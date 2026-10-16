const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('captureOverlay', {
  onInit: (callback) => ipcRenderer.once('capture:init', (_event, payload) => callback(payload)),
  complete: (image) => ipcRenderer.send('capture:complete', image),
  cancel: () => ipcRenderer.send('capture:cancel')
});
