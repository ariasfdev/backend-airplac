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

const router = Router();

// Historial por stock específico
router.get("/stock/:idStock", getHistorialStock);

// Historial por modelo específico
router.get("/modelo/:idModelo", getHistorialModelo);

// Historial por pedido específico
router.get("/pedido/:idPedido", getHistorialPedido);

// Trazabilidad completa de un pedido
router.get("/pedido/:idPedido/completa", getTrazabilidadPedido);

// Historial por cliente
router.get("/cliente/:clienteNombre", getHistorialCliente);

// Movimientos por rango de fechas
router.get("/fechas", getMovimientosPorFecha);

// Movimientos por tipo
router.get("/tipo/:tipo", getMovimientosPorTipo);

// Búsqueda de movimientos por texto
router.get("/buscar", buscarMovimientosTexto);

// Estadísticas de movimientos
router.get("/estadisticas", getEstadisticasMovimientos);

// Endpoint de prueba para registro de movimientos
router.post("/test-registro", testRegistroMovimiento);

export default router;
