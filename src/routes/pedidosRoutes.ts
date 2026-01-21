import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { requireAdmin, requireAdminOrVendedor } from "../auth/role.middleware";
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
router.get("/", requireAdminOrVendedor, getPedidos);
router.post("/", authMiddleware, requireAdminOrVendedor, createPedido);
router.get("/actualizarValores", requireAdmin, actualizarValores);
router.post("/:id/remito", requireAdminOrVendedor, uploadRemito);
router.get("/remito/:filename", requireAdminOrVendedor, getRemito);
router.put("/entregado/:id", requireAdmin, cambiarEstadoAEntregado);
router.post("/comentario/:id", requireAdminOrVendedor, añadirComentario);


// ✅ Nuevo endpoint para editar un pedido
router.put("/editar/:id", requireAdmin, updatePedido);
router.delete("/eliminar/:id", requireAdmin, deletePedido);

export default router;
