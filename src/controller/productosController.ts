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

// Función para crear un producto completo (modelo + stock + precio) individual
const crearProductoCompleto = async (productoData: any) => {
    const { _id, ...modeloData } = productoData; // Excluye el campo _id si está presente

    // 1. Crear el modelo
    const nuevoModelo = await Modelo.create(modeloData);

    // 2. Crear el stock asociado
    const stockData = {
        producto: nuevoModelo.producto,
        modelo: nuevoModelo.modelo,
        stock: productoData.stock || 0,
        reservado: 0,
        pendiente: 0,
        disponible: productoData.stock || 0,
        unidad: "m2",
        actualizaciones: [],
        idModelo: nuevoModelo._id,
        stockActivo: true, // Activar por defecto para productos completos
        pedidos: []
    };

    const nuevoStock = await Stock.create(stockData);

    // 3. Crear el precio base
    const precioData = {
        id_modelo: nuevoModelo._id,
        nombre_precio: "Precio Base",
        es_base: true,
        activo: true,
        costo: productoData.costo || 0,
        porcentaje_ganancia: productoData.porcentaje_ganancia || 100,
        porcentaje_tarjeta: productoData.porcentaje_tarjeta || 15,
        total_redondeo: productoData.total_redondeo || 0,
        fecha: new Date()
    };

    const nuevoPrecio = await Precio.create(precioData);

    return {
        modelo: nuevoModelo,
        stock: nuevoStock,
        precio: nuevoPrecio
    };
};

// Endpoint para creación masiva de productos
export const crearProductosMasivos = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { productos } = req.body;

        // Validar que se envíe un array de productos
        if (!Array.isArray(productos) || productos.length === 0) {
            res.status(400).json({
                message: "Se requiere un array de productos no vacío"
            });
            return;
        }

        const resultados = [];
        const errores = [];

        // Procesar cada producto de forma secuencial para evitar problemas de concurrencia
        for (let i = 0; i < productos.length; i++) {
            try {
                const producto = productos[i];

                // Validaciones básicas
                if (!producto.producto || !producto.modelo || !producto.ancho || !producto.alto || !producto.tipo) {
                    errores.push({
                        indice: i,
                        producto: producto.producto || 'Sin nombre',
                        error: "Faltan campos obligatorios del modelo (producto, modelo, ancho, alto, tipo)"
                    });
                    continue;
                }

                if (producto.costo === undefined || producto.costo < 0) {
                    errores.push({
                        indice: i,
                        producto: producto.producto,
                        error: "El costo es obligatorio y debe ser mayor o igual a 0"
                    });
                    continue;
                }

                const resultado = await crearProductoCompleto(producto);
                resultados.push({
                    indice: i,
                    producto: producto.producto,
                    modelo: resultado.modelo,
                    stock: resultado.stock,
                    precio: resultado.precio
                });

                console.log(`✅ Producto ${i + 1}/${productos.length} creado: ${producto.producto} - ${producto.modelo}`);

            } catch (error) {
                console.error(`❌ Error creando producto ${i + 1}:`, error);
                errores.push({
                    indice: i,
                    producto: productos[i].producto || 'Sin nombre',
                    error: error instanceof Error ? error.message : 'Error desconocido'
                });
            }
        }

        // Respuesta con resultados y errores
        res.status(201).json({
            message: `Procesados ${productos.length} productos`,
            exitosos: resultados.length,
            total_errores: errores.length,
            resultados,
            errores
        });

    } catch (error) {
        console.error("Error en creación masiva de productos:", error);
        res.status(500).json({
            message: "Error interno del servidor",
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

// Endpoint para crear un solo producto completo
export const crearProductoCompletoIndividual = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const resultado = await crearProductoCompleto(req.body);

        res.status(201).json({
            message: "Producto completo creado correctamente",
            modelo: resultado.modelo,
            stock: resultado.stock,
            precio: resultado.precio
        });
    } catch (error) {
        console.error("Error al crear producto completo:", error);
        res.status(500).json({
            message: "Error al crear producto completo",
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};


