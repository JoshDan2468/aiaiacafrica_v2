param(
  [ValidatePattern('^[a-z0-9][a-z0-9._-]+/[a-z0-9][a-z0-9._-]+$')][string]$Repository = "jaydee23/aiaiac-backend",
  [Parameter(Mandatory = $true)][ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$')][string]$Version
)
$ErrorActionPreference = "Stop"
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskImage = "docker.io/${Repository}:${Version}"
# Buildx pushes as part of the build; a failed push fails the release command.
docker buildx build --platform linux/amd64 --build-arg "VERSION=$Version" --tag $taskImage --push "$taskRoot/backend"
if ($LASTEXITCODE -ne 0) { throw "Backend build/push failed" }
Write-Host "Published $taskImage"
