import type { Response } from "express";
import type { AuthRequest } from "../auth/auth.middleware";
import { Types } from "mongoose";
import Pedido from "../models/pedidosModel";
import Stock from "../models/stockModel";
import Modelos from "../models/modelosModel";
import Precio from "../models/precios.model";
import { Usuario } from "../models/usuarioModel";

/**
 * UTILIDADES PARA REPORTES
 */

// Validar rango de fechas
const getDateRange = (desde?: string, hasta?: string) => {
  const desde_date = desde ? new Date(desde) : new Date(1970, 0, 1); // Toda la BD desde el inicio
  const hasta_date = hasta ? new Date(hasta) : new Date();
  
  // Asegurar que hasta incluya todo el día
  hasta_date.setHours(23, 59, 59, 999);
  
  return { desde_date, hasta_date };
};

/**
 * 0. UTILIDADES - Obtener modelos y tipos disponibles
 */
export const getModelosDisponibles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const modelos = await Modelos.find({ fecha_baja: { $exists: false } }).select("_id modelo producto ancho alto").lean();
    
    // Obtener productos únicos (estos son los "tipos" que se muestran)
    const tipos = [...new Set(modelos.map(m => m.producto))];

    res.json({
      modelos: modelos.map(m => ({
        _id: m._id,
        nombre: m.modelo,
        producto: m.producto,
        unidad: m.ancho
      })),
      tipos: tipos.sort()
    });
  } catch (error) {
    console.error("Error obteniendo modelos disponibles:", error);
    res.status(500).json({ error: "Error al obtener modelos disponibles" });
  }
};

/**
 * 1. DASHBOARD PRINCIPAL
 */
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta, filtro_mes } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    // Total de ingresos
    const totalIngresos = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          cantidad_pedidos: { $sum: 1 },
          total_pendiente: { $sum: "$total_pendiente" }
        }
      }
    ]);

    // Pedidos por estado
    const pedidosPorEstado = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido"
        }
      },
      {
        $group: {
          _id: "$estado",
          cantidad: { $sum: 1 },
          monto: { $sum: "$total" }
        }
      }
    ]);

    // Top 3 vendedores
    const top3Vendedores = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido"
        }
      },
      {
        $group: {
          _id: "$usuarioId",
          total: { $sum: "$total" },
          cantidad_pedidos: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "usuarios",
          localField: "_id",
          foreignField: "_id",
          as: "usuario"
        }
      },
      {
        $project: {
          usuarioId: "$_id",
          nombreVendedor: { $arrayElemAt: ["$usuario.nombreUsuario", 0] },
          email: { $arrayElemAt: ["$usuario.mail", 0] },
          total: 1,
          cantidad_pedidos: 1
        }
      }
    ]);

    // Stock con bajo nivel (disponible < 50)
    const bajoStock = await Stock.aggregate([
      {
        $match: {
          stockActivo: true,
          disponible: { $lt: 50 }
        }
      },
      {
        $lookup: {
          from: "Modelos",
          localField: "idModelo",
          foreignField: "_id",
          as: "modelo"
        }
      },
      {
        $project: {
          producto: 1,
          modelo_nombre: { $arrayElemAt: ["$modelo.modelo", 0] },
          stock: 1,
          disponible: 1,
          reservado: 1
        }
      },
      { $limit: 5 }
    ]);

    // Ingresos por mes (últimos 12 meses)
    const ingresosPorMes = await Pedido.aggregate([
      {
        $match: {
          tipo: "pedido"
        }
      },
      {
        $group: {
          _id: {
            año: { $year: "$fecha_pedido" },
            mes: { $month: "$fecha_pedido" }
          },
          total: { $sum: "$total" },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { "_id.año": 1, "_id.mes": 1 } },
      { $limit: 12 }
    ]);

    res.json({
      resumen: {
        total_ingresos: totalIngresos[0]?.total || 0,
        cantidad_pedidos: totalIngresos[0]?.cantidad_pedidos || 0,
        total_pendiente: totalIngresos[0]?.total_pendiente || 0,
        periodo: { desde: desde_date, hasta: hasta_date }
      },
      pedidos_por_estado: pedidosPorEstado,
      top_3_vendedores: top3Vendedores,
      bajo_stock: bajoStock,
      ingresos_por_mes: ingresosPorMes
    });
  } catch (error) {
    console.error("Error en Dashboard:", error);
    res.status(500).json({ error: "Error al generar dashboard" });
  }
};

/**
 * 2. VENTAS POR MODELO
 */
export const getVentasPorModelo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta, idModelo, filtro_estado, tipo_producto } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    const matchStage: any = {
      fecha_pedido: { $gte: desde_date, $lte: hasta_date },
      tipo: "pedido"
    };

    if (filtro_estado) {
      matchStage.estado = filtro_estado;
    }

    const ventasPorModelo = await Pedido.aggregate([
      { $match: matchStage },
      { $unwind: "$productos" },
      {
        $lookup: {
          from: "Modelos",
          localField: "productos.idModelo",
          foreignField: "_id",
          as: "modelo"
        }
      },
      {
        $lookup: {
          from: "Precios",
          localField: "productos.id_precio",
          foreignField: "_id",
          as: "precio"
        }
      },
      {
        $match: {
          ...(idModelo && { "modelo._id": new Types.ObjectId(idModelo as string) }),
          ...(tipo_producto && { "modelo.producto": tipo_producto })
        }
      },
      {
        $group: {
          _id: "$productos.idModelo",
          nombreModelo: { $first: { $arrayElemAt: ["$modelo.modelo", 0] } },
          producto: { $first: { $arrayElemAt: ["$modelo.producto", 0] } },
          tipo: { $first: { $arrayElemAt: ["$modelo.tipo", 0] } },
          unidad: { $first: { $arrayElemAt: ["$modelo.ancho", 0] } },
          cantidad_vendida: { $sum: "$productos.cantidad" },
          ingresos_brutos: { $sum: "$total" },
          descuentos_aplicados: { $sum: "$descuento" },
          fletes: { $sum: "$flete" },
          adelantos: { $sum: "$adelanto" },
          costo_total: {
            $sum: {
              $multiply: [
                "$productos.cantidad",
                { $arrayElemAt: ["$precio.costo", 0] }
              ]
            }
          },
          cantidad_pedidos: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          nombreModelo: 1,
          producto: 1,
          tipo: 1,
          unidad: 1,
          cantidad_vendida: 1,
          ingresos_brutos: 1,
          descuentos_aplicados: 1,
          fletes: 1,
          adelantos: 1,
          costo_total: 1,
          cantidad_pedidos: 1,
          ingresos_netos: {
            $subtract: [
              "$ingresos_brutos",
              { $add: ["$descuentos_aplicados", "$fletes"] }
            ]
          },
          ganancia_bruta: { $subtract: ["$ingresos_brutos", "$costo_total"] },
          margen_porcentaje: {
            $cond: [
              { $eq: ["$ingresos_brutos", 0] },
              0,
              {
                $multiply: [
                  { $divide: [{ $subtract: ["$ingresos_brutos", "$costo_total"] }, "$ingresos_brutos"] },
                  100
                ]
              }
            ]
          }
        }
      },
      { $sort: { ingresos_brutos: -1 } }
    ]);

    // Calcular total para porcentajes
    const totalIngresos = ventasPorModelo.reduce((sum, item) => sum + item.ingresos_brutos, 0);

    const ventasConPorcentaje = ventasPorModelo.map((item: any) => ({
      ...item,
      porcentaje_del_total: totalIngresos > 0 ? ((item.ingresos_brutos / totalIngresos) * 100).toFixed(2) : 0
    }));

    res.json({
      data: ventasConPorcentaje,
      resumen: {
        total_ingresos: totalIngresos,
        total_modelos: ventasConPorcentaje.length,
        cantidad_total_vendida: ventasConPorcentaje.reduce((sum, item) => sum + item.cantidad_vendida, 0),
        margen_promedio: (
          ventasConPorcentaje.reduce((sum, item) => sum + item.margen_porcentaje, 0) / ventasConPorcentaje.length
        ).toFixed(2)
      }
    });
  } catch (error) {
    console.error("Error en Ventas por Modelo:", error);
    res.status(500).json({ error: "Error al generar reporte de ventas por modelo" });
  }
};

/**
 * 3. VENTAS POR VENDEDOR
 */
export const getVentasPorVendedor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta, usuarioId, filtro_estado, idModelo, tipo_producto } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    const matchStage: any = {
      fecha_pedido: { $gte: desde_date, $lte: hasta_date }
    };

    if (usuarioId) {
      matchStage.usuarioId = new Types.ObjectId(usuarioId as string);
    }

    if (filtro_estado) {
      matchStage.tipo = filtro_estado; // "pedido" o "presupuesto"
    }

    const ventasPorVendedor = await Pedido.aggregate([
      { $match: matchStage },
      { $unwind: "$productos" },
      {
        $lookup: {
          from: "Modelos",
          localField: "productos.idModelo",
          foreignField: "_id",
          as: "modelo"
        }
      },
      {
        $match: {
          ...(idModelo && { "modelo._id": new Types.ObjectId(idModelo as string) }),
          ...(tipo_producto && { "modelo.producto": tipo_producto })
        }
      },
      {
        $group: {
          _id: "$usuarioId",
          total_facturado: { $sum: "$total" },
          cantidad_pedidos: {
            $sum: {
              $cond: [{ $eq: ["$tipo", "pedido"] }, 1, 0]
            }
          },
          cantidad_presupuestos: {
            $sum: {
              $cond: [{ $eq: ["$tipo", "presupuesto"] }, 1, 0]
            }
          },
          adelantos_recibidos: { $sum: "$adelanto" },
          total_pendiente_cobro: { $sum: "$total_pendiente" },
          descuentos_otorgados: { $sum: "$descuento" },
          fletes_cobrados: { $sum: "$flete" }
        }
      },
      {
        $lookup: {
          from: "usuarios",
          localField: "_id",
          foreignField: "_id",
          as: "usuario"
        }
      },
      {
        $project: {
          usuarioId: "$_id",
          nombreVendedor: { $arrayElemAt: ["$usuario.nombreUsuario", 0] },
          email: { $arrayElemAt: ["$usuario.mail", 0] },
          total_facturado: 1,
          cantidad_pedidos: 1,
          cantidad_presupuestos: 1,
          adelantos_recibidos: 1,
          total_pendiente_cobro: 1,
          descuentos_otorgados: 1,
          fletes_cobrados: 1,
          ticket_promedio: {
            $cond: [
              { $eq: ["$cantidad_pedidos", 0] },
              0,
              { $divide: ["$total_facturado", "$cantidad_pedidos"] }
            ]
          },
          tasa_conversion: {
            $cond: [
              { $eq: [{ $add: ["$cantidad_pedidos", "$cantidad_presupuestos"] }, 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      "$cantidad_pedidos",
                      { $add: ["$cantidad_pedidos", "$cantidad_presupuestos"] }
                    ]
                  },
                  100
                ]
              }
            ]
          }
        }
      },
      { $sort: { total_facturado: -1 } }
    ]);

    res.json({
      data: ventasPorVendedor.map((item: any) => ({
        ...item,
        tasa_conversion: parseFloat(item.tasa_conversion.toFixed(2)),
        ticket_promedio: parseFloat(item.ticket_promedio.toFixed(2))
      })),
      resumen: {
        total_vendedores: ventasPorVendedor.length,
        total_ingresos: ventasPorVendedor.reduce((sum, item) => sum + item.total_facturado, 0),
        total_pedidos: ventasPorVendedor.reduce((sum, item) => sum + item.cantidad_pedidos, 0),
        total_presupuestos: ventasPorVendedor.reduce((sum, item) => sum + item.cantidad_presupuestos, 0),
        adelantos_total: ventasPorVendedor.reduce((sum, item) => sum + item.adelantos_recibidos, 0),
        pendiente_total: ventasPorVendedor.reduce((sum, item) => sum + item.total_pendiente_cobro, 0)
      }
    });
  } catch (error) {
    console.error("Error en Ventas por Vendedor:", error);
    res.status(500).json({ error: "Error al generar reporte de ventas por vendedor" });
  }
};

/**
 * 4. TOP CLIENTES
 */
export const getTopClientes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta, limite = 10 } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    const topClientes = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido"
        }
      },
      {
        $group: {
          _id: "$cliente.nombre",
          cliente_dni: { $first: "$cliente.dni_cuil" },
          cliente_contacto: { $first: "$cliente.contacto" },
          cliente_direccion: { $first: "$cliente.direccion" },
          cantidadPedidos: { $sum: 1 },
          totalGastado: { $sum: "$total" },
          adelantosRecibidos: { $sum: "$adelanto" },
          pendiente: { $sum: "$total_pendiente" },
          procedencia: { $first: "$procedencia" },
          ultimo_pedido: { $max: "$fecha_pedido" },
          total_descuentos: { $sum: "$descuento" }
        }
      },
      {
        $project: {
          _id: 0,
          nombreCliente: "$_id",
          cliente_dni: 1,
          cliente_contacto: 1,
          cliente_direccion: 1,
          cantidadPedidos: 1,
          totalGastado: 1,
          adelantosRecibidos: 1,
          pendiente: 1,
          procedencia: 1,
          ultimo_pedido: 1,
          total_descuentos: 1,
          promedio_por_pedido: {
            $divide: ["$totalGastado", "$cantidadPedidos"]
          }
        }
      },
      { $sort: { totalGastado: -1 } },
      { $limit: parseInt(limite as string) || 10 }
    ]);

    res.json({
      data: topClientes.map((item: any) => ({
        ...item,
        promedio_por_pedido: parseFloat(item.promedio_por_pedido.toFixed(2))
      })),
      resumen: {
        clientes_listados: topClientes.length,
        total_ingresos: topClientes.reduce((sum, item) => sum + item.totalGastado, 0),
        total_adelantos: topClientes.reduce((sum, item) => sum + item.adelantosRecibidos, 0),
        total_pendiente: topClientes.reduce((sum, item) => sum + item.pendiente, 0)
      }
    });
  } catch (error) {
    console.error("Error en Top Clientes:", error);
    res.status(500).json({ error: "Error al generar reporte de top clientes" });
  }
};

/**
 * 5. COMPARATIVA ENTRE VENDEDORES (MES A MES)
 */
export const getComparativaVendedores = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { meses = 12 } = req.query;
    const mesesNum = parseInt(meses as string) || 12;

    // Calcular fecha inicial (hace N meses)
    const fechaInicial = new Date();
    fechaInicial.setMonth(fechaInicial.getMonth() - mesesNum);
    fechaInicial.setDate(1);
    fechaInicial.setHours(0, 0, 0, 0);

    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    // Obtener ventas por vendedor y mes
    const ventasPorMes = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: fechaInicial, $lte: hoy },
          tipo: "pedido"
        }
      },
      {
        $group: {
          _id: {
            usuarioId: "$usuarioId",
            año: { $year: "$fecha_pedido" },
            mes: { $month: "$fecha_pedido" }
          },
          total: { $sum: "$total" },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { "_id.año": 1, "_id.mes": 1 } },
      {
        $lookup: {
          from: "usuarios",
          localField: "_id.usuarioId",
          foreignField: "_id",
          as: "usuario"
        }
      }
    ]);

    // Obtener ranking actual (últimos 30 días)
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    hace30Dias.setHours(0, 0, 0, 0);

    const ranking = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: hace30Dias, $lte: hoy },
          tipo: "pedido"
        }
      },
      {
        $group: {
          _id: "$usuarioId",
          total: { $sum: "$total" },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      {
        $lookup: {
          from: "usuarios",
          localField: "_id",
          foreignField: "_id",
          as: "usuario"
        }
      },
      {
        $project: {
          usuarioId: "$_id",
          nombreVendedor: { $arrayElemAt: ["$usuario.nombreUsuario", 0] },
          email: { $arrayElemAt: ["$usuario.mail", 0] },
          total: 1,
          cantidad: 1
        }
      }
    ]);

    // Crear ranking con posiciones
    const rankingConPosicion = ranking.map((item, index) => ({
      ...item,
      posicion: index + 1
    }));

    // Organizar datos para gráfico serie temporal
    const meses_labels: string[] = [];
    const vendedoresMap = new Map();

    // Generar labels de meses
    for (let i = 0; i < mesesNum; i++) {
      const fecha = new Date(fechaInicial);
      fecha.setMonth(fecha.getMonth() + i);
      const label = `${fecha.toLocaleDateString("es-ES", { month: "short", year: "2-digit" })}`;
      meses_labels.push(label);
    }

    // Agrupar por vendedor
    ventasPorMes.forEach((item: any) => {
      const vendedorId = item._id.usuarioId.toString();
      const nombreVendedor = item.usuario[0]?.nombreUsuario || "Desconocido";

      if (!vendedoresMap.has(vendedorId)) {
        vendedoresMap.set(vendedorId, {
          usuarioId: vendedorId,
          nombreVendedor,
          datos: []
        });
      }

      vendedoresMap.get(vendedorId).datos.push({
        fecha: `${item._id.mes}/${item._id.año}`,
        total: item.total,
        cantidad: item.cantidad
      });
    });

    const graficoSeriesTemporal = Array.from(vendedoresMap.values());

    res.json({
      ranking: rankingConPosicion,
      grafico_mes_a_mes: graficoSeriesTemporal,
      meses_labels,
      periodo: {
        desde: fechaInicial,
        hasta: hoy,
        cantidad_meses: mesesNum
      }
    });
  } catch (error) {
    console.error("Error en Comparativa Vendedores:", error);
    res.status(500).json({ error: "Error al generar comparativa de vendedores" });
  }
};

/**
 * 6. RENTABILIDAD POR MODELO
 */
export const getRentabilidadPorModelo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta, idModelo, tipo_producto } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    const matchStage: any = {
      fecha_pedido: { $gte: desde_date, $lte: hasta_date },
      tipo: "pedido"
    };

    const rentabilidad = await Pedido.aggregate([
      { $match: matchStage },
      { $unwind: "$productos" },
      {
        $lookup: {
          from: "Modelos",
          localField: "productos.idModelo",
          foreignField: "_id",
          as: "modelo"
        }
      },
      {
        $lookup: {
          from: "Precios",
          localField: "productos.id_precio",
          foreignField: "_id",
          as: "precio"
        }
      },
      {
        $match: {
          ...(idModelo && { "modelo._id": new Types.ObjectId(idModelo as string) }),
          ...(tipo_producto && { "modelo.producto": tipo_producto })
        }
      },
      {
        $group: {
          _id: "$productos.idModelo",
          nombreModelo: { $first: { $arrayElemAt: ["$modelo.modelo", 0] } },
          producto: { $first: { $arrayElemAt: ["$modelo.producto", 0] } },
          tipo: { $first: { $arrayElemAt: ["$modelo.tipo", 0] } },
          unidad: { $first: { $arrayElemAt: ["$modelo.ancho", 0] } },
          cantidad: { $sum: "$productos.cantidad" },
          ingresos_brutos: { $sum: "$total" },
          costo_total: {
            $sum: {
              $multiply: [
                "$productos.cantidad",
                { $arrayElemAt: ["$precio.costo", 0] }
              ]
            }
          },
          descuentos: { $sum: "$descuento" },
          fletes: { $sum: "$flete" },
          valor_instalacion: { $sum: "$valor_instalacion" },
          cantidad_pedidos: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          nombreModelo: 1,
          producto: 1,
          tipo: 1,
          unidad: 1,
          cantidad: 1,
          ingresos_brutos: 1,
          costo_total: 1,
          ganancia_bruta: { $subtract: ["$ingresos_brutos", "$costo_total"] },
          margen_bruto_pct: {
            $cond: [
              { $eq: ["$ingresos_brutos", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$ingresos_brutos", "$costo_total"] },
                      "$ingresos_brutos"
                    ]
                  },
                  100
                ]
              }
            ]
          },
          descuentos: 1,
          fletes: 1,
          valor_instalacion: 1,
          costos_adicionales: {
            $add: ["$descuentos", "$fletes", "$valor_instalacion"]
          },
          ganancia_neta: {
            $subtract: [
              { $subtract: ["$ingresos_brutos", "$costo_total"] },
              { $add: ["$descuentos", "$fletes", "$valor_instalacion"] }
            ]
          },
          margen_neto_pct: {
            $cond: [
              { $eq: ["$ingresos_brutos", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $subtract: ["$ingresos_brutos", "$costo_total"] },
                          { $add: ["$descuentos", "$fletes", "$valor_instalacion"] }
                        ]
                      },
                      "$ingresos_brutos"
                    ]
                  },
                  100
                ]
              }
            ]
          },
          cantidad_pedidos: 1
        }
      },
      { $sort: { ingresos_brutos: -1 } }
    ]);

    const totalIngresos = rentabilidad.reduce((sum, item) => sum + item.ingresos_brutos, 0);
    const totalGanancia = rentabilidad.reduce((sum, item) => sum + item.ganancia_neta, 0);
    const margenPromedio = rentabilidad.length > 0 
      ? rentabilidad.reduce((sum, item) => sum + item.margen_neto_pct, 0) / rentabilidad.length
      : 0;

    res.json({
      data: rentabilidad.map((item: any) => ({
        ...item,
        margen_bruto_pct: parseFloat(item.margen_bruto_pct.toFixed(2)),
        margen_neto_pct: parseFloat(item.margen_neto_pct.toFixed(2))
      })),
      resumen: {
        total_ingresos: totalIngresos,
        total_costo: rentabilidad.reduce((sum, item) => sum + item.costo_total, 0),
        total_ganancia_bruta: rentabilidad.reduce((sum, item) => sum + item.ganancia_bruta, 0),
        total_costos_adicionales: rentabilidad.reduce((sum, item) => sum + item.costos_adicionales, 0),
        total_ganancia_neta: totalGanancia,
        margen_promedio: parseFloat(margenPromedio.toFixed(2)),
        modelo_mas_rentable: rentabilidad[0] || null,
        modelo_menos_rentable: rentabilidad[rentabilidad.length - 1] || null
      }
    });
  } catch (error) {
    console.error("Error en Rentabilidad por Modelo:", error);
    res.status(500).json({ error: "Error al generar reporte de rentabilidad por modelo" });
  }
};

/**
 * 7. TASA DE CONVERSIÓN PRESUPUESTO → PEDIDO
 */
export const getTasaConversion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta, idModelo, usuarioId } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    const matchStage: any = {
      fecha_pedido: { $gte: desde_date, $lte: hasta_date }
    };

    if (usuarioId) {
      matchStage.usuarioId = usuarioId;
    }

    // Conversión global
    const tasaGlobal = await Pedido.aggregate([
      { $match: matchStage },
      {
        $facet: {
          presupuestos: [
            { $match: { tipo: "presupuesto" } },
            { $count: "total" }
          ],
          pedidos: [
            { $match: { tipo: "pedido" } },
            { $count: "total" }
          ]
        }
      }
    ]);

    const totalPresupuestos = tasaGlobal[0].presupuestos[0]?.total || 0;
    const totalPedidos = tasaGlobal[0].pedidos[0]?.total || 0;
    const tasaConversionGlobal = totalPresupuestos + totalPedidos > 0
      ? ((totalPedidos / (totalPresupuestos + totalPedidos)) * 100)
      : 0;

    // Por vendedor
    const porVendedor = await Pedido.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$usuarioId",
          presupuestos: {
            $sum: { $cond: [{ $eq: ["$tipo", "presupuesto"] }, 1, 0] }
          },
          pedidos: {
            $sum: { $cond: [{ $eq: ["$tipo", "pedido"] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: "usuarios",
          localField: "_id",
          foreignField: "_id",
          as: "usuario"
        }
      },
      {
        $project: {
          usuarioId: "$_id",
          nombreVendedor: { $arrayElemAt: ["$usuario.nombreUsuario", 0] },
          email: { $arrayElemAt: ["$usuario.mail", 0] },
          presupuestos: 1,
          pedidos: 1,
          total_documentos: { $add: ["$presupuestos", "$pedidos"] },
          tasa_conversion: {
            $cond: [
              { $eq: [{ $add: ["$presupuestos", "$pedidos"] }, 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      "$pedidos",
                      { $add: ["$presupuestos", "$pedidos"] }
                    ]
                  },
                  100
                ]
              }
            ]
          }
        }
      },
      { $sort: { tasa_conversion: -1 } }
    ]);

    // Por modelo (dentro de presupuestos)
    const porModelo = await Pedido.aggregate([
      { $match: matchStage },
      { $unwind: "$productos" },
      {
        $lookup: {
          from: "Modelos",
          localField: "productos.idModelo",
          foreignField: "_id",
          as: "modelo"
        }
      },
      {
        $group: {
          _id: "$productos.idModelo",
          nombreModelo: { $first: { $arrayElemAt: ["$modelo.modelo", 0] } },
          presupuestos: {
            $sum: { $cond: [{ $eq: ["$tipo", "presupuesto"] }, 1, 0] }
          },
          pedidos: {
            $sum: { $cond: [{ $eq: ["$tipo", "pedido"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          idModelo: "$_id",
          nombreModelo: 1,
          presupuestos: 1,
          pedidos: 1,
          total_documentos: { $add: ["$presupuestos", "$pedidos"] },
          tasa_conversion: {
            $cond: [
              { $eq: [{ $add: ["$presupuestos", "$pedidos"] }, 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      "$pedidos",
                      { $add: ["$presupuestos", "$pedidos"] }
                    ]
                  },
                  100
                ]
              }
            ]
          }
        }
      },
      { $sort: { tasa_conversion: -1 } }
    ]);

    res.json({
      tasa_global: {
        presupuestos: totalPresupuestos,
        pedidos: totalPedidos,
        total_documentos: totalPresupuestos + totalPedidos,
        tasa_conversion_pct: parseFloat(tasaConversionGlobal.toFixed(2))
      },
      por_vendedor: porVendedor.map((item: any) => ({
        ...item,
        tasa_conversion: parseFloat(item.tasa_conversion.toFixed(2))
      })),
      por_modelo: porModelo.map((item: any) => ({
        ...item,
        tasa_conversion: parseFloat(item.tasa_conversion.toFixed(2))
      })),
      periodo: { desde: desde_date, hasta: hasta_date }
    });
  } catch (error) {
    console.error("Error en Tasa de Conversión:", error);
    res.status(500).json({ error: "Error al generar reporte de tasa de conversión" });
  }
};

/**
 * 8. RENTABILIDAD POR CLIENTE
 */
export const getRentabilidadPorCliente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta, nombreCliente, limite = 20 } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    const matchStage: any = {
      fecha_pedido: { $gte: desde_date, $lte: hasta_date },
      tipo: "pedido"
    };

    if (nombreCliente) {
      matchStage["cliente.nombre"] = new RegExp(nombreCliente as string, "i");
    }

    const rentabilidad = await Pedido.aggregate([
      { $match: matchStage },
      { $unwind: "$productos" },
      {
        $lookup: {
          from: "Precios",
          localField: "productos.id_precio",
          foreignField: "_id",
          as: "precio"
        }
      },
      {
        $group: {
          _id: "$cliente.nombre",
          cliente_dni: { $first: "$cliente.dni_cuil" },
          cliente_contacto: { $first: "$cliente.contacto" },
          cliente_direccion: { $first: "$cliente.direccion" },
          ingresos: { $sum: "$total" },
          costo_total: {
            $sum: {
              $multiply: [
                "$productos.cantidad",
                { $arrayElemAt: ["$precio.costo", 0] }
              ]
            }
          },
          cantidad_pedidos: { $sum: 1 },
          descuentos: { $sum: "$descuento" },
          fletes: { $sum: "$flete" },
          adelantos: { $sum: "$adelanto" },
          total_pendiente: { $sum: "$total_pendiente" }
        }
      },
      {
        $project: {
          _id: 0,
          nombreCliente: "$_id",
          cliente_dni: 1,
          cliente_contacto: 1,
          cliente_direccion: 1,
          ingresos: 1,
          costo_total: 1,
          ganancia_bruta: { $subtract: ["$ingresos", "$costo_total"] },
          margen_bruto_pct: {
            $cond: [
              { $eq: ["$ingresos", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$ingresos", "$costo_total"] },
                      "$ingresos"
                    ]
                  },
                  100
                ]
              }
            ]
          },
          descuentos: 1,
          fletes: 1,
          adelantos: 1,
          total_pendiente: 1,
          costos_adicionales: { $add: ["$descuentos", "$fletes"] },
          ganancia_neta: {
            $subtract: [
              { $subtract: ["$ingresos", "$costo_total"] },
              { $add: ["$descuentos", "$fletes"] }
            ]
          },
          margen_neto_pct: {
            $cond: [
              { $eq: ["$ingresos", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $subtract: ["$ingresos", "$costo_total"] },
                          { $add: ["$descuentos", "$fletes"] }
                        ]
                      },
                      "$ingresos"
                    ]
                  },
                  100
                ]
              }
            ]
          },
          cantidad_pedidos: 1,
          valor_promedio_pedido: {
            $divide: ["$ingresos", "$cantidad_pedidos"]
          }
        }
      },
      { $sort: { ganancia_neta: -1 } },
      { $limit: parseInt(limite as string) || 20 }
    ]);

    const totalIngresos = rentabilidad.reduce((sum, item) => sum + item.ingresos, 0);
    const totalGanancia = rentabilidad.reduce((sum, item) => sum + item.ganancia_neta, 0);
    const margenPromedio = rentabilidad.length > 0
      ? rentabilidad.reduce((sum, item) => sum + item.margen_neto_pct, 0) / rentabilidad.length
      : 0;

    res.json({
      data: rentabilidad.map((item: any) => ({
        ...item,
        margen_bruto_pct: parseFloat(item.margen_bruto_pct.toFixed(2)),
        margen_neto_pct: parseFloat(item.margen_neto_pct.toFixed(2)),
        valor_promedio_pedido: parseFloat(item.valor_promedio_pedido.toFixed(2))
      })),
      resumen: {
        total_clientes: rentabilidad.length,
        total_ingresos: totalIngresos,
        total_costo: rentabilidad.reduce((sum, item) => sum + item.costo_total, 0),
        total_ganancia_neta: totalGanancia,
        margen_promedio: parseFloat(margenPromedio.toFixed(2)),
        cliente_mas_rentable: rentabilidad[0] || null,
        cliente_menos_rentable: rentabilidad[rentabilidad.length - 1] || null
      }
    });
  } catch (error) {
    console.error("Error en Rentabilidad por Cliente:", error);
    res.status(500).json({ error: "Error al generar reporte de rentabilidad por cliente" });
  }
};

/**
 * 9. ANÁLISIS DE DESCUENTOS & EXTRAS
 */
export const getAnalisisDescuentosExtras = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta, tipoAnalisis } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    // Totales generales
    const totalesGenerales = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido"
        }
      },
      {
        $group: {
          _id: null,
          total_descuentos: { $sum: "$descuento" },
          total_fletes: { $sum: "$flete" },
          total_valor_instalacion: { $sum: "$valor_instalacion" },
          total_adicionales: { $sum: "$adicional" },
          total_adelantos: { $sum: "$adelanto" },
          total_ingresos: { $sum: "$total" },
          cantidad_pedidos: { $sum: 1 }
        }
      }
    ]);

    const totales = totalesGenerales[0] || {
      total_descuentos: 0,
      total_fletes: 0,
      total_valor_instalacion: 0,
      total_adicionales: 0,
      total_adelantos: 0,
      total_ingresos: 0,
      cantidad_pedidos: 0
    };

    // Descuentos por modelo
    const descuentosPorModelo = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido",
          descuento: { $gt: 0 }
        }
      },
      { $unwind: "$productos" },
      {
        $lookup: {
          from: "Modelos",
          localField: "productos.idModelo",
          foreignField: "_id",
          as: "modelo"
        }
      },
      {
        $group: {
          _id: "$productos.idModelo",
          nombreModelo: { $first: { $arrayElemAt: ["$modelo.modelo", 0] } },
          total_descuentos: { $sum: "$descuento" },
          cantidad_pedidos_con_descuento: { $sum: 1 },
          descuento_promedio: { $avg: "$descuento" },
          descuento_maximo: { $max: "$descuento" },
          total_ingresos: { $sum: "$total" }
        }
      },
      {
        $project: {
          _id: 1,
          nombreModelo: 1,
          total_descuentos: 1,
          cantidad_pedidos_con_descuento: 1,
          descuento_promedio: { $round: ["$descuento_promedio", 2] },
          descuento_maximo: 1,
          total_ingresos: 1,
          porcentaje_descuento_sobre_ingresos: {
            $cond: [
              { $eq: ["$total_ingresos", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$total_descuentos", "$total_ingresos"] },
                  100
                ]
              }
            ]
          }
        }
      },
      { $sort: { total_descuentos: -1 } }
    ]);

    // Detalles de pedidos con altos descuentos
    const pedidosAltoDescuento = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido",
          descuento: { $gt: 0 }
        }
      },
      {
        $project: {
          remito: 1,
          cliente_nombre: "$cliente.nombre",
          descuento: 1,
          flete: 1,
          valor_instalacion: 1,
          adicional: 1,
          total: 1,
          fecha_pedido: 1,
          descuento_porcentaje: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { $multiply: [{ $divide: ["$descuento", "$total"] }, 100] }
            ]
          },
          costos_adicionales_total: {
            $add: ["$flete", "$valor_instalacion", "$adicional"]
          }
        }
      },
      { $sort: { descuento: -1 } },
      { $limit: 10 }
    ]);

    // Análisis por período (últimos 12 meses)
    const analisisiPorPeriodo = await Pedido.aggregate([
      {
        $match: {
          tipo: "pedido"
        }
      },
      {
        $group: {
          _id: {
            año: { $year: "$fecha_pedido" },
            mes: { $month: "$fecha_pedido" }
          },
          total_descuentos: { $sum: "$descuento" },
          total_fletes: { $sum: "$flete" },
          total_valor_instalacion: { $sum: "$valor_instalacion" },
          total_ingresos: { $sum: "$total" },
          cantidad_pedidos: { $sum: 1 }
        }
      },
      { $sort: { "_id.año": 1, "_id.mes": 1 } },
      { $limit: 12 },
      {
        $project: {
          _id: 1,
          periodo: {
            $concat: [
              { $toString: "$_id.mes" },
              "/",
              { $toString: "$_id.año" }
            ]
          },
          total_descuentos: 1,
          total_fletes: 1,
          total_valor_instalacion: 1,
          total_ingresos: 1,
          cantidad_pedidos: 1,
          costos_adicionales_total: {
            $add: ["$total_descuentos", "$total_fletes", "$total_valor_instalacion"]
          },
          porcentaje_descuentos: {
            $cond: [
              { $eq: ["$total_ingresos", 0] },
              0,
              { $multiply: [{ $divide: ["$total_descuentos", "$total_ingresos"] }, 100] }
            ]
          }
        }
      }
    ]);

    res.json({
      resumen_general: {
        total_descuentos: totales.total_descuentos,
        total_fletes: totales.total_fletes,
        total_valor_instalacion: totales.total_valor_instalacion,
        total_adicionales: totales.total_adicionales,
        total_costos_adicionales: totales.total_descuentos + totales.total_fletes + totales.total_valor_instalacion + totales.total_adicionales,
        promedio_descuento_por_pedido: totales.cantidad_pedidos > 0 ? parseFloat((totales.total_descuentos / totales.cantidad_pedidos).toFixed(2)) : 0,
        total_adelantos: totales.total_adelantos,
        total_ingresos: totales.total_ingresos,
        porcentaje_descuentos: totales.total_ingresos > 0 ? parseFloat(((totales.total_descuentos / totales.total_ingresos) * 100).toFixed(2)) : 0,
        porcentaje_fletes: totales.total_ingresos > 0 ? parseFloat(((totales.total_fletes / totales.total_ingresos) * 100).toFixed(2)) : 0,
        cantidad_pedidos: totales.cantidad_pedidos
      },
      descuentos_por_modelo: descuentosPorModelo.map((item: any) => ({
        ...item,
        porcentaje_descuento_sobre_ingresos: parseFloat(item.porcentaje_descuento_sobre_ingresos.toFixed(2))
      })),
      pedidos_alto_descuento: pedidosAltoDescuento.map((item: any) => ({
        ...item,
        descuento_porcentaje: parseFloat(item.descuento_porcentaje.toFixed(2))
      })),
      tendencia_por_periodo: analisisiPorPeriodo.map((item: any) => ({
        ...item,
        porcentaje_descuentos: parseFloat(item.porcentaje_descuentos.toFixed(2))
      })),
      periodo: { desde: desde_date, hasta: hasta_date }
    });
  } catch (error) {
    console.error("Error en Análisis de Descuentos:", error);
    res.status(500).json({ error: "Error al generar reporte de análisis de descuentos" });
  }
};

/**
 * 10. ESTADO DE PEDIDOS
 */
export const getEstadoPedidos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta, estado, usuarioId, limite = 50, idModelo, tipo_producto } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    const matchStage: any = {
      fecha_pedido: { $gte: desde_date, $lte: hasta_date },
      tipo: "pedido"
    };

    if (estado) {
      matchStage.estado = estado;
    }

    if (usuarioId) {
      matchStage.usuarioId = usuarioId;
    }

    // Resumen por estado (incluyendo modelos si se filtra)
    let resumenEstadoBase: any = [
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido"
        }
      }
    ];

    if (idModelo || tipo_producto) {
      resumenEstadoBase.push({ $unwind: "$productos" });
      resumenEstadoBase.push({
        $lookup: {
          from: "Modelos",
          localField: "productos.idModelo",
          foreignField: "_id",
          as: "modelo"
        }
      });
      resumenEstadoBase.push({
        $match: {
          ...(idModelo && { "modelo._id": new Types.ObjectId(idModelo as string) }),
          ...(tipo_producto && { "modelo.producto": tipo_producto })
        }
      });
    }

    resumenEstadoBase.push({
      $group: {
        _id: "$estado",
        cantidad: { $sum: 1 },
        monto: { $sum: "$total" },
        monto_pendiente: { $sum: "$total_pendiente" },
        producto: { $first: { $arrayElemAt: ["$modelo.producto", 0] } }
      }
    });
    resumenEstadoBase.push({ $sort: { cantidad: -1 } });

    const resumenEstado = await Pedido.aggregate(resumenEstadoBase);

    // Detalles de pedidos
    let detalleBase: any = [
      { $match: matchStage },
      {
        $lookup: {
          from: "usuarios",
          localField: "usuarioId",
          foreignField: "_id",
          as: "usuario"
        }
      }
    ];

    if (idModelo || tipo_producto) {
      detalleBase.push({ $unwind: "$productos" });
      detalleBase.push({
        $lookup: {
          from: "Modelos",
          localField: "productos.idModelo",
          foreignField: "_id",
          as: "modelo"
        }
      });
      detalleBase.push({
        $match: {
          ...(idModelo && { "modelo._id": new Types.ObjectId(idModelo as string) }),
          ...(tipo_producto && { "modelo.producto": tipo_producto })
        }
      });
    }

    detalleBase.push({
      $addFields: {
        dias_transcurridos: {
          $divide: [
            {
              $subtract: [new Date(), "$fecha_pedido"]
            },
            1000 * 60 * 60 * 24
          ]
        },
        dias_hasta_entrega: {
          $divide: [
            {
              $subtract: ["$fecha_entrega_estimada", "$fecha_pedido"]
            },
            1000 * 60 * 60 * 24
          ]
        },
        demora_real: {
          $cond: [
            { $eq: ["$estado", "entregado"] },
            {
              $divide: [
                {
                  $subtract: [new Date(), "$fecha_pedido"]
                },
                1000 * 60 * 60 * 24
              ]
            },
            null
          ]
        }
      }
    });
    
    detalleBase.push({
      $project: {
        remito: 1,
        estado: 1,
        cliente_nombre: "$cliente.nombre",
        vendedor: { $arrayElemAt: ["$usuario.nombreUsuario", 0] },
        modelo_nombre: { $arrayElemAt: ["$modelo.modelo", 0] },
        producto: { $arrayElemAt: ["$modelo.producto", 0] },
        tipo_producto: { $arrayElemAt: ["$modelo.tipo", 0] },
        fecha_pedido: 1,
        fecha_entrega_estimada: 1,
        fecha_entrega_real: 1,
        total: 1,
        total_pendiente: 1,
        dias_transcurridos: { $round: ["$dias_transcurridos", 1] },
        dias_hasta_entrega: { $round: ["$dias_hasta_entrega", 1] },
        demora_real: { $round: ["$demora_real", 1] },
        metodo_pago: 1,
        adelanto: 1
      }
    });
    
    detalleBase.push({ $sort: { fecha_pedido: -1 } });
    detalleBase.push({ $limit: parseInt(limite as string) || 50 });

    const detallePedidos = await Pedido.aggregate(detalleBase);

    // Estadísticas de tiempo
    const estadisticasTiempo = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido",
          estado: "entregado"
        }
      },
      {
        $addFields: {
          dias_para_entregar: {
            $divide: [
              {
                $subtract: ["$fecha_entrega_estimada", "$fecha_pedido"]
              },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          tiempo_promedio: { $avg: "$dias_para_entregar" },
          tiempo_maximo: { $max: "$dias_para_entregar" },
          tiempo_minimo: { $min: "$dias_para_entregar" }
        }
      }
    ]);

    // Pedidos pendientes de cobro
    const pendientesCobro = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido",
          total_pendiente: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: "$estado",
          cantidad: { $sum: 1 },
          total_pendiente: { $sum: "$total_pendiente" }
        }
      }
    ]);

    // Pedidos retrasados
    const horaActual = new Date();
    const pedidosRetrasados = await Pedido.aggregate([
      {
        $match: {
          fecha_pedido: { $gte: desde_date, $lte: hasta_date },
          tipo: "pedido",
          estado: { $ne: "entregado" },
          fecha_entrega_estimada: { $lt: horaActual }
        }
      },
      { $count: "cantidad" }
    ]);

    res.json({
      resumen_estado: resumenEstado,
      estadisticas_tiempo: estadisticasTiempo[0] || {
        tiempo_promedio: 0,
        tiempo_maximo: 0,
        tiempo_minimo: 0
      },
      pendientes_cobro: pendientesCobro,
      pedidos_retrasados: pedidosRetrasados[0]?.cantidad || 0,
      detalle_pedidos: detallePedidos.map((item: any) => ({
        ...item,
        dias_transcurridos: parseFloat(item.dias_transcurridos?.toString() || "0"),
        dias_hasta_entrega: parseFloat(item.dias_hasta_entrega?.toString() || "0"),
        demora_real: item.demora_real ? parseFloat(item.demora_real.toString()) : null
      })),
      periodo: { desde: desde_date, hasta: hasta_date }
    });
  } catch (error) {
    console.error("Error en Estado de Pedidos:", error);
    res.status(500).json({ error: "Error al generar reporte de estado de pedidos" });
  }
};

/**
 * 11. STOCK & PRODUCCIÓN
 */
export const getStockProduccion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { alertaStock = 50, ordenarPor = "disponible" } = req.query;
    const alertaStockNum = parseInt(alertaStock as string) || 50;

    // Obtener información de stock
    const stockInfo = await Stock.aggregate([
      {
        $match: { stockActivo: true }
      },
      {
        $lookup: {
          from: "Modelos",
          localField: "idModelo",
          foreignField: "_id",
          as: "modelo"
        }
      },
      {
        $project: {
          producto: 1,
          modelo_nombre: { $arrayElemAt: ["$modelo.modelo", 0] },
          idModelo: 1,
          stock_actual: "$stock",
          stock_reservado: "$reservado",
          disponible: {
            $subtract: ["$stock", "$reservado"]
          },
          pendiente: 1,
          unidad: 1,
          bajo_stock: {
            $cond: [
              { $lt: [{ $subtract: ["$stock", "$reservado"] }, alertaStockNum] },
              true,
              false
            ]
          },
          placas_por_metro: { $arrayElemAt: ["$modelo.placas_por_metro", 0] },
          metros_cuadrados: {
            $cond: [
              { $eq: [{ $arrayElemAt: ["$modelo.placas_por_metro", 0] }, 0] },
              0,
              {
                $divide: [
                  { $subtract: ["$stock", "$reservado"] },
                  { $arrayElemAt: ["$modelo.placas_por_metro", 0] }
                ]
              }
            ]
          }
        }
      }
    ]);

    // Calcular producción diaria promedio (últimos 30 días)
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const produccionDiaria = await Stock.aggregate([
      {
        $match: { stockActivo: true }
      },
      {
        $lookup: {
          from: "movimientosStock",
          localField: "_id",
          foreignField: "idStock",
          as: "movimientos"
        }
      },
      {
        $addFields: {
          movimientos_recientes: {
            $filter: {
              input: "$movimientos",
              as: "mov",
              cond: { $gte: ["$$mov.fecha", hace30Dias] }
            }
          }
        }
      },
      {
        $project: {
          idModelo: 1,
          movimientos_recientes: 1,
          total_movimientos_30d: { $size: "$movimientos_recientes" },
          produccion_diaria_estimada: {
            $cond: [
              { $eq: [{ $size: "$movimientos_recientes" }, 0] },
              0,
              { $divide: [{ $size: "$movimientos_recientes" }, 30] }
            ]
          }
        }
      }
    ]);

    // Stock bajo alerta
    const bajoAlerta = stockInfo
      .filter((item: any) => item.bajo_stock)
      .sort((a: any, b: any) => a.disponible - b.disponible);

    // Enriquecer datos con producción
    const stockConProduccion = stockInfo.map((stock: any) => {
      const prodData = produccionDiaria.find((p: any) => p.idModelo?.toString() === stock.idModelo?.toString());
      const produccionDiariaEst = prodData?.produccion_diaria_estimada || 0;
      const diasParaAgotar = produccionDiariaEst > 0 
        ? Math.ceil(stock.disponible / produccionDiariaEst)
        : Infinity;

      return {
        ...stock,
        produccion_diaria_estimada: parseFloat(produccionDiariaEst.toFixed(2)),
        dias_para_agotar: diasParaAgotar === Infinity ? null : diasParaAgotar,
        metros_cuadrados: parseFloat(stock.metros_cuadrados?.toFixed(2) || "0")
      };
    });

    // Ordenar según parámetro
    if (ordenarPor === "bajo_stock") {
      stockConProduccion.sort((a: any, b: any) => 
        (a.bajo_stock ? 0 : 1) - (b.bajo_stock ? 0 : 1)
      );
    } else if (ordenarPor === "dias_agotar") {
      stockConProduccion.sort((a: any, b: any) => {
        const diasA = a.dias_para_agotar || Infinity;
        const diasB = b.dias_para_agotar || Infinity;
        return diasA - diasB;
      });
    }

    // Resumen
    const resumen = {
      total_modelos: stockConProduccion.length,
      bajo_alerta: bajoAlerta.length,
      stock_total: stockConProduccion.reduce((sum, item) => sum + item.stock_actual, 0),
      stock_reservado_total: stockConProduccion.reduce((sum, item) => sum + item.stock_reservado, 0),
      stock_disponible_total: stockConProduccion.reduce((sum, item) => sum + item.disponible, 0),
      metros_cuadrados_disponibles: stockConProduccion.reduce((sum, item) => sum + (item.metros_cuadrados || 0), 0),
      promedio_disponible_por_modelo: stockConProduccion.length > 0 
        ? parseFloat((stockConProduccion.reduce((sum, item) => sum + item.disponible, 0) / stockConProduccion.length).toFixed(2))
        : 0
    };

    res.json({
      resumen,
      bajo_alerta: bajoAlerta,
      stock_general: stockConProduccion,
      umbral_alerta: alertaStockNum,
      fecha_consulta: new Date()
    });
  } catch (error) {
    console.error("Error en Stock & Producción:", error);
    res.status(500).json({ error: "Error al generar reporte de stock y producción" });
  }
};

/**
 * 12. MÉTODOS DE PAGO & PROCEDENCIA
 */
export const getMetodosPagoProcedenncia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { desde, hasta } = req.query;
    const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

    const matchStage = {
      fecha_pedido: { $gte: desde_date, $lte: hasta_date },
      tipo: "pedido"
    };

    // Análisis por métodos de pago
    const metodosPago = await Pedido.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$metodo_pago",
          cantidad: { $sum: 1 },
          monto_total: { $sum: "$total" },
          monto_adelantos: { $sum: "$adelanto" },
          monto_pendiente: { $sum: "$total_pendiente" },
          monto_promedio: { $avg: "$total" }
        }
      },
      {
        $project: {
          metodo_pago: "$_id",
          cantidad: 1,
          monto_total: 1,
          monto_adelantos: 1,
          monto_pendiente: 1,
          monto_promedio: { $round: ["$monto_promedio", 2] },
          _id: 0
        }
      }
    ]);

    // Análisis por procedencia
    const procedencia = await Pedido.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$procedencia",
          cantidad: { $sum: 1 },
          monto_total: { $sum: "$total" },
          monto_adelantos: { $sum: "$adelanto" },
          monto_promedio: { $avg: "$total" },
          clientes_unicos: { $addToSet: "$cliente.nombre" }
        }
      },
      {
        $project: {
          procedencia: "$_id",
          cantidad: 1,
          monto_total: 1,
          monto_adelantos: 1,
          monto_promedio: { $round: ["$monto_promedio", 2] },
          cantidad_clientes_unicos: { $size: "$clientes_unicos" },
          _id: 0
        }
      },
      { $sort: { monto_total: -1 } }
    ]);

    // Cartera de pagos por método
    const carteraPorMetodo = await Pedido.aggregate([
      {
        $match: {
          ...matchStage,
          total_pendiente: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: "$metodo_pago",
          cantidad_pendiente: { $sum: 1 },
          monto_pendiente: { $sum: "$total_pendiente" },
          monto_pagado: {
            $sum: { $subtract: ["$total", "$total_pendiente"] }
          }
        }
      },
      {
        $project: {
          metodo_pago: "$_id",
          cantidad_pendiente: 1,
          monto_pendiente: 1,
          monto_pagado: 1,
          tasa_cobranza: {
            $multiply: [
              {
                $divide: [
                  "$monto_pagado",
                  { $add: ["$monto_pagado", "$monto_pendiente"] }
                ]
              },
              100
            ]
          },
          _id: 0
        }
      }
    ]);

    // Cartera de pagos por procedencia (origen del cliente)
    const carteraPorProcedencia = await Pedido.aggregate([
      {
        $match: {
          ...matchStage,
          total_pendiente: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: "$procedencia",
          cantidad_pendiente: { $sum: 1 },
          monto_pendiente: { $sum: "$total_pendiente" },
          monto_pagado: {
            $sum: { $subtract: ["$total", "$total_pendiente"] }
          }
        }
      },
      {
        $project: {
          procedencia: "$_id",
          cantidad_pendiente: 1,
          monto_pendiente: 1,
          monto_pagado: 1,
          tasa_cobranza: {
            $cond: [
              { $eq: [{ $add: ["$monto_pagado", "$monto_pendiente"] }, 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      "$monto_pagado",
                      { $add: ["$monto_pagado", "$monto_pendiente"] }
                    ]
                  },
                  100
                ]
              }
            ]
          },
          _id: 0
        }
      }
    ]);

    // Cálculos generales
    const totalIngresos = metodosPago.reduce((sum, item) => sum + item.monto_total, 0);
    const totalAdelantos = metodosPago.reduce((sum, item) => sum + item.monto_adelantos, 0);
    const totalPendiente = metodosPago.reduce((sum, item) => sum + item.monto_pendiente, 0);

    // Enriquecer métodos de pago con porcentajes
    const metodosPagoConPorcentaje = metodosPago.map((item: any) => ({
      ...item,
      porcentaje_del_total: totalIngresos > 0 ? parseFloat(((item.monto_total / totalIngresos) * 100).toFixed(2)) : 0
    }));

    // Enriquecer procedencia con porcentajes
    const procedenciaConPorcentaje = procedencia.map((item: any) => ({
      ...item,
      porcentaje_del_total: totalIngresos > 0 ? parseFloat(((item.monto_total / totalIngresos) * 100).toFixed(2)) : 0
    }));

    res.json({
      resumen_general: {
        total_ingresos: totalIngresos,
        total_adelantos: totalAdelantos,
        total_pendiente: totalPendiente,
        tasa_cobranza_global: totalIngresos > 0 ? parseFloat((((totalIngresos - totalPendiente) / totalIngresos) * 100).toFixed(2)) : 0,
        cantidad_pedidos: metodosPago.reduce((sum, item) => sum + item.cantidad, 0)
      },
      metodos_pago: metodosPagoConPorcentaje,
      procedencia: procedenciaConPorcentaje,
      cartera_por_metodo: carteraPorMetodo.map((item: any) => ({
        ...item,
        tasa_cobranza: parseFloat(item.tasa_cobranza.toFixed(2))
      })),
      cartera_por_procedencia: carteraPorProcedencia.map((item: any) => ({
        ...item,
        tasa_cobranza: parseFloat(item.tasa_cobranza.toFixed(2))
      })),
      periodo: { desde: desde_date, hasta: hasta_date }
    });
  } catch (error) {
    console.error("Error en Métodos de Pago & Procedencia:", error);
    res.status(500).json({ error: "Error al generar reporte de métodos de pago y procedencia" });
  }
};
