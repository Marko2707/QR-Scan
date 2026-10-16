<p align="center">
  <img src="build/icon.png" width="128" alt="QR Scan app icon">
</p>

<h1 align="center">QR Scan</h1>

<p align="center">
  Scan QR codes straight from your Windows desktop.
</p>

I built QR Scan because opening a QR code on a desktop is still more awkward than it should be. The app works a bit like the Windows Snipping Tool: draw a box around a QR code and get the result right away. Scans are processed locally and saved in a small, searchable history on your device.

## Features

- Capture a screen region with the global `Ctrl+Shift+Q` shortcut
- Decode QR codes locally without uploading screenshots
- Paste or drag-and-drop QR code images
- Copy scan results or safely open supported links
- Searchable history for up to 100 scans
- Dark, Light, and Arcane Pixel themes
- System tray access
- Native Windows installer

Download and install

Grab the latest `QR-Scan-Setup-*.exe` from the [GitHub Releases page](../../releases/latest), run it, and you are good to go. QR Scan will be available from the Start menu and, if selected during setup, as a desktop shortcut.

Requires Node.js 22 or newer.

```powershell
git clone <repository-url>
cd QR-Scan
npm.cmd install
npm.cmd run dev
```

## Build the Windows installer

```powershell
npm.cmd run build
```

The installer is generated at `release/QR-Scan-Setup-0.2.0.exe`. Generated files such as `node_modules/`, `dist/`, and `release/` are intentionally excluded from Git.

## A small note about the project

Honestly, this project is **mostly vibe coded**. It started with a simple idea, and I built it by experimenting, changing things, breaking a few things, and working with AI along the way.
