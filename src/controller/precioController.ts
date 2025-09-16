import { Request, Response } from "express";
import Precio from "../models/precios.model";



export const getPreciosIdModelo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idModelo } = req.params;
    console.log(req.params)
    const precios = await Precio.find({ id_modelo: idModelo });
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
