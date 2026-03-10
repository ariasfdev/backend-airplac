import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import stockRoutes from "./routes/stockRoutes";
import vendedoresRoutes from "./routes/vendedoresRoutes";
import pedidosRoutes from "./routes/pedidosRoutes";
import modelosRoutes from "./routes/modelosRoutes";
import productosRoutes from "./routes/productosRoutes";
import trazabilidadRoutes from "./routes/trazabilidadRoutes";
import reportesRoutes from "./routes/reportesRoutes";
import authRoutes from "./routes/authRoutes";
import { authMiddleware } from "./auth/auth.middleware";
import path from "path";

const app = express();

// Debug: Ver qué valor tiene FRONTEND_ORIGIN
console.log("🔍 DEBUG CORS - FRONTEND_ORIGIN:", process.env.FRONTEND_ORIGIN);
console.log("🔍 DEBUG CORS - NODE_ENV:", process.env.NODE_ENV);
console.log("🔍 DEBUG CORS - CORS origin configurado:", process.env.FRONTEND_ORIGIN || "http://localhost:5173");

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(cookieParser());

// Rutas
app.get("/", (req, res) => {
  res.send("API de Stock y Vendedores - con Autenticación");
});

// Rutas de autenticación (sin protección)
app.use("/api/auth", authRoutes);

// Aplicar middleware de autenticación globalmente para rutas protegidas
app.use(authMiddleware);

// Rutas protegidas
app.use("/api/stock", stockRoutes);
app.use("/api/vendedores", vendedoresRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/modelos", modelosRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/trazabilidad", trazabilidadRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

export default app;
