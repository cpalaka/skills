# Bootstrap the Chunk library on a new Windows machine.
# Prereq: this repo (skills) is already cloned. Run this script from the clone:
#   powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1
# It creates a directory junction %USERPROFILE%\.claude\chunks -> <clone>\chunks so every project's
# @~/.claude/chunks/<name>.md imports resolve. A junction needs no admin rights. Idempotent.
$ErrorActionPreference = 'Stop'

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Chunks  = Join-Path $RepoDir 'chunks'
$Link    = Join-Path $env:USERPROFILE '.claude\chunks'

if (-not (Test-Path $Chunks)) { Write-Error "chunks\ not found at $Chunks - run this from the skills clone."; exit 1 }
New-Item -ItemType Directory -Force -Path (Split-Path $Link) | Out-Null

if (Test-Path $Link) {
  $item = Get-Item $Link -Force
  if ($item.LinkType -eq 'Junction' -and ($item.Target -contains $Chunks)) { Write-Host "ok: ~/.claude/chunks already junctioned -> $Chunks"; exit 0 }
  Write-Error "$Link already exists. Remove it and re-run."; exit 1
}

New-Item -ItemType Junction -Path $Link -Target $Chunks | Out-Null
Write-Host "junctioned $Link -> $Chunks"
Write-Host ""
Write-Host "Per consuming project: approve the external-includes prompt once on first launch (then restart"
Write-Host "so the imports load). Headless/automation runs must pass: --add-dir ~/.claude/chunks"
