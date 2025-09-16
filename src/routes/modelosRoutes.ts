import { Router } from "express";
import { inicializarModelos, obtenerModelos, editarModelo, nuevoModelo } from "../controller/modelosController";
import { crearModeloConStock } from "../controller/productosController";

const router = Router();

router.post("/inicializar", inicializarModelos);
router.get("/", obtenerModelos);
router.put("/:id", editarModelo);
router.post("/", crearModeloConStock);

export default router;
