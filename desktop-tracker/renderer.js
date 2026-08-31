/**
 * ============================================================
 * TIME ENGINE v2 — ELECTRON RENDERER
 * ============================================================
 * IDLE DETECTION: 100% from main process via powerMonitor
 *   → window.addEventListener is NOT used for idle detection
 *   → Only used for UI button clicks
 *
 * ACTIVITY SOURCE: powerMonitor.getSystemIdleTime() in main.js
 *   → Detects activity from Chrome, Word, VS Code, WhatsApp,
 *     File Explorer — ANY app on the PC
 *   → Works even when Electron window is minimized/unfocused
 *
 * DISPLAY: All timer values come from backend poll only
 *   → No local math, no local increments
 * ============================================================
 */

// ── Display state (set by backend only) ───────────────────
let activeSeconds = 0;
let inactiveSeconds = 0;
let status = 'OFFLINE';
let isIdle = false;
let idleNotificationSent = false;
let authToken = '';
let lastStartOrResumeTime = 0;

// ── Local Ticking Engine State (for smooth UI updates) ────
let baseActiveSeconds = 0;
let baseInactiveSeconds = 0;
let lastAppliedActive = 0;
let lastAppliedInactive = 0;
let lastAppliedTime = 0;
let isSessionRunning = false;
let idleStartTime = null;

// Local clock loop for smooth UI ticking using real elapsed timestamps
setInterval(() => {
  if (status === 'ACTIVE' && isSessionRunning) {
    if (lastAppliedTime > 0) {
      const elapsedSincePoll = Math.floor((Date.now() - lastAppliedTime) / 1000);
      activeSeconds = lastAppliedActive + Math.max(0, elapsedSincePoll);
    } else {
      activeSeconds += 1;
    }
    updateDisplay();
  } else if (status === 'IDLE') {
    // 🛡️ When IDLE: Active Work Time is strictly frozen, Idle Time calculates from real elapsed timestamps
    if (lastAppliedTime > 0) {
      const elapsedSincePoll = Math.floor((Date.now() - lastAppliedTime) / 1000);
      inactiveSeconds = lastAppliedInactive + Math.max(0, elapsedSincePoll);
    } else {
      inactiveSeconds += 1;
    }
    updateDisplay();
  }
}, 1000);

// ── Intervals ─────────────────────────────────────────────
let pollInterval = null;  // polls /status every 1s
let heartbeatInterval = null; // sends /activity every 10s

// ── Screenshot ────────────────────────────────────────────
let screenshotTimeout = null;

// ── Idle Reminder (every 3 minutes while paused/idle) ────
let idleReminderInterval = null;
const IDLE_REMINDER_MS = 3 * 60 * 1000; // 3 minutes

// ── Socket ────────────────────────────────────────────────
let socket = null;

// ── Config ────────────────────────────────────────────────
const PRODUCTION_BACKEND_URL = 'https://hrm1-wljp.onrender.com';
const PRODUCTION_FRONTEND_URL = 'https://hrm-staging.aupanishad.tech';

let BACKEND_HOST = PRODUCTION_BACKEND_URL;
let FRONTEND_HOST = PRODUCTION_FRONTEND_URL;
let API_BASE = `${BACKEND_HOST}/api/time`;
const POLL_MS = 1000;   // 1s display refresh
const HEARTBEAT_MS = 10000;  // 10s heartbeat to backend

// ── DOM refs ──────────────────────────────────────────────
const activeTimerEl = document.getElementById('active-timer');
const inactiveTimerEl = document.getElementById('inactive-timer');
const statusEl = document.getElementById('status-display');
const syncIndicator = document.getElementById('sync-indicator');

// ============================================================
// 🌐 SYSTEM-WIDE IDLE DETECTION & AUTO-RESUME
// ============================================================
// Receives idleSeconds from powerMonitor.getSystemIdleTime()
// in the main process — covers ALL applications on the PC.
// ============================================================
let isAutoResuming = false;

async function autoResumeFromIdle() {
  if (isAutoResuming || status === 'ACTIVE' || status === 'PAUSED' || status === 'COMPLETED' || status === 'OFFLINE') return;
  if (!authToken) return;
  isAutoResuming = true;

  console.log('⚡ [AUTO RESUME] User activity detected on PC — restoring ACTIVE state');

  // 🚀 OPTIMISTIC UI: Instantly restore active state and freeze inactive time
  status = 'ACTIVE';
  isIdle = false;
  isSessionRunning = true;
  idleNotificationSent = false;
  lastStartOrResumeTime = Date.now();
  lastAppliedActive = activeSeconds;
  lastAppliedInactive = inactiveSeconds;
  lastAppliedTime = Date.now();

  stopIdleReminderLoop();
  updateDisplay();
  updateUI();

  try {
    const res = await fetch(`${API_BASE}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.session) {
        applyServerState(data.session);
      }
    }
  } catch (err) {
    console.error('[AUTO RESUME ERROR]', err);
  } finally {
    isAutoResuming = false;
  }
}

if (window.electronAPI?.onSystemIdleStatus) {
  window.electronAPI.onSystemIdleStatus(({ idleSeconds, isIdle: systemIsIdle }) => {
    lastSystemIdleSeconds = idleSeconds;

    // Case 1: Currently ACTIVE — check if user has gone idle (no activity for 60s)
    if (status === 'ACTIVE' && isSessionRunning) {
      const sessionElapsed = Math.floor((Date.now() - lastStartOrResumeTime) / 1000);
      if (sessionElapsed >= 60 && systemIsIdle && idleSeconds >= 60) {
        if (!idleNotificationSent) {
          const effectiveIdleSeconds = Math.min(idleSeconds, sessionElapsed);
          triggerIdle(effectiveIdleSeconds);
        }
      } else if (idleSeconds < 5) {
        idleNotificationSent = false;
        isIdle = false;
      }
    }
    // 🛑 NO AUTO-RESUME: When paused by idle, timer remains paused until user explicitly clicks RESUME button
  });
}

// Track last known system idle seconds (for heartbeat type decision)
let lastSystemIdleSeconds = 0;

// ============================================================
// 🔄 STARTUP
// ============================================================
async function loadSession() {
  requestNotificationPermission();

  try {
    const version = await window.electronAPI.getAppVersion();
    const versionDisplayEl = document.getElementById('version-display');
    if (versionDisplayEl && version) {
      versionDisplayEl.innerText = `V${version} PRO`;
    }
  } catch (err) {
    console.error('Failed to get app version:', err);
  }

  // 1. Immediately read stored authToken & serverHost
  const savedToken = await window.electronAPI.getStoreValue('authToken');
  if (savedToken) {
    authToken = savedToken;
    hideAuthSection();
  }

  const savedServer = await window.electronAPI.getStoreValue('serverHost');
  if (savedServer && !savedServer.includes('localhost') && !savedServer.includes('127.0.0.1') && !savedServer.includes('aupanishad.tech')) {
    BACKEND_HOST = savedServer;
  } else {
    BACKEND_HOST = PRODUCTION_BACKEND_URL;
    FRONTEND_HOST = PRODUCTION_FRONTEND_URL;
    if (window.electronAPI?.setStoreValue) {
      await window.electronAPI.setStoreValue('serverHost', PRODUCTION_BACKEND_URL);
    }
  }
  API_BASE = `${BACKEND_HOST}/api/time`;
  console.log('🚀 Desktop Tracker Initialized with BACKEND_HOST:', BACKEND_HOST, 'API_BASE:', API_BASE);

  if (!authToken) {
    showAuthSection();
    return;
  }

  hideAuthSection();
  await fetchUserProfile();
  initSocket();
  lastStartOrResumeTime = Date.now();
  await pollSessionStatus();
  startPolling();
  startHeartbeat();
}

loadSession();

// ============================================================
// 📡 POLL /status — apply backend values directly, no local math
// ============================================================
async function pollSessionStatus() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API_BASE}/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    applyServerState(data);
  } catch (err) {
    console.error('[POLL ERROR]', err.message);
  }
}

function applyServerState(data) {
  const serverStatus = String(data?.status || '').toLowerCase();

  if (serverStatus === 'completed') {
    status = 'COMPLETED';
    isIdle = false;
    isSessionRunning = false;
    stopPolling();
    stopHeartbeat();
    stopScreenshotLoop();
    stopIdleReminderLoop();
    activeSeconds = data.activeTime ?? activeSeconds;
    inactiveSeconds = data.idleTime ?? inactiveSeconds;
    lastAppliedActive = activeSeconds;
    lastAppliedInactive = inactiveSeconds;
    lastAppliedTime = 0;
    updateDisplay();
    updateUI();
    return;
  }

  if (!data?.hasActiveSession && serverStatus !== 'active' && serverStatus !== 'idle' && serverStatus !== 'paused') {
    // Only transition to OFFLINE if we are not actively in a session locally
    if (status === 'ACTIVE' && isSessionRunning) {
      return; // 🛡️ Protect active session against transient network blips
    }
    status = 'OFFLINE';
    activeSeconds = 0;
    inactiveSeconds = 0;
    isIdle = false;
    isSessionRunning = false;
    lastAppliedActive = 0;
    lastAppliedInactive = 0;
    lastAppliedTime = 0;
    stopPolling();
    stopHeartbeat();
    stopScreenshotLoop();
    updateDisplay();
    updateUI();
    return;
  }

  if (serverStatus === 'idle') {
    // 🛡️ GUARD: If the user explicitly resumed locally within the last 5 seconds,
    // do NOT let a stale background poll or focus poll overwrite the state back to IDLE!
    if (Date.now() - lastStartOrResumeTime < 5000) {
      return;
    }

    status = 'IDLE';
    isIdle = true;
    isSessionRunning = false;

    if (data.idleTime !== undefined && data.idleTime >= 0) {
      inactiveSeconds = data.idleTime;
      lastAppliedInactive = data.idleTime;
    }

    if (data.activeTime !== undefined && data.activeTime >= 0) {
      activeSeconds = data.activeTime;
      lastAppliedActive = data.activeTime;
    }
    lastAppliedTime = Date.now();
  } else if (serverStatus === 'active' && data.isRunning) {
    status = 'ACTIVE';
    isIdle = false;
    idleNotificationSent = false;
    isSessionRunning = true;

    if (data.activeTime !== undefined && data.activeTime >= 0) {
      activeSeconds = data.activeTime;
      lastAppliedActive = data.activeTime;
    }
    if (data.idleTime !== undefined && data.idleTime >= 0) {
      inactiveSeconds = data.idleTime;
      lastAppliedInactive = data.idleTime;
    }
    lastAppliedTime = Date.now();

    if (!screenshotTimeout) {
      initScreenshotLoop(true);
    }
  } else if (serverStatus === 'paused') {
    status = 'PAUSED';
    isIdle = false;
    isSessionRunning = false;
    if (data.activeTime !== undefined) activeSeconds = data.activeTime;
    if (data.idleTime !== undefined) inactiveSeconds = data.idleTime;
    lastAppliedActive = activeSeconds;
    lastAppliedInactive = inactiveSeconds;
    lastAppliedTime = Date.now();
  }

  updateDisplay();
  updateUI();
}

// ============================================================
// 💓 HEARTBEAT — sends activity type to backend every 10s
// ============================================================
async function sendHeartbeat() {
  if (!authToken || status !== 'ACTIVE') return;
  // Use system idle seconds from powerMonitor to decide type
  const type = lastSystemIdleSeconds === 0 ? 'heartbeat' : 'active';
  try {
    syncIndicator?.classList.add('online');
    await fetch(`${API_BASE}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ type })
    });
    setTimeout(() => syncIndicator?.classList.remove('online'), 2000);
  } catch (err) {
    console.error('[HEARTBEAT ERROR]', err.message);
  }
}

// ── Immediately fire idle signal to backend ───────────────
async function triggerIdle(idleSeconds = 60) {
  if (!authToken || status !== 'ACTIVE') return;

  // 🚀 OPTIMISTIC UI: Instantly freeze active timer and lock into IDLE state
  status = 'IDLE';
  isIdle = true;
  isSessionRunning = false;

  // 🛡️ Calculate exact total elapsed active time up to this moment
  let totalElapsedActive = activeSeconds;
  if (lastAppliedTime > 0) {
    const elapsedSincePoll = Math.floor((Date.now() - lastAppliedTime) / 1000);
    totalElapsedActive = lastAppliedActive + Math.max(0, elapsedSincePoll);
  }

  // 🎯 TRANSFER MATH: Subtract inactive duration from Active Time and add to Inactive Time
  // Total Time (Active + Inactive) remains 100% constant!
  activeSeconds = Math.max(0, totalElapsedActive - idleSeconds);
  inactiveSeconds = lastAppliedInactive + idleSeconds;

  lastAppliedActive = activeSeconds;
  lastAppliedInactive = inactiveSeconds;
  lastAppliedTime = Date.now();

  updateDisplay();
  updateUI();

  idleNotificationSent = true;
  showIdleNotification();
  try {
    syncIndicator?.classList.add('online');
    const res = await fetch(`${API_BASE}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ type: 'idle', idleSeconds }) // 🎯 Send exact duration
    });
    const data = await res.json();
    if (data) applyServerState(data);
    setTimeout(() => syncIndicator?.classList.remove('online'), 2000);
  } catch (err) {
    console.error('[IDLE TRIGGER ERROR]', err.message);
  }
}

// ============================================================
// 🟢 START
// ============================================================
async function startSession() {
  if (!authToken) return alert('Please login first.');
  try {
    const res = await fetch(`${API_BASE}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status === 401) {
      logout();
      alert('Session expired. Please log in again.');
      return;
    }
    if (!res.ok) {
      const err = await res.json();
      return alert(err.message || 'Unable to start session.');
    }
    const data = await res.json();
    notifyDesktop('Session Started', 'Your tracking session is now active.');

    status = 'ACTIVE';
    isIdle = false;
    isSessionRunning = true;
    idleNotificationSent = false;
    lastStartOrResumeTime = Date.now();

    if (data?.session) {
      applyServerState(data.session);
    }

    stopIdleReminderLoop();
    startPolling();
    startHeartbeat();
    initScreenshotLoop(true);
  } catch (err) {
    console.error('[START ERROR]', err);
    alert('Connection error. Is the server running?');
  }
}

// ============================================================
// ⏸️ PAUSE
// ============================================================
async function pauseSession() {
  if (!authToken || status === 'PAUSED') return;
  try {
    const res = await fetch(`${API_BASE}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const err = await res.json();
      if (!err.message?.toLowerCase().includes('already')) alert(err.message || 'Unable to pause.');
    }
    stopScreenshotLoop();
    await pollSessionStatus();
    await notifyDesktop('Session Paused', 'Your tracking session has been paused. Please resume when you are back.');
    startIdleReminderLoop();
  } catch (err) {
    console.error('[PAUSE ERROR]', err);
    alert('Unable to pause session.');
  }
}

// ============================================================
// ▶️ RESUME
// ============================================================
async function resumeSession() {
  if (!authToken) return alert('Please login first.');

  // 🚀 OPTIMISTIC UI: Instantly clear idle status and banner
  status = 'ACTIVE';
  isIdle = false;
  isSessionRunning = true;
  idleNotificationSent = false;
  lastStartOrResumeTime = Date.now();
  lastAppliedActive = activeSeconds;
  lastAppliedInactive = inactiveSeconds;
  lastAppliedTime = Date.now();

  stopIdleReminderLoop();
  updateDisplay();
  updateUI();

  try {
    const res = await fetch(`${API_BASE}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (!err.message?.toLowerCase().includes('already')) {
        console.warn(err.message || 'Unable to resume.');
      }
    } else {
      const data = await res.json().catch(() => ({}));
      if (data?.session) {
        applyServerState(data.session);
      }
    }
    startPolling();
    startHeartbeat();
    initScreenshotLoop(true);
    notifyDesktop('Session Resumed', 'Your tracking session is now active.').catch(() => {});
  } catch (err) {
    console.error('[RESUME ERROR]', err);
  }
}

// ============================================================
// 🔴 STOP / CHECK OUT (With Confirmation)
// ============================================================
function showCheckoutConfirmationModal() {
  const modal = document.getElementById('checkout-confirm-section');
  if (modal) modal.style.display = 'flex';
}

function hideCheckoutConfirmationModal() {
  const modal = document.getElementById('checkout-confirm-section');
  if (modal) modal.style.display = 'none';
}

async function stopSession() {
  if (!authToken) return alert('Please login first.');
  showCheckoutConfirmationModal();
}

async function confirmStopSession() {
  hideCheckoutConfirmationModal();
  if (!authToken) return alert('Please login first.');
  try {
    const res = await fetch(`${API_BASE}/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const err = await res.json();
      return alert(err.message || 'Unable to stop session.');
    }
    stopPolling();
    stopHeartbeat();
    stopScreenshotLoop();
    stopIdleReminderLoop();
    idleNotificationSent = false;

    // 🛡️ Lock into COMPLETED state immediately after checkout
    status = 'COMPLETED';
    isIdle = false;
    isSessionRunning = false;
    segmentStartTime = null;
    updateUI();
    await notifyDesktop('Workday Ended', 'You have successfully checked out for today.');
  } catch (err) {
    console.error('[STOP ERROR]', err);
    alert('Unable to stop session.');
  }
}

// ============================================================
// 🖥️ UI
// ============================================================
function updateDisplay() {
  if (activeTimerEl) activeTimerEl.innerText = formatTime(activeSeconds);
  if (inactiveTimerEl) inactiveTimerEl.innerText = formatTime(inactiveSeconds);
}

function updateUI() {
  setControlState(status);
  const alertBox = document.getElementById('desktop-alert');
  if (alertBox) alertBox.style.display = (status === 'IDLE') ? 'flex' : 'none';
}

function setControlState(currentStatus) {
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const stopBtn = document.getElementById('stop-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const binaryControls = document.querySelector('.binary-controls');
  const controlMatrix = document.querySelector('.control-matrix');
  const timerDisplay = document.querySelector('.timer-display');
  const completedSection = document.getElementById('checkout-completed-section');
  const alertEl = document.getElementById('desktop-alert');

  if (!startBtn || !pauseBtn || !resumeBtn || !binaryControls) return;

  if (currentStatus === 'COMPLETED') {
    // 🛡️ WORKDAY COMPLETED / CHECKED OUT:
    // Hide ALL control buttons (START, PAUSE, RESUME, CHECK OUT, LOGOUT) and the active timer
    if (controlMatrix) controlMatrix.style.display = 'none';
    if (timerDisplay) timerDisplay.style.display = 'none';
    if (alertEl) alertEl.style.display = 'none';
    if (completedSection) completedSection.style.display = 'flex';
    if (statusEl) {
      statusEl.innerText = 'WORKDAY COMPLETED';
      statusEl.className = 'status-badge status-completed';
    }
    return;
  }

  // Active / Offline / Paused states: restore standard layout
  if (completedSection) completedSection.style.display = 'none';
  if (controlMatrix) controlMatrix.style.display = 'block';
  if (timerDisplay) timerDisplay.style.display = 'flex';

  const isActuallyActive = currentStatus === 'ACTIVE' && !isIdle;

  if (currentStatus === 'OFFLINE') {
    startBtn.style.display = 'flex';
    binaryControls.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'flex';
    if (statusEl) { statusEl.innerText = 'OFFLINE'; statusEl.className = 'status-badge'; }
    if (alertEl) alertEl.style.display = 'none';
  } else if (isActuallyActive) {
    startBtn.style.display = 'none';
    binaryControls.style.display = 'flex';
    pauseBtn.style.display = 'flex';
    resumeBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'flex';
    if (statusEl) { statusEl.innerText = 'ACTIVE'; statusEl.className = 'status-badge status-active'; }
    if (alertEl) alertEl.style.display = 'none';
  } else {
    startBtn.style.display = 'none';
    binaryControls.style.display = 'flex';
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'flex';
    if (stopBtn) stopBtn.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'flex';
    if (statusEl) {
      statusEl.innerText = isIdle ? 'IDLE' : currentStatus;
      statusEl.className = 'status-badge status-idle';
    }
  }
}

// ============================================================
// ⏱️ INTERVALS
// ============================================================
function startPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(pollSessionStatus, POLL_MS);
}
function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}
function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_MS);
}
function stopHeartbeat() {
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
}

// ============================================================
// 🔔 NOTIFICATIONS
// ============================================================
let lastNotificationTs = 0;

async function notifyDesktop(title, body) {
  const now = Date.now();
  if (now - lastNotificationTs < 5000) return;
  lastNotificationTs = now;
  if (window.electronAPI?.notifyNative) {
    try { await window.electronAPI.notifyNative(title, body); return; } catch (_) { }
  }
  if (window.Notification?.permission === 'granted') {
    new window.Notification(title, { body });
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

async function showIdleNotification() {
  await notifyDesktop('Inactivity Detected', 'Timer is paused due to inactivity. Please start the timer.');
  const alertEl = document.getElementById('desktop-alert');
  if (alertEl) {
    const titleEl = alertEl.querySelector('.alert-title');
    const textEl = alertEl.querySelector('.alert-text');
    if (titleEl) titleEl.innerText = 'Inactivity Detected';
    if (textEl) textEl.innerText = 'Timer is paused. Please resume the timer.';
    alertEl.style.display = 'flex';
  }
  startIdleReminderLoop();
}

function startIdleReminderLoop() {
  if (idleReminderInterval) clearInterval(idleReminderInterval);
  idleReminderInterval = setInterval(async () => {
    if (status === 'IDLE' || status === 'PAUSED') {
      await notifyDesktop('Timer Paused', 'Your timer is paused. Please resume / start the timer to track your work.');
    } else {
      stopIdleReminderLoop();
    }
  }, IDLE_REMINDER_MS);
}

function stopIdleReminderLoop() {
  if (idleReminderInterval) {
    clearInterval(idleReminderInterval);
    idleReminderInterval = null;
  }
}

// ============================================================
// 📸 SCREENSHOTS
// ============================================================
async function takeScreenshot() {
  if (status !== 'ACTIVE' || !authToken) return;
  try {
    const dataUrl = await window.electronAPI.captureScreen();
    if (!dataUrl) return;
    const userRes = await fetch(`${BACKEND_HOST}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const user = await userRes.json();
    await fetch(`${BACKEND_HOST}/api/screenshot/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        screenshot: dataUrl,
        userId: user.id || user._id
      })
    });
    await notifyDesktop('Screenshot Captured', 'A monitoring trace has been recorded.');
  } catch (err) {
    console.error('[SCREENSHOT ERROR]', err);
  } finally {
    initScreenshotLoop();
  }
}

function initScreenshotLoop(isFirst = false) {
  if (screenshotTimeout) clearTimeout(screenshotTimeout);
  if (status !== 'ACTIVE') return;
  const randomMs = isFirst ? 10000 : 60000; // First screenshot in 10s, then every 60s
  screenshotTimeout = setTimeout(takeScreenshot, randomMs);
}

function stopScreenshotLoop() {
  if (screenshotTimeout) { clearTimeout(screenshotTimeout); screenshotTimeout = null; }
}

// ============================================================
// 👤 USER PROFILE
// ============================================================
async function fetchUserProfile() {
  if (!authToken) return;
  try {
    const res = await fetch(`${BACKEND_HOST}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) return;
    const user = await res.json();
    const nameEl = document.getElementById('display-name');
    const roleEl = document.getElementById('display-role');
    const profileEl = document.getElementById('user-profile-display');
    if (nameEl) nameEl.innerText = user.name || 'System User';
    if (roleEl) roleEl.innerText = user.role || 'Personnel';
    if (profileEl) profileEl.style.display = 'block';
  } catch (err) {
    console.error('[PROFILE ERROR]', err);
  }
}

// ============================================================
// 🔌 SOCKET
// ============================================================
async function initSocket() {
  if (socket || !authToken) return;
  try {
    const res = await fetch(`${BACKEND_HOST}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const user = await res.json();
    if (!user?.id && !user?._id) return;
    socket = io(BACKEND_HOST);
    socket.on('connect', () => {
      socket.emit('join_notifications', { userId: user._id || user.id, role: user.role });
    });
    socket.on('timer_paused', (data) => { if (data) applyServerState(data); });
    socket.on('timer_resumed', (data) => {
      idleNotificationSent = false;
      if (data) applyServerState(data);
      else pollSessionStatus();
    });
    socket.on('timer_update', (data) => { if (data) applyServerState(data); });
    socket.on('new_notification', (notif) => {
      if (window.electronAPI?.notifyNative) {
        window.electronAPI.notifyNative('New Announcement', notif.message).catch(() => { });
      } else if (window.Notification?.permission === 'granted') {
        new window.Notification('New Announcement', { body: notif.message });
      }
    });
  } catch (err) {
    console.error('[SOCKET ERROR]', err);
  }
}

// ============================================================
// 🔐 AUTH
// ============================================================
function showAuthSection() {
  const authEl = document.getElementById('auth-section');
  if (authEl) authEl.style.display = 'flex';
  status = 'OFFLINE';
  updateUI();
}

function hideAuthSection() {
  const authEl = document.getElementById('auth-section');
  if (authEl) authEl.style.display = 'none';
}

function redirectToWebLogin() {
  const loginUrl = `${FRONTEND_HOST}/login?desktop=true`;
  if (window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(loginUrl);
  } else {
    window.open(loginUrl, '_blank');
  }
}

if (window.electronAPI?.onDeepLinkServer) {
  window.electronAPI.onDeepLinkServer(async (serverUrl) => {
    if (serverUrl && typeof serverUrl === 'string') {
      let cleanUrl = serverUrl.replace(/\/+$/, '');
      if (cleanUrl.includes('aupanishad.tech') || cleanUrl.includes(':3000')) {
        cleanUrl = PRODUCTION_BACKEND_URL;
      }
      console.log('Server URL received via deep link:', cleanUrl);
      BACKEND_HOST = cleanUrl;
      API_BASE = `${BACKEND_HOST}/api/time`;
      await window.electronAPI.setStoreValue('serverHost', cleanUrl);
      initSocket();
    }
  });
}

if (window.electronAPI?.onDeepLinkToken) {
  window.electronAPI.onDeepLinkToken(async (token) => {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) errorEl.style.display = 'none';

    console.log('Auth token received via deep link.');
    authToken = token;
    await window.electronAPI.setStoreValue('authToken', authToken);

    if (BACKEND_HOST.includes('aupanishad.tech') || BACKEND_HOST.includes(':3000')) {
      BACKEND_HOST = PRODUCTION_BACKEND_URL;
      API_BASE = `${BACKEND_HOST}/api/time`;
      await window.electronAPI.setStoreValue('serverHost', BACKEND_HOST);
    }

    hideAuthSection();
    await fetchUserProfile();
    initSocket();
    await pollSessionStatus();
    startPolling();
    startHeartbeat();
    updateUI();
  });
}

if (window.electronAPI?.onDeepLinkAction) {
  window.electronAPI.onDeepLinkAction(async (action) => {
    console.log('[Remote/DeepLink Action]', action);
    if (!authToken) {
      authToken = await window.electronAPI.getStoreValue('authToken');
    }
    if (action === 'start') {
      if (authToken) {
        hideAuthSection();
        await startSession();
      }
    } else if (action === 'stop') {
      if (authToken) {
        await stopSession();
      }
    } else if (action === 'pause') {
      if (authToken) {
        await pauseSession();
      }
    }
  });
}

async function logout() {
  const currentToken = authToken;
  const currentSocket = socket;
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  // 1. Tell backend to stop tracking and record logout
  if (currentToken) {
    try {
      await fetch(`${API_BASE}/desktop-logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoutTime: nowStr })
      }).catch(() => {});

      await fetch(`${API_BASE}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch (e) {
      console.error('[LOGOUT NOTIFICATION ERROR]', e);
    }
  }

  // 2. Emit socket event
  if (currentSocket) {
    try {
      let userId = null;
      if (currentToken) {
        try {
          userId = JSON.parse(atob(currentToken.split('.')[1]))?.id;
        } catch (_) {}
      }
      currentSocket.emit('desktop_logout', { userId, timestamp: nowStr });
    } catch (_) {}
    currentSocket.disconnect();
    socket = null;
  }

  authToken = '';
  await window.electronAPI.setStoreValue('authToken', '');
  await window.electronAPI.setStoreValue('serverHost', PRODUCTION_BACKEND_URL);
  BACKEND_HOST = PRODUCTION_BACKEND_URL;
  API_BASE = `${BACKEND_HOST}/api/time`;
  stopPolling();
  stopHeartbeat();
  stopScreenshotLoop();
  stopIdleReminderLoop();
  activeSeconds = 0;
  inactiveSeconds = 0;
  status = 'OFFLINE';
  isIdle = false;
  updateDisplay();
  showAuthSection();
  const profileEl = document.getElementById('user-profile-display');
  if (profileEl) profileEl.style.display = 'none';
}

// ============================================================
// 🔧 UTILS
// ============================================================
function formatTime(s) {
  const total = Math.max(0, Math.round(s || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ============================================================
// 🎛️ EVENT BINDINGS — UI buttons only, NOT for idle detection
// ============================================================
document.getElementById('start-btn')?.addEventListener('click', startSession);
document.getElementById('pause-btn')?.addEventListener('click', pauseSession);
document.getElementById('resume-btn')?.addEventListener('click', resumeSession);
document.getElementById('stop-btn')?.addEventListener('click', stopSession);
document.getElementById('confirm-checkout-btn')?.addEventListener('click', confirmStopSession);
document.getElementById('cancel-checkout-btn')?.addEventListener('click', hideCheckoutConfirmationModal);
document.getElementById('minimize-btn')?.addEventListener('click', () => window.electronAPI.minimizeApp());
document.getElementById('close-btn')?.addEventListener('click', () => window.electronAPI.closeApp());
document.getElementById('web-auth-btn')?.addEventListener('click', redirectToWebLogin);
document.getElementById('logout-btn')?.addEventListener('click', logout);
document.getElementById('completed-logout-btn')?.addEventListener('click', logout);
document.getElementById('auth-minimize-btn')?.addEventListener('click', () => window.electronAPI.minimizeApp());
document.getElementById('auth-close-btn')?.addEventListener('click', () => window.electronAPI.closeApp());

// Re-poll when window regains focus (catches state changes while minimized)
window.addEventListener('focus', () => { if (authToken) pollSessionStatus(); });
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && authToken) pollSessionStatus();
});

// ── Window Controls ─────────────────────────────────────
document.getElementById('minimize-btn')?.addEventListener('click', () => {
  window.electronAPI.minimizeApp();
});
document.getElementById('close-btn')?.addEventListener('click', () => {
  window.electronAPI.closeApp();
});
document.getElementById('auth-minimize-btn')?.addEventListener('click', () => {
  window.electronAPI.minimizeApp();
});
document.getElementById('auth-close-btn')?.addEventListener('click', () => {
  window.electronAPI.closeApp();
});

// ── Custom Auto-Updater Modal Logic ─────────────────────
if (window.electronAPI?.onUpdateDownloaded) {
  window.electronAPI.onUpdateDownloaded(() => {
    const updateSection = document.getElementById('update-section');
    if (updateSection) {
      updateSection.style.display = 'flex';
    }
  });
}

document.getElementById('update-restart-btn')?.addEventListener('click', () => {
  if (window.electronAPI?.installUpdate) {
    window.electronAPI.installUpdate();
  }
});

document.getElementById('update-later-btn')?.addEventListener('click', () => {
  const updateSection = document.getElementById('update-section');
  if (updateSection) {
    updateSection.style.display = 'none';
  }
});

document.getElementById('update-minimize-btn')?.addEventListener('click', () => {
  window.electronAPI?.minimizeApp();
});
document.getElementById('update-close-btn')?.addEventListener('click', () => {
  const updateSection = document.getElementById('update-section');
  if (updateSection) {
    updateSection.style.display = 'none';
  }
});

// ── Dynamic Version Display ─────────────────────────────
if (window.electronAPI?.getAppVersion) {
  window.electronAPI.getAppVersion().then(v => {
    const versionEl = document.getElementById('version-display');
    if (versionEl && v) {
      versionEl.innerText = `V${v} PRO`;
    }
  }).catch(() => {});
}
