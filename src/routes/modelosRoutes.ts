import { Router } from "express";
import { inicializarModelos, obtenerModelos, editarModelo, eliminarModelo } from "../controller/modelosController";
import { crearModeloConStock } from "../controller/productosController";
import { requireAdmin } from "../auth/role.middleware";

const router = Router();

router.post("/inicializar", requireAdmin, inicializarModelos);
router.get("/", requireAdmin, obtenerModelos);
router.put("/:id", requireAdmin, editarModelo);
router.post("/", requireAdmin, crearModeloConStock);
router.post("/eliminar/:id", requireAdmin, eliminarModelo);

export default router;
