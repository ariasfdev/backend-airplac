import { Router } from "express";
import {
    crearModeloConStock,
    updateStockConProduccion,
} from "../controller/productosController";

const router = Router();

// Crear un nuevo modelo con su stock asociado
router.post("/", crearModeloConStock);

// Actualizar stock y crear registro de producción
router.put("/stock/:id", updateStockConProduccion);

// Obtener todos los productos (modelos con sus stocks)

export default router; 