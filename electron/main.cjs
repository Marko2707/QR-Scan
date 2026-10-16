const { app, BrowserWindow, clipboard, desktopCapturer, globalShortcut, ipcMain, Menu, nativeImage, screen, shell, Tray } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const isDev = !app.isPackaged;
const HISTORY_LIMIT = 100;
const CAPTURE_SHORTCUT = 'CommandOrControl+Shift+Q';

let mainWindow;
let overlayWindow;
let tray;
let isQuitting = false;

const historyPath = () => path.join(app.getPath('userData'), 'history.json');

async function readHistory() {
  try {
    const value = JSON.parse(await fs.readFile(historyPath(), 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not read history:', error);
    return [];
  }
}

async function writeHistory(history) {
  const target = historyPath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.tmp`;
  await fs.writeFile(temp, JSON.stringify(history, null, 2), 'utf8');
  await fs.rename(temp, target);
}

function loadAppPage(window, page = 'index.html') {
  if (isDev) return window.loadURL(`http://localhost:5173/${page}`);
  return window.loadFile(path.join(__dirname, '..', 'dist', page));
}

function makeTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#7457ff"/>
      <g fill="white">
        <path d="M6 6h8v8H6zm2 2v4h4V8zM18 6h8v8h-8zm2 2v4h4V8zM6 18h8v8H6zm2 2v4h4v-4z"/>
        <path d="M18 18h3v3h-3zm5 0h3v5h-3zm-5 5h5v3h-5zm6 1h2v2h-2z"/>
      </g>
    </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`).resize({ width: 16, height: 16 });
}

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 720,
    minHeight: 540,
    show: false,
    title: 'QR Scan',
    backgroundColor: '#111018',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#111018',
      symbolColor: '#d9d5e7',
      height: 44
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  loadAppPage(mainWindow);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  tray = new Tray(makeTrayIcon());
  tray.setToolTip('QR Scan');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Scan an area', click: () => beginCapture() },
    { label: 'Open QR Scan', click: showMainWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
  ]));
  tray.on('click', showMainWindow);
}

function finishCapture() {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
  overlayWindow = null;
  showMainWindow();
}

async function beginCapture() {
  if (overlayWindow) return;

  try {
    if (mainWindow?.isVisible()) mainWindow.hide();
    await new Promise((resolve) => setTimeout(resolve, 180));

    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const width = Math.max(1, Math.round(display.bounds.width * display.scaleFactor));
    const height = Math.max(1, Math.round(display.bounds.height * display.scaleFactor));
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    });
    const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0];
    if (!source || source.thumbnail.isEmpty()) throw new Error('No screen image was available.');

    overlayWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: false,
      backgroundColor: '#000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      movable: false,
      resizable: false,
      fullscreenable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'overlay-preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.on('closed', () => {
      overlayWindow = null;
      if (!isQuitting) showMainWindow();
    });
    overlayWindow.webContents.once('did-finish-load', () => {
      overlayWindow?.webContents.send('capture:init', {
        image: source.thumbnail.toDataURL(),
        displayWidth: display.bounds.width,
        displayHeight: display.bounds.height
      });
      overlayWindow?.show();
      overlayWindow?.focus();
    });
    await loadAppPage(overlayWindow, 'overlay.html');
  } catch (error) {
    console.error('Capture failed:', error);
    finishCapture();
    mainWindow?.webContents.send('capture:error', error.message || 'Screen capture failed.');
  }
}

function registerIpc() {
  ipcMain.handle('theme:set', (_event, theme) => {
    const palettes = {
      dark: { color: '#111018', symbolColor: '#d9d5e7' },
      light: { color: '#f7f5fb', symbolColor: '#282433' },
      arcane: { color: '#09051b', symbolColor: '#f6d87a' }
    };
    const palette = palettes[theme] ?? palettes.dark;
    mainWindow?.setTitleBarOverlay({ ...palette, height: 44 });
    mainWindow?.setBackgroundColor(palette.color);
    return true;
  });
  ipcMain.handle('history:list', readHistory);
  ipcMain.handle('history:add', async (_event, entry) => {
    if (!entry || typeof entry.value !== 'string' || !entry.value.trim()) throw new Error('Invalid history entry.');
    const history = await readHistory();
    const value = entry.value.trim();
    const duplicate = history.find((item) => item.value === value);
    const item = {
      id: crypto.randomUUID(),
      value,
      scannedAt: new Date().toISOString(),
      preview: typeof entry.preview === 'string' && entry.preview.length < 350_000 ? entry.preview : null
    };
    const next = [item, ...history.filter((candidate) => candidate.id !== duplicate?.id)].slice(0, HISTORY_LIMIT);
    await writeHistory(next);
    return item;
  });
  ipcMain.handle('history:remove', async (_event, id) => {
    const history = await readHistory();
    await writeHistory(history.filter((item) => item.id !== id));
    return true;
  });
  ipcMain.handle('history:clear', async () => {
    await writeHistory([]);
    return true;
  });
  ipcMain.handle('clipboard:write', (_event, text) => clipboard.writeText(String(text)));
  ipcMain.handle('link:open', async (_event, value) => {
    const parsed = new URL(value);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) throw new Error('This link type cannot be opened safely.');
    await shell.openExternal(parsed.href);
    return true;
  });
  ipcMain.handle('capture:start', beginCapture);
  ipcMain.on('capture:cancel', (event) => {
    if (event.sender === overlayWindow?.webContents) finishCapture();
  });
  ipcMain.on('capture:complete', (event, image) => {
    if (event.sender !== overlayWindow?.webContents || typeof image !== 'string' || image.length > 25_000_000) return;
    finishCapture();
    mainWindow?.webContents.send('capture:result', image);
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on('second-instance', showMainWindow);
  app.whenReady().then(() => {
    registerIpc();
    createMainWindow();
    createTray();
    globalShortcut.register(CAPTURE_SHORTCUT, beginCapture);
  });
}

app.on('activate', showMainWindow);
app.on('window-all-closed', () => {});
app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
