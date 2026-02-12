import { Router } from "express";
import { authMiddleware, requireRole } from "../auth/auth.middleware";
import {
  getModelosDisponibles,
  getDashboard,
  getVentasPorModelo,
  getVentasPorVendedor,
  getTopClientes,
  getComparativaVendedores,
  getRentabilidadPorModelo,
  getTasaConversion,
  getRentabilidadPorCliente,
  getAnalisisDescuentosExtras,
  getEstadoPedidos,
  getStockProduccion,
  getMetodosPagoProcedenncia
} from "../controller/reportesController";

const router = Router();

// Todos los reportes requieren autenticación y rol Admin/Superadmin
router.use(authMiddleware);
router.use(requireRole(["Admin", "Superadmin"]));

// Utilidades
router.get("/modelos-disponibles", getModelosDisponibles);

// FASE 1: Reportes principales
router.get("/dashboard", getDashboard);
router.get("/ventas-por-modelo", getVentasPorModelo);
router.get("/ventas-por-vendedor", getVentasPorVendedor);
router.get("/top-clientes", getTopClientes);

// FASE 2: Reportes estratégicos
router.get("/comparativa-vendedores", getComparativaVendedores);
router.get("/rentabilidad-modelo", getRentabilidadPorModelo);
router.get("/tasa-conversion", getTasaConversion);

// FASE 3: Análisis detallado
router.get("/rentabilidad-cliente", getRentabilidadPorCliente);
router.get("/analisis-descuentos", getAnalisisDescuentosExtras);
router.get("/estado-pedidos", getEstadoPedidos);

// FASE 4: Reportes operacionales
router.get("/stock-produccion", getStockProduccion);
router.get("/metodos-pago-procedencia", getMetodosPagoProcedenncia);

export default router;
