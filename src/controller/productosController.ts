import { Request, Response } from "express";
import Modelo from "../models/modelosModel";
import Stock from "../models/stockModel";
import Produccion from "../models/produccionModel";
import Pedido from "../models/pedidosModel";
import Precio from "../models/precios.model";
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
                        $set: { "productos.$.estado_stock": "reservado" }
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

export const crearModeloConStock = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { _id, ...modeloData } = req.body; // Excluye el campo _id si está presente

        // Crear el modelo

        const nuevoModelo = await Modelo.create(modeloData);

        // Crear el stock asociado con datos del modelo
        const stockData = {
            producto: nuevoModelo.producto,
            modelo: nuevoModelo.modelo,
            stock: 0, // Stock inicial en 0
            reservado: 0,
            pendiente: 0,
            disponible: 0,
            unidad: "m2", // Unidad por defecto
            actualizaciones: [], // Array vacío de actualizaciones
            idModelo: nuevoModelo._id, // Referencia al modelo creado
            stockActivo: false, // Stock inactivo por defecto
            pedidos: [] // Array vacío de pedidos
        };

        const nuevoStock = await Stock.create(stockData);
        console.log("Modelo y stock creados correctamente", nuevoModelo, nuevoStock,);
        res.status(201).json({
            message: "Modelo y stock creados correctamente",
            modelo: nuevoModelo,
            stock: nuevoStock
        });
    } catch (error) {
        console.error("Error al crear modelo y stock:", error);
        res.status(500).json({
            message: "Error al crear modelo y stock",
            error
        });
    }
};

export const updateStockConProduccion = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Preparar los datos para actualizar, incluyendo stockActivo: true
        const updateData = {
            ...req.body,
            stockActivo: true // Siempre activar el stock en este endpoint
        };
        console.log(updateData)
        // Hacer EXACTAMENTE lo mismo que updateStock del stockController
        const updatedStock = await Stock.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        console.log(updatedStock)

        if (!updatedStock) {
            res.status(404).json({ message: "Stock no encontrado" });
            return;
        }

        // ADEMÁS: Crear el primer registro en ProduccionModel
        const { stock } = req.body;

        if (stock !== undefined) {
            const nuevaProduccion = await Produccion.create({
                idStock: req.params.id,
                fecha: new Date(),
                cantidad: stock,
                responsable: "Agustin Fernandez" // Siempre marcar como Agustin Fernandez
            });

            // ✅ Evaluar pedidos pendientes después del incremento
            await evaluarPedidosPendientes(req.params.id);

            res.json({
                message: "Stock actualizado con éxito y producción registrada",
                stock: updatedStock,
                produccion: nuevaProduccion
            });
        } else {
            res.json({
                message: "Stock actualizado con éxito",
                stock: updatedStock
            });
        }
    } catch (error) {
        res.status(400).json({ message: "Error al actualizar el stock", error });
    }
};


