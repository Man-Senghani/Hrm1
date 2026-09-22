const { app, BrowserWindow, ipcMain, Notification, powerMonitor, shell, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const screenshot = require('screenshot-desktop');

// ── App & Environment Configuration ──
let trackerConfig = {
  environment: 'production',
  appId: 'com.fluidhr.tracker',
  appName: 'FluidHR Tracker',
  productName: 'FluidHR Tracker',
  protocol: 'fluidhr-tracker',
  bridgePort: 28734,
  defaultServer: 'https://hrm.aupanishad.tech',
  version: '1.4.1'
};

try {
  const customConfig = require('./tracker-config.json');
  trackerConfig = { ...trackerConfig, ...customConfig };
} catch (_) {}

if (process.env.TRACKER_ENV === 'staging' || app.getName().toLowerCase().includes('staging')) {
  trackerConfig = {
    ...trackerConfig,
    environment: 'staging',
    appId: 'com.fluidhr.tracker.staging',
    appName: 'FluidHR Tracker (Staging)',
    productName: 'FluidHR Tracker (Staging)',
    protocol: 'fluidhr-staging-tracker',
    bridgePort: 28735,
    defaultServer: 'https://hrm-staging.aupanishad.tech',
    version: '1.0.2'
  };
}

const isStaging = trackerConfig.environment === 'staging';

if (isStaging) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
}

// Set isolated user data directory so tokens & cache never conflict between staging and production
app.setPath('userData', path.join(app.getPath('appData'), isStaging ? 'fluidhr-desktop-tracker-staging' : 'fluidhr-desktop-tracker'));

if (process.platform === 'win32') {
  app.setAppUserModelId(trackerConfig.appId);
}

// Register custom protocol client
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(trackerConfig.protocol, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(trackerConfig.protocol);
}

// Window transparency fixes for Windows 11
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-rasterization');

const http = require('http');
const store = new Store();
let mainWindow;
let localServer = null;

// Handle deep link logic
function handleDeepLink(urlStr) {
  try {
    const parsedUrl = new URL(urlStr);
    const validProtocols = [`${trackerConfig.protocol}:`, 'fluidhr-tracker:', 'fluidhr-staging-tracker:'];
    if (validProtocols.includes(parsedUrl.protocol)) {
      const token = parsedUrl.searchParams.get('token');
      const server = parsedUrl.searchParams.get('server');
      let action = parsedUrl.searchParams.get('action');

      if (!action) {
        if (parsedUrl.hostname === 'stop' || parsedUrl.pathname.includes('stop')) {
          action = 'stop';
        } else if (parsedUrl.hostname === 'pause' || parsedUrl.pathname.includes('pause')) {
          action = 'pause';
        } else if (parsedUrl.hostname === 'auth' || parsedUrl.pathname.includes('auth')) {
          action = 'auth';
        } else {
          action = 'start';
        }
      }

      // 💾 Immediately persist token and serverHost to store
      if (token) {
        store.set('authToken', token);
      }
      if (server) {
        let cleanServer = server.replace(/\/+$/, '');
        if (cleanServer.includes('aupanishad.tech') || cleanServer.includes(':3000')) {
          cleanServer = 'http://hrm.aupanishad.tech';
        }
        store.set('serverHost', cleanServer);
      }
      
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(true);
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(false);
          }
        }, 800);

        if (server) {
          mainWindow.webContents.send('deep-link-server', server);
        }
        if (token) {
          mainWindow.webContents.send('deep-link-token', token);
        }
        if (action) {
          mainWindow.webContents.send('deep-link-action', action);
        }
      } else {
        app.readyUrl = urlStr;
      }
    }
  } catch (err) {
    console.error('Failed to parse deep link:', err);
  }
}

// ── LOCAL HTTP BRIDGE SERVER (for instant browser-to-desktop communication) ──
function startLocalBridgeServer() {
  const PORT = trackerConfig.bridgePort;
  localServer = http.createServer((req, res) => {
    // Set standard CORS headers so web app can interact seamlessly
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const reqUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const pathname = reqUrl.pathname;

      if (pathname === '/ping' || pathname === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          app: trackerConfig.appName,
          environment: trackerConfig.environment,
          version: trackerConfig.version || app.getVersion()
        }));
        return;
      }

      if (pathname === '/auth') {
        const token = reqUrl.searchParams.get('token');
        const server = reqUrl.searchParams.get('server');
        if (token) store.set('authToken', token);
        if (server) store.set('serverHost', server);
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true);
          setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false); }, 800);
          if (server) mainWindow.webContents.send('deep-link-server', server);
          if (token) mainWindow.webContents.send('deep-link-token', token);
          mainWindow.webContents.send('deep-link-action', 'auth');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Authenticated' }));
        return;
      }

      if (pathname === '/start') {
        const token = reqUrl.searchParams.get('token');
        if (token) store.set('authToken', token);
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true);
          setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false); }, 800);
          if (token) {
            mainWindow.webContents.send('deep-link-token', token);
          }
          mainWindow.webContents.send('deep-link-action', 'start');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Tracking started' }));
        return;
      }

      if (pathname === '/stop') {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true);
          setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false); }, 800);
          mainWindow.webContents.send('deep-link-action', 'stop');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Opened desktop tracker for checkout confirmation' }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  localServer.on('error', (err) => {
    console.warn(`[Local Server Error] Could not bind to port ${PORT}:`, err.message);
  });

  localServer.listen(PORT, '127.0.0.1', () => {
    console.log(`[Desktop Tracker] Local bridge listening on http://127.0.0.1:${PORT}`);
  });
}

// macOS open-url handler
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    handleDeepLink(url);
  } else {
    app.readyUrl = url;
  }
});

// ── MUST match backend IDLE_THRESHOLD_SECONDS ─────────────
const IDLE_THRESHOLD = 600; // 10 minutes (600 seconds)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 350,
    height: 680,
    resizable: false,
    frame: false,
    transparent: false,
    alwaysOnTop: false,
    hasShadow: true,
    thickFrame: false,
    roundedCorners: false,
    show: false,
    skipTaskbar: false,
    autoHideMenuBar: true,
    backgroundColor: '#F8F9FA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');

  mainWindow.webContents.once('did-finish-load', () => {
    if (app.readyUrl) {
      handleDeepLink(app.readyUrl);
      app.readyUrl = null;
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// ── SINGLE INSTANCE LOCK ──────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false); }, 800);
      
      const url = commandLine.find(arg => 
        arg.startsWith(`${trackerConfig.protocol}://`) || 
        arg.startsWith('fluidhr-staging-tracker://') || 
        arg.startsWith('fluidhr-tracker://')
      );
      if (url) {
        handleDeepLink(url);
      }
    }
  });

  app.whenReady().then(() => {
    const url = process.argv.find(arg => 
      arg.startsWith(`${trackerConfig.protocol}://`) || 
      arg.startsWith('fluidhr-staging-tracker://') || 
      arg.startsWith('fluidhr-tracker://')
    );
    if (url) {
      app.readyUrl = url;
    }
    createWindow();
    startLocalBridgeServer();

    // Check for updates (Production only: Staging should not auto-update to production 1.4.1)
    if (!isStaging) {
      autoUpdater.checkForUpdatesAndNotify().catch(err => console.log('[Updater Error]', err.message));
    }

    // ============================================================
    // 🌐 SYSTEM-WIDE IDLE MONITOR — MAIN PROCESS ONLY
    // ============================================================
    // powerMonitor.getSystemIdleTime() reads from the OS kernel.
    // It counts seconds since the last keyboard/mouse event on the
    // ENTIRE machine — Chrome, Word, VS Code, WhatsApp, anything.
    // This fires every second regardless of Electron window focus.
    // ============================================================
    setInterval(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;

      const idleSeconds = powerMonitor.getSystemIdleTime();
      const isIdle = idleSeconds >= IDLE_THRESHOLD;

      // Real-time diagnostic log
      if (idleSeconds % 5 === 0 || isIdle) {
        console.log(`[IDLE MONITOR] System Idle: ${idleSeconds}s | Threshold: ${IDLE_THRESHOLD}s | Status: ${isIdle ? 'IDLE' : 'ACTIVE'}`);
      }

      // Send to renderer via IPC — renderer ONLY displays/reacts
      mainWindow.webContents.send('system-idle-status', {
        idleSeconds,
        isIdle
      });
    }, 1000); // 🚀 1s interval matches real-time seconds
    // ============================================================
    // ── Auto-Pause on OS Sleep, Lock, Shutdown ──
    powerMonitor.on('suspend', async () => {
      console.log('[POWER MONITOR] System entering sleep/suspend. Pausing tracking...');
      await autoPauseTrackingOnExit();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deep-link-action', 'pause');
      }
    });

    powerMonitor.on('shutdown', async () => {
      console.log('[POWER MONITOR] System shutting down/restarting. Pausing tracking...');
      await autoPauseTrackingOnExit();
    });

    powerMonitor.on('lock-screen', async () => {
      console.log('[POWER MONITOR] System screen locked. Pausing tracking...');
      await autoPauseTrackingOnExit();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deep-link-action', 'pause');
      }
    });
  });
}

// ── Auto-Pause Helper for Exits & Sleep ───────────────────
async function autoPauseTrackingOnExit() {
  try {
    const token = store.get('authToken');
    let serverHost = store.get('serverHost') || trackerConfig.defaultServer;
    if (!token) return;
    console.log('[AUTO PAUSE] Sending pause signal before exit/shutdown...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    await fetch(`${serverHost}/api/time/pause`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    }).catch(() => {});
    clearTimeout(timeoutId);
    console.log('[AUTO PAUSE] Completed.');
  } catch (err) {
    console.error('[AUTO PAUSE ERROR]', err.message);
  }
}

let isAppQuitting = false;
app.on('before-quit', async (event) => {
  if (!isAppQuitting) {
    event.preventDefault();
    isAppQuitting = true;
    await autoPauseTrackingOnExit();
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC HANDLERS ─────────────────────────────────────────
ipcMain.handle('get-app-version', () => {
  return trackerConfig.version || app.getVersion();
});

ipcMain.handle('get-app-config', () => {
  return trackerConfig;
});

ipcMain.handle('open-external', (event, url) => {
  return shell.openExternal(url);
});

ipcMain.handle('get-store-value', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-store-value', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('close-app', async () => {
  await autoPauseTrackingOnExit();
  app.quit();
});

ipcMain.handle('minimize-app', () => {
  mainWindow.minimize();
});

ipcMain.handle('notify-native', (event, payload) => {
  const { title, body } = payload || {};
  const allowedTitles = ['started', 'paused', 'resumed', 'stopped', 'screenshot', 'inactivity', 'idle', 'announcement'];
  const isAllowed = allowedTitles.some(t => title?.toLowerCase().includes(t));
  if (!isAllowed) {
    console.log('Notification blocked (not critical):', title);
    return false;
  }
  try {
    const notification = new Notification({
      title: title || 'FluidHR Tracker',
      body: body || '',
      silent: false
    });
    notification.on('failed', (event, error) => console.error('Notification failed:', error));
    notification.show();
    return true;
  } catch (err) {
    console.error('Notification error:', err);
    return false;
  }
});

ipcMain.handle('capture-screen', async () => {
  try {
    let screenId = undefined;
    try {
      const displays = await screenshot.listDisplays();
      if (displays && displays.length > 1) {
        const activeDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
        let bestMatch = displays[0];
        let minDistance = Infinity;
        for (const disp of displays) {
          const dx = Math.abs(disp.left - activeDisplay.bounds.x);
          const dy = Math.abs(disp.top - activeDisplay.bounds.y);
          const dist = dx + dy;
          if (dist < minDistance) {
            minDistance = dist;
            bestMatch = disp;
          }
        }
        screenId = bestMatch.id;
      }
    } catch (err) {
      console.error('Error listing displays for screenshot:', err);
    }

    const options = { format: 'jpeg' };
    if (screenId) {
      options.screen = screenId;
    }
    const imgBuffer = await screenshot(options);
    return `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Capture Error:', err);
    return null;
  }
});

// ── AUTO-UPDATER EVENTS & HANDLERS ───────────────────────
autoUpdater.on('update-available', () => {
  console.log('[Updater] Update available. Downloading in background...');
});

autoUpdater.on('update-downloaded', () => {
  console.log('[Updater] Update downloaded. Notifying renderer...');
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded-ui');
  }
});

ipcMain.on('install-update', () => {
  if (!isStaging) {
    autoUpdater.quitAndInstall();
  }
});

ipcMain.handle('check-for-updates', () => {
  if (!isStaging) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});
