# Crea en GitHub los Issues de los requerimientos (uno por archivo NN-*.md de esta carpeta) con TU cuenta.
# Uso en Windows (PowerShell), una sola vez:
#   1. Instala GitHub CLI:   winget install --id GitHub.cli
#   2. Inicia sesión:        gh auth login
#   3. Ejecuta:              powershell -ExecutionPolicy Bypass -File docs\issues\crear-issues.ps1
# Si un Issue con el mismo título ya existe, lo salta (se puede ejecutar dos veces sin duplicar).
param([string]$Repo = "WillC372/FrontendPatSft")
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot
gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Primero inicia sesión con: gh auth login"; exit 1 }

$labels = @(
  @{ n = "requerimiento funcional";    c = "1f6feb"; d = "Requerimiento funcional (RF)" },
  @{ n = "requerimiento no funcional"; c = "8957e5"; d = "Requerimiento no funcional (RNF)" },
  @{ n = "historia de usuario";        c = "0e8a16"; d = "Como... quiero... para..." },
  @{ n = "estado: hecho";              c = "2da44e"; d = "Implementado y probado en la app publicada" },
  @{ n = "estado: parcial";            c = "d29922"; d = "Implementado con una limitación indicada" }
)
foreach ($l in $labels) { gh label create $l.n --repo $Repo --color $l.c --description $l.d --force | Out-Null }

$existing = gh issue list --repo $Repo --state all --limit 500 --json title --jq ".[].title"
Get-ChildItem -File | Where-Object { $_.Name -match "^\d\d-.*\.md$" } | Sort-Object Name | ForEach-Object {
  $lines = Get-Content $_.FullName -Encoding UTF8
  $title = $lines[0] -replace "^# ", ""
  if ($existing -contains $title) { Write-Host "Ya existe: $title"; return }
  $tags = ($lines[1] -replace "^<!-- etiquetas: ", "" -replace " -->$", "").Split(",") | ForEach-Object { $_.Trim() }
  $body = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllLines($body, $lines[3..($lines.Length - 1)], (New-Object System.Text.UTF8Encoding $false))
  $ghArgs = @("issue", "create", "--repo", $Repo, "--title", $title, "--body-file", $body)
  foreach ($t in $tags) { $ghArgs += @("--label", $t) }
  gh @ghArgs
  Remove-Item $body
}
Write-Host "Listo. Revisa la pestaña Issues de https://github.com/$Repo"
