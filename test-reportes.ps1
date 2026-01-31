# Script de Testing para Endpoints de Reportes
# =============================================

$baseUrl = "http://localhost:3000"
$apiUrl = "$baseUrl/api"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   TESTING DE ENDPOINTS DE REPORTES - AIRPLAC" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Funcion para hacer requests
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Token
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri $Url -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "   SUCCESS - Status 200" -ForegroundColor Green
        
        # Mostrar info del resultado
        if ($response.resumen) {
            Write-Host "   Resumen encontrado" -ForegroundColor Cyan
        } 
        if ($response.data) {
            $count = 0
            if ($response.data -is [array]) { 
                $count = $response.data.Count 
            } else { 
                $count = 1 
            }
            Write-Host "   Datos encontrados: $count registros" -ForegroundColor Cyan
        }
        
        Write-Host ""
        return $true
    }
    catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# ============================================
# 1. LOGIN (obtener token)
# ============================================
Write-Host "Paso 1: Autenticacion" -ForegroundColor Magenta
Write-Host "Usando credenciales de Superadmin..." -ForegroundColor Yellow
Write-Host ""

# Usar credenciales directamente
$username = "superadmin"
$password = "Temporal123!"

$loginBody = @{
    usuario = $username
    contrasena = $password
} | ConvertTo-Json

Write-Host "Usuario: $username" -ForegroundColor Cyan
Write-Host "Autenticando..." -ForegroundColor Yellow

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    $token = $loginResponse.accessToken
    
    Write-Host "Autenticacion exitosa!" -ForegroundColor Green
    Write-Host "   Usuario: superadmin" -ForegroundColor Cyan
    Write-Host "   Token obtenido correctamente" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host "Error en autenticacion." -ForegroundColor Red
    Write-Host "Respuesta del servidor: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Detalles: $($_.Exception.Message)" -ForegroundColor Red
    
    # Intentar extraer el mensaje de error del servidor
    try {
        $errorContent = $_.Exception.Response.Content.ReadAsStream() | ForEach-Object { [System.IO.StreamReader]::new($_).ReadToEnd() }
        Write-Host "Error del servidor: $errorContent" -ForegroundColor Red
    }
    catch { }
    
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Pausa para que el usuario vea el resultado
Start-Sleep -Seconds 1

# ============================================
# 2. TESTING DE ENDPOINTS
# ============================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   INICIANDO TESTS DE ENDPOINTS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

# FASE 1: Reportes Principales
Write-Host "FASE 1: Reportes Principales" -ForegroundColor Magenta
Write-Host "--------------------------------------------------" -ForegroundColor Gray

if (Test-Endpoint -Name "Dashboard" -Url "$apiUrl/reportes/dashboard" -Token $token) { $successCount++ } else { $failCount++ }
if (Test-Endpoint -Name "Ventas por Modelo" -Url "$apiUrl/reportes/ventas-por-modelo" -Token $token) { $successCount++ } else { $failCount++ }
if (Test-Endpoint -Name "Ventas por Vendedor" -Url "$apiUrl/reportes/ventas-por-vendedor" -Token $token) { $successCount++ } else { $failCount++ }
if (Test-Endpoint -Name "Top Clientes" -Url "$apiUrl/reportes/top-clientes?limite=5" -Token $token) { $successCount++ } else { $failCount++ }

# FASE 2: Reportes Estrategicos
Write-Host "FASE 2: Reportes Estrategicos" -ForegroundColor Magenta
Write-Host "--------------------------------------------------" -ForegroundColor Gray

if (Test-Endpoint -Name "Comparativa Vendedores" -Url "$apiUrl/reportes/comparativa-vendedores?meses=6" -Token $token) { $successCount++ } else { $failCount++ }
if (Test-Endpoint -Name "Rentabilidad por Modelo" -Url "$apiUrl/reportes/rentabilidad-modelo" -Token $token) { $successCount++ } else { $failCount++ }
if (Test-Endpoint -Name "Tasa de Conversion" -Url "$apiUrl/reportes/tasa-conversion" -Token $token) { $successCount++ } else { $failCount++ }

# FASE 3: Analisis Detallado
Write-Host "FASE 3: Analisis Detallado" -ForegroundColor Magenta
Write-Host "--------------------------------------------------" -ForegroundColor Gray

if (Test-Endpoint -Name "Rentabilidad por Cliente" -Url "$apiUrl/reportes/rentabilidad-cliente?limite=10" -Token $token) { $successCount++ } else { $failCount++ }
if (Test-Endpoint -Name "Analisis de Descuentos" -Url "$apiUrl/reportes/analisis-descuentos" -Token $token) { $successCount++ } else { $failCount++ }
if (Test-Endpoint -Name "Estado de Pedidos" -Url "$apiUrl/reportes/estado-pedidos?limite=20" -Token $token) { $successCount++ } else { $failCount++ }

# FASE 4: Reportes Operacionales
Write-Host "FASE 4: Reportes Operacionales" -ForegroundColor Magenta
Write-Host "--------------------------------------------------" -ForegroundColor Gray

if (Test-Endpoint -Name "Stock y Produccion" -Url "$apiUrl/reportes/stock-produccion?alertaStock=50" -Token $token) { $successCount++ } else { $failCount++ }
if (Test-Endpoint -Name "Metodos Pago y Procedencia" -Url "$apiUrl/reportes/metodos-pago-procedencia" -Token $token) { $successCount++ } else { $failCount++ }

# ============================================
# 3. RESUMEN FINAL
# ============================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   RESUMEN DE TESTS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = $successCount + $failCount
$successRate = 0
if ($totalTests -gt 0) {
    $successRate = [math]::Round(($successCount / $totalTests) * 100, 2)
}

Write-Host "Total de tests:        $totalTests" -ForegroundColor White
Write-Host "Exitosos:              $successCount" -ForegroundColor Green
Write-Host "Fallidos:              $failCount" -ForegroundColor Red
Write-Host "Tasa de exito:         $successRate%" -ForegroundColor White
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "TODOS LOS TESTS PASARON EXITOSAMENTE!" -ForegroundColor Green
} elseif ($successCount -gt 0) {
    Write-Host "Algunos tests fallaron. Revisa los errores arriba." -ForegroundColor Yellow
} else {
    Write-Host "Todos los tests fallaron. Revisa la configuracion del servidor." -ForegroundColor Red
}

Write-Host ""
Write-Host "Presiona Enter para salir..." -ForegroundColor Gray
Read-Host
