const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (data) => ipcRenderer.invoke('data:save', data),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  copy: (text) => ipcRenderer.invoke('clipboard:write', text),
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
  openFile: () => ipcRenderer.invoke('file:open'),
});
