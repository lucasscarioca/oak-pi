# WSL image paste

Adds an `Alt+V` shortcut for Pi running inside WSL.

When pressed, the extension reads the Windows clipboard image via PowerShell,
saves it as a PNG under WSL's temp directory, and pastes the WSL file path into
Pi's editor.

This works around Windows terminals intercepting `Ctrl+V` before Pi can handle
image paste.

## Usage

1. Copy a screenshot/image to the Windows clipboard.
2. Press `Alt+V` in Pi.
3. The generated PNG path is inserted into the prompt.

You can also run:

```text
/paste-wsl-image
```
