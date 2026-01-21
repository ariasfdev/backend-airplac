import { Router } from "express";
import {
  getAllStocks,
  createStock,
  getStockById,
  updateStock,
  deleteStock,
  getAllStocksImportacion,
  agregarProduccion,
  registrarEntrega,
  obtenerProduccionesPorStock,
  actualizarStock,
  refrescar, // Importa la nueva función
  addToStock, // Nuevo controlador para suma
  subtractFromStock // Nuevo controlador para resta
} from "../controller/stockController";
import {
  getPreciosIdModelo,
  actualizarPrecios,
  darBajaPrecio,
  actualizarPreciosMasivos,
  crearPrecioAdicionalMasivo
} from "../controller/precioController";
import { requireAdmin, requireAdminOrVendedor } from "../auth/role.middleware";
const router = Router();

// Stock endpoints
//router.get("/norma", normalizarStock); // Rutas específicas primero
router.get("/", requireAdminOrVendedor, getAllStocks);
router.post("/", requireAdmin, createStock);
router.get("/:id", requireAdminOrVendedor, getStockById); // Rutas dinámicas después
router.get("/importacion/:idVendedor", requireAdminOrVendedor, getAllStocksImportacion);
router.put("/:id", requireAdmin, updateStock);
router.delete("/:id", requireAdmin, deleteStock);

// Nuevos endpoints para manejo específico de stock
router.put("/add/:id", requireAdmin, addToStock); // Suma al stock
router.put("/subtract/:id", requireAdmin, subtractFromStock); // Resta del stock

// Endpoint para creación masiva de stocks
//router.post("/bulk", bulkCreateStock);
router.post("/refrescar", requireAdmin, refrescar);

// Producción endpoints
router.post("/actualizar-stock", requireAdmin, actualizarStock);
router.post("/produccion", requireAdmin, agregarProduccion);
router.put("/produccion/entrega", requireAdmin, registrarEntrega);
router.get("/produccion/:idStock", requireAdminOrVendedor, obtenerProduccionesPorStock);
// Rutas de precios - las más específicas primero
router.put("/precios/masivo/actualizar", requireAdmin, actualizarPreciosMasivos);
router.post("/precios/masivo/adicional", requireAdmin, crearPrecioAdicionalMasivo);
router.put("/precios/:idPrecio/baja", requireAdmin, darBajaPrecio);
router.get("/precios/:idModelo", requireAdmin, getPreciosIdModelo);
router.put("/precios/:idModelo", requireAdmin, actualizarPrecios);

export default router;
