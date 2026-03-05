$ErrorActionPreference = "Stop"

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = "C:\Python313\python.exe"
$port = 3939
$logDir = Join-Path $HOME ".codex\log\notion-mcp"
$outLog = Join-Path $logDir "stdout.log"
$errLog = Join-Path $logDir "stderr.log"

# Skip if the endpoint is already listening.
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($listener) {
  exit 0
}

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

Start-Process -FilePath $python `
  -ArgumentList @("$base\server.py", "--transport", "http", "--port", "$port", "--disable-auth") `
  -WorkingDirectory $base `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -WindowStyle Hidden | Out-Null

Start-Sleep -Seconds 2

try {
  $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -UseBasicParsing -TimeoutSec 8
  if ($resp.StatusCode -ne 200) { exit 1 }
} catch {
  exit 1
}

exit 0
