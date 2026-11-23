param(
    [string]$DirectorioProyecto = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$rutaEjemplo = Join-Path $DirectorioProyecto '.env.example'
$rutaEnv = Join-Path $DirectorioProyecto '.env'

if (Test-Path -LiteralPath $rutaEnv) {
    throw "Ya existe '$rutaEnv'. No se modificó para proteger sus secretos."
}

if (-not (Test-Path -LiteralPath $rutaEjemplo -PathType Leaf)) {
    throw "No se encontró la plantilla '$rutaEjemplo'."
}

$claves = @(
    'DB_PASSWORD',
    'POSTGRES_PASSWORD',
    'ADMIN_INITIAL_PASSWORD',
    'OWNER_INITIAL_PASSWORD',
    'BARISTA_INITIAL_PASSWORD',
    'MOZO_INITIAL_PASSWORD',
    'CLIENT_INITIAL_PASSWORD'
)

$lineas = [System.IO.File]::ReadAllLines($rutaEjemplo)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

try {
    foreach ($clave in $claves) {
        $coincidencias = @(
            for ($i = 0; $i -lt $lineas.Length; $i++) {
                if ($lineas[$i] -match "^$([regex]::Escape($clave))=") { $i }
            }
        )

        if ($coincidencias.Count -ne 1) {
            throw "La plantilla debe contener exactamente una línea '$clave='."
        }

        $bytes = New-Object byte[] 32
        $rng.GetBytes($bytes)
        $secreto = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
        $lineas[$coincidencias[0]] = "$clave=$secreto"
        [Array]::Clear($bytes, 0, $bytes.Length)
    }

    $contenido = [string]::Join([Environment]::NewLine, $lineas) + [Environment]::NewLine
    $utf8SinBOM = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($rutaEnv, $contenido, $utf8SinBOM)
    Write-Output "Se creó '$rutaEnv' con siete secretos aleatorios. No se sobrescribió ningún archivo existente."
}
finally {
    $rng.Dispose()
}
