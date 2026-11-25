const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // SQLite-backed data
  list: () => ipcRenderer.invoke('db:list'),
  upsert: (collaborator) => ipcRenderer.invoke('db:upsert', collaborator),
  remove: (id) => ipcRenderer.invoke('db:remove', id),
  backup: (stamp) => ipcRenderer.invoke('db:backup', stamp),
  restore: () => ipcRenderer.invoke('db:restore'),

  // Desktop helpers
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  copy: (text) => ipcRenderer.invoke('clipboard:write', text),
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
});
