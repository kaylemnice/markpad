const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let pendingFilePath = null; // file requested before the window was ready

function resolveArgvFile(argv) {
  // Find a .md-ish path in argv (used on first launch from CLI / Finder on some platforms)
  const candidates = argv.slice(1).filter((a) => !a.startsWith('-'));
  for (const c of candidates) {
    if (/\.(md|markdown|mdown|mkd)$/i.test(c) && fs.existsSync(c)) return path.resolve(c);
  }
  return null;
}

function sendOpenFile(filePath) {
  if (!filePath) return;
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.getURL()) {
    mainWindow.webContents.send('file:open-path', filePath);
    mainWindow.show();
    mainWindow.focus();
  } else {
    pendingFilePath = filePath;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 640,
    minHeight: 420,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingFilePath) {
      mainWindow.webContents.send('file:open-path', pendingFilePath);
      pendingFilePath = null;
    }
  });

  // Confirm before closing with unsaved changes
  mainWindow.on('close', (e) => {
    if (mainWindow.isDocumentEdited()) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        message: 'You have unsaved changes.',
        detail: 'Do you want to save them before closing?',
      });
      if (choice === 2) {
        e.preventDefault();
        return;
      }
      if (choice === 0) {
        e.preventDefault();
        mainWindow.webContents.send('file:request-save-then-close');
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// macOS: double-clicking a .md file in Finder fires this
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  sendOpenFile(filePath);
});

// Single-instance: re-use the window when another file is opened
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const f = resolveArgvFile(argv);
    if (f) sendOpenFile(f);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  const f = resolveArgvFile(process.argv);
  if (f) pendingFilePath = f;
  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

/* ---------------- IPC: file operations ---------------- */

ipcMain.handle('file:read', async (_e, filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return { content };
});

ipcMain.handle('file:write', async (_e, filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true };
});

ipcMain.handle('dialog:open', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'] }],
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

ipcMain.handle('dialog:save-as', async (_e, suggestedName) => {
  const res = await dialog.showSaveDialog(mainWindow, {
    defaultPath: suggestedName || 'Untitled.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
  if (res.canceled || !res.filePath) return null;
  return res.filePath;
});

ipcMain.handle('file:rename', async (_e, oldPath, newName) => {
  const newPath = path.join(path.dirname(oldPath), newName);
  if (fs.existsSync(newPath) && newPath !== oldPath) {
    return { error: 'A file with that name already exists.' };
  }
  fs.renameSync(oldPath, newPath);
  return { path: newPath };
});

ipcMain.handle('file:trash', async (_e, filePath) => {
  const { shell } = require('electron');
  await shell.trashItem(filePath);
  return { ok: true };
});

ipcMain.handle('dir:list', async (_e, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = entries
      .filter((d) => d.isFile() && /\.(md|markdown|mdown|mkd)$/i.test(d.name))
      .map((d) => ({ name: d.name, path: path.join(dirPath, d.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return { dir: dirPath, files };
  } catch (err) {
    return { dir: dirPath, files: [], error: err.message };
  }
});

ipcMain.handle('dialog:choose-folder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

ipcMain.handle('file:exists', async (_e, p) => {
  return fs.existsSync(p);
});

ipcMain.handle('file:reveal', async (_e, filePath) => {
  const { shell } = require('electron');
  shell.showItemInFolder(filePath);
  return { ok: true };
});

ipcMain.on('doc:set-edited', (_e, edited) => {
  if (mainWindow) mainWindow.setDocumentEdited(!!edited);
});

ipcMain.on('doc:set-represented-file', (_e, filePath) => {
  if (mainWindow) {
    mainWindow.setRepresentedFilename(filePath || '');
    mainWindow.setTitle(filePath ? path.basename(filePath) : 'MarkPad');
  }
});

ipcMain.on('app:close-window', () => {
  if (mainWindow) {
    mainWindow.setDocumentEdited(false);
    mainWindow.close();
  }
});

/* ---------------- Menu (keyboard shortcuts) ---------------- */

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const send = (channel) => () => mainWindow && mainWindow.webContents.send(channel);
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: send('menu:new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: send('menu:open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: send('menu:save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: send('menu:save-as') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
