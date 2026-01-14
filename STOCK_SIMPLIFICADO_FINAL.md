# Simplificación del Sistema de Stock - Solo Suma/Resta

## Cambios Realizados

### 🚫 **Eliminado:**
- **Endpoint `setStockValue`** (establecer valor fijo)
- **Rutas `/stock/set/:id`**
- **Opción "Valor Fijo"** en el frontend

### ✅ **Mantenido:**
- **Endpoint `addToStock`** (suma)
- **Endpoint `subtractFromStock`** (resta con validación mejorada)
- **Interfaz simplificada** con un solo input +/-

## Validación Crítica Implementada

### 🔒 **Restricción de Stock Disponible**
Antes se validaba contra el **stock total**, ahora se valida contra el **stock disponible**.

#### Backend - `subtractFromStock`:
```typescript
const stockReservado = stockAnterior.reservado || 0;
const stockDisponible = valorAnterior - stockReservado;

// ✅ VALIDAR CONTRA STOCK DISPONIBLE, NO TOTAL
if (cantidad > stockDisponible) {
  res.status(400).json({ 
    message: `No se puede restar ${cantidad} unidades. Stock disponible: ${stockDisponible} (Total: ${valorAnterior}, Reservado: ${stockReservado})`,
    stockTotal: valorAnterior,
    stockReservado: stockReservado,
    stockDisponible: stockDisponible,
    cantidadARestar: cantidad
  });
  return;
}
```

## Interfaz Simplificada

### **Un Solo Input**
- **Números positivos** → Suma al stock
- **Números negativos** → Resta del stock disponible

### **Información Completa**
```tsx
Stock total: 200.00 unidades
Stock reservado: 97.50 unidades
Stock disponible: 102.50 unidades ← Máximo que se puede restar
```

### **Validaciones Frontend**
- No permite restar más del stock disponible
- Vista previa en tiempo real
- Mensajes de error específicos

## Ejemplo Práctico

### Situación:
```
Stock total: 200
Stock reservado: 97.50
Stock disponible: 102.50
```

### Operaciones Permitidas:
✅ **Suma +50**: 200 + 50 = 250 (sin restricciones)  
✅ **Resta -50**: 200 - 50 = 150 (50 ≤ 102.50 disponible)  
❌ **Resta -120**: Error (120 > 102.50 disponible)

### Mensaje de Error:
```
"No se puede restar 120 unidades. 
Stock disponible: 102.50 (Total: 200, Reservado: 97.50)"
```

## Funcionalidad de Evaluación de Pedidos

### ✅ **Mantenida en addToStock**
Cuando se suma stock, se evalúan automáticamente los pedidos pendientes para pasarlos a reservado.

### ❌ **No aplica en subtractFromStock**
Al restar stock no se evalúan pedidos (lógico, ya que se reduce disponibilidad).

## Flujo de Trabajo Actualizado

### Para sumar stock:
1. Ingresa número positivo: `+45`
2. Se ejecuta `addToStock`
3. Se evalúan pedidos pendientes automáticamente
4. Pedidos pasan a reservado si hay stock suficiente

### Para restar stock:
1. Ingresa número negativo: `-20`
2. Se valida contra stock disponible
3. Se ejecuta `subtractFromStock` si es válido
4. No se evalúan pedidos (no aplica)

## Endpoints Finales

### 🟢 **Activos:**
- `PUT /api/stock/add/:id` - Suma cantidad
- `PUT /api/stock/subtract/:id` - Resta cantidad (con validación de disponible)

### 🔴 **Eliminados:**
- `PUT /api/stock/set/:id` - Establecer valor fijo (eliminado)

## Payload de Requests

```json
// Para ambos endpoints
{
  "cantidad": 45,
  "responsable": "Juan Pérez"
}
```

## Respuestas Mejoradas

### Success Response:
```json
{
  "message": "Cantidad sumada/restada del stock con éxito",
  "stock": { /* objeto actualizado */ },
  "valorAnterior": 200,
  "valorNuevo": 245,
  "cantidadSumada/Restada": 45
}
```

### Error Response (Resta):
```json
{
  "message": "No se puede restar 120 unidades. Stock disponible: 102.50 (Total: 200, Reservado: 97.50)",
  "stockTotal": 200,
  "stockReservado": 97.50,
  "stockDisponible": 102.50,
  "cantidadARestar": 120
}
```

## Beneficios

1. **🔒 Protección de Reservas**: No se puede restar stock comprometido
2. **🎯 Interfaz Simple**: Un solo input, más intuitivo
3. **📊 Información Clara**: Muestra total, reservado y disponible
4. **⚡ Proceso Rápido**: Menos pasos, menos errores
5. **🛡️ Validación Robusta**: Frontend y backend coordinados

## Compatibilidad

- ✅ Mantiene toda la funcionalidad de suma
- ✅ Mejora la funcionalidad de resta
- ✅ Elimina complejidad innecesaria
- ✅ Conserva evaluación automática de pedidos
- ✅ No afecta otras partes del sistema