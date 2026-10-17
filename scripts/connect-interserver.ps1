param(
  [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9.@_-]*$')][string]$InterServerHost = "162.35.8.152",
  [ValidateRange(1024,65535)][int]$LocalPort = 5500,
  [ValidateRange(1024,65535)][int]$RemotePort = 5000
)
$ErrorActionPreference = "Stop"
Write-Host "InterServer API tunnel: http://127.0.0.1:$LocalPort (keep this terminal running)"
ssh -N -o BatchMode=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L "127.0.0.1:${LocalPort}:127.0.0.1:${RemotePort}" $InterServerHost
if ($LASTEXITCODE -ne 0) { throw "InterServer SSH tunnel stopped or failed" }
