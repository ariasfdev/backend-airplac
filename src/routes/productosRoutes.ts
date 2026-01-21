import { Router } from "express";
import {
    crearModeloConStock,
    updateStockConProduccion,
    crearProductosMasivos,
    crearProductoCompletoIndividual,
} from "../controller/productosController";
import { requireAdmin } from "../auth/role.middleware";

const router = Router();

// Crear un nuevo modelo con su stock asociado
router.post("/", requireAdmin, crearModeloConStock);

// Crear un producto completo (modelo + stock + precio)
router.post("/completo", requireAdmin, crearProductoCompletoIndividual);

// Crear múltiples productos completos de forma masiva
router.post("/masivos", requireAdmin, crearProductosMasivos);

// Actualizar stock y crear registro de producción
router.put("/stock/:id", requireAdmin, updateStockConProduccion);

// Obtener todos los productos (modelos con sus stocks)

export default router; 