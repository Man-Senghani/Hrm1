import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, User, Clock, CalendarDays, FileText,
  FolderOpen, TrendingUp, MessageSquare, Bell, Search,
  LogOut, ChevronLeft, ChevronRight, Sun, Moon, Menu, X,
  Play, Zap, PlusCircle, Calendar, Wallet, Target,
  Globe, ChevronDown, Briefcase, BarChart3
} from 'lucide-react';
import useAuthStore from '@shared/store/authStore';

// ─── THEME HOOK ───────────────────────────────────────────────
const useTheme = () => {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      return true;
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark');
      return false;
    }
    return document.documentElement.classList.contains('dark');
  });
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      document.documentElement.classList.add('theme-transitioning');
    }
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    if (!isFirstRender.current) {
      const timer = setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [dark]);
  return [dark, setDark];
};

// ─── SIDEBAR GROUPS ──────────────────────────────────────────
const SIDEBAR_ITEMS = {
  OVERVIEW: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Time Tracker', path: '/time-tracker', icon: Clock },
    { label: 'Team Chat', path: '/chat', icon: MessageSquare },
    { label: 'Notifications', path: '/notifications', icon: Bell },
  ],
  WORKSPACE: [
    { label: 'My Attendance', path: '/attendance', icon: CalendarDays },
    { label: 'My Leave', path: '/leave', icon: Calendar },
    { label: 'My Projects', path: '/projects', icon: FolderOpen },
    { label: 'My Payslips', path: '/payslips', icon: Wallet },
    { label: 'My Documents', path: '/documents', icon: FileText },
    { label: 'My Performance', path: '/performance', icon: Target },
    { label: 'Company Holidays', path: '/holidays', icon: Globe },
    { label: 'Events', path: '/events', icon: Briefcase },
  ],
  ACCOUNT: [
    { label: 'My Profile', path: '/profile', icon: User },
  ]
};

// ─── AVATAR ───────────────────────────────────────────────────
const Avatar = ({ name = '', image, size = 32 }) => {
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const colors = ['#16a34a', '#2563eb', '#9333ea', '#dc2626', '#d97706'];
  const color = colors[name.charCodeAt(0) % colors.length] || '#16a34a';

  const getUrl = (p) => {
    if (!p) return null;
    if (p.startsWith('http') || p.startsWith('data:')) return p;
    return p.startsWith('/') ? p : `/${p}`;
  };

  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, background: image ? 'transparent' : color, fontSize: size * 0.38 }}
    >
      {image
        ? <img src={getUrl(image)} alt={name} className="w-full h-full object-cover" />
        : initials
      }
    </div>
  );
};

// ─── MAIN LAYOUT ─────────────────────────────────────────────
const EmployeeLayout = () => {
  const [dark, setDark] = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const token = sessionStorage.getItem('token');
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const isChat = location.pathname.endsWith('/chat');

  // ── Fetch Profile ──────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setIsProfileLoading(false);
      return;
    }
    setIsProfileLoading(true);
    setProfileError(null);
    axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.data) {
          setProfile(r.data);
          sessionStorage.setItem('user', JSON.stringify(r.data));
        } else {
          throw new Error('No profile data');
        }
      })
      .catch(() => {
        const s = sessionStorage.getItem('user');
        if (s && s !== 'undefined' && s !== 'null') {
          try {
            setProfile(JSON.parse(s));
          } catch {
            setProfileError('Unable to load profile');
          }
        } else {
          setProfileError('Unable to load profile');
        }
      })
      .finally(() => {
        setIsProfileLoading(false);
      });
  }, [token]);

  // ── Fetch Notifications ────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const fetch = () => axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const items = Array.isArray(r.data)
          ? r.data
          : (r.data?.notifications || r.data?.data || []);
        setNotifications(items.filter(n => !n.read).slice(0, 50));
      }).catch(() => { });
    fetch();
    const id = setInterval(fetch, 60000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const fetchStatus = () => {
      axios.get('/api/time/status', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          const isRunning = !!(r.data?.isRunning && r.data?.status === 'active');
          setTimerActive(isRunning);
          setIsPaused(!isRunning);
        })
        .catch(() => { });
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // ── Socket ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const s = io(window.location.origin, { withCredentials: true });
    s.on('connect', () => {
      const u = (() => { try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; } })();
      if (u) s.emit('join_notifications', { userId: u._id || u.id, role: 'employee' });
    });
    s.on('notification', d => setNotifications(p => [d, ...p].slice(0, 50)));
    s.on('new_notification', d => setNotifications(p => [d, ...p].slice(0, 50)));
    s.on('timer_paused', () => { setTimerActive(false); setIsPaused(true); });
    s.on('timer_stopped', () => { setTimerActive(false); setIsPaused(true); });
    s.on('timer_resumed', () => { setTimerActive(true); setIsPaused(false); });
    s.on('timer_update', () => {
      axios.get('/api/time/status', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          const isRunning = !!(r.data?.isRunning && r.data?.status === 'active');
          setTimerActive(isRunning);
          setIsPaused(!isRunning);
        }).catch(() => { });
    });
    return () => s.disconnect();
  }, [token]);

  // ── Click Outside Notif & Profile ─────────────────────────
  useEffect(() => {
    const h = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileDropdownOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 🛡️ KEYBOARD ACCESSIBILITY HANDLERS
  const handleDropdownKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsProfileDropdownOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const focusableElements = dropdownRef.current?.querySelectorAll('button, [role="menuitem"]');
      if (!focusableElements || focusableElements.length === 0) return;

      const activeElement = document.activeElement;
      const index = Array.from(focusableElements).indexOf(activeElement);

      let nextIndex = index;
      if (e.key === 'ArrowDown') {
        nextIndex = (index + 1) % focusableElements.length;
      } else if (e.key === 'ArrowUp') {
        nextIndex = (index - 1 + focusableElements.length) % focusableElements.length;
      }

      focusableElements[nextIndex]?.focus();
    }
  };

  useEffect(() => {
    if (isProfileDropdownOpen) {
      // Focus on the first item in dropdown for keyboard accessibility
      const firstItem = dropdownRef.current?.querySelector('button, [role="menuitem"]');
      firstItem?.focus();
    }
  }, [isProfileDropdownOpen]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleResume = () => {
    axios.post('/api/time/resume', {}, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => { setTimerActive(true); setIsPaused(false); })
      .catch(() => {
        axios.post('/api/time/start', {}, { headers: { Authorization: `Bearer ${token}` } })
          .then(() => { setTimerActive(true); setIsPaused(false); })
          .catch(() => { });
      });
  };

  const displayName = profile?.name || profile?.fullName || 'Employee';
  const displayEmail = profile?.email || 'employee@fluidhr.com';
  const userRealRole = profile?.position || (
    profile?.role === 'admin' ? 'Super Admin' :
      profile?.role === 'hr' ? 'HR Manager' :
        profile?.role === 'manager' ? 'Team Manager' :
          profile?.role === 'employee' ? 'Employee' : 'User'
  );
  const activeRole = sessionStorage.getItem('role') || 'employee';
  const activeRoleTitle = activeRole === 'admin' ? 'Super Admin' :
    activeRole === 'hr' ? 'HR Manager' :
      activeRole === 'manager' ? 'Team Manager' :
        activeRole === 'employee' ? 'Employee' : 'User';

  const handleRoleSwitch = (targetRole) => {
    sessionStorage.setItem('role', targetRole);
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        userObj.role = targetRole;
        sessionStorage.setItem('user', JSON.stringify(userObj));
      } catch (e) {
        console.error('Failed to sync user role in session:', e);
      }
    }
    setIsProfileDropdownOpen(false);
    window.location.href = `/${targetRole}`;
    window.location.reload();
  };

  const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'BK';

  const unreadCount = notifications.length;

  // ─── SIDEBAR CONTENT ────────────────────────────────────────
  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full" style={{ backgroundColor: dark ? '#08100e' : '#ffffff', fontFamily: "'Inter', sans-serif" }}>
      {/* Brand Header */}
      {(!collapsed || mobile) ? (
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#eceae3] dark:border-[#1a2d29]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#00a76b]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              <circle cx="12" cy="12" r="3" fill="white" />
            </svg>
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="font-bold text-[16px] text-[#201515] dark:text-white tracking-tight">Fluid HR</span>
            <span className="text-[10px] font-bold text-[#829e92] dark:text-[#527068] uppercase tracking-wider">Workforce OS</span>
          </div>
          {mobile && (
            <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 rounded-lg text-[#829e92] cursor-pointer bg-transparent border-none hover:text-[#201515] dark:hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-5 border-b border-[#eceae3] dark:border-[#1a2d29]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#00a76b]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              <circle cx="12" cy="12" r="3" fill="white" />
            </svg>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
        {Object.entries(SIDEBAR_ITEMS).map(([groupName, items]) => (
          <div key={groupName} className="space-y-1.5">
            {(!collapsed || mobile) && (
              <p className="px-3 text-[10px] font-bold text-[#829e92] dark:text-[#527068] uppercase tracking-[0.15em] mb-1.5 mt-1">
                {groupName}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/')) || (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => mobile && setMobileOpen(false)}
                    title={collapsed && !mobile ? item.label : ''}
                    style={{ transition: 'all 200ms ease-in-out' }}
                    className={`flex items-center h-9 text-[13px] font-semibold no-underline rounded-[6px] group ${collapsed && !mobile ? 'justify-center px-0 w-full' : 'px-3 gap-2.5 w-full'} ${active ? 'text-white bg-[#00a76b] shadow-sm' : 'text-[#475569] dark:text-[#a3b3af] hover:bg-[#eceae3]/50 dark:hover:bg-[#111c18]/60 hover:text-[#00a76b]'}`}
                  >
                    <div className={`shrink-0 flex items-center justify-center transition-all ${collapsed && !mobile ? 'w-8' : 'w-5'}`}>
                      <Icon size={17} className={active ? 'text-white' : 'text-[#64748b] dark:text-[#829e92] group-hover:text-[#00a76b]'} style={{ transition: 'color 200ms ease-in-out' }} />
                    </div>
                    {(!collapsed || mobile) && <span className="truncate whitespace-nowrap overflow-hidden">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse button at bottom */}
      <div className="p-3 mt-auto border-t border-[#eceae3] dark:border-[#1a2d29]">
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`flex items-center h-9 text-[13px] font-semibold no-underline rounded-[6px] transition-all w-full bg-transparent border-none cursor-pointer text-[#475569] dark:text-[#a3b3af] hover:bg-[#eceae3]/50 dark:hover:bg-[#111c18]/60 hover:text-[#00a76b] ${collapsed && !mobile ? 'justify-center px-0' : 'px-3 gap-2.5'}`}
          style={{ transition: 'all 200ms ease-in-out' }}
        >
          <div className="shrink-0 flex items-center justify-center w-5">
            {collapsed && !mobile ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </div>
          {(!collapsed || mobile) && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#fffefb] dark:bg-[#08100e] text-[#201515] dark:text-[#e2e8f0] transition-colors duration-300 ease-in-out">
      {/* ── TOPBAR (Full Width) ────────────────────────── */}
      <header className="sticky top-0 w-full z-50 border-b border-[#c5c0b1] dark:border-[#1a2d29] bg-white/80 dark:bg-[#08100e]/80 backdrop-blur-md transition-colors duration-300 ease-in-out">
        <div className="flex items-center h-[56px] w-full px-6">
          <div className="flex items-center gap-6 mr-6">
            <Link to="/dashboard" className="flex items-center gap-3 no-underline">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#00a76b] rounded-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                    <circle cx="12" cy="12" r="3" fill="white" />
                  </svg>
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[17px] font-black text-[#201515] dark:text-white tracking-tight">Fluid HR</span>
                  <span className="text-[10px] font-bold text-[#939084] dark:text-[#a3b3af] uppercase tracking-wider">Workforce OS</span>
                </div>
              </div>
            </Link>
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden md:flex items-center justify-center w-10 h-10 hover:bg-[#eceae3] rounded-[5px] text-[#36342e] transition-all cursor-pointer border-none bg-transparent"
            >
              <Menu size={22} />
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 hover:bg-[#eceae3] rounded-[5px] text-[#36342e] transition-all cursor-pointer border-none bg-transparent"
            >
              <Menu size={22} />
            </button>
          </div>

          {/* Search bar in the center-left */}
          <div className="flex-1 max-w-[340px] relative mx-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search employees, requests, payroll..."
              className="w-full pl-10 pr-4 py-2 bg-[#f3f4f6] dark:bg-[#111c18] border-none rounded-full text-sm font-semibold text-gray-700 dark:text-[#a3b3af] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white dark:focus:bg-[#162722] transition-all"
            />
          </div>

          {/* + Quick action button */}
          <button className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#00b27a] to-[#00915c] hover:from-[#00c285] hover:to-[#00a368] text-white rounded-full font-bold text-xs transition-all cursor-pointer border-none shadow-sm mr-4">
            <PlusCircle size={15} strokeWidth={2.8} />
            <span>Quick action</span>
          </button>

          <div className="ml-auto flex items-center h-full gap-2">
            {/* Inactivity banner / timer controls */}
            {timerActive ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#eceae3] rounded-full border border-[#c5c0b1] mr-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#24a148]"></div>
                <span className="text-[10px] font-black text-[#201515] uppercase tracking-widest tabular-nums">
                  Active
                </span>
              </div>
            ) : (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#00a76b] text-white rounded-full border-none cursor-pointer hover:bg-[#059669] transition-all mr-2"
              >
                <Play size={14} fill="currentColor" />
                <span className="text-[10px] font-black uppercase tracking-widest">Resume Timer</span>
              </button>
            )}

            {/* Utility Icons */}
            <button className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-100 border-none bg-transparent cursor-pointer">
              <Globe size={18} />
            </button>

            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-100 border-none bg-transparent cursor-pointer"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => navigate('/employee/chat')}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-100 border-none bg-transparent cursor-pointer"
            >
              <MessageSquare size={18} />
            </button>

            {/* Notifications Alert Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNotifOpen(!notifOpen);
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative border-none cursor-pointer outline-none ${notifOpen ? 'bg-[#00a76b] text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm border border-white dark:border-[#111c18]">
                    {unreadCount > 10 ? '10+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-[48px] right-0 w-80 bg-white dark:bg-[#111c18] border border-[#c5c0b1] dark:border-[#1a2d29] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden z-[100]">
                  <div className="p-4 border-b border-[#eceae3] dark:border-[#1a2d29] bg-[#fffdf9] dark:bg-[#162722] flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#201515] dark:text-white">Intelligence Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-[#00a76b]/10 text-[#00a76b] text-[8px] font-black rounded-full uppercase">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af]">No Active Alerts</p>
                      </div>
                    ) : (
                      notifications.map((n, i) => {
                        const senderName = n.senderName || n.sender?.name || n.senderId?.name || (typeof n.sender === 'string' ? n.sender : null);
                        const senderRole = n.senderRole || n.sender?.role || n.senderId?.role || '';

                        return (
                          <div
                            key={n._id || i}
                            onClick={() => {
                              navigate(n.path || '/employee/dashboard');
                              setNotifOpen(false);
                              setNotifications(prev => prev.filter(notif => notif._id !== n._id));
                              if (n._id) axios.put(`/api/notifications/${n._id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => { });
                            }}
                            className="p-4 border-b border-[#eceae3] dark:border-[#1a2d29] hover:bg-[#fffdf9] dark:hover:bg-[#162722]/50 transition-all cursor-pointer group"
                          >
                            <div className="flex gap-3 items-start">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'birthday' ? 'bg-pink-500' : n.type === 'anniversary' ? 'bg-purple-500' : 'bg-[#00a76b]'}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-[#201515] dark:text-[#e2e8f0] leading-snug group-hover:text-[#00a76b] transition-colors break-words">
                                  {n.message || n.text}
                                </p>

                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {senderName ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00a76b] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/50">
                                      <span className="text-gray-500 dark:text-gray-400 font-semibold">From:</span> {senderName} {senderRole ? `(${senderRole.toUpperCase()})` : ''}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                      <span className="text-gray-500 dark:text-gray-400 font-semibold">From:</span> HR / Management
                                    </span>
                                  )}

                                  <span className="text-[9px] font-black text-[#939084] dark:text-[#a3b3af] uppercase tracking-widest">
                                    {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (n.time || 'Recently')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar details */}
            <div className="relative" ref={profileRef}>
              {isProfileLoading ? (
                <div
                  className="hidden sm:flex items-center gap-3 px-3 h-11 rounded-full select-none opacity-60 animate-pulse bg-gray-50 dark:bg-[#111c18]"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0"></div>
                  <div className="flex flex-col gap-1 items-start leading-none">
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-10 mt-1"></div>
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </div>
              ) : (
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsProfileDropdownOpen(!isProfileDropdownOpen);
                    }
                  }}
                  className={`hidden sm:flex items-center gap-3 px-3 h-11 rounded-full cursor-pointer transition-all select-none border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#00a76b]/50 ${isProfileDropdownOpen ? 'bg-gray-100 dark:bg-[#111c18]' : 'hover:bg-gray-100 dark:hover:bg-[#111c18]'}`}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="true"
                >
                  <Avatar name={displayName} image={profile?.profileImage} size={30} />
                  <div className="hidden lg:block text-left leading-none">
                    <div className="text-xs font-semibold text-[#201515] dark:text-white truncate max-w-[120px]">{displayName}</div>
                    <div className="text-[9px] font-medium text-[#00a76b] mt-1">{activeRoleTitle}</div>
                  </div>
                  <ChevronDown size={14} className={`text-gray-500 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              {isProfileDropdownOpen && (
                <div
                  ref={dropdownRef}
                  onKeyDown={handleDropdownKeyDown}
                  className="absolute top-[48px] right-0 w-72 bg-white dark:bg-[#111c18] border border-gray-100 dark:border-[#1a2d29] rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.3)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex="-1"
                >
                  {/* User Details Header inside Dropdown */}
                  {isProfileLoading ? (
                    <div className="px-6 py-4 flex flex-col gap-1.5 animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-32 mt-1"></div>
                    </div>
                  ) : profileError || !profile ? (
                    <div className="px-6 py-4 text-left">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">Unable to load profile</span>
                    </div>
                  ) : (
                    <div className="px-6 pt-5 pb-4 flex flex-col">
                      <span className="text-[17px] font-semibold text-slate-900 dark:text-white leading-tight">{displayName}</span>
                      <span className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-none">{displayEmail}</span>
                    </div>
                  )}

                  <div className="h-px bg-slate-100 dark:bg-slate-800/80 w-full" />

                  {/* Dropdown Options */}
                  <div className="flex flex-col">


                    <button
                      role="menuitem"
                      onClick={() => {
                        setIsLogoutModalOpen(true);
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full px-6 py-3.5 flex items-center gap-3.5 text-left text-[14px] font-semibold text-[#EF4444] dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors duration-150 border-none bg-transparent cursor-pointer outline-none focus-visible:bg-red-50/50 dark:focus-visible:bg-red-950/20"
                    >
                      <LogOut size={18} className="text-[#EF4444] dark:text-red-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full relative">
        {/* Desktop Sidebar */}
        <aside
          className="hidden md:flex flex-col border-r flex-shrink-0 transition-all duration-300 ease-in-out relative"
          style={{
            width: collapsed ? '80px' : '280px',
            borderColor: dark ? '#1a2d29' : '#e2eae7',
            backgroundColor: dark ? '#08100e' : '#ffffff',
          }}
        >
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-[280px] border-r animate-slide-in-left shadow-2xl"
              style={{
                backgroundColor: dark ? '#08100e' : '#ffffff',
                borderColor: dark ? '#1a2d29' : '#e2eae7'
              }}>
              <SidebarContent mobile />
            </aside>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#fffefb] dark:bg-[#08100e] relative flex flex-col">
          {isChat ? (
            <div className="h-full relative overflow-hidden"><Outlet /></div>
          ) : (
            <div className="p-4 md:p-6 lg:p-8 max-w-[1440px] mx-auto animate-fade-in w-full">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsLogoutModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-[#0c1512] border border-[#eceae3] dark:border-[#1a2d29] rounded-[24px] shadow-2xl w-full max-w-sm p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <LogOut size={28} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sign Out</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                Are you sure you want to sign out?
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-[#162722] dark:hover:bg-[#1a2d29] text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsLogoutModalOpen(false);
                    handleLogout();
                  }}
                  className="flex-1 py-3 px-4 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#00a76b]/20 border-none cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLayout;
