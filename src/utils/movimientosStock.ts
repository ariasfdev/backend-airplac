import MovimientoStock from "../models/movimientosStockModel";
import Stock from "../models/stockModel";
import Pedido from "../models/pedidosModel";
import { Request } from "express";

export interface DatosMovimiento {
    idStock: string;
    idModelo: string;
    idPedido?: string;
    tipo_movimiento: "produccion" | "reserva" | "liberacion" | "entrega" | "eliminacion" | "ajuste";
    cantidad: number;
    responsable?: string;
    motivo?: string;
    remito?: string;
    cliente_nombre?: string;
    vendedor_id?: string;
    estado_pedido?: string;
    precio_unitario?: number;
    req?: Request; // Para extraer IP y User-Agent
}

/**
 * Registra un movimiento de stock en el sistema
 */
export const registrarMovimiento = async (datos: DatosMovimiento): Promise<void> => {
    try {
        console.log(`🔄 Intentando registrar movimiento:`, {
            tipo: datos.tipo_movimiento,
            cantidad: datos.cantidad,
            idStock: datos.idStock,
            idModelo: datos.idModelo,
            motivo: datos.motivo
        });

        // Obtener el stock actual para calcular estados anteriores y posteriores
        const stock = await Stock.findById(datos.idStock);
        if (!stock) {
            console.error(`❌ No se encontró stock con ID: ${datos.idStock}`);
            return;
        }

        console.log(`📦 Stock encontrado:`, {
            id: stock._id,
            producto: stock.producto,
            modelo: stock.modelo,
            stock_actual: stock.stock,
            reservado_actual: stock.reservado,
            pendiente_actual: stock.pendiente
        });

        // Obtener información del pedido si existe
        let infoPedido: any = {};
        if (datos.idPedido) {
            const pedido = await Pedido.findById(datos.idPedido);
            if (pedido) {
                infoPedido = {
                    remito: pedido.remito,
                    cliente_nombre: pedido.cliente?.nombre,
                    vendedor_id: pedido.usuarioId,
                    estado_pedido: pedido.estado
                };
            }
        }

        // Calcular total del movimiento si hay precio unitario
        const total_movimiento = datos.precio_unitario ?
            Math.abs(datos.cantidad) * datos.precio_unitario : undefined;

        // Extraer información de la request si está disponible
        let ip, user_agent;
        if (datos.req) {
            ip = datos.req.ip || datos.req.connection?.remoteAddress;
            user_agent = datos.req.get('User-Agent');
        }

        // Calcular estados posteriores basados en el tipo de movimiento
        let stock_posterior = stock.stock;
        let reservado_posterior = stock.reservado;
        let pendiente_posterior = stock.pendiente;

        // Aplicar la lógica del movimiento para calcular estados posteriores
        if (datos.tipo_movimiento === "produccion" || datos.tipo_movimiento === "ajuste") {
            stock_posterior = stock.stock + datos.cantidad;
        } else if (datos.tipo_movimiento === "entrega") {
            stock_posterior = stock.stock + datos.cantidad; // datos.cantidad es negativo para entrega
            reservado_posterior = stock.reservado + datos.cantidad; // datos.cantidad es negativo
        } else if (datos.tipo_movimiento === "reserva") {
            if (datos.cantidad > 0) {
                // Verificar si hay stock suficiente para reservar
                const stockDisponible = stock.stock - stock.reservado;
                if (stockDisponible >= datos.cantidad) {
                    reservado_posterior = stock.reservado + datos.cantidad;
                } else {
                    pendiente_posterior = stock.pendiente + datos.cantidad;
                }
            }
        } else if (datos.tipo_movimiento === "liberacion") {
            if (datos.cantidad < 0) {
                reservado_posterior = stock.reservado + datos.cantidad; // datos.cantidad es negativo
                pendiente_posterior = stock.pendiente + datos.cantidad; // datos.cantidad es negativo
            }
        }

        // Crear el movimiento
        const movimiento = new MovimientoStock({
            idStock: datos.idStock,
            idModelo: datos.idModelo,
            idPedido: datos.idPedido,

            producto: stock.producto,
            modelo: stock.modelo,

            tipo_movimiento: datos.tipo_movimiento,
            cantidad: datos.cantidad,

            // Estados antes del movimiento
            stock_anterior: stock.stock,
            reservado_anterior: stock.reservado,
            pendiente_anterior: stock.pendiente,

            // Estados después del movimiento (calculados)
            stock_posterior: stock_posterior,
            reservado_posterior: reservado_posterior,
            pendiente_posterior: pendiente_posterior,

            // Información del pedido
            ...infoPedido,

            // Información del responsable
            responsable: datos.responsable || "Sistema",
            motivo: datos.motivo,

            // Metadatos
            ip,
            user_agent,

            // Campos adicionales
            precio_unitario: datos.precio_unitario,
            total_movimiento
        });

        await movimiento.save();

        console.log(`✅ Movimiento registrado exitosamente:`, {
            id: movimiento._id,
            tipo: datos.tipo_movimiento,
            cantidad: datos.cantidad,
            producto: stock.producto,
            modelo: stock.modelo,
            stock_anterior: movimiento.stock_anterior,
            stock_posterior: movimiento.stock_posterior,
            reservado_anterior: movimiento.reservado_anterior,
            reservado_posterior: movimiento.reservado_posterior
        });

    } catch (error) {
        console.error("❌ Error al registrar movimiento:", error);
        console.error("❌ Datos del movimiento que falló:", datos);
        // No lanzar el error para no interrumpir el flujo principal
    }
};

/**
 * Registra múltiples movimientos de una vez (para operaciones complejas)
 */
export const registrarMovimientos = async (movimientos: DatosMovimiento[]): Promise<void> => {
    try {
        for (const movimiento of movimientos) {
            await registrarMovimiento(movimiento);
        }
    } catch (error) {
        console.error("❌ Error al registrar movimientos múltiples:", error);
    }
};

/**
 * Obtiene el historial de movimientos para un stock específico
 */
export const obtenerHistorialStock = async (idStock: string, limit: number = 50) => {
    try {
        return await MovimientoStock.find({ idStock })
            .populate('idPedido', 'remito cliente estado')
            .populate('vendedor_id', 'nombreUsuario mail')
            .sort({ fecha: -1 })
            .limit(limit);
    } catch (error) {
        console.error("❌ Error al obtener historial de stock:", error);
        return [];
    }
};

/**
 * Obtiene el historial de movimientos para un modelo específico
 */
export const obtenerHistorialModelo = async (idModelo: string, limit: number = 50) => {
    try {
        return await MovimientoStock.find({ idModelo })
            .populate('idPedido', 'remito cliente estado')
            .populate('vendedor_id', 'nombreUsuario mail')
            .sort({ fecha: -1 })
            .limit(limit);
    } catch (error) {
        console.error("❌ Error al obtener historial de modelo:", error);
        return [];
    }
};

/**
 * Obtiene el historial de movimientos para un pedido específico
 */
export const obtenerHistorialPedido = async (idPedido: string) => {
    try {
        return await MovimientoStock.find({ idPedido })
            .populate('idStock', 'producto modelo')
            .populate('idModelo', 'producto modelo')
            .populate('vendedor_id', 'nombreUsuario mail')
            .sort({ fecha: -1 });
    } catch (error) {
        console.error("❌ Error al obtener historial de pedido:", error);
        return [];
    }
};

/**
 * Obtiene movimientos por cliente
 */
export const obtenerHistorialCliente = async (clienteNombre: string, limit: number = 50) => {
    try {
        return await MovimientoStock.find({ cliente_nombre: clienteNombre })
            .populate('idPedido', 'remito estado')
            .populate('vendedor_id', 'nombre')
            .sort({ fecha: -1 })
            .limit(limit);
    } catch (error) {
        console.error("❌ Error al obtener historial de cliente:", error);
        return [];
    }
};

/**
 * Obtiene movimientos por rango de fechas
 */
export const obtenerMovimientosPorFecha = async (
    fechaInicio: Date,
    fechaFin: Date,
    limit: number = 100
) => {
    try {
        return await MovimientoStock.find({
            fecha: {
                $gte: fechaInicio,
                $lte: fechaFin
            }
        })
            .populate('idPedido', 'remito cliente estado')
            .populate('vendedor_id', 'nombre')
            .sort({ fecha: -1 })
            .limit(limit);
    } catch (error) {
        console.error("❌ Error al obtener movimientos por fecha:", error);
        return [];
    }
};

/**
 * Obtiene movimientos por tipo
 */
export const obtenerMovimientosPorTipo = async (
    tipo: string,
    limit: number = 50
) => {
    try {
        return await MovimientoStock.find({ tipo_movimiento: tipo })
            .populate('idPedido', 'remito cliente estado')
            .populate('vendedor_id', 'nombre')
            .sort({ fecha: -1 })
            .limit(limit);
    } catch (error) {
        console.error("❌ Error al obtener movimientos por tipo:", error);
        return [];
    }
};

/**
 * Busca movimientos por texto (producto, modelo, cliente, remito)
 */
export const buscarMovimientos = async (texto: string, limit: number = 50) => {
    try {
        return await MovimientoStock.find({
            $text: { $search: texto }
        })
            .populate('idPedido', 'remito cliente estado')
            .populate('vendedor_id', 'nombre')
            .sort({ score: { $meta: 'textScore' }, fecha: -1 })
            .limit(limit);
    } catch (error) {
        console.error("❌ Error al buscar movimientos:", error);
        return [];
    }
};

/**
 * Obtiene estadísticas de movimientos
 */
export const obtenerEstadisticasMovimientos = async (
    fechaInicio?: Date,
    fechaFin?: Date
) => {
    try {
        const filtroFecha = fechaInicio && fechaFin ? {
            fecha: { $gte: fechaInicio, $lte: fechaFin }
        } : {};

        const pipeline = [
            { $match: filtroFecha },
            {
                $group: {
                    _id: "$tipo_movimiento",
                    total_movimientos: { $sum: 1 },
                    total_cantidad: { $sum: "$cantidad" },
                    total_valor: { $sum: "$total_movimiento" }
                }
            },
            { $sort: { total_movimientos: -1 as 1 | -1 } }
        ];

        return await MovimientoStock.aggregate(pipeline);
    } catch (error) {
        console.error("❌ Error al obtener estadísticas:", error);
        return [];
    }
};
