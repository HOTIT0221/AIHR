const { app, BrowserWindow, ipcMain, shell, clipboard, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const THEMES = {
  dark: { color: '#0b0d12', symbolColor: '#c9d1e0' },
  light: { color: '#f5f6fa', symbolColor: '#333a48' },
};

let win;
let startupNotice = null;

// Wrap DB calls so the renderer always gets { ok, ... } instead of a thrown IPC error.
const safe = (fn) => async (_e, ...args) => {
  try {
    return { ok: true, ...(await fn(...args)) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

function createWindow() {
  const work = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: Math.min(1640, work.width - 40),
    height: Math.min(960, work.height - 40),
    minWidth: 1000,
    minHeight: 620,
    show: false,
    backgroundColor: THEMES.dark.color,
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...THEMES.dark, height: 44 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // Never navigate the app window away; open web links in the browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

ipcMain.handle('db:list', safe(() => ({ collaborators: db.list(), notice: startupNotice })));
ipcMain.handle('db:upsert', safe((c) => ({ collaborator: db.upsert(c) })));
ipcMain.handle('db:remove', safe((id) => (db.remove(id), {})));

ipcMain.handle('open-external', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url);
});

ipcMain.handle('clipboard:write', (_e, text) => {
  clipboard.writeText(String(text ?? ''));
});

ipcMain.handle('theme:set', (_e, theme) => {
  const t = THEMES[theme] || THEMES.dark;
  if (win && !win.isDestroyed()) {
    try { win.setTitleBarOverlay({ ...t, height: 44 }); } catch {}
    win.setBackgroundColor(t.color);
  }
});

ipcMain.handle('file:save', async (_e, { defaultName, content, filters }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters,
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true, filePath };
});

ipcMain.handle('db:backup', safe(async (stamp) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), `hrmanager-backup-${stamp}.db`),
    filters: [
      { name: 'SQLite database', extensions: ['db'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  });
  if (canceled || !filePath) return { canceled: true };
  if (path.extname(filePath).toLowerCase() === '.json') {
    const json = { version: 1, exportedAt: new Date().toISOString(), collaborators: db.list() };
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
  } else {
    db.backupTo(filePath);
  }
  return { filePath };
}));

ipcMain.handle('db:restore', safe(async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Backup (.db, .json)', extensions: ['db', 'json'] }],
  });
  if (canceled || !filePaths[0]) return { canceled: true };
  const file = filePaths[0];
  let items;
  if (path.extname(file).toLowerCase() === '.json') {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    items = Array.isArray(parsed) ? parsed : parsed.collaborators;
    if (!Array.isArray(items)) throw new Error('No collaborators found in this file.');
  } else {
    items = db.readExternal(file);
  }
  const counts = db.upsertMany(items, { keepTimestamps: true });
  return { ...counts, collaborators: db.list() };
}));

if (!app.requestSingleInstanceLock()) {
  // Only one window may own the database at a time.
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(() => {
    try {
      startupNotice = db.open(app.getPath('userData'));
    } catch (err) {
      dialog.showErrorBox('AITrain HR Manager', `Could not open the database:\n\n${err.message}`);
      app.quit();
      return;
    }
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('will-quit', () => db.close());
}
