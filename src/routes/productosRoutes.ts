import { Router } from "express";
import {
    crearModeloConStock,
    updateStockConProduccion,
    crearProductosMasivos,
    crearProductoCompletoIndividual,
} from "../controller/productosController";
import { authMiddleware, requireRole } from "../auth/auth.middleware";

const router = Router();

// Solo Admin y Superadmin pueden crear modelos con stock
router.post("/", authMiddleware, requireRole(["Admin", "Superadmin"]), crearModeloConStock);

// Solo Admin y Superadmin pueden crear productos completos
router.post("/completo", authMiddleware, requireRole(["Admin", "Superadmin"]), crearProductoCompletoIndividual);

// Solo Admin y Superadmin pueden crear productos de forma masiva
router.post("/masivos", authMiddleware, requireRole(["Admin", "Superadmin"]), crearProductosMasivos);

// Solo Admin y Superadmin pueden actualizar stock y crear registro de producción
router.put("/stock/:id", authMiddleware, requireRole(["Admin", "Superadmin"]), updateStockConProduccion);

export default router; 