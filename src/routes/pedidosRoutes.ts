import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import {
  getPedidos,
  createPedido,
  uploadRemito,
  getRemito,
  cambiarEstadoAEntregado,
  updatePedido,
  añadirComentario,
  actualizarValores,
  deletePedido, // ✅ Importar la nueva función
} from "../controller/pedidosController";

const router = Router();

// Endpoints existentes
router.get("/", getPedidos);
router.post("/", authMiddleware, createPedido);
router.get("/actualizarValores", actualizarValores);
router.post("/:id/remito", uploadRemito);
router.get("/remito/:filename", getRemito);
router.put("/entregado/:id", cambiarEstadoAEntregado);
router.post("/comentario/:id", añadirComentario);


// ✅ Nuevo endpoint para editar un pedido
router.put("/editar/:id", updatePedido);
router.delete("/eliminar/:id", deletePedido);

export default router;
