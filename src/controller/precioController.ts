import { Request, Response } from "express";
import Precio from "../models/precios.model";
import Modelo from "../models/modelosModel";
import Stock from "../models/stockModel";
import Pedido from "../models/pedidosModel";



export const getPreciosIdModelo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idModelo } = req.params;
    console.log(req.params)
    const precios = await Precio.find({ id_modelo: idModelo, activo: true });
    console.log(precios);
    res.status(200).json(precios);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los precios" });
  }
}

export const actualizarPrecios = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(req.params)
    const { idModelo } = req.params;
    const { precios } = req.body; // Array de precios a actualizar/crear

    if (!Array.isArray(precios)) {
      res.status(400).json({ message: "El campo 'precios' debe ser un array" });
      return;
    }

    const resultados = {
      actualizados: 0,
      creados: 0,
      errores: [] as string[]
    };

    // Procesar cada precio del array
    for (const precioData of precios) {
      try {
        if (precioData._id) {
          // Actualizar precio existente - solo campos permitidos
          const camposPermitidos = {
            es_base: precioData.es_base,
            nombre_precio: precioData.nombre_precio,
            costo: precioData.costo,
            porcentaje_ganancia: precioData.porcentaje_ganancia,
            porcentaje_tarjeta: precioData.porcentaje_tarjeta,
            total_redondeo: precioData.total_redondeo
          };

          // Filtrar campos undefined/null
          const camposActualizar = Object.fromEntries(
            Object.entries(camposPermitidos).filter(([_, value]) => value !== undefined && value !== null)
          );

          // Calcular precios si se actualizan campos que afectan el cálculo
          if (camposActualizar.costo !== undefined || camposActualizar.porcentaje_ganancia !== undefined ||
            camposActualizar.porcentaje_tarjeta !== undefined || camposActualizar.total_redondeo !== undefined) {

            // Obtener el precio actual para tener todos los valores
            const precioActual = await Precio.findById(precioData._id);
            if (precioActual) {
              const costo = camposActualizar.costo ?? precioActual.costo;
              const porcentaje_ganancia = camposActualizar.porcentaje_ganancia ?? precioActual.porcentaje_ganancia;
              const porcentaje_tarjeta = camposActualizar.porcentaje_tarjeta ?? precioActual.porcentaje_tarjeta;
              const total_redondeo = camposActualizar.total_redondeo ?? precioActual.total_redondeo;

              // Calcular nuevos precios
              const base = costo * (1 + porcentaje_ganancia / 100) + total_redondeo;
              const conTarjeta = base * (1 + porcentaje_tarjeta / 100);

              camposActualizar.precio = Number(base.toFixed(2));
              camposActualizar.precioTarjeta = Number(conTarjeta.toFixed(2));
            }
          }

          const precioActualizado = await Precio.findByIdAndUpdate(
            precioData._id,
            camposActualizar,
            { new: true, runValidators: true }
          );

          if (precioActualizado) {
            resultados.actualizados++;
          } else {
            resultados.errores.push(`No se encontró el precio con ID: ${precioData._id}`);
          }
        } else {
          // Crear nuevo precio - solo campos permitidos
          const nuevoPrecio = new Precio({

            nombre_precio: precioData.nombre_precio,
            costo: precioData.costo,
            porcentaje_ganancia: precioData.porcentaje_ganancia,
            porcentaje_tarjeta: precioData.porcentaje_tarjeta,
            total_redondeo: precioData.total_redondeo || 0,
            id_modelo: idModelo,
            es_base: precioData.es_base, // Por defecto no es base
            activo: true    // Por defecto activo
          });

          await nuevoPrecio.save();
          resultados.creados++;
        }
      } catch (error: any) {
        const mensajeError = error.code === 11000
          ? "Ya existe un precio base activo para este modelo"
          : error.message;
        resultados.errores.push(mensajeError);
      }
    }

    // Obtener todos los precios actualizados del modelo
    const preciosActualizados = await Precio.find({ id_modelo: idModelo });

    res.status(200).json({
      message: "Operación completada",
      resultados,
      precios: preciosActualizados
    });

  } catch (error) {
    console.error("Error en actualizarPrecios:", error);
    res.status(500).json({ message: "Error al actualizar los precios" });
  }
}

export const darBajaPrecio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idPrecio } = req.params;

    const precio = await Precio.findByIdAndUpdate(
      idPrecio,
      { activo: false },
      { new: true, runValidators: true }
    );

    if (!precio) {
      res.status(404).json({ message: "Precio no encontrado" });
      return;
    }

    res.status(200).json({
      message: "Precio dado de baja correctamente",
      precio
    });
  } catch (error) {
    console.error("Error en darBajaPrecio:", error);
    res.status(500).json({ message: "Error al dar de baja el precio" });
  }
}

// ========================= ENDPOINTS MASIVOS =========================

/**
 * Actualizar precios base masivamente por tipo de modelo
 * PUT /api/precios/masivo/actualizar
 */
export const actualizarPreciosMasivos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { producto, excluidos = [], actualizacion } = req.body;
    const isPreview = req.query.preview === 'true';

    // Validaciones básicas
    if (!producto || !actualizacion) {
      res.status(400).json({
        message: "Se requieren los campos 'producto' y 'actualizacion'"
      });
      return;
    }

    // Validar que al menos un campo de actualización esté presente
    const { costo, porcentaje_ganancia, porcentaje_tarjeta, total_redondeo } = actualizacion;
    if (costo === undefined && porcentaje_ganancia === undefined &&
      porcentaje_tarjeta === undefined && total_redondeo === undefined) {
      res.status(400).json({
        message: "Debe proporcionar al menos un campo para actualizar"
      });
      return;
    }

    // 1. Obtener todos los modelos del producto especificado
    const modelos = await Modelo.find({ producto: { $regex: `^${producto}$`, $options: 'i' } });

    if (modelos.length === 0) {
      res.status(404).json({
        message: `No se encontraron modelos del tipo "${producto}"`
      });
      return;
    }

    const resultados = {
      total_modelos: modelos.length,
      exitosos: 0,
      no_actualizados: 0,
      excluidos: 0,
      sin_precio_base: 0,
      actualizados: [] as any[],
      con_pedidos_activos: [] as any[],
      modelos_excluidos: [] as any[],
      sin_precio_base_lista: [] as any[]
    };

    // 2. Procesar cada modelo
    for (const modelo of modelos) {
      const modeloId = (modelo._id as any).toString();

      // Verificar si está en la lista de excluidos
      if (excluidos.includes(modeloId)) {
        resultados.excluidos++;
        resultados.modelos_excluidos.push({
          modelo: modelo.modelo,
          producto: modelo.producto,
          id: modeloId
        });
        continue;
      }

      // Obtener el stock asociado al modelo
      const stock = await Stock.findOne({ idModelo: modelo._id });

      if (!stock) {
        console.log(`⚠️ Modelo ${modelo.modelo} no tiene stock asociado`);
        continue;
      }

      // Verificar si tiene pedidos activos (estado !== "entregado")
      const tienePedidosActivos = stock.pedidos && stock.pedidos.some(
        (p: any) => p.estado !== "entregado"
      );

      if (tienePedidosActivos) {
        resultados.no_actualizados++;
        const pedidosActivos = stock.pedidos.filter((p: any) => p.estado !== "entregado");
        resultados.con_pedidos_activos.push({
          modelo: modelo.modelo,
          producto: modelo.producto,
          id: modeloId,
          pedidos_activos: pedidosActivos.map((p: any) => ({
            idPedido: p.idPedido,
            cantidad: p.cantidad,
            estado: p.estado
          }))
        });
        continue;
      }

      // Buscar el precio base activo del modelo
      const precioBase = await Precio.findOne({
        id_modelo: modelo._id,
        es_base: true,
        activo: true
      });

      if (!precioBase) {
        resultados.sin_precio_base++;
        resultados.sin_precio_base_lista.push({
          modelo: modelo.modelo,
          producto: modelo.producto,
          id: modeloId
        });
        continue;
      }

      // Guardar valores anteriores
      const precioAnterior = {
        costo: precioBase.costo,
        porcentaje_ganancia: precioBase.porcentaje_ganancia,
        porcentaje_tarjeta: precioBase.porcentaje_tarjeta,
        total_redondeo: precioBase.total_redondeo,
        precio: precioBase.precio,
        precioTarjeta: precioBase.precioTarjeta
      };

      // Actualizar con valores absolutos (solo los que se proporcionaron)
      const camposActualizar: any = {};

      if (costo !== undefined) camposActualizar.costo = costo;
      if (porcentaje_ganancia !== undefined) camposActualizar.porcentaje_ganancia = porcentaje_ganancia;
      if (porcentaje_tarjeta !== undefined) camposActualizar.porcentaje_tarjeta = porcentaje_tarjeta;
      if (total_redondeo !== undefined) camposActualizar.total_redondeo = total_redondeo;

      // Calcular nuevos precios con valores actualizados
      const costoFinal = camposActualizar.costo ?? precioBase.costo;
      const gananciaFinal = camposActualizar.porcentaje_ganancia ?? precioBase.porcentaje_ganancia;
      const tarjetaFinal = camposActualizar.porcentaje_tarjeta ?? precioBase.porcentaje_tarjeta;
      const redondeoFinal = camposActualizar.total_redondeo ?? precioBase.total_redondeo;

      const base = costoFinal * (1 + gananciaFinal / 100) + redondeoFinal;
      const conTarjeta = base * (1 + tarjetaFinal / 100);

      camposActualizar.precio = Number(base.toFixed(2));
      camposActualizar.precioTarjeta = Number(conTarjeta.toFixed(2));

      // Si es preview, NO actualizar
      if (!isPreview) {
        // Actualizar el precio
        const precioActualizado = await Precio.findByIdAndUpdate(
          precioBase._id,
          camposActualizar,
          { new: true, runValidators: true }
        );

        if (precioActualizado) {
          resultados.exitosos++;
          resultados.actualizados.push({
            modelo: modelo.modelo,
            producto: modelo.producto,
            id: modeloId,
            precio_anterior: precioAnterior,
            precio_nuevo: {
              costo: precioActualizado.costo,
              porcentaje_ganancia: precioActualizado.porcentaje_ganancia,
              porcentaje_tarjeta: precioActualizado.porcentaje_tarjeta,
              total_redondeo: precioActualizado.total_redondeo,
              precio: precioActualizado.precio,
              precioTarjeta: precioActualizado.precioTarjeta
            }
          });
        }
      } else {
        // Preview: simular el resultado
        resultados.exitosos++;
        resultados.actualizados.push({
          modelo: modelo.modelo,
          producto: modelo.producto,
          id: modeloId,
          precio_anterior: precioAnterior,
          precio_nuevo: {
            costo: costoFinal,
            porcentaje_ganancia: gananciaFinal,
            porcentaje_tarjeta: tarjetaFinal,
            total_redondeo: redondeoFinal,
            precio: camposActualizar.precio,
            precioTarjeta: camposActualizar.precioTarjeta
          }
        });
      }
    }

    res.status(200).json({
      message: isPreview ? "Vista previa generada" : "Actualización masiva de precios completada",
      preview: isPreview,
      producto,
      resumen: {
        total_modelos: resultados.total_modelos,
        exitosos: resultados.exitosos,
        no_actualizados: resultados.no_actualizados,
        excluidos: resultados.excluidos,
        sin_precio_base: resultados.sin_precio_base
      },
      detalles: {
        actualizados: resultados.actualizados,
        con_pedidos_activos: resultados.con_pedidos_activos,
        modelos_excluidos: resultados.modelos_excluidos,
        sin_precio_base: resultados.sin_precio_base_lista
      }
    });

  } catch (error) {
    console.error("Error en actualizarPreciosMasivos:", error);
    res.status(500).json({
      message: "Error al actualizar precios masivamente",
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear precio adicional (no base) masivamente por tipo de modelo
 * POST /api/precios/masivo/adicional
 */
export const crearPrecioAdicionalMasivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { producto, excluidos = [], nuevo_precio } = req.body;
    const isPreview = req.query.preview === 'true';

    // Validaciones básicas
    if (!producto || !nuevo_precio) {
      res.status(400).json({
        message: "Se requieren los campos 'producto' y 'nuevo_precio'"
      });
      return;
    }

    const { nombre_precio, costo, porcentaje_ganancia, porcentaje_tarjeta, total_redondeo } = nuevo_precio;

    if (!nombre_precio || costo === undefined || porcentaje_ganancia === undefined ||
      porcentaje_tarjeta === undefined) {
      res.status(400).json({
        message: "El nuevo_precio debe contener: nombre_precio, costo, porcentaje_ganancia y porcentaje_tarjeta"
      });
      return;
    }

    // 1. Obtener todos los modelos del producto especificado
    const modelos = await Modelo.find({ producto: { $regex: `^${producto}$`, $options: 'i' } });

    if (modelos.length === 0) {
      res.status(404).json({
        message: `No se encontraron modelos del tipo "${producto}"`
      });
      return;
    }

    const resultados = {
      total_modelos: modelos.length,
      exitosos: 0,
      no_creados: 0,
      excluidos: 0,
      precios_creados: [] as any[],
      con_pedidos_activos: [] as any[],
      modelos_excluidos: [] as any[],
      errores: [] as any[]
    };

    // 2. Procesar cada modelo
    for (const modelo of modelos) {
      const modeloId = (modelo._id as any).toString();

      try {
        // Verificar si está en la lista de excluidos
        if (excluidos.includes(modeloId)) {
          resultados.excluidos++;
          resultados.modelos_excluidos.push({
            modelo: modelo.modelo,
            producto: modelo.producto,
            id: modeloId
          });
          continue;
        }

        // Obtener el stock asociado al modelo
        const stock = await Stock.findOne({ idModelo: modelo._id });

        if (!stock) {
          console.log(`⚠️ Modelo ${modelo.modelo} no tiene stock asociado`);
          continue;
        }

        // Verificar si tiene pedidos activos (estado !== "entregado")
        const tienePedidosActivos = stock.pedidos && stock.pedidos.some(
          (p: any) => p.estado !== "entregado"
        );

        if (tienePedidosActivos) {
          resultados.no_creados++;
          const pedidosActivos = stock.pedidos.filter((p: any) => p.estado !== "entregado");
          resultados.con_pedidos_activos.push({
            modelo: modelo.modelo,
            producto: modelo.producto,
            id: modeloId,
            pedidos_activos: pedidosActivos.map((p: any) => ({
              idPedido: p.idPedido,
              cantidad: p.cantidad,
              estado: p.estado
            }))
          });
          continue;
        }

        // Crear el nuevo precio adicional
        if (!isPreview) {
          const nuevoPrecio = new Precio({
            id_modelo: modelo._id,
            nombre_precio,
            es_base: false, // No es precio base
            activo: true,
            costo,
            porcentaje_ganancia,
            porcentaje_tarjeta,
            total_redondeo: total_redondeo || 0
          });

          const precioGuardado = await nuevoPrecio.save();

          resultados.exitosos++;
          resultados.precios_creados.push({
            modelo: modelo.modelo,
            producto: modelo.producto,
            id: modeloId,
            nuevo_precio: {
              id_precio: precioGuardado._id,
              nombre_precio: precioGuardado.nombre_precio,
              costo: precioGuardado.costo,
              porcentaje_ganancia: precioGuardado.porcentaje_ganancia,
              porcentaje_tarjeta: precioGuardado.porcentaje_tarjeta,
              total_redondeo: precioGuardado.total_redondeo,
              precio: precioGuardado.precio,
              precioTarjeta: precioGuardado.precioTarjeta
            }
          });
        } else {
          // Preview: simular creación
          const base = costo * (1 + porcentaje_ganancia / 100) + (total_redondeo || 0);
          const conTarjeta = base * (1 + porcentaje_tarjeta / 100);

          resultados.exitosos++;
          resultados.precios_creados.push({
            modelo: modelo.modelo,
            producto: modelo.producto,
            id: modeloId,
            nuevo_precio: {
              nombre_precio,
              costo,
              porcentaje_ganancia,
              porcentaje_tarjeta,
              total_redondeo: total_redondeo || 0,
              precio: Number(base.toFixed(2)),
              precioTarjeta: Number(conTarjeta.toFixed(2))
            }
          });
        }

      } catch (error) {
        resultados.errores.push({
          modelo: modelo.modelo,
          producto: modelo.producto,
          id: modeloId,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    res.status(201).json({
      message: isPreview ? "Vista previa generada" : "Creación masiva de precios adicionales completada",
      preview: isPreview,
      producto,
      resumen: {
        total_modelos: resultados.total_modelos,
        exitosos: resultados.exitosos,
        no_creados: resultados.no_creados,
        excluidos: resultados.excluidos,
        errores: resultados.errores.length
      },
      detalles: {
        precios_creados: resultados.precios_creados,
        con_pedidos_activos: resultados.con_pedidos_activos,
        modelos_excluidos: resultados.modelos_excluidos,
        errores: resultados.errores
      }
    });

  } catch (error) {
    console.error("Error en crearPrecioAdicionalMasivo:", error);
    res.status(500).json({
      message: "Error al crear precios adicionales masivamente",
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};