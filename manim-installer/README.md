# Manim Windows Installer

A one-command Windows bootstrapper for a system-wide Manim setup.

It uses Chocolatey for Windows-level dependencies and uv for Python, Python versions, and the Manim CLI. The goal is to make a fresh Windows machine ready to run `manim` without manually setting up Python, FFmpeg, LaTeX, PATH entries, or virtual environments.

## What It Installs

- Chocolatey, if missing
- uv, using Astral's official installer
- FFmpeg, through Chocolatey
- MiKTeX, through Chocolatey unless skipped
- Python, managed by uv
- Manim, installed as a uv tool
- Machine PATH entries for uv and Manim

Manim itself is not installed through Chocolatey. Chocolatey handles OS dependencies; uv handles the Python side.

## Recommended Sandbox Test

Copy/paste this into the default Windows Sandbox `cmd.exe` prompt. It downloads the latest installer, installs Manim system-wide, renders `Hello World`, and opens the MP4:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script -TestRender -OpenRender"
```

The script relaunches as Administrator when needed because it installs system packages and writes machine PATH entries.

## Remote Commands

Install, render, and open the generated MP4:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script -TestRender -OpenRender"
```

Install the default setup:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script"
```

Install and render the test animation:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script -TestRender"
```

Pin Python and Manim versions:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script -Python 3.12 -ManimVersion 0.20.0 -TestRender -OpenRender"
```

Skip LaTeX:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script -NoLatex -TestRender -OpenRender"
```

Check an existing install:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script -DoctorOnly"
```

Check an existing install, render Hello World, and open the MP4:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script -DoctorOnly -TestRender -OpenRender"
```

Force-refresh the Manim uv tool install:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script -Repair -TestRender -OpenRender"
```

Use existing manually installed system dependencies and skip Chocolatey:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script=Join-Path $env:TEMP 'install-manim.ps1'; irm 'https://raw.githubusercontent.com/justelson/toolz.hub/main/manim-installer/install-manim.ps1' -OutFile $script; powershell -NoProfile -ExecutionPolicy Bypass -File $script -NoChoco -TestRender -OpenRender"
```

## Test Render

With `-TestRender`, the installer renders this scene:

Add `-OpenRender` to open the generated MP4 after a successful render.

```python
from manim import *


class HelloWorld(Scene):
    def construct(self):
        text = Text("Hello World", font_size=72)
        self.play(Write(text))
        self.wait(1)
```

The rendered video is written under:

```text
%ProgramData%\ManimInstaller\test-render
```

## Install Layout

The default machine-wide layout is:

```text
%ProgramData%\ManimInstaller
  bin\                 # manim.exe and other uv tool shims
  uv\bin\              # uv.exe copied for machine PATH access
  uv\tools\            # uv tool virtual environments
  test-render\         # Hello World render test output
```

The installer also sets:

```text
UV_TOOL_DIR=%ProgramData%\ManimInstaller\uv\tools
UV_TOOL_BIN_DIR=%ProgramData%\ManimInstaller\bin
```

## Notes

- Run in an elevated PowerShell if UAC relaunch is disabled.
- Open a new terminal after installation if the current shell does not see `manim`.
- MiKTeX can take extra time on first LaTeX render while it installs missing TeX packages.
- The Hello World test uses Manim `Text`, so it can validate Manim without requiring a LaTeX-heavy scene.

## References

- Manim Community install docs: https://docs.manim.community/
- uv install docs: https://docs.astral.sh/uv/getting-started/installation/
- uv tools docs: https://docs.astral.sh/uv/concepts/tools/
- Chocolatey install docs: https://chocolatey.org/install
