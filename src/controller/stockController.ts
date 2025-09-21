import { Request, Response } from "express";
import Stock from "../models/stockModel";
import Produccion from "../models/produccionModel";
import Pedido from "../models/pedidosModel";
import Modelos from "../models/modelosModel";
import Precio from "../models/precios.model";
import { registrarMovimiento } from "../utils/movimientosStock";
export const getAllStocks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Obtener solo los stocks que tienen stockActivo true
    const stocks = await Stock.find({ stockActivo: true }).lean();

    // Obtener todos los modelos en un solo query para reducir consultas
    const modelos = await Modelos.find(
      {},
      { _id: 1, placas_por_metro: 1 }
    ).lean();
    const modeloMap = new Map(
      modelos.map((m) => [m._id.toString(), m.placas_por_metro])
    );

    // Obtener información de pedidos para completar datos faltantes
    const pedidosIds = new Set();
    stocks.forEach(stock => {
      if (stock.pedidos) {
        stock.pedidos.forEach((pedido: any) => {
          pedidosIds.add(pedido.idPedido.toString());
        });
      }
    });

    // Obtener información de pedidos en una sola consulta
    const pedidosInfo = await Pedido.find(
      { _id: { $in: Array.from(pedidosIds) } },
      { _id: 1, remito: 1, "cliente.nombre": 1 }
    ).lean();

    const pedidosMap = new Map();
    pedidosInfo.forEach(pedido => {
      pedidosMap.set(pedido._id.toString(), {
        remito: pedido.remito,
        cliente: pedido.cliente?.nombre || "Sin cliente"
      });
    });

    // Añadir la propiedad metros_cuadrados, información de reserva y precio base a cada stock
    const stocksConMetrosCuadrados = await Promise.all(stocks.map(async (stock) => {
      const placasPorMetro = modeloMap.get(stock.idModelo?.toString()) || 1; // Evita dividir por 0

      // Buscar el precio base para este modelo específico
      const precioBase = await Precio.findOne({
        id_modelo: stock.idModelo,
        es_base: true,
        activo: true
      }).lean();

      // Calcular stock reservado usando la propiedad pedidos del Stock
      const stockReservado: {
        total_reservado: number;
        pedidos: Array<{
          idPedido: any;
          cantidad: number;
          cantidad_placas: number;
          remito: string;
          cliente: string;
          estado: string;
        }>;
      } = {
        total_reservado: 0,
        pedidos: []
      };

      if (stock.pedidos && stock.pedidos.length > 0) {
        // Filtrar pedidos por estado
        const pedidosPendientes = stock.pedidos.filter((pedido: any) =>
          pedido.estado === "pendiente"
        );
        const pedidosReservados = stock.pedidos.filter((pedido: any) =>
          pedido.estado === "reservado"
        );

        // Usar los campos del modelo en lugar de calcular
        stockReservado.total_reservado = stock.reservado || 0;

        // Formatear pedidos con información completa (todos los pedidos activos)
        const todosLosPedidos = [...pedidosPendientes, ...pedidosReservados];
        stockReservado.pedidos = todosLosPedidos.map((pedido: any) => {
          const pedidoInfo = pedidosMap.get(pedido.idPedido.toString()) || {
            remito: "Sin remito",
            cliente: "Sin cliente"
          };

          return {
            idPedido: pedido.idPedido,
            cantidad: pedido.cantidad,
            cantidad_placas: pedido.cantidad, // Ya viene calculada en cantidad
            remito: pedidoInfo.remito,
            cliente: pedidoInfo.cliente,
            estado: pedido.estado
          };
        });
      }

      return {
        ...stock,
        metros_cuadrados: stock.stock / placasPorMetro,
        total_reservado: stockReservado.total_reservado,
        stock_reservado: stockReservado,
        precio_base: precioBase?.precio || 0
      };
    }));

    res.json(stocksConMetrosCuadrados);
  } catch (error) {
    console.error("❌ Error al obtener los stocks:", error);
    res.status(500).json({ message: "Error al obtener los stocks", error });
  }
};

export const getAllStocksImportacion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Obtener el idVendedor de los parámetros de la solicitud
    const { idVendedor } = req.params;

    // Validar que se proporcione un idVendedor
    if (!idVendedor) {
      res
        .status(400)
        .json({ message: "El parámetro idVendedor es obligatorio" });
      return;
    }

    // Validar el formato del idVendedor
    if (!idVendedor.match(/^[0-9a-fA-F]{24}$/)) {
      res
        .status(400)
        .json({ message: "El idVendedor proporcionado no es válido" });
      return;
    }

    // Obtener los stocks de la base de datos
    const stocks = await Stock.find({}, { modelo: 1, _id: 1, idModelo: 1 }); // Selecciona solo modelo y _id

    // Agregar el campo idVendedor a cada registro
    const stocksConVendedor = stocks.map((stock) => ({
      ...stock.toObject(), // Convertir el documento a un objeto plano
      idVendedor, // Agregar el campo idVendedor
    }));

    // Enviar la respuesta
    res.json(stocksConVendedor);
  } catch (error) {
    console.error("Error al obtener los stocks:", error);
    res.status(500).json({ message: "Error al obtener los stocks", error });
  }
};

export const refrescar = async (req: Request, res: Response): Promise<void> => {
  try {
    // Se espera que en el body se envíe el objeto de stock con al menos _id e idModelo
    const stockData = req.body;
    if (!stockData._id || !stockData.idModelo) {
      res.status(400).json({
        message:
          "Se requiere el _id y el idModelo en el cuerpo de la solicitud",
      });
      return;
    }

    // Se obtiene el modelo para acceder a la propiedad placas_por_metro
    const modelo = await Modelos.findById(stockData.idModelo);
    if (!modelo || !modelo.placas_por_metro) {
      res.status(400).json({
        message:
          "No se pudo determinar el valor de placas_por_metro para el modelo especificado",
      });
      return;
    }

    // Llamar a la función que valida y actualiza los pedidos pendientes para este stock
    // await validarPedidosConStock(stockData._id, modelo.placas_por_metro); // Comentado porque usa propiedades que no existen

    res.json({
      message: `Stock refrescado exitosamente para el idStock ${stockData._id}`,
    });
  } catch (error) {
    console.error("Error al refrescar stock:", error);
    res.status(500).json({ message: "Error al refrescar stock", error });
  }
};

export const createStock = async (req: Request, res: Response) => {
  try {
    console.log("Datos recibidos:", req.body); // ✅ Verifica los datos que llegan al backend

    // Filtrar y preparar los datos para el modelo
    const stockData = {
      ...req.body,
      // Eliminar cantidad_actual ya que no existe en la interfaz IStock
      cantidad_actual: undefined,
      // Añadir total_redondeo por defecto si no se proporciona
      total_redondeo: req.body.total_redondeo || 0,
    };

    const newStock = new Stock(stockData);
    await newStock.save();

    res
      .status(201)
      .json({ message: "Stock creado con éxito", stock: newStock });
  } catch (error: any) {
    console.error("Error al crear el stock:", error);
    res
      .status(400)
      .json({ message: "Error al crear el stock", error: error.message }); // ✅ Envía el mensaje exacto del error
  }
};

export const getStockById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      res.status(404).json({ message: "Stock no encontrado" });
      return;
    }
    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el stock", error });
  }
};

export const updateStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Datos recibidos:", req.body); // ✅ Verifica los datos que llegan al backend

    // Obtener el stock actual para calcular diferencias
    const stockAnterior = await Stock.findById(req.params.id);
    if (!stockAnterior) {
      res.status(404).json({ message: "Stock no encontrado" });
      return;
    }

    // ✅ Si stockActivo viene false, cambiarlo a true
    const updateData = { ...req.body };
    if (updateData.stockActivo === false) {
      updateData.stockActivo = true;
      console.log("🔄 Stock activado automáticamente de false a true");
    }

    const updatedStock = await Stock.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedStock) {
      res.status(404).json({ message: "Stock no encontrado" });
      return;
    }

    // ✅ Registrar movimiento si hay cambio en el stock
    if (req.body.stock !== undefined && req.body.stock !== stockAnterior.stock) {
      const diferenciaStock = req.body.stock - stockAnterior.stock;
      if (diferenciaStock !== 0) {
        await registrarMovimiento({
          idStock: req.params.id,
          idModelo: updatedStock.idModelo?.toString() || "",
          tipo_movimiento: diferenciaStock > 0 ? "produccion" : "ajuste",
          cantidad: diferenciaStock,
          responsable: "Sistema",
          motivo: diferenciaStock > 0
            ? "Incremento de stock manual"
            : "Decremento de stock manual",
          req: req
        });
      }
    }

    res.json({ message: "Stock actualizado con éxito", stock: updatedStock });
  } catch (error) {
    res.status(400).json({ message: "Error al actualizar el stock", error });
  }
};

export const deleteStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deletedStock = await Stock.findByIdAndDelete(req.params.id);
    if (!deletedStock) {
      res.status(404).json({ message: "Stock no encontrado" });
      return;
    }
    res.json({ message: "Stock eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el stock", error });
  }
};

// Funciones para manejar producción
export const agregarProduccion = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { idStock, cantidad, responsable } = req.body;

  try {
    // Validar datos requeridos
    if (!idStock || cantidad === undefined || !responsable) {
      res.status(400).json({ message: "Faltan datos requeridos: idStock, cantidad, responsable" });
      return;
    }

    // Verificar que el stock existe
    const stock = await Stock.findById(idStock);
    if (!stock) {
      res.status(404).json({ message: "Stock no encontrado" });
      return;
    }

    // Agregar la producción
    const nuevaProduccion = await Produccion.create({
      idStock,
      fecha: new Date(),
      cantidad,
      responsable,
    });

    // Actualizar el stock
    await Stock.findByIdAndUpdate(
      idStock,
      { $inc: { stock: cantidad } },
      { new: true }
    );

    // ✅ Evaluar pedidos pendientes después del incremento
    await evaluarPedidosPendientes(idStock);

    res.status(201).json({
      message: "Producción registrada correctamente",
      produccion: nuevaProduccion,
    });
  } catch (error) {
    console.error("Error al agregar producción:", error);
    res.status(500).json({ message: "Error al agregar producción", error });
  }
};

export const registrarEntrega = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { idStock, cantidadEntregada, responsable } = req.body;

  try {
    // Validar datos requeridos
    if (!idStock || cantidadEntregada === undefined || !responsable) {
      res.status(400).json({ message: "Faltan datos requeridos: idStock, cantidadEntregada, responsable" });
      return;
    }

    // Verificar que el stock existe y tiene suficiente cantidad
    const stock = await Stock.findById(idStock);
    if (!stock) {
      res.status(404).json({ message: "Stock no encontrado" });
      return;
    }

    if (stock.stock < cantidadEntregada) {
      res.status(400).json({ message: "Stock insuficiente para la entrega" });
      return;
    }

    // Registrar la entrega como producción negativa
    const entregaProduccion = await Produccion.create({
      idStock,
      fecha: new Date(),
      cantidad: -cantidadEntregada, // Cantidad negativa para indicar salida
      responsable,
    });

    // Actualizar el stock
    const stockActualizado = await Stock.findByIdAndUpdate(
      idStock,
      { $inc: { stock: -cantidadEntregada } },
      { new: true }
    );

    res.status(200).json({
      message: "Entrega registrada correctamente",
      stock: stockActualizado,
      produccion: entregaProduccion,
    });
  } catch (error) {
    console.error("Error al registrar entrega:", error);
    res.status(500).json({ message: "Error al registrar entrega", error });
  }
};

export const obtenerProduccionesPorStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { idStock } = req.params;

  try {
    // Validar que el stock existe
    const stock = await Stock.findById(idStock);
    if (!stock) {
      res.status(404).json({ message: "Stock no encontrado" });
      return;
    }

    const producciones = await Produccion.find({ idStock }).sort({ fecha: -1 });
    res.status(200).json(producciones);
  } catch (error) {
    console.error("Error al obtener producciones:", error);
    res.status(500).json({ message: "Error al obtener producciones", error });
  }
};
// Función para evaluar pedidos pendientes y cambiarlos a reservado si hay stock suficiente
const evaluarPedidosPendientes = async (idStock: string): Promise<void> => {
  try {
    // Obtener el stock actualizado
    const stock = await Stock.findById(idStock);
    if (!stock) return;

    // Obtener pedidos pendientes para este stock
    const pedidosPendientes = stock.pedidos.filter((pedido: any) =>
      pedido.estado === "pendiente"
    );

    if (pedidosPendientes.length === 0) return;

    // Calcular stock disponible (total - reservado)
    const stockDisponible = stock.stock - stock.reservado;

    // Procesar cada pedido pendiente
    let stockDisponibleActual = stockDisponible; // Variable para ir restando

    for (const pedidoPendiente of pedidosPendientes) {
      if (stockDisponibleActual >= pedidoPendiente.cantidad) {
        // ✅ Hay suficiente stock - cambiar a reservado

        // Actualizar el stock: incrementar reservado y cambiar estado del pedido
        await Stock.findByIdAndUpdate(
          idStock,
          {
            $inc: { reservado: pedidoPendiente.cantidad },
            $set: {
              "pedidos.$[elem].estado": "reservado"
            }
          },
          {
            arrayFilters: [{ "elem.idPedido": pedidoPendiente.idPedido }],
            new: true
          }
        );

        // Actualizar el estado_stock en el pedido
        await Pedido.updateOne(
          {
            _id: pedidoPendiente.idPedido,
            "productos.idStock": idStock
          },
          {
            $set: { "productos.$.estado_stock": "Disponible" }
          }
        );

        // ✅ Restar la cantidad reservada del stock disponible
        stockDisponibleActual -= pedidoPendiente.cantidad;

        console.log(`🟢 Pedido ${pedidoPendiente.idPedido} cambiado a RESERVADO para stock ${idStock} (Stock restante: ${stockDisponibleActual})`);
      } else {
        console.log(`🔴 Pedido ${pedidoPendiente.idPedido} no puede ser reservado - Stock insuficiente (Necesita: ${pedidoPendiente.cantidad}, Disponible: ${stockDisponibleActual})`);
      }
    }
  } catch (error) {
    console.error("Error al evaluar pedidos pendientes:", error);
  }
};

export const actualizarStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { idStock, cantidad, responsable } = req.body;

    if (!idStock || cantidad === undefined || !responsable) {
      res.status(400).json({ message: "Faltan datos requeridos: idStock, cantidad, responsable" });
      return;
    }

    // Obtener el stock actual
    const stock = await Stock.findById(idStock);
    if (!stock) {
      res.status(404).json({ message: `Stock con ID ${idStock} no encontrado` });
      return;
    }

    // Crear la fecha en formato DD/MM/AAAA HH:MM
    const fecha = new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Crear el registro de producción
    const nuevaProduccion = await Produccion.create({
      idStock: idStock,
      fecha: fecha,
      cantidad: cantidad,
      responsable: responsable
    });

    // ✅ Preparar la actualización del stock
    const updateData: any = { $inc: { stock: cantidad } };

    // ✅ Si el stock está desactivado, activarlo
    if (!stock.stockActivo) {
      updateData.$set = { stockActivo: true };
      console.log("🔄 Stock activado automáticamente al añadir cantidad");
    }

    // Actualizar el stock
    const stockActualizado = await Stock.findByIdAndUpdate(
      idStock,
      updateData,
      { new: true }
    );

    // ✅ Evaluar pedidos pendientes después del incremento
    await evaluarPedidosPendientes(idStock);

    res.status(200).json({
      message: "Stock actualizado correctamente",
      stock: stockActualizado,
      produccion: nuevaProduccion,
      fecha_formateada: fechaFormateada
    });

  } catch (error) {
    console.error("Error al actualizar el stock:", error);
    res.status(500).json({ message: "Error al actualizar el stock", error });
  }
};
/*
export const bulkCreateStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Función comentada porque usa propiedades que no existen en la interfaz
};

export const validarPedidosConStock = async (
  idStock: any,
  placasPorMetro: number
): Promise<void> => {
  // Función comentada porque usa propiedades que no existen en la interfaz
};
*/
