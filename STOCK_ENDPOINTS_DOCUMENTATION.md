# Nuevos Endpoints para Manejo de Stock

Se han agregado tres nuevos endpoints para el manejo específico del stock, que permiten diferentes tipos de operaciones:

## 1. Establecer Valor Fijo
**Endpoint:** `PUT /api/stock/set/:id`

Establece un valor específico para el stock (no suma ni resta, sino que reemplaza el valor actual).

### Ejemplo de uso:
Si tienes 5 en stock y envías valor=20, el stock quedará en 20.

```json
PUT /api/stock/set/507f1f77bcf86cd799439011
{
  "valor": 20,
  "responsable": "Juan Pérez"
}
```

### Respuesta:
```json
{
  "message": "Stock establecido con éxito",
  "stock": { /* objeto stock actualizado */ },
  "valorAnterior": 5,
  "valorNuevo": 20,
  "diferencia": 15
}
```

## 2. Sumar al Stock
**Endpoint:** `PUT /api/stock/add/:id`

Suma una cantidad al stock actual.

### Ejemplo de uso:
Si tienes 5 en stock y envías cantidad=10, el stock quedará en 15.

```json
PUT /api/stock/add/507f1f77bcf86cd799439011
{
  "cantidad": 10,
  "responsable": "Juan Pérez"
}
```

### Respuesta:
```json
{
  "message": "Cantidad sumada al stock con éxito",
  "stock": { /* objeto stock actualizado */ },
  "valorAnterior": 5,
  "valorNuevo": 15,
  "cantidadSumada": 10
}
```

## 3. Restar del Stock
**Endpoint:** `PUT /api/stock/subtract/:id`

Resta una cantidad del stock actual.

### Ejemplo de uso:
Si tienes 15 en stock y envías cantidad=3, el stock quedará en 12.

```json
PUT /api/stock/subtract/507f1f77bcf86cd799439011
{
  "cantidad": 3,
  "responsable": "Juan Pérez"
}
```

### Respuesta:
```json
{
  "message": "Cantidad restada del stock con éxito",
  "stock": { /* objeto stock actualizado */ },
  "valorAnterior": 15,
  "valorNuevo": 12,
  "cantidadRestada": 3
}
```

## Validaciones

### Endpoint SET (valor fijo):
- ✅ El valor no puede ser negativo
- ✅ Se requiere `valor` y `responsable`

### Endpoint ADD (suma):
- ✅ La cantidad debe ser mayor a 0
- ✅ Se requiere `cantidad` y `responsable`

### Endpoint SUBTRACT (resta):
- ✅ La cantidad debe ser mayor a 0
- ✅ No permite que el stock quede negativo
- ✅ Se requiere `cantidad` y `responsable`

## Registro de Movimientos

Todos los endpoints registran automáticamente el movimiento en el sistema:
- **SET**: Tipo "ajuste" con la diferencia calculada
- **ADD**: Tipo "produccion" con la cantidad sumada
- **SUBTRACT**: Tipo "ajuste" con la cantidad restada (valor negativo)

## Activación Automática

Todos los endpoints activan automáticamente el stock (`stockActivo: true`) si estaba desactivado.

## Errores Comunes

### Error 400:
```json
{
  "message": "Faltan datos requeridos: valor y responsable"
}
```

### Error 404:
```json
{
  "message": "Stock no encontrado"
}
```

### Error 400 (resta insuficiente):
```json
{
  "message": "No se puede restar 10 del stock actual (5). El resultado sería negativo.",
  "stockActual": 5,
  "cantidadARestar": 10
}
```