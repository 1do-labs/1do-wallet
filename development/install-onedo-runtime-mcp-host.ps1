param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidatePattern('^[a-pA-P0-9]{32}$')]
  [string] $ExtensionId,
  [string] $CoreRoot = ''
)

$ErrorActionPreference = 'Stop'
$walletRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($CoreRoot)) {
  $CoreRoot = Join-Path (Split-Path -Parent $walletRoot) '1do-core'
}
$hostSource = Join-Path $walletRoot 'development\onedo-runtime-mcp-host.ts'
$hostDir = Join-Path $env:LOCALAPPDATA '1do-wallet-mcp'
$tokenFile = Join-Path $hostDir 'token'
$wrapper = Join-Path $hostDir '1do-runtime-mcp-host.cmd'
$manifest = Join-Path $hostDir 'com.1do.wallet.mcp.json'

New-Item -ItemType Directory -Force -Path $hostDir | Out-Null
@"
@echo off
cd /d "$walletRoot"
set "ONEDO_WALLET_MCP_TOKEN_FILE=$tokenFile"
node --import tsx "$hostSource"
"@ | Set-Content -Encoding ascii $wrapper

@{
  name = 'com.1do.wallet.mcp'
  description = '1Do Wallet MCP Native Messaging host'
  path = $wrapper
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $manifest

$registryPath = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.1do.wallet.mcp'
New-Item -Force -Path $registryPath | Out-Null
Set-ItemProperty -Path $registryPath -Name '(default)' -Value $manifest

Write-Output (ConvertTo-Json @{ host = $wrapper; manifest = $manifest; tokenFile = $tokenFile; extensionId = $ExtensionId } -Depth 3)
