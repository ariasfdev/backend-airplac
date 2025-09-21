import { Request, Response } from "express";
import {
    obtenerHistorialStock,
    obtenerHistorialModelo,
    obtenerHistorialPedido,
    obtenerHistorialCliente,
    obtenerMovimientosPorFecha,
    obtenerMovimientosPorTipo,
    buscarMovimientos,
    obtenerEstadisticasMovimientos
} from "../utils/movimientosStock";

/**
 * Obtiene el historial de movimientos para un stock específico
 */
export const getHistorialStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idStock } = req.params;
        const { limit = 50 } = req.query;

        const movimientos = await obtenerHistorialStock(idStock, Number(limit));

        res.status(200).json({
            message: "Historial de stock obtenido exitosamente",
            total: movimientos.length,
            movimientos
        });
    } catch (error) {
        console.error("❌ Error al obtener historial de stock:", error);
        res.status(500).json({
            message: "Error al obtener historial de stock",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};

/**
 * Obtiene el historial de movimientos para un modelo específico
 */
export const getHistorialModelo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idModelo } = req.params;
        const { limit = 50 } = req.query;

        const movimientos = await obtenerHistorialModelo(idModelo, Number(limit));

        res.status(200).json({
            message: "Historial de modelo obtenido exitosamente",
            total: movimientos.length,
            movimientos
        });
    } catch (error) {
        console.error("❌ Error al obtener historial de modelo:", error);
        res.status(500).json({
            message: "Error al obtener historial de modelo",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};

/**
 * Obtiene el historial de movimientos para un pedido específico
 */
export const getHistorialPedido = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idPedido } = req.params;

        const movimientos = await obtenerHistorialPedido(idPedido);

        res.status(200).json({
            message: "Historial de pedido obtenido exitosamente",
            total: movimientos.length,
            movimientos
        });
    } catch (error) {
        console.error("❌ Error al obtener historial de pedido:", error);
        res.status(500).json({
            message: "Error al obtener historial de pedido",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};

/**
 * Obtiene el historial de movimientos para un cliente específico
 */
export const getHistorialCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clienteNombre } = req.params;
        const { limit = 50 } = req.query;

        const movimientos = await obtenerHistorialCliente(clienteNombre, Number(limit));

        res.status(200).json({
            message: "Historial de cliente obtenido exitosamente",
            total: movimientos.length,
            movimientos
        });
    } catch (error) {
        console.error("❌ Error al obtener historial de cliente:", error);
        res.status(500).json({
            message: "Error al obtener historial de cliente",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};

/**
 * Obtiene movimientos por rango de fechas
 */
export const getMovimientosPorFecha = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        const { limit = 100 } = req.query;

        if (!fechaInicio || !fechaFin) {
            res.status(400).json({
                message: "Se requieren fechaInicio y fechaFin"
            });
            return;
        }

        const inicio = new Date(fechaInicio as string);
        const fin = new Date(fechaFin as string);

        if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
            res.status(400).json({
                message: "Formato de fecha inválido. Use YYYY-MM-DD"
            });
            return;
        }

        const movimientos = await obtenerMovimientosPorFecha(inicio, fin, Number(limit));

        res.status(200).json({
            message: "Movimientos por fecha obtenidos exitosamente",
            fechaInicio: inicio.toISOString(),
            fechaFin: fin.toISOString(),
            total: movimientos.length,
            movimientos
        });
    } catch (error) {
        console.error("❌ Error al obtener movimientos por fecha:", error);
        res.status(500).json({
            message: "Error al obtener movimientos por fecha",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};

/**
 * Obtiene movimientos por tipo
 */
export const getMovimientosPorTipo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tipo } = req.params;
        const { limit = 50 } = req.query;

        const tiposValidos = ["produccion", "reserva", "liberacion", "entrega", "eliminacion", "ajuste"];

        if (!tiposValidos.includes(tipo)) {
            res.status(400).json({
                message: `Tipo inválido. Tipos válidos: ${tiposValidos.join(", ")}`
            });
            return;
        }

        const movimientos = await obtenerMovimientosPorTipo(tipo, Number(limit));

        res.status(200).json({
            message: "Movimientos por tipo obtenidos exitosamente",
            tipo,
            total: movimientos.length,
            movimientos
        });
    } catch (error) {
        console.error("❌ Error al obtener movimientos por tipo:", error);
        res.status(500).json({
            message: "Error al obtener movimientos por tipo",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};

/**
 * Busca movimientos por texto
 */
export const buscarMovimientosTexto = async (req: Request, res: Response): Promise<void> => {
    try {
        const { texto } = req.query;
        const { limit = 50 } = req.query;

        if (!texto || typeof texto !== "string") {
            res.status(400).json({
                message: "Se requiere el parámetro 'texto' para la búsqueda"
            });
            return;
        }

        const movimientos = await buscarMovimientos(texto, Number(limit));

        res.status(200).json({
            message: "Búsqueda de movimientos completada",
            texto,
            total: movimientos.length,
            movimientos
        });
    } catch (error) {
        console.error("❌ Error al buscar movimientos:", error);
        res.status(500).json({
            message: "Error al buscar movimientos",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};

/**
 * Obtiene estadísticas de movimientos
 */
export const getEstadisticasMovimientos = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        let fechaInicioObj: Date | undefined;
        let fechaFinObj: Date | undefined;

        if (fechaInicio) {
            fechaInicioObj = new Date(fechaInicio as string);
            if (isNaN(fechaInicioObj.getTime())) {
                res.status(400).json({
                    message: "Formato de fechaInicio inválido. Use YYYY-MM-DD"
                });
                return;
            }
        }

        if (fechaFin) {
            fechaFinObj = new Date(fechaFin as string);
            if (isNaN(fechaFinObj.getTime())) {
                res.status(400).json({
                    message: "Formato de fechaFin inválido. Use YYYY-MM-DD"
                });
                return;
            }
        }

        const estadisticas = await obtenerEstadisticasMovimientos(fechaInicioObj, fechaFinObj);

        res.status(200).json({
            message: "Estadísticas obtenidas exitosamente",
            periodo: {
                fechaInicio: fechaInicioObj?.toISOString(),
                fechaFin: fechaFinObj?.toISOString()
            },
            estadisticas
        });
    } catch (error) {
        console.error("❌ Error al obtener estadísticas:", error);
        res.status(500).json({
            message: "Error al obtener estadísticas",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};

/**
 * Endpoint de prueba para verificar el registro de movimientos
 */
export const testRegistroMovimiento = async (req: Request, res: Response): Promise<void> => {
    try {
        const { registrarMovimiento } = await import("../utils/movimientosStock");

        const movimientoTest = {
            idStock: req.body.idStock || "test",
            idModelo: req.body.idModelo || "test",
            tipo_movimiento: "produccion" as const,
            cantidad: req.body.cantidad || 100,
            responsable: "Test",
            motivo: "Prueba de registro de movimiento",
            req: req
        };

        await registrarMovimiento(movimientoTest);

        res.status(200).json({
            message: "Movimiento de prueba registrado exitosamente",
            datos: movimientoTest
        });
    } catch (error) {
        console.error("❌ Error en test de registro:", error);
        res.status(500).json({
            message: "Error en test de registro",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};

/**
 * Obtiene un resumen completo de trazabilidad para un pedido
 */
export const getTrazabilidadPedido = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idPedido } = req.params;

        // Obtener movimientos del pedido
        const movimientos = await obtenerHistorialPedido(idPedido);

        // Agrupar movimientos por tipo
        const movimientosPorTipo = movimientos.reduce((acc: any, movimiento: any) => {
            const tipo = movimiento.tipo_movimiento;
            if (!acc[tipo]) {
                acc[tipo] = [];
            }
            acc[tipo].push(movimiento);
            return acc;
        }, {});

        // Calcular resumen
        const resumen = {
            totalMovimientos: movimientos.length,
            tiposMovimientos: Object.keys(movimientosPorTipo).length,
            movimientosPorTipo: Object.keys(movimientosPorTipo).map(tipo => ({
                tipo,
                cantidad: movimientosPorTipo[tipo].length,
                totalCantidad: movimientosPorTipo[tipo].reduce((sum: number, m: any) => sum + Math.abs(m.cantidad), 0)
            })),
            fechaPrimerMovimiento: movimientos.length > 0 ? movimientos[movimientos.length - 1].fecha : null,
            fechaUltimoMovimiento: movimientos.length > 0 ? movimientos[0].fecha : null
        };

        res.status(200).json({
            message: "Trazabilidad de pedido obtenida exitosamente",
            idPedido,
            resumen,
            movimientos
        });
    } catch (error) {
        console.error("❌ Error al obtener trazabilidad de pedido:", error);
        res.status(500).json({
            message: "Error al obtener trazabilidad de pedido",
            error: error instanceof Error ? error.message : "Error desconocido"
        });
    }
};
