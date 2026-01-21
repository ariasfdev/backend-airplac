import { Router } from "express";
import { inicializarModelos, obtenerModelos, editarModelo, eliminarModelo } from "../controller/modelosController";
import { crearModeloConStock } from "../controller/productosController";

const router = Router();

router.post("/inicializar", inicializarModelos);
router.get("/", obtenerModelos);
router.put("/:id", editarModelo);
router.post("/", crearModeloConStock);
router.post("/eliminar/:id", eliminarModelo);

export default router;
