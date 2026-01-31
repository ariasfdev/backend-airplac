# Reportes Endpoints - Parameter Documentation

## Summary
All reportes endpoints use **`desde`** and **`hasta`** query parameters for date filtering. Dates are converted to JavaScript Date objects using the `getDateRange()` utility function.

---

## Date Handling Utility

```typescript
const getDateRange = (desde?: string, hasta?: string) => {
  const desde_date = desde ? new Date(desde) : new Date(new Date().getFullYear(), 0, 1);
  const hasta_date = hasta ? new Date(hasta) : new Date();
  
  // Asegurar que hasta incluya todo el día
  hasta_date.setHours(23, 59, 59, 999);
  
  return { desde_date, hasta_date };
};
```

**Behavior:**
- If `desde` is not provided: defaults to January 1st of the current year
- If `hasta` is not provided: defaults to today
- `hasta_date` is always set to 23:59:59.999 to include the entire day
- Both are converted to MongoDB `$gte` and `$lte` operators for date range filtering

---

## Endpoints Documentation

### 1. **GET /reportes/dashboard**
**Purpose:** Main dashboard with key metrics

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `desde` | string (ISO date) | Start date for filtering (optional, defaults to Jan 1st current year) |
| `hasta` | string (ISO date) | End date for filtering (optional, defaults to today) |
| `filtro_mes` | string | Month filter (optional, not actively used in query) |

**Date Filtering:**
```typescript
const { desde, hasta, filtro_mes } = req.query;
const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

// Applied to fecha_pedido field
fecha_pedido: { $gte: desde_date, $lte: hasta_date }
```

**Returns:**
- Total ingresos, cantidad_pedidos, total_pendiente
- Pedidos por estado
- Top 3 vendedores
- Low stock items (disponible < 50)
- Ingresos por mes (últimos 12 meses)

---

### 2. **GET /reportes/ventas-por-modelo**
**Purpose:** Sales breakdown by model

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `desde` | string (ISO date) | Start date for filtering |
| `hasta` | string (ISO date) | End date for filtering |
| `idModelo` | string | Filter by specific model ID (optional) |
| `filtro_estado` | string | Filter by order estado (optional) |

**Date Filtering:**
```typescript
const { desde, hasta, idModelo, filtro_estado } = req.query;
const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

matchStage: {
  fecha_pedido: { $gte: desde_date, $lte: hasta_date },
  tipo: "pedido"
}
```

**Additional Filters (optional):**
- If `filtro_estado` is provided: matches against `estado` field
- Always filters for `tipo: "pedido"` (not presupuestos)

**Returns:**
- Model name, quantity sold, gross revenue
- Cost calculations and margins
- Discount and freight breakdown

---

### 3. **GET /reportes/ventas-por-vendedor**
**Purpose:** Sales metrics by salesperson

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `desde` | string (ISO date) | Start date for filtering |
| `hasta` | string (ISO date) | End date for filtering |
| `usuarioId` | string | Filter by specific vendor ID (optional) |
| `filtro_estado` | string | Filter by tipo: "pedido" or "presupuesto" (optional) |

**Date Filtering:**
```typescript
const { desde, hasta, usuarioId, filtro_estado } = req.query;
const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

matchStage: {
  fecha_pedido: { $gte: desde_date, $lte: hasta_date }
}
```

**Additional Filters (optional):**
- If `usuarioId` provided: filters by `usuarioId` field
- If `filtro_estado` provided: filters by `tipo` field (not `estado`)

**Returns:**
- Vendor name, total invoiced, order counts
- Conversion rate, average ticket
- Advance payments and pending amounts

---

### 4. **GET /reportes/top-clientes**
**Purpose:** Top customers by spending

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `desde` | string (ISO date) | Start date for filtering |
| `hasta` | string (ISO date) | End date for filtering |
| `limite` | number | Limit results (default: 10) |

**Date Filtering:**
```typescript
const { desde, hasta, limite = 10 } = req.query;
const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

$match: {
  fecha_pedido: { $gte: desde_date, $lte: hasta_date },
  tipo: "pedido"
}
```

**Limit Handling:**
```typescript
{ $limit: parseInt(limite as string) || 10 }
```

**Returns:**
- Customer details (name, DNI, contact, address)
- Purchase count, total spent, pending amounts
- Average per order

---

### 5. **GET /reportes/comparativa-vendedores**
**Purpose:** Vendor comparison over time

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `meses` | number | Number of months to compare (default: 12) |

**Date Calculation (does NOT use desde/hasta):**
```typescript
const { meses = 12 } = req.query;
const mesesNum = parseInt(meses as string) || 12;

const fechaInicial = new Date();
fechaInicial.setMonth(fechaInicial.getMonth() - mesesNum);
fechaInicial.setDate(1);
fechaInicial.setHours(0, 0, 0, 0);

const hoy = new Date();
hoy.setHours(23, 59, 59, 999);
```

**Special Note:** This endpoint calculates its own date range based on `meses` parameter (NOT using desde/hasta)

**Returns:**
- Month-by-month sales comparison
- Current ranking (last 30 days)
- Temporal series data for charting

---

### 6. **GET /reportes/rentabilidad-modelo**
**Purpose:** Profitability analysis by model

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `desde` | string (ISO date) | Start date for filtering |
| `hasta` | string (ISO date) | End date for filtering |
| `idModelo` | string | Filter by specific model ID (optional) |

**Date Filtering:**
```typescript
const { desde, hasta, idModelo } = req.query;
const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

matchStage: {
  fecha_pedido: { $gte: desde_date, $lte: hasta_date },
  tipo: "pedido"
}
```

**Returns:**
- Gross and net margins by model
- Profitability metrics
- Cost breakdowns
- Most and least profitable models

---

### 7. **GET /reportes/tasa-conversion**
**Purpose:** Budget to order conversion rate analysis

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `desde` | string (ISO date) | Start date for filtering |
| `hasta` | string (ISO date) | End date for filtering |
| `idModelo` | string | Filter by specific model ID (optional) |
| `usuarioId` | string | Filter by specific vendor ID (optional) |

**Date Filtering:**
```typescript
const { desde, hasta, idModelo, usuarioId } = req.query;
const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

matchStage: {
  fecha_pedido: { $gte: desde_date, $lte: hasta_date }
}
```

**Additional Filters (optional):**
- If `usuarioId` provided: added to match stage
- Analysis includes presupuestos vs pedidos

**Distinction Between Document Types:**
```typescript
// Counts by tipo field
presupuestos: { $sum: { $cond: [{ $eq: ["$tipo", "presupuesto"] }, 1, 0] } }
pedidos: { $sum: { $cond: [{ $eq: ["$tipo", "pedido"] }, 1, 0] } }

// Conversion rate = pedidos / (pedidos + presupuestos) * 100
```

**Returns:**
- Global conversion rate
- Conversion by vendor
- Conversion by model
- Document counts

---

### 8. **GET /reportes/rentabilidad-cliente**
**Purpose:** Profitability analysis by customer

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `desde` | string (ISO date) | Start date for filtering |
| `hasta` | string (ISO date) | End date for filtering |
| `nombreCliente` | string | Filter by customer name (regex, case-insensitive) |
| `limite` | number | Limit results (default: 20) |

**Date Filtering:**
```typescript
const { desde, hasta, nombreCliente, limite = 20 } = req.query;
const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

matchStage: {
  fecha_pedido: { $gte: desde_date, $lte: hasta_date },
  tipo: "pedido"
}
```

**Additional Filters (optional):**
- If `nombreCliente` provided: uses regex matching
```typescript
if (nombreCliente) {
  matchStage["cliente.nombre"] = new RegExp(nombreCliente as string, "i");
}
```

**Limit Handling:**
```typescript
{ $limit: parseInt(limite as string) || 20 }
```

**Returns:**
- Customer profitability metrics
- Gross and net margins
- Revenue, costs, and discounts
- Most and least profitable customers

---

### 9. **GET /reportes/analisis-descuentos**
**Purpose:** Discount and extra costs analysis

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `desde` | string (ISO date) | Start date for filtering |
| `hasta` | string (ISO date) | End date for filtering |
| `tipoAnalisis` | string | Type of analysis (optional, not actively used) |

**Date Filtering:**
```typescript
const { desde, hasta, tipoAnalisis } = req.query;
const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

$match: {
  fecha_pedido: { $gte: desde_date, $lte: hasta_date },
  tipo: "pedido"
}
```

**Returns:**
- Summary of discounts, freight, installation values
- Discounts by model
- Orders with high discounts (top 10)
- Trend analysis by period (last 12 months)

---

### 10. **GET /reportes/estado-pedidos**
**Purpose:** Order status and fulfillment tracking

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `desde` | string (ISO date) | Start date for filtering |
| `hasta` | string (ISO date) | End date for filtering |
| `estado` | string | Filter by specific order estado (optional) |
| `usuarioId` | string | Filter by specific vendor ID (optional) |
| `limite` | number | Limit results (default: 50) |

**Date Filtering:**
```typescript
const { desde, hasta, estado, usuarioId, limite = 50 } = req.query;
const { desde_date, hasta_date } = getDateRange(desde as string, hasta as string);

matchStage: {
  fecha_pedido: { $gte: desde_date, $lte: hasta_date },
  tipo: "pedido"
}
```

**Additional Filters (optional):**
- If `estado` provided: filters by `estado` field
- If `usuarioId` provided: filters by `usuarioId` field

**Limit Handling:**
```typescript
{ $limit: parseInt(limite as string) || 50 }
```

**Time Calculations (added to response):**
```typescript
dias_transcurridos: {
  $divide: [
    { $subtract: [new Date(), "$fecha_pedido"] },
    1000 * 60 * 60 * 24
  ]
}

dias_hasta_entrega: {
  $divide: [
    { $subtract: ["$fecha_entrega_estimada", "$fecha_pedido"] },
    1000 * 60 * 60 * 24
  ]
}

demora_real: {
  $cond: [
    { $eq: ["$estado", "entregado"] },
    { $divide: [{ $subtract: [new Date(), "$fecha_pedido"] }, 1000 * 60 * 60 * 24] },
    null
  ]
}
```

**Returns:**
- Summary by estado (status)
- Detailed order list with status tracking
- Days elapsed, days to delivery
- Payment method and advance info
- Time statistics

---

## Common Query Parameter Patterns

### Date Parameters
- **Pattern:** `desde`, `hasta`
- **Format:** ISO date strings (e.g., "2024-01-15")
- **Defaults:** 
  - `desde`: January 1st of current year
  - `hasta`: Today (inclusive, to 23:59:59.999)

### Filter Parameters
- **By Model:** `idModelo` (string)
- **By Vendor:** `usuarioId` (string)
- **By Customer:** `nombreCliente` (string, regex-enabled)
- **By Status:** `estado` (string)
- **By Document Type:** `filtro_estado` (string: "pedido" or "presupuesto")

### Pagination/Limiting
- **Parameter:** `limite`
- **Type:** number
- **Defaults vary by endpoint:**
  - Top Clientes: 10
  - Rentabilidad Cliente: 20
  - Estado Pedidos: 50
- **Parsing:** `parseInt(limite as string) || defaultValue`

### Unique Parameters
- **comparativa-vendedores:** Uses `meses` instead of `desde`/`hasta`
- **top-clientes:** Supports `limite` parameter

---

## MongoDB Field Names Used for Date Filtering

All endpoints filter on: **`fecha_pedido`** field

- Type: Date
- Used in: All endpoints except `comparativa-vendedores`
- Filter operators: `$gte` (greater than or equal) and `$lte` (less than or equal)

---

## Related Date Fields in Responses

- `fecha_pedido`: Order creation date
- `fecha_entrega_estimada`: Estimated delivery date
- `fecha_entrega_real`: Actual delivery date (if delivered)
- `ultimo_pedido`: Last order date (in top-clientes)

---

## Authentication

All reportes endpoints require:
- `authMiddleware`: Must be authenticated
- `requireRole(["Admin", "Superadmin"])`: Only Admins and Superadmins can access

```typescript
router.use(authMiddleware);
router.use(requireRole(["Admin", "Superadmin"]));
```

---

## Example Requests

### Dashboard (last 30 days)
```
GET /reportes/dashboard?desde=2024-12-14&hasta=2025-01-13
```

### Ventas por Modelo (specific model)
```
GET /reportes/ventas-por-modelo?desde=2024-01-01&hasta=2025-01-13&idModelo=507f1f77bcf86cd799439011
```

### Tasa Conversión (by vendor)
```
GET /reportes/tasa-conversion?desde=2024-01-01&hasta=2025-01-13&usuarioId=507f1f77bcf86cd799439012
```

### Estado Pedidos (with limit)
```
GET /reportes/estado-pedidos?desde=2024-01-01&hasta=2025-01-13&estado=entregado&limite=100
```

### Top Clientes (custom limit)
```
GET /reportes/top-clientes?desde=2024-01-01&hasta=2025-01-13&limite=20
```

### Comparativa Vendedores (last 6 months)
```
GET /reportes/comparativa-vendedores?meses=6
```

### Rentabilidad Cliente (with customer filter)
```
GET /reportes/rentabilidad-cliente?desde=2024-01-01&hasta=2025-01-13&nombreCliente=ACME&limite=30
```
