# 📋 Análisis de Configuración para Producción

## ✅ Resumen Ejecutivo

**Buenas noticias:** Tu API está bien diseñada y **solo necesitas cambiar variables de entorno** para pasar a producción. No hay URLs hardcodeadas en el código crítico.

---

## 🔧 Variables de Entorno Requeridas

### Variables que DEBES cambiar para producción:

#### 1. **FRONTEND_ORIGIN** ⚠️ **CRÍTICO**
```env
# Desarrollo
FRONTEND_ORIGIN=http://localhost:5173

# Producción
FRONTEND_ORIGIN=https://tudominio.com
# o con puerto si es necesario
FRONTEND_ORIGIN=https://tudominio.com:443
```

**Ubicación en código:**
- `src/app.ts` línea 26: Configuración de CORS
- `src/auth/auth.service.ts` línea 139: Configuración de cookies (secure flag)

**Impacto:**
- ✅ CORS se configura automáticamente
- ✅ Cookies se configuran como `secure: true` si usas HTTPS
- ✅ `sameSite` se ajusta automáticamente (`none` para HTTPS, `lax` para HTTP)

---

#### 2. **MONGO_URI** ⚠️ **CRÍTICO**
```env
# Desarrollo
MONGO_URI=mongodb://localhost:27017/airplac

# Producción (ejemplos)
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/airplac-prod
# o
MONGO_URI=mongodb://usuario:password@servidor:27017/airplac-prod
```

**Ubicación en código:**
- `src/config/database.ts` línea 5

---

#### 3. **NODE_ENV** ⚠️ **IMPORTANTE**
```env
# Desarrollo
NODE_ENV=development

# Producción
NODE_ENV=production
```

**Ubicación en código:**
- `src/app.ts` línea 20: Debug logs (puedes eliminarlos en producción)

**Impacto:**
- Afecta el comportamiento de algunas librerías
- Puede desactivar logs de debug

---

#### 4. **PORT** (Opcional)
```env
# Desarrollo
PORT=3000

# Producción (depende de tu servidor)
PORT=3000
# o el puerto que asigne tu proveedor (Heroku, Railway, etc.)
```

**Ubicación en código:**
- `src/server.ts` línea 12

---

### Variables que NO necesitas cambiar (pero verifica):

#### 5. **JWT_SECRET** 🔐
```env
JWT_SECRET=tu-secret-key-muy-segura
```
**⚠️ IMPORTANTE:** Usa un secret diferente en producción, más largo y complejo.

---

#### 6. **JWT_EXPIRATION_ACCESS** y **JWT_EXPIRATION_REFRESH**
```env
JWT_EXPIRATION_ACCESS=3600      # 1 hora
JWT_EXPIRATION_REFRESH=604800   # 7 días
```
Puedes mantener estos valores o ajustarlos según tus necesidades de seguridad.

---

#### 7. **EMAIL_USER** y **EMAIL_PASS**
```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password
```
Asegúrate de que funcionen en producción.

---

#### 8. **Variables de Superadmin**
```env
SUPERADMIN_EMAIL=admin@tudominio.com
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=tu-password-segura
DEFAULT_SUCURSAL_ID=tu-sucursal-id
```

---

## 📍 Lugares en el Código (Solo Referencia)

### ✅ Configuraciones Automáticas (No requieren cambios)

1. **CORS** - `src/app.ts:24-29`
   - Se configura automáticamente desde `FRONTEND_ORIGIN`
   - ✅ No requiere cambios en código

2. **Cookies Secure** - `src/auth/auth.service.ts:137-149`
   - Detecta automáticamente HTTPS desde `FRONTEND_ORIGIN`
   - ✅ No requiere cambios en código

3. **Base de Datos** - `src/config/database.ts:5`
   - Usa `MONGO_URI` de variables de entorno
   - ✅ No requiere cambios en código

---

### 📝 Lugares con Valores Hardcodeados (Solo Informativos - NO afectan producción)

#### 1. **Mensaje de Consola** - `src/server.ts:24`
```typescript
console.log(`Server running on http://localhost:${PORT} VERSION NUEVA`);
```
**Estado:** ⚠️ Solo es un mensaje de log. No afecta la funcionalidad.
**Recomendación:** Opcional - puedes mejorarlo para mostrar el dominio real en producción.

#### 2. **Scripts de Prueba** - `test-login.ps1` y `test-reportes.ps1`
```powershell
$baseUrl = "http://localhost:3000"
```
**Estado:** ✅ Solo scripts de desarrollo. No se usan en producción.

#### 3. **Valor por defecto en migración** - `src/scripts/migratePedidosUsuarios.ts:19`
```typescript
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/airplac';
```
**Estado:** ✅ Solo fallback si no hay variable de entorno. En producción siempre tendrás `MONGO_URI` configurado.

---

## 🚀 Checklist para Producción

### Variables de Entorno (.env)
- [ ] `FRONTEND_ORIGIN` → Tu dominio de producción con HTTPS
- [ ] `MONGO_URI` → URI de MongoDB en producción
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` → Secret nuevo y seguro
- [ ] `PORT` → Puerto asignado por tu proveedor (o 3000)
- [ ] `EMAIL_USER` y `EMAIL_PASS` → Verificados
- [ ] `SUPERADMIN_*` → Configurados correctamente

### Configuración del Servidor
- [ ] HTTPS configurado (certificado SSL)
- [ ] Firewall configurado (solo puertos necesarios)
- [ ] Variables de entorno configuradas en el servidor
- [ ] MongoDB accesible desde el servidor de producción

### Seguridad
- [ ] `.env` en `.gitignore` (ya está ✅)
- [ ] `JWT_SECRET` fuerte y único
- [ ] CORS configurado solo para tu dominio
- [ ] Cookies con `secure: true` (automático con HTTPS)

### Opcional (Mejoras)
- [ ] Eliminar logs de debug en `src/app.ts` líneas 18-21
- [ ] Mejorar mensaje de inicio en `src/server.ts:24`
- [ ] Configurar rate limiting
- [ ] Configurar logging estructurado

---

## 🔍 Análisis Detallado por Archivo

### `src/app.ts`
**Líneas críticas:**
- **26:** `origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"`
  - ✅ Usa variable de entorno
  - ⚠️ Fallback a localhost (solo desarrollo)

**Líneas informativas (debug):**
- **18-21:** Logs de debug
  - 💡 Recomendación: Eliminar o condicionar con `NODE_ENV !== 'production'`

---

### `src/auth/auth.service.ts`
**Líneas críticas:**
- **139:** `const isSecure = process.env.FRONTEND_ORIGIN?.startsWith('https://') || false;`
  - ✅ Detecta automáticamente HTTPS
  - ✅ Configura cookies `secure` correctamente

---

### `src/server.ts`
**Líneas críticas:**
- **12:** `const PORT = process.env.PORT || 3000`
  - ✅ Usa variable de entorno

**Líneas informativas:**
- **24:** Mensaje de consola con localhost
  - 💡 Opcional: Mejorar para producción

---

### `src/config/database.ts`
**Líneas críticas:**
- **5:** `await mongoose.connect(process.env.MONGO_URI || '', {...})`
  - ✅ Usa variable de entorno
  - ⚠️ Fallback vacío (asegúrate de tener `MONGO_URI` configurado)

---

## 📊 Resumen de Cambios Necesarios

| Componente | Cambio Requerido | Tipo |
|------------|------------------|------|
| CORS | Solo variable `FRONTEND_ORIGIN` | ✅ Variable de entorno |
| Cookies | Automático (detecta HTTPS) | ✅ Automático |
| Base de Datos | Solo variable `MONGO_URI` | ✅ Variable de entorno |
| Puerto | Solo variable `PORT` | ✅ Variable de entorno |
| JWT | Solo variable `JWT_SECRET` | ✅ Variable de entorno |
| Email | Variables `EMAIL_USER` y `EMAIL_PASS` | ✅ Variable de entorno |
| Logs Debug | Opcional: Eliminar o condicionar | 💡 Mejora opcional |
| Mensaje Inicio | Opcional: Mejorar | 💡 Mejora opcional |

---

## ✅ Conclusión

**Solo necesitas cambiar variables de entorno.** Tu código está bien diseñado y no tiene dependencias hardcodeadas que bloqueen el despliegue a producción.

### Pasos para Producción:
1. Configurar todas las variables de entorno en tu servidor
2. Asegurar que `FRONTEND_ORIGIN` apunte a tu dominio con HTTPS
3. Verificar que `MONGO_URI` apunte a tu base de datos de producción
4. Configurar `NODE_ENV=production`
5. (Opcional) Eliminar logs de debug

**¡Tu API está lista para producción!** 🚀
