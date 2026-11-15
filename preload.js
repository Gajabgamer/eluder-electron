const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eluder', {
  validateToken:  (token) => ipcRenderer.invoke('validate-token', token),
  getHwid:        ()      => ipcRenderer.invoke('get-hwid'),
  licenseOk:      ()      => ipcRenderer.invoke('license-ok'),
  quit:           ()      => ipcRenderer.invoke('quit'),
  openTelegram:   ()      => ipcRenderer.invoke('open-telegram'),
  setOpacity:     (val)   => ipcRenderer.invoke('set-opacity', val),
  setAlwaysOnTop: (val)   => ipcRenderer.invoke('set-always-on-top', val),
  minimize:       ()      => ipcRenderer.invoke('minimize'),
  closeMain:      ()      => ipcRenderer.invoke('close-main'),
  takeScreenshot: ()      => ipcRenderer.invoke('take-screenshot'),
});
