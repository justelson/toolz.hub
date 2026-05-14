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

## Quick Install

From this folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -TestRender
```

From a remote raw script URL:

```powershell
irm https://raw.githubusercontent.com/<owner>/<repo>/<branch>/manim-installer/install-manim.ps1 -OutFile install-manim.ps1
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -TestRender
```

The script relaunches as Administrator when needed because it installs system packages and writes machine PATH entries.

## Common Commands

Install the default setup:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1
```

Install and render the test animation:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -TestRender
```

Pin Python and Manim versions:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -Python 3.12 -ManimVersion 0.20.0
```

Skip LaTeX:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -NoLatex
```

Check an existing install:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -DoctorOnly
```

Check an existing install and render Hello World:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -DoctorOnly -TestRender
```

Force-refresh the Manim uv tool install:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -Repair
```

Use existing manually installed system dependencies and skip Chocolatey:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-manim.ps1 -NoChoco
```

## Test Render

With `-TestRender`, the installer renders this scene:

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
