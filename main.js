const { app, BrowserWindow, ipcMain, shell, clipboard, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const THEMES = {
  dark: { color: '#0b0d12', symbolColor: '#c9d1e0' },
  light: { color: '#f5f6fa', symbolColor: '#333a48' },
};

let win;
const dataFile = () => path.join(app.getPath('userData'), 'collaborators.json');

function readData() {
  const file = dataFile();
  if (!fs.existsSync(file)) return { collaborators: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed.collaborators)) parsed.collaborators = [];
    return parsed;
  } catch (err) {
    // Keep the unreadable file instead of silently overwriting it later.
    const backup = file.replace(/\.json$/, `.corrupt-${Date.now()}.json`);
    try { fs.copyFileSync(file, backup); } catch {}
    return { collaborators: [], warning: `Data file could not be read. A copy was kept at ${backup}` };
  }
}

function writeData(data) {
  const file = dataFile();
  const tmp = file + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, collaborators: data.collaborators }, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

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

ipcMain.handle('data:load', () => readData());

ipcMain.handle('data:save', (_e, data) => {
  try {
    writeData(data);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

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

ipcMain.handle('file:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Backup', extensions: ['json'] }],
  });
  if (canceled || !filePaths[0]) return { ok: false, canceled: true };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    const list = Array.isArray(parsed) ? parsed : parsed.collaborators;
    if (!Array.isArray(list)) throw new Error('No collaborators found in this file.');
    return { ok: true, collaborators: list };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
