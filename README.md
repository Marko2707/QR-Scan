# QR Scan

A private, snipping-tool style QR code reader for Windows. Select a QR code anywhere on your screen, decode it locally, and keep a searchable history of previous scans.

## Features

- Select a screen region and scan it with `Ctrl+Shift+Q`
- Paste or drag-and-drop QR code images
- Copy results or safely open supported links
- Searchable on-device scan history (up to 100 entries)
- Three persistent themes: Dark, Light, and Arcane Pixel
- System tray access
- Installable Windows build using NSIS

## Development

Requires Node.js 22 or newer.

```powershell
npm.cmd install
npm.cmd run dev
```

## Build the Windows installer

```powershell
npm.cmd run build
```

The installer is written to `release/QR-Scan-Setup-0.2.0.exe`.
