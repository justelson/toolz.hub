#requires -Version 5.1
<#
.SYNOPSIS
Installs a system-wide Windows Manim setup using Chocolatey for OS dependencies
and uv for Python, Python versions, and the Manim CLI.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -TestRender

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -Python 3.12 -ManimVersion 0.20.0 -TestRender
#>

[CmdletBinding()]
param(
    [string]$Python = "3.12",
    [string]$ManimVersion = "",
    [ValidateSet("miktex", "none")]
    [string]$Latex = "miktex",
    [switch]$NoLatex,
    [switch]$TestRender,
    [switch]$DoctorOnly,
    [switch]$Repair,
    [switch]$NoChoco,
    [switch]$NoAdminRelaunch,
    [switch]$Help,
    [string]$InstallRoot = "$env:ProgramData\ManimInstaller"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

if ($NoLatex) {
    $Latex = "none"
}

function Show-InstallerHelp {
    @"
Manim Windows Installer

Usage:
  powershell -ExecutionPolicy Bypass -File .\install-manim.ps1
  powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -TestRender
  powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -Python 3.12 -ManimVersion 0.20.0
  powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -DoctorOnly

What it installs:
  - Chocolatey, if missing
  - uv, using Astral's official installer
  - FFmpeg, using Chocolatey
  - MiKTeX, using Chocolatey unless -NoLatex or -Latex none is passed
  - Python, using uv-managed Python
  - Manim, using uv tool install into a machine-wide tool directory

Useful flags:
  -TestRender       Render a small Hello World animation after install/checks.
  -DoctorOnly       Only check the current machine; do not install packages.
  -Repair           Force-refresh uv's Manim tool install.
  -NoLatex          Skip LaTeX installation. Text-only Manim scenes still work.
  -NoChoco          Do not install Chocolatey or Chocolatey packages.
  -NoAdminRelaunch  Fail instead of relaunching elevated when admin is needed.
"@
}

if ($Help) {
    Show-InstallerHelp
    exit 0
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "OK  $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Quote-ForArgumentList {
    param([string]$Value)
    return '"' + ($Value -replace '"', '\"') + '"'
}

function Get-RelaunchArgumentList {
    $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Quote-ForArgumentList $PSCommandPath))

    foreach ($entry in $PSBoundParameters.GetEnumerator()) {
        if ($entry.Key -eq "NoAdminRelaunch") {
            continue
        }

        $value = $entry.Value
        if ($value -is [System.Management.Automation.SwitchParameter]) {
            if ($value.IsPresent) {
                $args += "-$($entry.Key)"
            }
            continue
        }

        $args += "-$($entry.Key)"
        $args += (Quote-ForArgumentList ([string]$value))
    }

    $args += "-NoAdminRelaunch"
    return $args
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$Arguments = @(),
        [switch]$IgnoreExitCode
    )

    & $FilePath @Arguments
    $exitCode = $LASTEXITCODE
    if (-not $IgnoreExitCode -and $null -ne $exitCode -and $exitCode -ne 0) {
        throw "$FilePath failed with exit code $exitCode"
    }
}

function Add-MachinePath {
    param([Parameter(Mandatory = $true)][string]$PathToAdd)

    if (-not (Test-Path $PathToAdd)) {
        New-Item -ItemType Directory -Force -Path $PathToAdd | Out-Null
    }

    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $parts = @()
    if ($machinePath) {
        $parts = $machinePath -split ";" | Where-Object { $_ }
    }

    $alreadyPresent = $false
    foreach ($part in $parts) {
        if ($part.TrimEnd("\") -ieq $PathToAdd.TrimEnd("\")) {
            $alreadyPresent = $true
            break
        }
    }

    if (-not $alreadyPresent) {
        $newPath = if ($machinePath) { "$machinePath;$PathToAdd" } else { $PathToAdd }
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
        Write-Ok "Added to machine PATH: $PathToAdd"
    }

    $envParts = $env:Path -split ";" | Where-Object { $_ }
    if (-not ($envParts | Where-Object { $_.TrimEnd("\") -ieq $PathToAdd.TrimEnd("\") })) {
        $env:Path = "$PathToAdd;$env:Path"
    }
}

function Refresh-ProcessPath {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = @($machinePath, $userPath, $env:Path) -join ";"
}

function Ensure-AdminIfNeeded {
    if ($DoctorOnly) {
        return
    }

    if (Test-Administrator) {
        return
    }

    if ($NoAdminRelaunch) {
        throw "Administrator rights are required for system-wide install. Re-run PowerShell as Administrator."
    }

    Write-Step "Relaunching as Administrator"
    $argList = Get-RelaunchArgumentList
    Start-Process -FilePath "powershell.exe" -ArgumentList $argList -Verb RunAs -Wait
    exit $LASTEXITCODE
}

function Ensure-Chocolatey {
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Ok "Chocolatey found"
        return
    }

    if ($NoChoco) {
        throw "Chocolatey is missing and -NoChoco was passed."
    }

    Write-Step "Installing Chocolatey"
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-Expression ((New-Object Net.WebClient).DownloadString("https://community.chocolatey.org/install.ps1"))
    Refresh-ProcessPath

    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        throw "Chocolatey install finished but choco.exe is still not on PATH. Open a new elevated PowerShell and retry."
    }

    Write-Ok "Chocolatey installed"
}

function Ensure-ChocoPackage {
    param(
        [Parameter(Mandatory = $true)][string]$PackageName,
        [Parameter(Mandatory = $true)][string]$CommandName
    )

    if (Get-Command $CommandName -ErrorAction SilentlyContinue) {
        Write-Ok "$PackageName found"
        return
    }

    if ($NoChoco) {
        throw "$PackageName is missing and -NoChoco was passed."
    }

    Write-Step "Installing $PackageName"
    Invoke-Native "choco" @("install", "-y", $PackageName)
    Refresh-ProcessPath

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Write-Warn "$PackageName installed, but $CommandName is not visible in this shell yet. PATH refresh may require a new terminal."
    } else {
        Write-Ok "$PackageName installed"
    }
}

function Ensure-Uv {
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        Write-Ok "uv found"
        return
    }

    Write-Step "Installing uv with Astral's official installer"
    Invoke-Native "powershell.exe" @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "irm https://astral.sh/uv/install.ps1 | iex")
    Refresh-ProcessPath

    $localUv = Join-Path $HOME ".local\bin\uv.exe"
    if (-not (Get-Command uv -ErrorAction SilentlyContinue) -and (Test-Path $localUv)) {
        $env:Path = "$(Split-Path $localUv);$env:Path"
    }

    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
        throw "uv installed but uv.exe is not available on PATH. Open a new PowerShell and retry."
    }

    Write-Ok "uv installed"
}

function Publish-UvMachineWide {
    $uvCommand = Get-Command uv -ErrorAction Stop
    $sourceDir = Split-Path $uvCommand.Source
    $machineUvBin = Join-Path $InstallRoot "uv\bin"
    New-Item -ItemType Directory -Force -Path $machineUvBin | Out-Null

    foreach ($exe in @("uv.exe", "uvx.exe", "uvw.exe")) {
        $source = Join-Path $sourceDir $exe
        $destination = Join-Path $machineUvBin $exe
        if (Test-Path $source) {
            if ((Resolve-Path -LiteralPath $source).Path -ine $destination) {
                Copy-Item -Force -Path $source -Destination $destination
            }
        }
    }

    Add-MachinePath $machineUvBin
    Write-Ok "uv published to machine path"
}

function Configure-UvToolDirs {
    $toolDir = Join-Path $InstallRoot "uv\tools"
    $toolBinDir = Join-Path $InstallRoot "bin"

    New-Item -ItemType Directory -Force -Path $toolDir, $toolBinDir | Out-Null

    [Environment]::SetEnvironmentVariable("UV_TOOL_DIR", $toolDir, "Machine")
    [Environment]::SetEnvironmentVariable("UV_TOOL_BIN_DIR", $toolBinDir, "Machine")
    $env:UV_TOOL_DIR = $toolDir
    $env:UV_TOOL_BIN_DIR = $toolBinDir

    Add-MachinePath $toolBinDir
    Write-Ok "uv tool directory set to $toolDir"
    Write-Ok "uv tool bin directory set to $toolBinDir"
}

function Ensure-Manim {
    Write-Step "Installing uv-managed Python $Python"
    Invoke-Native "uv" @("python", "install", $Python)

    $package = if ([string]::IsNullOrWhiteSpace($ManimVersion)) { "manim" } else { "manim==$ManimVersion" }
    $installArgs = @("tool", "install", "--python", $Python)
    if ($Repair) {
        $installArgs += "--force"
    }
    $installArgs += $package

    Write-Step "Installing Manim with uv"
    Invoke-Native "uv" $installArgs
    Refresh-ProcessPath

    if (-not (Get-Command manim -ErrorAction SilentlyContinue)) {
        $toolBinDir = [Environment]::GetEnvironmentVariable("UV_TOOL_BIN_DIR", "Machine")
        if ($toolBinDir) {
            $env:Path = "$toolBinDir;$env:Path"
        }
    }

    if (-not (Get-Command manim -ErrorAction SilentlyContinue)) {
        throw "Manim installed but manim.exe is not on PATH. Open a new terminal or check UV_TOOL_BIN_DIR."
    }

    Write-Ok "Manim command available"
}

function Invoke-Doctor {
    Write-Step "Doctor"

    $checks = @(
        @{ Name = "Chocolatey"; Command = "choco"; Required = -not $NoChoco },
        @{ Name = "uv"; Command = "uv"; Required = $true },
        @{ Name = "FFmpeg"; Command = "ffmpeg"; Required = $true },
        @{ Name = "Manim"; Command = "manim"; Required = $true },
        @{ Name = "LaTeX/pdflatex"; Command = "pdflatex"; Required = ($Latex -ne "none") }
    )

    $failed = @()
    foreach ($check in $checks) {
        if (-not $check.Required) {
            Write-Warn "$($check.Name) skipped"
            continue
        }

        $cmd = Get-Command $check.Command -ErrorAction SilentlyContinue
        if ($cmd) {
            Write-Ok "$($check.Name): $($cmd.Source)"
        } else {
            Write-Warn "$($check.Name): missing"
            $failed += $check.Name
        }
    }

    if (Get-Command uv -ErrorAction SilentlyContinue) {
        Invoke-Native "uv" @("--version") -IgnoreExitCode
        Invoke-Native "uv" @("tool", "dir", "--bin") -IgnoreExitCode
    }

    if (Get-Command manim -ErrorAction SilentlyContinue) {
        Invoke-Native "manim" @("--version") -IgnoreExitCode
        Invoke-Native "manim" @("checkhealth") -IgnoreExitCode
    }

    if ($failed.Count -gt 0) {
        throw "Doctor found missing requirements: $($failed -join ', ')"
    }
}

function Invoke-HelloWorldRender {
    Write-Step "Rendering Hello World test animation"

    $renderRoot = Join-Path $InstallRoot "test-render"
    New-Item -ItemType Directory -Force -Path $renderRoot | Out-Null

    $sourceScene = Join-Path $PSScriptRoot "scripts\hello_world.py"
    $scenePath = Join-Path $renderRoot "hello_world.py"

    if (Test-Path $sourceScene) {
        Copy-Item -Force -Path $sourceScene -Destination $scenePath
    } else {
        @'
from manim import *


class HelloWorld(Scene):
    def construct(self):
        text = Text("Hello World", font_size=72)
        self.play(Write(text))
        self.wait(1)
'@ | Set-Content -Encoding UTF8 -Path $scenePath
    }

    Push-Location $renderRoot
    try {
        Invoke-Native "manim" @("-ql", "--disable_caching", $scenePath, "HelloWorld")
    } finally {
        Pop-Location
    }

    $video = Get-ChildItem -Path $renderRoot -Recurse -Filter "HelloWorld.mp4" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $video) {
        throw "Manim completed but the HelloWorld.mp4 output was not found under $renderRoot."
    }

    Write-Ok "Rendered: $($video.FullName)"
}

Ensure-AdminIfNeeded

if ($DoctorOnly) {
    Invoke-Doctor
    if ($TestRender) {
        Invoke-HelloWorldRender
    }
    exit 0
}

Write-Step "Preparing machine-wide Manim install"
New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

if ($NoChoco) {
    Write-Warn "Skipping Chocolatey install and Chocolatey-managed dependencies"
} else {
    Ensure-Chocolatey
}
Ensure-Uv
Publish-UvMachineWide
Configure-UvToolDirs

if (-not $NoChoco) {
    Ensure-ChocoPackage -PackageName "ffmpeg" -CommandName "ffmpeg"
    if ($Latex -eq "miktex") {
        Ensure-ChocoPackage -PackageName "miktex" -CommandName "pdflatex"
    }
}

Ensure-Manim
Invoke-Doctor

if ($TestRender) {
    Invoke-HelloWorldRender
}

Write-Step "Complete"
Write-Ok "Open a new terminal if this shell does not see the updated machine PATH."
