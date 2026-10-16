const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qrScan', {
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  startCapture: () => ipcRenderer.invoke('capture:start'),
  onCapture: (callback) => {
    const listener = (_event, image) => callback(image);
    ipcRenderer.on('capture:result', listener);
    return () => ipcRenderer.removeListener('capture:result', listener);
  },
  onCaptureError: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('capture:error', listener);
    return () => ipcRenderer.removeListener('capture:error', listener);
  },
  listHistory: () => ipcRenderer.invoke('history:list'),
  addHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  removeHistory: (id) => ipcRenderer.invoke('history:remove', id),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  openLink: (value) => ipcRenderer.invoke('link:open', value)
});
