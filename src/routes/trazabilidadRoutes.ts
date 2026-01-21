import { Router } from "express";
import {
    getHistorialStock,
    getHistorialModelo,
    getHistorialPedido,
    getHistorialCliente,
    getMovimientosPorFecha,
    getMovimientosPorTipo,
    buscarMovimientosTexto,
    getEstadisticasMovimientos,
    getTrazabilidadPedido,
    testRegistroMovimiento
} from "../controller/trazabilidadController";
import { requireAdmin } from "../auth/role.middleware";

const router = Router();

// Historial por stock específico
router.get("/stock/:idStock", requireAdmin, getHistorialStock);

// Historial por modelo específico
router.get("/modelo/:idModelo", requireAdmin, getHistorialModelo);

// Historial por pedido específico
router.get("/pedido/:idPedido", requireAdmin, getHistorialPedido);

// Trazabilidad completa de un pedido
router.get("/pedido/:idPedido/completa", requireAdmin, getTrazabilidadPedido);

// Historial por cliente
router.get("/cliente/:clienteNombre", requireAdmin, getHistorialCliente);

// Movimientos por rango de fechas
router.get("/fechas", requireAdmin, getMovimientosPorFecha);

// Movimientos por tipo
router.get("/tipo/:tipo", requireAdmin, getMovimientosPorTipo);

// Búsqueda de movimientos por texto
router.get("/buscar", requireAdmin, buscarMovimientosTexto);

// Estadísticas de movimientos
router.get("/estadisticas", requireAdmin, getEstadisticasMovimientos);

// Endpoint de prueba para registro de movimientos
router.post("/test-registro", requireAdmin, testRegistroMovimiento);

export default router;
