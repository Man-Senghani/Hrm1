const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Persistence ───────────────────────────────────────
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getStoreValue: (key) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', key, value),

  // ── Window controls ───────────────────────────────────
  closeApp:    () => ipcRenderer.invoke('close-app'),
  minimizeApp: () => ipcRenderer.invoke('minimize-app'),

  // ── Notifications & screenshots ───────────────────────
  notifyNative: (title, body) => ipcRenderer.invoke('notify-native', { title, body }),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),

  // ── Auto-Updater ───────────────────────────────────────
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded-ui', callback),
  installUpdate: () => ipcRenderer.send('install-update'),

  // ── Browser Authentication / Deep Linking ──────────────
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onDeepLinkServer: (callback) =>
    ipcRenderer.on('deep-link-server', (event, data) => callback(data)),
  onDeepLinkToken: (callback) =>
    ipcRenderer.on('deep-link-token', (event, data) => callback(data)),
  onDeepLinkAction: (callback) =>
    ipcRenderer.on('deep-link-action', (event, data) => callback(data)),

  // ── SYSTEM-WIDE IDLE STATUS ───────────────────────────
  // Fired every second from main process using powerMonitor.getSystemIdleTime()
  // Covers ALL apps on the PC — not just the Electron window
  // Payload: { idleSeconds: number, isIdle: boolean }
  onSystemIdleStatus: (callback) =>
    ipcRenderer.on('system-idle-status', (event, data) => callback(data))
});
