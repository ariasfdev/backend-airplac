import type { Request, Response } from "express"
import Pedido from "../models/pedidosModel"
import Stock from "../models/stockModel" // Modelo para el stock
import Modelos from "../models/modelosModel" // Modelo para los modelos
import path from "path"
import fs from "fs"

// Función para evaluar pedidos pendientes y cambiarlos a reservado si hay stock suficiente
const evaluarPedidosPendientes = async (idStock: string): Promise<void> => {
  try {
    // Obtener el stock actualizado
    const stock = await Stock.findById(idStock)
    if (!stock) return

    // Obtener pedidos pendientes para este stock
    const pedidosPendientes = stock.pedidos.filter((pedido: any) => pedido.estado === "pendiente")

    if (pedidosPendientes.length === 0) return

    // Calcular stock disponible (total - reservado)
    const stockDisponible = stock.stock - stock.reservado

    // Procesar cada pedido pendiente
    let stockDisponibleActual = stockDisponible // Variable para ir restando

    for (const pedidoPendiente of pedidosPendientes) {
      if (stockDisponibleActual >= pedidoPendiente.cantidad) {
        // ✅ Hay suficiente stock - cambiar a reservado

        // Actualizar el stock: incrementar reservado y cambiar estado del pedido
        await Stock.findByIdAndUpdate(
          idStock,
          {
            $inc: { reservado: pedidoPendiente.cantidad },
            $set: {
              "pedidos.$[elem].estado": "reservado",
            },
          },
          {
            arrayFilters: [{ "elem.idPedido": pedidoPendiente.idPedido }],
            new: true,
          },
        )

        // Actualizar el estado_stock en el pedido usando la nueva referencia
        await Pedido.updateOne(
          {
            _id: pedidoPendiente.idPedido,
            "productos.idStock": idStock,
          },
          {
            $set: { "productos.$.estado_stock": "Disponible" },
          },
        )

        // ✅ Restar la cantidad reservada del stock disponible
        stockDisponibleActual -= pedidoPendiente.cantidad

        console.log(
          `🟢 Pedido ${pedidoPendiente.idPedido} cambiado a RESERVADO para stock ${idStock} (Stock restante: ${stockDisponibleActual})`,
        )
      } else {
        // ✅ Si no hay stock suficiente, asegurar que el estado sea "pendiente"
        await Pedido.updateOne(
          {
            _id: pedidoPendiente.idPedido,
            "productos.idStock": idStock,
          },
          {
            $set: { "productos.$.estado_stock": "Pendiente" },
          },
        )

        console.log(
          `🔴 Pedido ${pedidoPendiente.idPedido} no puede ser reservado - Stock insuficiente (Necesita: ${pedidoPendiente.cantidad}, Disponible: ${stockDisponibleActual}) - Estado cambiado a PENDIENTE`,
        )
      }
    }
  } catch (error) {
    console.error("Error al evaluar pedidos pendientes:", error)
  }
}
//import { validarPedidosConStock } from "./stockController";

export const getPedidos = async (req: Request, res: Response): Promise<void> => {
  try {
    const pedidos = await Pedido.aggregate([
      { $unwind: "$productos" },

      {
        $lookup: {
          from: "Modelos",
          localField: "productos.idModelo",
          foreignField: "_id",
          as: "modeloInfo",
        },
      },
      { $unwind: { path: "$modeloInfo", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "Stock",
          localField: "productos.idStock",
          foreignField: "_id",
          as: "stockInfo",
        },
      },
      { $unwind: { path: "$stockInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "Precios",
          localField: "productos.id_precio",
          foreignField: "_id",
          as: "precioInfo",
        },
      },
      { $unwind: { path: "$precioInfo", preserveNullAndEmptyArrays: true } },

      {
        $group: {
          _id: "$_id",
          remito: { $first: "$remito" },
          fecha_pedido: { $first: "$fecha_pedido" },
          fecha_entrega_estimada: { $first: "$fecha_entrega_estimada" },
          demora_calculada: { $first: "$demora_calculada" },
          cliente: { $first: "$cliente" },
          estado: { $first: "$estado" },
          metodo_pago: { $first: "$metodo_pago" },
          procedencia: { $first: "$procedencia" },
          flete: { $first: "$flete" },
          descuento: { $first: "$descuento" },
          adelanto: { $first: "$adelanto" },
          adicional: { $first: "$adicional" },
          total: { $first: "$total" },
          total_pendiente: { $first: "$total_pendiente" },
          valor_instalacion: { $first: "$valor_instalacion" },
          remitos: { $first: "$remitos" },
          comentario_cliente: { $first: "$comentario_cliente" },
          tipo: { $first: "$tipo" }, // <-- Asegura que el campo tipo se incluya aquí
          productos: {
            $push: {
              idStock: "$productos.idStock",
              idModelo: "$productos.idModelo",
              cantidad: "$productos.cantidad",
              unidad: "$productos.unidad",
              materiales: "$productos.materiales",
              materiales_sueltos: "$productos.materiales_sueltos",
              estado_stock: "$productos.estado_stock",
              comentario_producto: "$productos.comentario_producto",
              modelo: "$modeloInfo.modelo",
              descripcion_modelo: "$modeloInfo.descripcion",
              categoria_modelo: "$modeloInfo.categoria",
              placas_por_metro: "$modeloInfo.placas_por_metro",

              producto: "$stockInfo.producto",
              stock_actual: "$stockInfo.cantidad_actual",
              unidad_stock: "$stockInfo.unidad",
              produccion_diaria: "$stockInfo.produccion_diaria",
              actualizaciones: "$stockInfo.actualizaciones",

              valor_m2: "$stockInfo.valor_m2",
              promo1: "$stockInfo.promo1",
              promo2: "$stockInfo.promo2",
              promo3: "$stockInfo.promo3",
              porcentaje_ganancia: "$stockInfo.porcentaje_ganancia",
              total_redondeo: "$stockInfo.total_redondeo",
              porcentaje_tarjeta: "$stockInfo.porcentaje_tarjeta",

              valor: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$productos.materiales", "promo1"],
                      },
                      then: "$stockInfo.promo1",
                    },
                    {
                      case: { $eq: ["$productos.materiales", "promo2"] },
                      then: "$stockInfo.promo2",
                    },
                    {
                      case: {
                        $eq: ["$productos.materiales", "promo3"],
                      },
                      then: "$stockInfo.promo3",
                    },
                  ],
                  default: "$stockInfo.valor_m2",
                },
              },
              nombre_precio: "$precioInfo.nombre_precio",
              id_precio: "$productos.id_precio", // <-- Agregado aquí
            },
          },
        },
      },
    ])

    const pedidosFormateados = await Promise.all(
      pedidos.map(async (pedido) => {
        const primerProducto = pedido.productos[0]

        // Mapear productos y agregar preciosModelo
        const productosConPrecios = await Promise.all(
          pedido.productos.map(async (prod: any) => {
            // Buscar todos los precios del modelo
            let preciosModelo = []
            try {
              preciosModelo = await require("../models/precios.model").default.find({ id_modelo: prod.idModelo })
            } catch (e) {
              preciosModelo = []
            }
            return {
              ...prod,
              preciosModelo,
            }
          }),
        )

        return {
          id: pedido._id,
          remito: pedido.remito,
          fecha: pedido.fecha_pedido?.toISOString().split("T")[0] || "",
          año: new Date(pedido.fecha_pedido).getFullYear().toString(),
          cliente: pedido.cliente?.nombre || "",
          direccion: pedido.cliente?.direccion || "",
          contacto: pedido.cliente?.contacto || "",
          comentario_cliente: pedido.comentario_cliente || "",
          detalle: primerProducto?.modelo || "Sin modelo",
          cantidadM2: primerProducto?.cantidad || 0,
          materiales: primerProducto?.materiales || "Sin materiales",
          valor: `$${primerProducto && !isNaN(primerProducto.valor) ? primerProducto.valor.toFixed(2) : "0.00"}`,

          porcentaje_ganancia: primerProducto?.porcentaje_ganancia || 0,
          porcentaje_tarjeta: primerProducto?.porcentaje_tarjeta || 0,
          total_redondeo: primerProducto?.total_redondeo || 0,

          pago: pedido.metodo_pago,
          procedencia: pedido.procedencia,
          flete: pedido.flete || "",
          seña: pedido.adelanto || "",
          adicional: pedido.adicional || "",
          descuento: pedido.descuento || "",
          total: pedido.total,
          total_pendiente: pedido.total_pendiente,
          valor_instalacion: pedido.valor_instalacion,
          estado: pedido.estado,

          // ✅ Solo estado_stock del primer producto
          disponible: primerProducto?.estado_stock || "pendiente",

          masDeUnProducto: pedido.productos.length > 1,

          productos: productosConPrecios,
          tipo: pedido.tipo || "pedido", // <-- Ahora sí se respeta el valor real
        }
      }),
    )

    res.status(200).json(pedidosFormateados)
  } catch (error) {
    console.error("Error al obtener los pedidos:", error)
    res.status(500).json({ message: "Error al obtener los pedidos", error })
  }
}

export const createPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      remito,
      vendedor_id,
      cliente,
      productos,
      estado,
      fecha_pedido,
      fecha_entrega_estimada,
      demora_calculada,
      metodo_pago,
      procedencia,
      flete,
      descuento,
      adelanto,
      adicional,
      total,
      total_pendiente,
      valor_instalacion,
      tipo, // <-- nuevo campo
    } = req.body

    // 1️⃣ Crear el pedido con estado_stock "pendiente" por defecto
    const productosConEstado = productos.map((prod: any) => ({
      ...prod,
      estado_stock: "pendiente", // Estado por defecto
    }))
    console.log(productosConEstado)

    const nuevoPedido = new Pedido({
      remito,
      vendedor_id,
      cliente,
      productos: productosConEstado,
      estado,
      estado_stock: "pendiente", // mantenemos por compatibilidad pero ya no es usado
      fecha_pedido,
      fecha_entrega_estimada,
      demora_calculada,
      metodo_pago,
      procedencia,
      flete,
      descuento,
      adelanto,
      adicional,
      total,
      total_pendiente,
      valor_instalacion,
      tipo: tipo || "pedido", // default pedido
    })

    const pedidoGuardado = await nuevoPedido.save()

    // Solo afectar stock si es pedido
    if ((tipo || "pedido") === "pedido") {
      for (const prod of productos) {
        const stock = await Stock.findById(prod.idStock)
        const modelo = await Modelos.findById(prod.idModelo)

        if (stock && modelo && modelo.placas_por_metro) {
          const cantidadNecesaria = prod.cantidad * modelo.placas_por_metro
          const stockTotal = stock.stock || 0

          // Calcular stock reservado por pedidos pendientes
          const stockReservado = stock.pedidos
            ? stock.pedidos
                .filter((pedido: any) => pedido.estado === "reservado" || pedido.estado === "pendiente")
                .reduce((total: number, pedido: any) => total + (pedido.cantidad || 0), 0)
            : 0

          // Stock realmente disponible = stock total - stock reservado
          const stockDisponible = stockTotal - stockReservado

          if (stockDisponible >= cantidadNecesaria) {
            // ✅ Stock disponible - Actualizar estado a "reservado"
            await Pedido.updateOne(
              {
                _id: pedidoGuardado._id,
                "productos.idStock": prod.idStock,
              },
              {
                $set: { "productos.$.estado_stock": "Disponible" },
              },
            )

            // Actualizar el stock: incrementar reservado y agregar al array pedidos
            await Stock.findByIdAndUpdate(prod.idStock, {
              $inc: { reservado: cantidadNecesaria },
              $push: {
                pedidos: {
                  idPedido: pedidoGuardado._id,
                  cantidad: cantidadNecesaria,
                  estado: "reservado",
                },
              },
            })

            console.log(
              `🟢 Stock reservado para idStock ${prod.idStock}: ${stockDisponible} >= ${cantidadNecesaria} (Total: ${stockTotal}, Reservado: ${stockReservado})`,
            )
          } else {
            // 🔴 Stock insuficiente - Mantener estado "pendiente"

            // Actualizar el stock: incrementar pendiente y agregar al array pedidos
            await Stock.findByIdAndUpdate(prod.idStock, {
              $inc: { pendiente: cantidadNecesaria },
              $push: {
                pedidos: {
                  idPedido: pedidoGuardado._id,
                  cantidad: cantidadNecesaria,
                  estado: "pendiente",
                },
              },
            })

            console.log(
              `🔴 Stock pendiente para idStock ${prod.idStock}: ${stockDisponible} < ${cantidadNecesaria} (Total: ${stockTotal}, Reservado: ${stockReservado})`,
            )
          }

          console.log(
            `📦 Reserva agregada al stock ${prod.idStock}: ${cantidadNecesaria} unidades para pedido ${pedidoGuardado.remito}`,
          )
        }
      }
    }

    // 3️⃣ Obtener el pedido actualizado con los estados finales
    const pedidoFinal = await Pedido.findById(pedidoGuardado._id)

    res.status(201).json(pedidoFinal)
  } catch (error) {
    console.error("❌ Error al crear el pedido:", error)
    res.status(500).json({ message: "Error al crear el pedido", error })
  }
}

export const uploadRemito = async (req: Request, res: Response): Promise<void> => {
  try {
    const pedido: any = await Pedido.findById(req.params.id)
    if (!pedido) {
      res.status(404).json({ message: "Pedido no encontrado" })
      return
    }

    pedido.remitos.push({ url: `/uploads/remitos/${req.file?.filename}` })

    // ✅ Cambiar el estado a "remitado"
    pedido.estado = "remitado"

    await pedido.save()
    console.log("Remito subido y estado actualizado a 'remitado'", req.file?.filename)

    res.status(200).json({ message: "Remito subido con éxito", remito: req.file?.filename })
  } catch (error) {
    console.log("Error al subir el remito", error)
    res.status(500).json({ message: "Error al subir el remito", error })
  }
}

export const getRemito = (req: Request, res: Response): void => {
  const filePath = path.resolve(__dirname, "../../uploads/remitos", req.params.filename)

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath)
  } else {
    console.error(`Archivo no encontrado: ${filePath}`)
    res.status(404).json({ message: "Archivo no encontrado" })
  }
}

export const cambiarEstadoAEntregado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const pedido = await Pedido.findById(id)
    if (!pedido) {
      res.status(404).json({ message: "Pedido no encontrado" })
      return
    }

    const estadosPermitidos = ["retira", "enviar", "instalacion"]
    if (!estadosPermitidos.includes(pedido.estado)) {
      res.status(400).json({
        message: "El pedido no está en un estado que permita el cambio a 'entregado'",
      })
      return
    }

    // ✅ Procesar cada producto del pedido
    for (const producto of pedido.productos) {
      const modelo = await Modelos.findById(producto.idModelo)
      if (!modelo || !modelo.placas_por_metro) {
        console.warn(`⚠ No se encontró modelo o placas_por_metro no es válido para idModelo: ${producto.idModelo}`)
        continue
      }

      const cantidadRealEntregada = producto.cantidad * modelo.placas_por_metro

      // ✅ Actualizar el Stock: decrementar stock y reservado, eliminar del array pedidos
      const stockActualizado = await Stock.findByIdAndUpdate(
        producto.idStock,
        {
          $inc: {
            stock: -cantidadRealEntregada,
            reservado: -cantidadRealEntregada,
          },
          $pull: {
            pedidos: {
              idPedido: pedido._id,
            },
          },
        },
        { new: true },
      )

      if (!stockActualizado) {
        console.warn(`⚠ No se encontró stock con ID: ${producto.idStock}`)
        continue
      }

      // ✅ Cambiar estado_stock del producto a "entregado"
      await Pedido.updateOne(
        {
          _id: pedido._id,
          "productos.idStock": producto.idStock,
        },
        {
          $set: { "productos.$.estado_stock": "entregado" },
        },
      )

      console.log(`📦 Stock actualizado para idStock ${producto.idStock}:`)
      console.log(`   - ${cantidadRealEntregada} unidades restadas del stock.`)
      console.log(`   - ${cantidadRealEntregada} unidades restadas del reservado.`)
      console.log(`   - Pedido eliminado del array pedidos.`)
    }

    // ✅ Obtener el pedido actualizado
    const pedidoActualizado = await Pedido.findById(pedido._id)

    res.status(200).json({
      message: "Productos entregados, stock actualizado correctamente.",
      pedido: pedidoActualizado,
    })
  } catch (error) {
    console.error("❌ Error al cambiar el estado:", error)
    res.status(500).json({ message: "Error al cambiar el estado", error })
  }
}

export const updatePedido = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const updates = req.body

  try {
    console.log("🔍 === DEBUG UPDATE PEDIDO ===")
    console.log("📋 ID del pedido:", id)
    console.log("📦 Datos recibidos del frontend:", JSON.stringify(updates, null, 2))

    // Se busca el pedido existente para obtener la cantidad anterior
    const pedidoExistente = await Pedido.findById(id)
    if (!pedidoExistente) {
      console.error("❌ Pedido no encontrado con ID:", id)
      res.status(404).json({ message: "Pedido no encontrado" })
      return
    }

    console.log("📋 Pedido existente encontrado:", {
      id: pedidoExistente._id,
      remito: pedidoExistente.remito,
      productos: pedidoExistente.productos.map((p: any) => ({
        idStock: p.idStock,
        idModelo: p.idModelo,
        cantidad: p.cantidad,
        estado_stock: p.estado_stock,
      })),
    })

    // Detectar cambio de presupuesto a pedido
    const tipoPedidoAnterior = pedidoExistente.tipo || "pedido";
    const tipoPedidoNuevo = updates.tipo || tipoPedidoAnterior;

    const cambioPresupuestoAPedido = tipoPedidoAnterior === "presupuesto" && tipoPedidoNuevo === "pedido";

    // Procesar stock si es pedido o si se cambió de presupuesto a pedido
    if ((tipoPedidoNuevo === "pedido" || cambioPresupuestoAPedido)) {
      // Si hay productos en la actualización, usa esos; si no, usa los actuales
      const productosProcesar = updates.productos && Array.isArray(updates.productos)
        ? updates.productos
        : pedidoExistente.productos;

      // Procesar cada producto para afectar el stock si el pedido era presupuesto y ahora es pedido
      for (const prod of productosProcesar) {
        const stock = await Stock.findById(prod.idStock);
        const modelo = await Modelos.findById(prod.idModelo);

        if (stock && modelo && modelo.placas_por_metro) {
          const cantidadNecesaria = prod.cantidad * modelo.placas_por_metro;
          const stockTotal = stock.stock || 0;

          // Calcular stock reservado por pedidos pendientes
          const stockReservado = stock.pedidos
            ? stock.pedidos
                .filter((pedido: any) => pedido.estado === "reservado" || pedido.estado === "pendiente")
                .reduce((total: number, pedido: any) => total + (pedido.cantidad || 0), 0)
            : 0;

          // Stock realmente disponible = stock total - stock reservado
          const stockDisponible = stockTotal - stockReservado;

          if (stockDisponible >= cantidadNecesaria) {
            // Stock disponible - Actualizar estado a "reservado"
            await Pedido.updateOne(
              {
                _id: pedidoExistente._id,
                "productos.idStock": prod.idStock,
              },
              {
                $set: { "productos.$.estado_stock": "Disponible" },
              },
            )

            // Actualizar el stock: incrementar reservado y agregar al array pedidos
            await Stock.findByIdAndUpdate(prod.idStock, {
              $inc: { reservado: cantidadNecesaria },
              $push: {
                pedidos: {
                  idPedido: pedidoExistente._id,
                  cantidad: cantidadNecesaria,
                  estado: "reservado",
                },
              },
            })

            console.log(
              `🟢 Stock reservado para idStock ${prod.idStock}: ${stockDisponible} >= ${cantidadNecesaria} (Total: ${stockTotal}, Reservado: ${stockReservado})`,
            )
          } else {
            // Stock insuficiente - Mantener estado "pendiente"
            await Stock.findByIdAndUpdate(prod.idStock, {
              $inc: { pendiente: cantidadNecesaria },
              $push: {
                pedidos: {
                  idPedido: pedidoExistente._id,
                  cantidad: cantidadNecesaria,
                  estado: "pendiente",
                },
              },
            })

            console.log(
              `🔴 Stock pendiente para idStock ${prod.idStock}: ${stockDisponible} < ${cantidadNecesaria} (Total: ${stockTotal}, Reservado: ${stockReservado})`,
            )
          }

          console.log(
            `📦 Reserva agregada al stock ${prod.idStock}: ${cantidadNecesaria} unidades para pedido ${pedidoExistente.remito}`,
          )
        }
      }
    }

    // ✅ Preparar datos de actualización sin sobrescribir estados ya actualizados
    const updatesFinal = { ...updates }

    // ✅ Si se procesaron productos, incluir los estados_stock actualizados
    if (updates.productos && Array.isArray(updates.productos)) {
      // ✅ Obtener el pedido actualizado para incluir los estados_stock correctos
      const pedidoActualizadoTemp = await Pedido.findById(id)
      if (pedidoActualizadoTemp) {
        updatesFinal.productos = await Promise.all(
          updates.productos.map(async (prod: any, index: number) => {
            const productoActualizado = pedidoActualizadoTemp.productos[index]

            // ✅ Verificar si es un producto nuevo
            const esProductoNuevo = !pedidoExistente.productos.some(
              (p: any) => p.idStock.toString() === prod.idStock.toString(),
            )

            let estadoCorrecto
            if (esProductoNuevo) {
              // ✅ Es un producto nuevo - obtener estado del stock
              const stock = await Stock.findById(prod.idStock)
              const pedidoEnStock = stock?.pedidos.find(
                (p: any) => p.idPedido.toString() === (pedidoExistente._id as any).toString(),
              )
              estadoCorrecto = pedidoEnStock?.estado === "reservado" ? "Disponible" : "Pendiente"
              console.log(`🔄 Producto NUEVO ${prod.idStock} - Estado del stock: ${estadoCorrecto}`)
            } else {
              // ✅ Es un producto existente - usar estado del pedido actualizado
              estadoCorrecto = productoActualizado?.estado_stock
              console.log(`🔄 Producto EXISTENTE ${prod.idStock} - Estado correcto: ${estadoCorrecto}`)
            }

            return {
              ...prod,
              estado_stock: estadoCorrecto || prod.estado_stock,
            }
          }),
        )
      }
    }

    console.log("🔄 === ACTUALIZANDO PEDIDO FINAL ===")
    console.log("📦 Datos finales de actualización:", JSON.stringify(updatesFinal, null, 2))

    // Finalmente se actualiza el pedido
    const pedidoActualizado = await Pedido.findByIdAndUpdate(id, updatesFinal, {
      new: true, // Devuelve el pedido actualizado
      runValidators: true, // Se validan los datos antes de actualizar
    })

    // Asegura que el campo tipo se incluya en la actualización
    if (typeof updates.tipo !== "undefined") {
      updatesFinal.tipo = updates.tipo;
    }

    console.log("✅ === PEDIDO ACTUALIZADO EXITOSAMENTE ===")
    console.log("📋 Pedido final:", {
      id: pedidoActualizado?._id,
      remito: pedidoActualizado?.remito,
      productos: pedidoActualizado?.productos.map((p: any) => ({
        idStock: p.idStock,
        cantidad: p.cantidad,
        estado_stock: p.estado_stock,
      })),
    })

    res.status(200).json({
      message: "Pedido actualizado con éxito",
      pedido: pedidoActualizado,
    })
  } catch (error) {
    console.error("❌ === ERROR AL ACTUALIZAR PEDIDO ===")
    console.error("🔍 Error completo:", error)
    res.status(500).json({ message: "Error al actualizar el pedido", error })
  }
}

export const actualizarValores = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obtener todos los pedidos con los datos de Stock asociados
    const pedidos = await Pedido.find().populate("productos.idStock")

    let pedidosActualizados = 0

    for (const pedido of pedidos) {
      // Calcular el total utilizando la misma lógica que el frontend
      const subtotalProductos = pedido.productos.reduce((sum, producto: any) => {
        const stock = producto.idStock as any // Acceso a los datos de Stock

        if (!stock) {
          console.warn(`⚠ No se encontró stock para el producto en el pedido ${pedido.remito}`)
          return sum
        }

        let valorBase = stock.valor_m2
        if (producto.materiales === "promo1") {
          valorBase = stock.promo1 || 0
        } else if (producto.materiales === "promo2") {
          valorBase = stock.promo2 || 0
        } else if (producto.materiales === "promo3") {
          valorBase = stock.promo3 || 0
        }

        valorBase = valorBase + stock.total_redondeo

        // Aplicar porcentaje de ganancia
        const porcentajeGanancia = stock.porcentaje_ganancia ? stock.porcentaje_ganancia / 100 : 0
        let valorConGanancia = valorBase + valorBase * porcentajeGanancia

        // Aplicar incremento del 15% si el pago es con tarjeta
        if (pedido.metodo_pago === "credito") {
          valorConGanancia *= 1.15
        }

        return sum + producto.cantidad * valorConGanancia
      }, 0)

      // Subtotal incluyendo flete
      const subtotalConFlete = subtotalProductos + (pedido.flete || 0)

      // Aplicar descuento (si pedido.descuento = 10, significa 10% de descuento)
      const descuentoDecimal = (pedido.descuento || 0) / 100
      const totalConDescuento = subtotalConFlete - subtotalConFlete * descuentoDecimal

      // Restar adelanto
      let totalFinal = totalConDescuento - (pedido.adelanto || 0)
      totalFinal = totalFinal + (pedido.adicional || 0)

      // Asegurar que el total final no sea negativo
      const totalCorregido = totalFinal > 0 ? totalFinal : 0

      // Actualizar el pedido en la base de datos
      await Pedido.findByIdAndUpdate(pedido._id, {
        total: totalCorregido.toFixed(2),
      })

      console.log(`✅ Pedido ${pedido.remito} actualizado con total: ${totalCorregido.toFixed(2)}`)
      pedidosActualizados++
    }

    res.status(200).json({
      message: "Pedidos actualizados con éxito",
      totalPedidosActualizados: pedidosActualizados,
    })
  } catch (error) {
    console.error("❌ Error al actualizar los valores de los pedidos:", error)
    res.status(500).json({ message: "Error al actualizar los valores", error })
  }
}

export const deletePedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    console.log("🗑️ === ELIMINANDO PEDIDO ===")
    console.log("📋 ID del pedido:", id)

    // ✅ Buscar el pedido antes de eliminarlo para obtener información del stock
    const pedidoAEliminar = await Pedido.findById(id)
    if (!pedidoAEliminar) {
      res.status(404).json({ message: "Pedido no encontrado" })
      return
    }

    console.log("📋 Pedido encontrado:", {
      id: pedidoAEliminar._id,
      remito: pedidoAEliminar.remito,
      productos: pedidoAEliminar.productos.map((p: any) => ({
        idStock: p.idStock,
        idModelo: p.idModelo,
        cantidad: p.cantidad,
        estado_stock: p.estado_stock,
      })),
    })

    // ✅ Procesar cada producto del pedido para liberar stock
    for (const producto of pedidoAEliminar.productos) {
      console.log("🔄 === PROCESANDO PRODUCTO PARA ELIMINACIÓN ===")
      console.log("📦 Producto:", {
        idStock: producto.idStock,
        idModelo: producto.idModelo,
        cantidad: producto.cantidad,
        estado_stock: producto.estado_stock,
      })

      // ✅ Obtener el modelo para calcular cantidad real
      const modelo = await Modelos.findById(producto.idModelo)
      if (!modelo || !modelo.placas_por_metro) {
        console.warn(`⚠ No se encontró modelo para idModelo: ${producto.idModelo}`)
        continue
      }

      const cantidadRealEliminada = producto.cantidad * modelo.placas_por_metro
      console.log("📊 Cantidad real a liberar:", cantidadRealEliminada)

      // ✅ Obtener el stock actual
      const stock = await Stock.findById(producto.idStock)
      if (!stock) {
        console.warn(`⚠ No se encontró stock para idStock: ${producto.idStock}`)
        continue
      }

      console.log("📦 Stock encontrado:", {
        id: stock._id,
        producto: stock.producto,
        stock: stock.stock,
        reservado: stock.reservado,
        pendiente: stock.pendiente,
        pedidosCount: stock.pedidos?.length || 0,
      })

      // ✅ Buscar el pedido en el array pedidos del stock
      const pedidoEnStock = stock.pedidos.find(
        (p: any) => p.idPedido.toString() === (pedidoAEliminar._id as any).toString(),
      )

      if (pedidoEnStock) {
        console.log("🔄 === LIBERANDO STOCK ===")
        console.log("📦 Pedido en stock encontrado:", {
          idPedido: pedidoEnStock.idPedido,
          cantidad: pedidoEnStock.cantidad,
          estado: pedidoEnStock.estado,
        })

        // ✅ Liberar stock según el estado del pedido
        if (pedidoEnStock.estado === "reservado") {
          // ✅ Decrementar reservado y eliminar del array pedidos
          await Stock.findByIdAndUpdate(
            producto.idStock,
            {
              $inc: { reservado: -pedidoEnStock.cantidad },
              $pull: {
                pedidos: {
                  idPedido: pedidoAEliminar._id,
                },
              },
            },
            { new: true },
          )

          console.log(`✅ Stock reservado liberado para ${producto.idStock}: -${pedidoEnStock.cantidad} unidades`)
          console.log(`✅ Pedido eliminado del array pedidos`)

          // ✅ Re-evaluar pedidos pendientes ya que se liberó stock reservado
          console.log("🔄 Re-evaluando pedidos pendientes después de liberar stock reservado...")
          await evaluarPedidosPendientes(producto.idStock.toString())
          console.log("✅ Re-evaluación completada")
        } else if (pedidoEnStock.estado === "pendiente") {
          // ✅ Decrementar pendiente y eliminar del array pedidos
          await Stock.findByIdAndUpdate(
            producto.idStock,
            {
              $inc: { pendiente: -pedidoEnStock.cantidad },
              $pull: {
                pedidos: {
                  idPedido: pedidoAEliminar._id,
                },
              },
            },
            { new: true },
          )

          console.log(`✅ Stock pendiente liberado para ${producto.idStock}: -${pedidoEnStock.cantidad} unidades`)
          console.log(`✅ Pedido eliminado del array pedidos`)
        }
      } else {
        console.log("⚠ Pedido no encontrado en el stock, no hay stock que liberar")
      }
    }

    // ✅ Finalmente eliminar el pedido
    const pedidoEliminado = await Pedido.findByIdAndDelete(id)

    console.log(`✅ Pedido ${pedidoEliminado?.remito} eliminado correctamente.`)
    console.log("✅ Stock liberado y pedidos pendientes re-evaluados.")

    res.status(200).json({
      message: "Pedido eliminado con éxito y stock liberado",
      pedido: pedidoEliminado,
    })
  } catch (error) {
    console.error("❌ Error al eliminar el pedido:", error)
    res.status(500).json({ message: "Error al eliminar el pedido", error })
  }
}

export const añadirComentario = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("🔄 === AÑADIENDO COMENTARIO ===")
    const { id } = req.params
    const { comentario, tipo } = req.body

    console.log("🔄 === AÑADIENDO COMENTARIO ===")
    console.log("📋 ID del pedido:", id)
    console.log("📝 Comentario:", comentario)
    console.log("🏷️ Tipo:", tipo)

    // ✅ Validar datos requeridos
    if (!comentario || !tipo) {
      res.status(400).json({
        message: "Faltan datos requeridos: comentario y tipo",
      })
      return
    }

    // ✅ Validar tipo de comentario
    const tiposValidos = ["cliente", "producto"]
    if (!tiposValidos.includes(tipo)) {
      res.status(400).json({
        message: "Tipo de comentario inválido. Debe ser 'cliente' o 'producto'",
      })
      return
    }

    // ✅ Buscar el pedido
    const pedido = await Pedido.findById(id)
    if (!pedido) {
      res.status(404).json({ message: "Pedido no encontrado" })
      return
    }

    let pedidoActualizado

    if (tipo === "cliente") {
      // ✅ Sobrescribir comentario del cliente
      const comentarioAnterior = pedido.comentario_cliente
      pedidoActualizado = await Pedido.findByIdAndUpdate(id, { comentario_cliente: comentario }, { new: true })
      console.log(`✅ Comentario de cliente ${comentarioAnterior ? "reemplazado" : "añadido"} correctamente`)
      if (comentarioAnterior) {
        console.log(`📝 Comentario anterior: "${comentarioAnterior}"`)
      }
      console.log(`📝 Nuevo comentario: "${comentario}"`)
    } else if (tipo === "producto") {
      // ✅ Validar que se proporcione el índice del producto
      const { indiceProducto } = req.body
      if (indiceProducto === undefined || indiceProducto < 0 || indiceProducto >= pedido.productos.length) {
        res.status(400).json({
          message: "Índice de producto inválido o no proporcionado",
        })
        return
      }

      // ✅ Sobrescribir comentario del producto específico
      const comentarioAnterior = pedido.productos[indiceProducto]?.comentario_producto
      pedidoActualizado = await Pedido.findByIdAndUpdate(
        id,
        { [`productos.${indiceProducto}.comentario_producto`]: comentario },
        { new: true },
      )
      console.log(
        `✅ Comentario de producto ${
          comentarioAnterior ? "reemplazado" : "añadido"
        } correctamente al índice ${indiceProducto}`,
      )
      if (comentarioAnterior) {
        console.log(`📝 Comentario anterior: "${comentarioAnterior}"`)
      }
      console.log(`📝 Nuevo comentario: "${comentario}"`)
    }

    res.status(200).json({
      message: "Comentario añadido correctamente",
      pedido: pedidoActualizado,
    })
  } catch (error) {
    console.error("❌ Error al añadir el comentario:", error)
    res.status(500).json({ message: "Error al añadir el comentario", error })
  }
}

export const eliminarComentario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { tipo } = req.body

    console.log("🗑️ === ELIMINANDO COMENTARIO ===")
    console.log("📋 ID del pedido:", id)
    console.log("🏷️ Tipo:", tipo)

    // ✅ Validar tipo de comentario
    const tiposValidos = ["cliente", "producto"]
    if (!tiposValidos.includes(tipo)) {
      res.status(400).json({
        message: "Tipo de comentario inválido. Debe ser 'cliente' o 'producto'",
      })
      return
    }

    // ✅ Buscar el pedido
    const pedido = await Pedido.findById(id)
    if (!pedido) {
      res.status(404).json({ message: "Pedido no encontrado" })
      return
    }

    let pedidoActualizado

    if (tipo === "cliente") {
      // ✅ Eliminar comentario del cliente
      pedidoActualizado = await Pedido.findByIdAndUpdate(id, { $unset: { comentario_cliente: "" } }, { new: true })
      console.log("✅ Comentario de cliente eliminado correctamente")
    } else if (tipo === "producto") {
      // ✅ Validar que se proporcione el índice del producto
      const { indiceProducto } = req.body
      if (indiceProducto === undefined || indiceProducto < 0 || indiceProducto >= pedido.productos.length) {
        res.status(400).json({
          message: "Índice de producto inválido o no proporcionado",
        })
        return
      }

      // ✅ Eliminar comentario del producto específico
      pedidoActualizado = await Pedido.findByIdAndUpdate(
        id,
        { $unset: { [`productos.${indiceProducto}.comentario_producto`]: "" } },
        { new: true },
      )
      console.log(`✅ Comentario de producto eliminado correctamente del índice ${indiceProducto}`)
    }

    res.status(200).json({
      message: "Comentario eliminado correctamente",
      pedido: pedidoActualizado,
    })
  } catch (error) {
    console.error("❌ Error al eliminar el comentario:", error)
    res.status(500).json({ message: "Error al eliminar el comentario", error })
  }
}
