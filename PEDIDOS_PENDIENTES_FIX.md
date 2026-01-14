# Fix: Evaluación Automática de Pedidos Pendientes

## Problema Identificado

Después de la implementación de los nuevos endpoints de stock (`/set`, `/add`, `/subtract`), se perdió la funcionalidad que automáticamente cambia pedidos de estado "pendiente" a "reservado" cuando hay suficiente stock disponible.

## Funcionalidad Original

En el endpoint original `actualizarStock`, cuando se agregaba stock, se llamaba a la función `evaluarPedidosPendientes()` que:

1. **Busca pedidos pendientes** para ese stock específico
2. **Calcula stock disponible** (stock total - reservado)
3. **Evalúa cada pedido pendiente** para ver si hay suficiente stock
4. **Cambia automáticamente** de "pendiente" → "reservado" si hay stock suficiente
5. **Actualiza el estado** en ambos lugares: Stock y Pedido

## Solución Implementada

Se agregó la llamada a `evaluarPedidosPendientes()` en los nuevos endpoints:

### 1. `setStockValue` (Establecer valor fijo)
```typescript
// ✅ Evaluar pedidos pendientes si el stock aumentó
if (diferencia > 0) {
  await evaluarPedidosPendientes(stockId);
  console.log(`🔄 Evaluando pedidos pendientes después de establecer stock a ${valor}`);
}
```
**Solo se evalúa cuando el nuevo valor es mayor al anterior**

### 2. `addToStock` (Sumar cantidad)
```typescript
// ✅ Evaluar pedidos pendientes después de sumar stock
await evaluarPedidosPendientes(stockId);
console.log(`🔄 Evaluando pedidos pendientes después de sumar ${cantidad} al stock`);
```
**Siempre se evalúa porque siempre se está sumando stock**

### 3. `subtractFromStock` (Restar cantidad)
**No se evalúa** porque estamos restando stock, no agregando.

## Funcionamiento de `evaluarPedidosPendientes()`

```typescript
const evaluarPedidosPendientes = async (idStock: string): Promise<void> => {
  // 1. Obtiene el stock actualizado
  // 2. Filtra pedidos en estado "pendiente"
  // 3. Calcula stock disponible (total - reservado)
  // 4. Para cada pedido pendiente:
  //    - Si hay suficiente stock disponible:
  //      ✅ Cambia a "reservado"
  //      ✅ Incrementa "reservado" en el stock
  //      ✅ Actualiza estado en el pedido
  //      ✅ Reduce stock disponible para el siguiente pedido
  //    - Si no hay suficiente:
  //      ❌ Mantiene como "pendiente"
}
```

## Flujo Completo Restaurado

### Ejemplo Práctico:
```
Situación inicial:
- Stock PIZARRA: 200 unidades
- Pedido #1: 97.50 pendiente
- Stock disponible: 200 - 0 = 200

Usuario agrega +50 stock:
1. Stock se actualiza: 200 + 50 = 250
2. Se ejecuta evaluarPedidosPendientes()
3. Pedido #1 necesita 97.50, hay 250 disponible ✅
4. Pedido #1 cambia a "reservado"
5. Stock reservado: 0 + 97.50 = 97.50
6. Stock disponible: 250 - 97.50 = 152.50
```

## Logs de Seguimiento

Se agregaron logs para facilitar el debugging:
- `🔄 Evaluando pedidos pendientes después de establecer stock a X`
- `🔄 Evaluando pedidos pendientes después de sumar X al stock`
- `🟢 Pedido X cambiado a RESERVADO para stock Y`
- `🔴 Pedido X no puede ser reservado - Stock insuficiente`

## Compatibilidad

✅ **Mantiene funcionalidad original** del endpoint `actualizarStock`  
✅ **Agrega la funcionalidad** a los nuevos endpoints  
✅ **No afecta** operaciones de resta de stock  
✅ **Conserva** toda la lógica de reservas y disponibilidad

## Resultado

Ahora cuando se agrega stock mediante cualquier método:
- **Valor fijo** (si aumenta el stock)
- **Suma** de cantidad
- **Endpoint original** actualizarStock

Los pedidos pendientes se evalúan automáticamente y pasan a reservado cuando hay suficiente stock disponible, restaurando completamente la funcionalidad que existía antes de los cambios.