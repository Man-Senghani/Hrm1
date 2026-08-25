/**
 * Desktop Tracker Bridge Service
 * Connects the web application to the FluidHR Desktop Application.
 */

const LOCAL_BRIDGE_URL = 'http://127.0.0.1:28734';

/**
 * Pings the local desktop tracker application to see if it's currently running.
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
export const pingDesktopTracker = async (timeoutMs = 800) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${LOCAL_BRIDGE_URL}/ping`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return data.ok === true;
    }
    return false;
  } catch (_) {
    clearTimeout(timeoutId);
    return false;
  }
};

/**
 * Signals the desktop tracker application to start tracking.
 * Automatically attempts local HTTP bridge and falls back to custom URI scheme (fluidhr-tracker://).
 * @param {string} token - User's auth token
 * @returns {Promise<{ success: boolean, method?: string, error?: string }>}
 */
export const startDesktopTracker = async (token) => {
  // 1. Try local HTTP bridge (if app is already running)
  const isRunning = await pingDesktopTracker(600);
  if (isRunning) {
    try {
      const res = await fetch(`${LOCAL_BRIDGE_URL}/start?token=${encodeURIComponent(token || '')}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        return { success: true, method: 'local_bridge' };
      }
    } catch (_) {
      // Fall through to protocol handler
    }
  }

  // 2. If not running, attempt launching via OS Custom URI scheme
  return new Promise((resolve) => {
    let hasResolved = false;
    let didBlur = false;

    const onBlur = () => {
      didBlur = true;
    };

    window.addEventListener('blur', onBlur);

    // Launch custom protocol with server origin
    const serverHost = import.meta.env?.VITE_API_URL || 'https://hrm1-wljp.onrender.com';
    const protocolUrl = `fluidhr-tracker://start?token=${encodeURIComponent(token || '')}&server=${encodeURIComponent(serverHost)}`;
    
    // Create invisible iframe or navigation
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = protocolUrl;
    document.body.appendChild(iframe);

    // Also fallback to direct location after microtask if iframe fails in some browsers
    setTimeout(() => {
      try {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (_) {}
    }, 2000);

    // Poll local bridge for up to 3.5 seconds to see if app launched and responded
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(async () => {
      attempts++;
      const alive = await pingDesktopTracker(300);
      if (alive) {
        clearInterval(interval);
        window.removeEventListener('blur', onBlur);
        if (!hasResolved) {
          hasResolved = true;
          // Send start command to newly launched app
          try {
            await fetch(`${LOCAL_BRIDGE_URL}/start?token=${encodeURIComponent(token || '')}`);
          } catch (_) {}
          resolve({ success: true, method: 'deep_link_launched' });
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        window.removeEventListener('blur', onBlur);
        if (!hasResolved) {
          hasResolved = true;
          resolve({ 
            success: false, 
            error: 'NOT_FOUND',
            message: 'FluidHR Desktop Application is not running or not installed on your system.' 
          });
        }
      }
    }, 350);
  });
};

/**
 * Signals the desktop tracker application to stop tracking.
 */
export const stopDesktopTracker = async () => {
  try {
    await fetch(`${LOCAL_BRIDGE_URL}/stop`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return true;
  } catch (_) {
    return false;
  }
};
