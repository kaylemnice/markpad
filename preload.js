const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('markpad', {
  readFile: (p) => ipcRenderer.invoke('file:read', p),
  writeFile: (p, content) => ipcRenderer.invoke('file:write', p, content),
  openDialog: () => ipcRenderer.invoke('dialog:open'),
  saveAsDialog: (suggestedName) => ipcRenderer.invoke('dialog:save-as', suggestedName),
  renameFile: (oldPath, newName) => ipcRenderer.invoke('file:rename', oldPath, newName),
  trashFile: (p) => ipcRenderer.invoke('file:trash', p),
  listDir: (dirPath) => ipcRenderer.invoke('dir:list', dirPath),
  chooseFolder: () => ipcRenderer.invoke('dialog:choose-folder'),
  fileExists: (p) => ipcRenderer.invoke('file:exists', p),
  pathForFile: (file) => webUtils.getPathForFile(file),
  revealFile: (p) => ipcRenderer.invoke('file:reveal', p),
  setEdited: (edited) => ipcRenderer.send('doc:set-edited', edited),
  setRepresentedFile: (p) => ipcRenderer.send('doc:set-represented-file', p),
  closeWindow: () => ipcRenderer.send('app:close-window'),

  onOpenPath: (cb) => ipcRenderer.on('file:open-path', (_e, p) => cb(p)),
  onSaveThenClose: (cb) => ipcRenderer.on('file:request-save-then-close', () => cb()),
  onMenu: (name, cb) => ipcRenderer.on(`menu:${name}`, () => cb()),
});
