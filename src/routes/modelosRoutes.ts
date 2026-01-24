import { Router } from "express";
import { inicializarModelos, obtenerModelos, editarModelo, eliminarModelo } from "../controller/modelosController";
import { crearModeloConStock } from "../controller/productosController";
import { authMiddleware, requireRole } from "../auth/auth.middleware";

const router = Router();

// Solo Admin y Superadmin pueden inicializar modelos
router.post("/inicializar", authMiddleware, requireRole(["Admin", "Superadmin"]), inicializarModelos);

// Todos los usuarios autenticados pueden ver modelos (necesario para crear pedidos)
router.get("/", authMiddleware, obtenerModelos);

// Solo Admin y Superadmin pueden editar modelos
router.put("/:id", authMiddleware, requireRole(["Admin", "Superadmin"]), editarModelo);

// Solo Admin y Superadmin pueden crear modelos
router.post("/", authMiddleware, requireRole(["Admin", "Superadmin"]), crearModeloConStock);

// Solo Admin y Superadmin pueden eliminar modelos
router.post("/eliminar/:id", authMiddleware, requireRole(["Admin", "Superadmin"]), eliminarModelo);

export default router;
