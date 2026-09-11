/**
 * 🛡️ Single Account Browser Session Synchronizer
 * Enforces that only ONE account can be active across the entire browser at a time.
 * Cross-tab synchronizes logins, logouts, and account switches.
 */

export const getActiveBrowserAccount = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('activeAccount');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.token && parsed.role) {
      return parsed;
    }
    return null;
  } catch (_) {
    return null;
  }
};

export const setActiveBrowserAccount = (data) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('activeAccount', JSON.stringify(data));
    if (data?.token) {
      localStorage.setItem('token', data.token);
    }
  } catch (err) {
    console.error('Failed to set active account in localStorage:', err);
  }
};

export const clearActiveAccountAndSession = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('activeAccount');
    localStorage.removeItem('token');
    sessionStorage.clear();
  } catch (err) {
    console.error('Failed to clear active session:', err);
  }
};

export const syncSessionFromActiveAccount = () => {
  if (typeof window === 'undefined') return false;
  try {
    let sessionToken = sessionStorage.getItem('token');
    const active = getActiveBrowserAccount();

    if (!sessionToken && active) {
      // Hydrate sessionStorage from activeAccount in localStorage
      sessionStorage.setItem('token', active.token);
      sessionStorage.setItem('role', active.role);
      sessionStorage.setItem('user', JSON.stringify({
        _id: active._id,
        role: active.role,
        email: active.email,
        name: active.name
      }));
      return true;
    }

    // Migration fallback: populate activeAccount from existing valid session
    if (sessionToken && !active) {
      const userRaw = sessionStorage.getItem('user');
      const role = sessionStorage.getItem('role');
      let user = {};
      try { user = JSON.parse(userRaw || '{}'); } catch (_) {}
      setActiveBrowserAccount({
        _id: user._id || user.id,
        role: role || user.role,
        email: user.email,
        name: user.name || user.fullName || user.email,
        token: sessionToken,
        loggedInAt: Date.now()
      });
      return true;
    }

    // Consistency check: ensure sessionStorage matches activeAccount
    if (sessionToken && active) {
      const userRaw = sessionStorage.getItem('user');
      let user = {};
      try { user = JSON.parse(userRaw || '{}'); } catch (_) {}
      if (user.email && active.email && user.email.toLowerCase() !== active.email.toLowerCase()) {
        sessionStorage.setItem('token', active.token);
        sessionStorage.setItem('role', active.role);
        sessionStorage.setItem('user', JSON.stringify({
          _id: active._id,
          role: active.role,
          email: active.email,
          name: active.name
        }));
        return true;
      }
    }

    return !!sessionToken;
  } catch (err) {
    console.error('Session sync error:', err);
    return false;
  }
};

export const setupCrossTabSessionSync = (onLogoutCallback) => {
  if (typeof window === 'undefined') return () => {};

  const handleStorageEvent = (e) => {
    if (e.key === 'activeAccount') {
      if (!e.newValue) {
        // Active account was cleared in another tab (logout)
        sessionStorage.clear();
        if (typeof onLogoutCallback === 'function') {
          onLogoutCallback();
        } else {
          window.location.href = '/login';
        }
      } else {
        try {
          const newActive = JSON.parse(e.newValue);
          const userRaw = sessionStorage.getItem('user');
          const currentUser = userRaw ? JSON.parse(userRaw) : null;
          if (newActive?.email && currentUser?.email && newActive.email.toLowerCase() !== currentUser.email.toLowerCase()) {
            // A different user logged in on another tab
            sessionStorage.clear();
            if (typeof onLogoutCallback === 'function') {
              onLogoutCallback();
            } else {
              window.location.href = '/login';
            }
          }
        } catch (_) {}
      }
    }
  };

  window.addEventListener('storage', handleStorageEvent);
  return () => window.removeEventListener('storage', handleStorageEvent);
};
