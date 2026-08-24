const { app, BrowserWindow, ipcMain, Notification, powerMonitor, shell, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const screenshot = require('screenshot-desktop');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.fluidhr.tracker');
}

// Register custom protocol client
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('fluidhr-tracker', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('fluidhr-tracker');
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
    if (parsedUrl.protocol === 'fluidhr-tracker:') {
      const token = parsedUrl.searchParams.get('token');
      const server = parsedUrl.searchParams.get('server');
      const action = parsedUrl.searchParams.get('action') || (parsedUrl.hostname === 'start' ? 'start' : parsedUrl.pathname.replace(/^\/+/, '')) || 'start';
      
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();

        if (server) {
          mainWindow.webContents.send('deep-link-server', server);
        }
        if (token) {
          mainWindow.webContents.send('deep-link-token', token);
        }
        if (action) {
          mainWindow.webContents.send('deep-link-action', action);
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse deep link:', err);
  }
}

// ── LOCAL HTTP BRIDGE SERVER (for instant browser-to-desktop communication) ──
function startLocalBridgeServer() {
  const PORT = 28734;
  localServer = http.createServer((req, res) => {
    // Set standard CORS headers so web app (http://localhost:4000) can interact seamlessly
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
          app: 'FluidHR Tracker',
          version: app.getVersion()
        }));
        return;
      }

      if (pathname === '/start') {
        const token = reqUrl.searchParams.get('token');
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
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
    console.warn('[Local Server Error] Could not bind to port 28734:', err.message);
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
const IDLE_THRESHOLD = 60; // 1 minute (60 seconds)

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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    if (app.readyUrl) {
      handleDeepLink(app.readyUrl);
      app.readyUrl = null;
    }
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
      mainWindow.focus();
      
      const url = commandLine.find(arg => arg.startsWith('fluidhr-tracker://'));
      if (url) {
        handleDeepLink(url);
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();
    startLocalBridgeServer();

    const url = process.argv.find(arg => arg.startsWith('fluidhr-tracker://'));
    if (url) {
      handleDeepLink(url);
    }

    // Check for updates
    autoUpdater.checkForUpdatesAndNotify();

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
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC HANDLERS ─────────────────────────────────────────
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
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

ipcMain.handle('close-app', () => {
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
  autoUpdater.quitAndInstall();
});

ipcMain.handle('check-for-updates', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
