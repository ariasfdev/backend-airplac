# 📊 DOCUMENTACIÓN DE ENDPOINTS - REPORTES AIRPLAC

## 🔐 Autenticación

Todos los endpoints requieren autenticación con JWT token y rol **Admin** o **Superadmin**.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "nombreUsuario": "tu_usuario",
  "contrasena": "tu_password"
}
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "nombreUsuario": "admin",
    "rol": "Admin"
  }
}
```

Usar el token en los headers:
```
Authorization: Bearer <token>
```

---

## 📈 FASE 1: Reportes Principales

### 1. Dashboard
**GET** `/api/reportes/dashboard`

**Query Parameters:**
- `desde` (opcional): Fecha inicio (formato: YYYY-MM-DD)
- `hasta` (opcional): Fecha fin (formato: YYYY-MM-DD)

**Ejemplo:**
```http
GET /api/reportes/dashboard?desde=2025-01-01&hasta=2025-12-31
```

**Respuesta incluye:**
- Resumen de ingresos y pedidos
- Pedidos por estado
- Top 3 vendedores
- Stock bajo nivel
- Ingresos por mes (últimos 12)

---

### 2. Ventas por Modelo
**GET** `/api/reportes/ventas-por-modelo`

**Query Parameters:**
- `desde` (opcional): Fecha inicio
- `hasta` (opcional): Fecha fin
- `idModelo` (opcional): ID específico de modelo
- `filtro_estado` (opcional): Estado del pedido

**Ejemplo:**
```http
GET /api/reportes/ventas-por-modelo?desde=2025-01-01&hasta=2025-12-31
```

**Respuesta incluye:**
- Cantidad vendida por modelo
- Ingresos brutos y netos
- Costos y márgenes
- Porcentaje del total

---

### 3. Ventas por Vendedor
**GET** `/api/reportes/ventas-por-vendedor`

**Query Parameters:**
- `desde` (opcional): Fecha inicio
- `hasta` (opcional): Fecha fin
- `usuarioId` (opcional): ID específico de usuario
- `filtro_estado` (opcional): "pedido" o "presupuesto"

**Ejemplo:**
```http
GET /api/reportes/ventas-por-vendedor?desde=2025-01-01&hasta=2025-12-31
```

**Respuesta incluye:**
- Total facturado por vendedor
- Cantidad de pedidos vs presupuestos
- Ticket promedio
- Tasa de conversión

---

### 4. Top Clientes
**GET** `/api/reportes/top-clientes`

**Query Parameters:**
- `desde` (opcional): Fecha inicio
- `hasta` (opcional): Fecha fin
- `limite` (opcional, default: 10): Cantidad de clientes

**Ejemplo:**
```http
GET /api/reportes/top-clientes?limite=20
```

**Respuesta incluye:**
- Cliente con mayor volumen
- Total gastado
- Cantidad de pedidos
- Procedencia

---

## 📊 FASE 2: Reportes Estratégicos

### 5. Comparativa entre Vendedores
**GET** `/api/reportes/comparativa-vendedores`

**Query Parameters:**
- `meses` (opcional, default: 12): Cantidad de meses a analizar

**Ejemplo:**
```http
GET /api/reportes/comparativa-vendedores?meses=6
```

**Respuesta incluye:**
- Ranking actual (últimos 30 días)
- Datos mes a mes por vendedor
- Serie temporal para gráficos

---

### 6. Rentabilidad por Modelo
**GET** `/api/reportes/rentabilidad-modelo`

**Query Parameters:**
- `desde` (opcional): Fecha inicio
- `hasta` (opcional): Fecha fin
- `idModelo` (opcional): ID específico de modelo

**Ejemplo:**
```http
GET /api/reportes/rentabilidad-modelo?desde=2025-01-01&hasta=2025-12-31
```

**Respuesta incluye:**
- Ganancia bruta y neta por modelo
- Margen de rentabilidad (%)
- Costos adicionales
- Modelo más y menos rentable

---

### 7. Tasa de Conversión
**GET** `/api/reportes/tasa-conversion`

**Query Parameters:**
- `desde` (opcional): Fecha inicio
- `hasta` (opcional): Fecha fin
- `idModelo` (opcional): ID específico de modelo
- `usuarioId` (opcional): ID específico de usuario

**Ejemplo:**
```http
GET /api/reportes/tasa-conversion?desde=2025-01-01&hasta=2025-12-31
```

**Respuesta incluye:**
- Tasa global de conversión presupuesto → pedido
- Conversión por vendedor
- Conversión por modelo

---

## 🔍 FASE 3: Análisis Detallado

### 8. Rentabilidad por Cliente
**GET** `/api/reportes/rentabilidad-cliente`

**Query Parameters:**
- `desde` (opcional): Fecha inicio
- `hasta` (opcional): Fecha fin
- `nombreCliente` (opcional): Búsqueda por nombre
- `limite` (opcional, default: 20): Cantidad de clientes

**Ejemplo:**
```http
GET /api/reportes/rentabilidad-cliente?limite=15
```

**Respuesta incluye:**
- Ganancia neta por cliente
- Margen de rentabilidad
- Valor promedio por pedido
- Cliente más y menos rentable

---

### 9. Análisis de Descuentos y Extras
**GET** `/api/reportes/analisis-descuentos`

**Query Parameters:**
- `desde` (opcional): Fecha inicio
- `hasta` (opcional): Fecha fin

**Ejemplo:**
```http
GET /api/reportes/analisis-descuentos?desde=2025-01-01&hasta=2025-12-31
```

**Respuesta incluye:**
- Total de descuentos aplicados
- Descuentos por modelo
- Top pedidos con mayor descuento
- Tendencia por período
- Fletes, instalaciones, adicionales

---

### 10. Estado de Pedidos
**GET** `/api/reportes/estado-pedidos`

**Query Parameters:**
- `desde` (opcional): Fecha inicio
- `hasta` (opcional): Fecha fin
- `estado` (opcional): Estado específico
- `usuarioId` (opcional): ID de vendedor
- `limite` (opcional, default: 50): Cantidad de pedidos

**Ejemplo:**
```http
GET /api/reportes/estado-pedidos?estado=pendiente&limite=30
```

**Respuesta incluye:**
- Resumen por estado
- Estadísticas de tiempo de entrega
- Detalle de pedidos
- Pedidos retrasados
- Cartera pendiente de cobro

---

## ⚙️ FASE 4: Reportes Operacionales

### 11. Stock & Producción
**GET** `/api/reportes/stock-produccion`

**Query Parameters:**
- `alertaStock` (opcional, default: 50): Umbral de alerta
- `ordenarPor` (opcional): "disponible" | "bajo_stock" | "dias_agotar"

**Ejemplo:**
```http
GET /api/reportes/stock-produccion?alertaStock=30&ordenarPor=bajo_stock
```

**Respuesta incluye:**
- Stock actual, reservado, disponible por modelo
- Metros cuadrados disponibles
- Producción diaria estimada
- Días para agotar stock
- Modelos bajo alerta

---

### 12. Métodos de Pago & Procedencia
**GET** `/api/reportes/metodos-pago-procedencia`

**Query Parameters:**
- `desde` (opcional): Fecha inicio
- `hasta` (opcional): Fecha fin

**Ejemplo:**
```http
GET /api/reportes/metodos-pago-procedencia?desde=2025-01-01&hasta=2025-12-31
```

**Respuesta incluye:**
- Análisis por método de pago (efectivo, transferencia, etc.)
- Análisis por procedencia (tiktok, facebook, etc.)
- Cartera de cobranza por método y procedencia
- Tasa de cobranza
- Clientes únicos por fuente

---

## 🧪 Testing

### Usando el Script de PowerShell:
```powershell
cd backend-airplac
.\test-reportes.ps1
```

### Usando cURL:
```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nombreUsuario":"admin","contrasena":"password"}'

# 2. Dashboard (con token)
curl -X GET "http://localhost:3000/api/reportes/dashboard" \
  -H "Authorization: Bearer <tu_token>"
```

### Usando Postman:
1. Importar colección
2. Configurar variable de entorno `{{token}}`
3. Login → copiar token
4. Probar endpoints

---

## 📝 Notas Importantes

- **Autenticación requerida** en todos los endpoints
- **Rol mínimo**: Admin o Superadmin
- **Fechas por defecto**: 
  - `desde`: 1 de enero del año actual
  - `hasta`: Fecha actual
- **Timezone**: Todas las fechas usan el timezone del servidor
- **Formato de fechas**: ISO 8601 (YYYY-MM-DD)
- **Respuestas**: JSON
- **Errores comunes**:
  - 401: Token inválido o expirado
  - 403: Permisos insuficientes
  - 500: Error del servidor

---

## 🚀 Endpoints Creados

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/dashboard` | GET | Resumen general |
| `/ventas-por-modelo` | GET | Análisis de ventas por producto |
| `/ventas-por-vendedor` | GET | Performance de vendedores |
| `/top-clientes` | GET | Mejores clientes |
| `/comparativa-vendedores` | GET | Ranking y evolución |
| `/rentabilidad-modelo` | GET | Márgenes por producto |
| `/tasa-conversion` | GET | Presupuestos → pedidos |
| `/rentabilidad-cliente` | GET | Márgenes por cliente |
| `/analisis-descuentos` | GET | Política de descuentos |
| `/estado-pedidos` | GET | Seguimiento de órdenes |
| `/stock-produccion` | GET | Gestión de inventario |
| `/metodos-pago-procedencia` | GET | Canales y cobranza |

**Total: 12 endpoints funcionales** ✅
