param(
  [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9.@_-]*$')][string]$InterServerHost = "162.35.8.152",
  [Parameter(Mandatory = $true)][ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$')][string]$Version,
  [ValidatePattern('^/[a-zA-Z0-9/_-]+$')][string]$RemoteDirectory = "/opt/aiaiac-staging"
)
$ErrorActionPreference = "Stop"
# The server has its own .env, backend.env and Docker login; secrets are never copied.
$taskDockerAccess = ssh -o BatchMode=yes -o ConnectTimeout=15 $InterServerHost 'if docker info >/dev/null 2>&1; then printf docker; elif sudo -n docker info >/dev/null 2>&1; then printf sudo; else exit 1; fi'
if ($LASTEXITCODE -ne 0) { throw "Cannot access Docker on InterServer" }
$taskDocker = switch ($taskDockerAccess) {
  "docker" { "env BACKEND_IMAGE_REF= BACKEND_VERSION='$Version' docker" }
  "sudo" { "sudo -n env BACKEND_IMAGE_REF= BACKEND_VERSION='$Version' docker" }
  default { throw "Unexpected Docker access response" }
}
ssh -o BatchMode=yes $InterServerHost "cd '$RemoteDirectory' && $taskDocker compose pull && $taskDocker compose up -d --no-build --wait --wait-timeout 900 && sed -i '/^BACKEND_VERSION=/d;/^BACKEND_IMAGE_REF=/d' .env && printf '\nBACKEND_VERSION=$Version\n' >> .env"
if ($LASTEXITCODE -ne 0) { throw "InterServer deployment failed" }
Write-Host "InterServer is running backend version $Version"
