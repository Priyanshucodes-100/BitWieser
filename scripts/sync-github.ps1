# Push local source to https://github.com/Priyanshucodes-100/BitWieser.git
# Does not add .env, installers, or node_modules (see .gitignore).

$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))

git status --short
if (-not (git status --porcelain)) {
  Write-Host 'Nothing to commit. Already clean.'
  exit 0
}

git add -A
git status --short

$pending = git diff --cached --name-only
if (-not $pending) {
  Write-Host 'Nothing staged after gitignore. Done.'
  exit 0
}

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
git commit -m "Sync local work to BitWieser ($stamp)"
git push -u origin HEAD
Write-Host 'BitWieser main updated.'
