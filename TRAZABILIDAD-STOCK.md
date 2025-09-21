# 📊 Sistema de Trazabilidad de Stock

## 🎯 Descripción

Sistema completo de trazabilidad que registra todos los movimientos de stock para poder seguir:

- **Stock de un modelo específico**
- **Pedidos de un cliente**
- **Movimientos por tipo**
- **Movimientos por precio**
- **Movimientos por fecha**

## 🔧 Tipos de Movimientos Registrados

| Tipo          | Descripción                             | Cantidad          |
| ------------- | --------------------------------------- | ----------------- |
| `produccion`  | Incremento de stock por producción      | Positiva          |
| `reserva`     | Reserva de stock para pedidos           | Positiva          |
| `liberacion`  | Liberación de stock reservado/pendiente | Negativa          |
| `entrega`     | Entrega de productos a cliente          | Negativa          |
| `eliminacion` | Eliminación de pedidos                  | Negativa          |
| `ajuste`      | Ajustes manuales de stock               | Positiva/Negativa |

## 🚀 Endpoints de Trazabilidad

### 1. Historial por Stock

```
GET /api/trazabilidad/stock/:idStock?limit=50
```

**Ejemplo:**

```bash
curl http://localhost:3000/api/trazabilidad/stock/65f8a1b2c3d4e5f6a7b8c9d0
```

### 2. Historial por Modelo

```
GET /api/trazabilidad/modelo/:idModelo?limit=50
```

**Ejemplo:**

```bash
curl http://localhost:3000/api/trazabilidad/modelo/65f8a1b2c3d4e5f6a7b8c9d1
```

### 3. Historial por Pedido

```
GET /api/trazabilidad/pedido/:idPedido
```

**Ejemplo:**

```bash
curl http://localhost:3000/api/trazabilidad/pedido/65f8a1b2c3d4e5f6a7b8c9d2
```

### 4. Trazabilidad Completa de Pedido

```
GET /api/trazabilidad/pedido/:idPedido/completa
```

**Respuesta:**

```json
{
  "message": "Trazabilidad de pedido obtenida exitosamente",
  "idPedido": "65f8a1b2c3d4e5f6a7b8c9d2",
  "resumen": {
    "totalMovimientos": 3,
    "tiposMovimientos": 2,
    "movimientosPorTipo": [
      {
        "tipo": "reserva",
        "cantidad": 1,
        "totalCantidad": 100
      },
      {
        "tipo": "entrega",
        "cantidad": 1,
        "totalCantidad": 100
      }
    ],
    "fechaPrimerMovimiento": "2024-01-15T10:00:00.000Z",
    "fechaUltimoMovimiento": "2024-01-20T15:30:00.000Z"
  },
  "movimientos": [...]
}
```

### 5. Historial por Cliente

```
GET /api/trazabilidad/cliente/:clienteNombre?limit=50
```

**Ejemplo:**

```bash
curl "http://localhost:3000/api/trazabilidad/cliente/Juan%20Perez"
```

### 6. Movimientos por Fechas

```
GET /api/trazabilidad/fechas?fechaInicio=2024-01-01&fechaFin=2024-01-31&limit=100
```

**Ejemplo:**

```bash
curl "http://localhost:3000/api/trazabilidad/fechas?fechaInicio=2024-01-01&fechaFin=2024-01-31"
```

### 7. Movimientos por Tipo

```
GET /api/trazabilidad/tipo/:tipo?limit=50
```

**Tipos válidos:** `produccion`, `reserva`, `liberacion`, `entrega`, `eliminacion`, `ajuste`

**Ejemplo:**

```bash
curl http://localhost:3000/api/trazabilidad/tipo/produccion
```

### 8. Búsqueda por Texto

```
GET /api/trazabilidad/buscar?texto=PLACAS&limit=50
```

**Ejemplo:**

```bash
curl "http://localhost:3000/api/trazabilidad/buscar?texto=PLACAS%20BARILOCHE"
```

### 9. Estadísticas

```
GET /api/trazabilidad/estadisticas?fechaInicio=2024-01-01&fechaFin=2024-01-31
```

**Respuesta:**

```json
{
  "message": "Estadísticas obtenidas exitosamente",
  "periodo": {
    "fechaInicio": "2024-01-01T00:00:00.000Z",
    "fechaFin": "2024-01-31T23:59:59.999Z"
  },
  "estadisticas": [
    {
      "_id": "produccion",
      "total_movimientos": 15,
      "total_cantidad": 1500,
      "total_valor": 7500000
    },
    {
      "_id": "entrega",
      "total_movimientos": 12,
      "total_cantidad": 1200,
      "total_valor": 6000000
    }
  ]
}
```

## 📋 Estructura de un Movimiento

```json
{
  "_id": "65f8a1b2c3d4e5f6a7b8c9d3",
  "idStock": "65f8a1b2c3d4e5f6a7b8c9d0",
  "idModelo": "65f8a1b2c3d4e5f6a7b8c9d1",
  "idPedido": "65f8a1b2c3d4e5f6a7b8c9d2",

  "producto": "PLACAS",
  "modelo": "BARILOCHE",

  "tipo_movimiento": "reserva",
  "cantidad": 100,

  "stock_anterior": 500,
  "stock_posterior": 500,
  "reservado_anterior": 0,
  "reservado_posterior": 100,
  "pendiente_anterior": 0,
  "pendiente_posterior": 0,

  "remito": "REM-2024-001",
  "cliente_nombre": "Juan Perez",
  "vendedor_id": "65f8a1b2c3d4e5f6a7b8c9d4",

  "responsable": "Sistema",
  "motivo": "Reserva por pedido REM-2024-001",

  "fecha": "2024-01-15T10:00:00.000Z",
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",

  "estado_pedido": "pendiente",
  "precio_unitario": 1500,
  "total_movimiento": 150000,

  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

## 🔍 Casos de Uso

### 1. Seguir un Producto desde Producción hasta Entrega

```bash
# 1. Ver movimientos de un stock específico
GET /api/trazabilidad/stock/65f8a1b2c3d4e5f6a7b8c9d0

# 2. Filtrar por tipo "produccion" para ver cuándo se produjo
GET /api/trazabilidad/tipo/produccion

# 3. Filtrar por tipo "entrega" para ver cuándo se entregó
GET /api/trazabilidad/tipo/entrega
```

### 2. Seguir Pedidos de un Cliente

```bash
# Ver todos los movimientos de un cliente
GET /api/trazabilidad/cliente/Juan%20Perez
```

### 3. Análisis por Período

```bash
# Ver movimientos del último mes
GET /api/trazabilidad/fechas?fechaInicio=2024-01-01&fechaFin=2024-01-31

# Ver estadísticas del período
GET /api/trazabilidad/estadisticas?fechaInicio=2024-01-01&fechaFin=2024-01-31
```

### 4. Búsqueda de Productos Específicos

```bash
# Buscar movimientos de placas de yeso
GET /api/trazabilidad/buscar?texto=PLACAS%20YESO

# Buscar por modelo específico
GET /api/trazabilidad/buscar?texto=BARILOCHE
```

## 🚀 Integración Automática

El sistema se integra automáticamente con:

- ✅ **createPedido**: Registra reservas y pendientes
- ✅ **cambiarEstadoAEntregado**: Registra entregas
- ✅ **deletePedido**: Registra liberaciones
- ✅ **updatePedido**: Registra cambios en reservas
- ✅ **updateStockConProduccion**: Registra producción

## 📊 Beneficios

1. **Trazabilidad Completa**: Seguimiento de cada producto desde producción hasta entrega
2. **Auditoría**: Registro de quién, cuándo y por qué se realizó cada movimiento
3. **Análisis**: Estadísticas y reportes detallados
4. **Búsqueda**: Encontrar información rápidamente por texto, fecha, tipo, etc.
5. **Transparencia**: Visibilidad total del flujo de stock

## 🔧 Configuración

El sistema está listo para usar. Solo necesitas:

1. ✅ **Modelo creado**: `MovimientoStock`
2. ✅ **Funciones utilitarias**: `movimientosStock.ts`
3. ✅ **Controlador**: `trazabilidadController.ts`
4. ✅ **Rutas**: `trazabilidadRoutes.ts`
5. ✅ **Integración**: En todas las funciones de pedidos y stock

¡El sistema de trazabilidad está completamente funcional! 🎉
