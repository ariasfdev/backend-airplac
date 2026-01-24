import { Router } from "express";
import { authMiddleware, requireRole } from "../auth/auth.middleware";
import {
  getPedidos,
  createPedido,
  uploadRemito,
  getRemito,
  cambiarEstadoAEntregado,
  updatePedido,
  añadirComentario,
  actualizarValores,
  deletePedido,
} from "../controller/pedidosController";

const router = Router();

// Todos los usuarios autenticados pueden ver pedidos
router.get("/", authMiddleware, getPedidos);

// Todos los usuarios autenticados pueden crear pedidos (vendedores, admin, superadmin)
router.post("/", authMiddleware, createPedido);

// Todos los usuarios autenticados pueden actualizar valores de pedidos
router.get("/actualizarValores", authMiddleware, actualizarValores);

// Todos los usuarios autenticados pueden subir remitos
router.post("/:id/remito", authMiddleware, uploadRemito);

// Todos los usuarios autenticados pueden ver remitos
router.get("/remito/:filename", authMiddleware, getRemito);

// Solo Admin y Superadmin pueden cambiar estado a entregado
router.put("/entregado/:id", authMiddleware, requireRole(["Admin", "Superadmin"]), cambiarEstadoAEntregado);

// Todos los usuarios autenticados pueden añadir comentarios
router.post("/comentario/:id", authMiddleware, añadirComentario);

// Solo Admin y Superadmin pueden editar pedidos
router.put("/editar/:id", authMiddleware, requireRole(["Admin", "Superadmin"]), updatePedido);

// Solo Admin y Superadmin pueden eliminar pedidos
router.delete("/eliminar/:id", authMiddleware, requireRole(["Admin", "Superadmin"]), deletePedido);

export default router;
