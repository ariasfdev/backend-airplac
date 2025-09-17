import { Router } from "express";
import {
    crearModeloConStock,
    updateStockConProduccion,
    crearProductosMasivos,
    crearProductoCompletoIndividual,
} from "../controller/productosController";

const router = Router();

// Crear un nuevo modelo con su stock asociado
router.post("/", crearModeloConStock);

// Crear un producto completo (modelo + stock + precio)
router.post("/completo", crearProductoCompletoIndividual);

// Crear múltiples productos completos de forma masiva
router.post("/masivos", crearProductosMasivos);

// Actualizar stock y crear registro de producción
router.put("/stock/:id", updateStockConProduccion);

// Obtener todos los productos (modelos con sus stocks)

export default router; 