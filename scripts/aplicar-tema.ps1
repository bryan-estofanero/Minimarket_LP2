$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'cargar-entorno.ps1')

# Actualiza únicamente la apariencia del realm existente; la importación inicial
# de Keycloak no aplica cambios a realms que ya están creados.
$taskKeycloak = 'http://localhost:38080'
$taskToken = $null
for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
    try {
        $taskToken = Invoke-RestMethod -Method Post -Uri "$taskKeycloak/realms/master/protocol/openid-connect/token" -Body @{
            grant_type = 'password'
            client_id = 'admin-cli'
            username = 'admin'
            password = $env:KEYCLOAK_ADMIN_PASSWORD
        } -TimeoutSec 5
        break
    } catch {
        if ($taskAttempt -eq 29) { throw 'No se pudo acceder a Keycloak con la cuenta administrativa local.' }
        Start-Sleep -Seconds 2
    }
}
$taskAppearance = @{
    loginTheme = 'minimarket'
    internationalizationEnabled = $true
    supportedLocales = @('es', 'en')
    defaultLocale = 'es'
} | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "$taskKeycloak/admin/realms/minimarket" -Headers @{
    Authorization = "Bearer $($taskToken.access_token)"
} -ContentType 'application/json' -Body $taskAppearance -TimeoutSec 15 | Out-Null
Write-Output 'Tema claro Minimarket aplicado al inicio de sesión.'
