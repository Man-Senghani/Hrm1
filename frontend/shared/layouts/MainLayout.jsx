import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import ChangePasswordModal from '@shared/components/ChangePasswordModal';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Search,
  Plus,
  LayoutDashboard,
  Users,
  CheckSquare,
  Layers,
  FileText,
  Calendar,
  Clock,
  Wallet,
  TrendingUp,
  BarChart3,
  Settings,
  ClipboardList,
  Briefcase,
  Menu,
  X,
  Target,
  Bell,
  MessageSquare,
  AlertCircle,
  Play,
  Camera,
  PlusCircle,
  User,
  Globe,
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  GraduationCap,
  IdCard,
  Plug,
  Award,
  RefreshCw,
  UserPlus
} from 'lucide-react';
import { io } from 'socket.io-client';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';
import RoleSearchBar from '@shared/components/RoleSearchBar';

const MainLayout = ({ children, navItems, userRole, userName, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const showExpandedSidebar = isSidebarOpen || isSidebarHovered;
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
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
  const [liveNotifications, setLiveNotifications] = useState([]);
  const notificationRef = React.useRef(null);
  const profileRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const quickActionRef = React.useRef(null);

  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Reserved for location.pathname based side effects
  }, [location.pathname]);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    document.documentElement.classList.add('theme-transitioning');
    setIsDarkMode(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 350);
  };

  const role = sessionStorage.getItem('role') || 'admin';
  const token = sessionStorage.getItem('token');
  const [userProfile, setUserProfile] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // 🛡️ DYNAMIC ROLE DERIVATION (URL-FIRST)
  const pathRole = location.pathname.split('/')[1];
  const roleMap = { admin: 'admin', hr: 'hr', manager: 'manager', employee: 'employee' };
  const activeRole = roleMap[pathRole] ? pathRole : role;
  const [unreadChats, setUnreadChats] = useState([]);
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      try {
        const res = await axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        const items = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.notifications)
            ? res.data.notifications
            : Array.isArray(res.data?.data)
              ? res.data.data
              : [];
        const alerts = items
          .filter(n => !n.read)
          .map(n => ({
            id: n._id,
            type: n.type || 'task',
            text: n.message,
            read: n.read || false,
            time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            path: `/${activeRole}/notifications`
          }));
        setLiveNotifications(alerts.slice(0, 50));
      } catch (err) { console.error('Notification fetch failed:', err); }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Back-up poll every min
    return () => clearInterval(interval);
  }, [token, activeRole]);

  useEffect(() => {
    const fetchUnreadChats = async () => {
      if (!token) return;
      try {
        const res = await axios.get('/api/chat/list', { headers: { Authorization: `Bearer ${token}` } });
        const unread = res.data.filter(c => c.unreadCount > 0);
        setUnreadChats(unread);
      } catch (err) { console.error('Chat fetch failed:', err); }
    };
    fetchUnreadChats();
    const interval = setInterval(fetchUnreadChats, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // 🛡️ CLICK OUTSIDE HANDLER
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }

      if (quickActionRef.current && !quickActionRef.current.contains(event.target)) {
        setIsQuickActionOpen(false);
      }
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        setIsChatPopupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔔 REAL-TIME SOCKET NOTIFICATIONS
  useEffect(() => {
    if (!token) return;
    const userId = (() => { try { return JSON.parse(atob(token.split('.')[1]))?.id; } catch { return null; } })();
    if (!userId) return;

    const socket = io(API_BASE_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      socket.emit('join_notifications', { userId, role });
    });

    socket.on('new_notification', (notif) => {
      const formatted = {
        id: notif._id,
        type: notif.type || 'announcement',
        text: notif.message,
        read: false,
        batchId: notif.batchId,
        time: new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        path: `/${activeRole}/notifications`
      };
      setLiveNotifications(prev => [formatted, ...prev].slice(0, 50));

      // Show Native OS Desktop Notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('New Announcement', { body: notif.message });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('New Announcement', { body: notif.message });
            }
          });
        }
      }
    });

    socket.on('update_notification', (notif) => {
      setLiveNotifications(prev => prev.map(n =>
        (n.id === notif._id || (n.batchId && n.batchId === notif.batchId)) ? { ...n, text: notif.message } : n
      ));
    });

    socket.on('delete_notification', (notif) => {
      setLiveNotifications(prev => prev.filter(n =>
        !(n.id === notif._id || (n.batchId && n.batchId === notif.batchId))
      ));
    });

    socket.on('desktop_app_logout', (data) => {
      const logoutTime = data?.logoutTime || data?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#18181b] text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-emerald-500/50 p-4 items-center gap-3 border border-emerald-500/30`}>
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <LogOut size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">FluidHR Tracker</p>
            <p className="text-xs text-emerald-400 font-medium mt-0.5">
              You are successfully logged out at {logoutTime}
            </p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ), {
        position: 'bottom-center',
        duration: 6000
      });

      // Notify all open pages/tabs to stop active timers immediately
      window.dispatchEvent(new CustomEvent('desktop_tracker_stopped', { detail: { logoutTime } }));
      window.dispatchEvent(new CustomEvent('timerStatusChanged', { detail: { status: 'stopped' } }));
    });

    socket.on('timer_started', (data) => {
      window.dispatchEvent(new CustomEvent('timerStatusChanged', { detail: { status: 'started', ...data } }));
    });

    socket.on('timer_resumed', (data) => {
      window.dispatchEvent(new CustomEvent('timerStatusChanged', { detail: { status: 'resumed', ...data } }));
    });

    socket.on('timer_paused', (data) => {
      window.dispatchEvent(new CustomEvent('timerStatusChanged', { detail: { status: 'paused', ...data } }));
    });

    socket.on('timer_stopped', (data) => {
      window.dispatchEvent(new CustomEvent('timerStatusChanged', { detail: { status: 'stopped', ...data } }));
    });

    return () => socket.disconnect();
  }, [token, role, activeRole]);



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

  const displayRole = userRole || (activeRole === 'hr' ? 'HR Manager' : (role ? role.toUpperCase() : 'ADMIN'));

  useEffect(() => {
    const fetchLatestProfile = async () => {
      if (!token) {
        setIsProfileLoading(false);
        return;
      }
      try {
        setIsProfileLoading(true);
        setProfileError(null);
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data) {
          setUserProfile(response.data);
          sessionStorage.setItem('user', JSON.stringify(response.data));
        } else {
          throw new Error('No profile data returned');
        }
      } catch (err) {
        console.error('Profile fetch failed:', err);
        const stored = sessionStorage.getItem('user');
        if (stored && stored !== 'undefined' && stored !== 'null') {
          try {
            setUserProfile(JSON.parse(stored));
          } catch (e) {
            setProfileError('Unable to load profile');
          }
        } else {
          setProfileError('Unable to load profile');
        }
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchLatestProfile();

    window.addEventListener('profileUpdated', fetchLatestProfile);
    return () => window.removeEventListener('profileUpdated', fetchLatestProfile);
  }, [token]);

  const displayName = userProfile?.name || userProfile?.fullName || userName || 'User';

  const displayEmail = userProfile?.email || 'user@company.com';

  const userRealRole = userProfile?.position || (
    userProfile?.role === 'admin' ? 'Super Admin' :
      userProfile?.role === 'hr' ? 'HR Manager' :
        userProfile?.role === 'manager' ? 'Team Manager' :
          userProfile?.role === 'employee' ? 'Employee' : 'User'
  );

  const activeRoleTitle = activeRole === 'admin' ? 'Super Admin' :
    activeRole === 'hr' ? 'HR Manager' :
      activeRole === 'manager' ? 'Team Manager' :
        activeRole === 'employee' ? 'Employee' : 'User';

  const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const baseTitle = 'Fluid HR';
    const roleMap = {
      admin: 'Admin',
      hr: 'HR',
      manager: 'Manager',
      employee: 'Employee'
    };
    const pathRole = location.pathname.split('/')[1];
    const activeRole = roleMap[pathRole] ? pathRole : role;
    const roleName = roleMap[activeRole] || 'System';
    document.title = `${baseTitle} | ${roleName}`;
  }, [role, location.pathname]);

  const getMenuItemsByRole = (currentRole) => {
    switch (currentRole) {
      case 'hr':
        return [
          { name: 'Dashboard', path: '/hr/dashboard', icon: LayoutDashboard },
          { name: 'Employees', path: '/hr/employees', icon: Users },
          { name: 'Daily Tasks Board', path: '/hr/tasks', icon: CheckSquare },
          { name: 'Events Management', path: '/hr/events', icon: Calendar },
          // { name: 'Task Management', path: '/hr/task-management', icon: ClipboardList },
          { name: 'Apply Leave', path: '/hr/leave', icon: ClipboardList },
          { name: 'Attendance', path: '/hr/attendance', icon: Calendar },
          { name: 'Team Chat', path: '/hr/chat', icon: MessageSquare },
          { name: 'Payroll', path: '/hr/payroll', icon: Wallet },
          { name: 'Recruitment', path: '/hr/recruitment', icon: UserPlus },
          { name: 'Performance', path: '/hr/performance', icon: TrendingUp },
          { name: 'Reports', path: '/hr/reports', icon: BarChart3 },
          { name: 'Monitoring Logs', path: '/hr/screenshots', icon: Camera },
          { name: 'Notifications', path: '/hr/notifications', icon: Bell },
          { name: 'Settings', path: '/hr/settings', icon: Settings },
        ];
      case 'employee':
        return [
          { name: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
          { name: 'Attendance', path: '/employee/attendance', icon: Calendar },
          { name: 'Apply Leave', path: '/employee/leave', icon: ClipboardList },
          { name: 'Team Chat', path: '/employee/chat', icon: MessageSquare },
          { name: 'Create Task', path: '/employee/task-management/create', icon: PlusCircle },
          { name: 'My Documents', path: '/employee/documents', icon: FileText },
          { name: 'Notifications', path: '/employee/notifications', icon: Bell },
        ];
      case 'manager':
        return [
          { name: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
          { name: 'Team / Employees', path: '/manager/employees', icon: Users },
          { name: 'Daily Tasks Board', path: '/manager/tasks', icon: CheckSquare },
          { name: 'Events Management', path: '/manager/events', icon: Calendar },
          // { name: 'Task Management', path: '/manager/task-management', icon: ClipboardList },
          // { name: 'Project Hub', path: '/manager/projects', icon: Briefcase },
          { name: 'Team Chat', path: '/manager/chat', icon: MessageSquare },
          { name: 'Team Attendance', path: '/manager/attendance', icon: Calendar },
          { name: 'Monitoring Logs', path: '/manager/screenshots', icon: Camera },
          { name: 'Notifications', path: '/manager/notifications', icon: Bell },
          { name: 'Apply Leave', path: '/manager/leave', icon: FileText },
        ];
      case 'admin':
      default:
        return [
          { name: 'Dashboard', path: `/${currentRole}/dashboard`, icon: LayoutDashboard },
          { name: 'Employees', path: `/${currentRole}/employees`, icon: Users },
          { name: 'Daily Tasks Board', path: `/${currentRole}/tasks`, icon: CheckSquare },
          { name: 'Events Management', path: `/${currentRole}/events`, icon: Calendar },
          // { name: 'Task Management', path: `/${currentRole}/task-management`, icon: ClipboardList },
          { name: 'Team Leave', path: `/${currentRole}/leave`, icon: ClipboardList },
          { name: 'Attendance', path: `/${currentRole}/attendance`, icon: Calendar },
          { name: 'Global Chat', path: `/${currentRole}/chat`, icon: MessageSquare },
          { name: 'Payroll', path: `/${currentRole}/payroll`, icon: Wallet },
          { name: 'Recruitment', path: `/${currentRole}/recruitment`, icon: UserPlus },
          { name: 'Performance', path: `/${currentRole}/performance`, icon: TrendingUp },
          { name: 'Reports', path: `/${currentRole}/reports`, icon: BarChart3 },
          { name: 'Monitoring Logs', path: `/${currentRole}/screenshots`, icon: Camera },
          { name: 'Notifications', path: `/${currentRole}/notifications`, icon: Bell },
          { name: 'Settings', path: `/${currentRole}/settings`, icon: Settings },
        ];
    }
  };

  const menuItems = navItems ? navItems.map(item => ({
    name: item.label || item.name,
    path: item.path,
    icon: item.icon || LayoutDashboard
  })) : getMenuItemsByRole(activeRole);

  const getCategorizedMenuItems = (role) => {
    const categorized = {
      'Overview': [],
      'Workspace': [],
      'Administration': []
    };

    menuItems.forEach(item => {
      const n = item.name.toLowerCase();
      if (n.includes('dashboard') || n.includes('chat') || n.includes('notifications')) {
        categorized['Overview'].push(item);
      } else if (n.includes('settings') || n.includes('log') || n.includes('create user')) {
        categorized['Administration'].push(item);
      } else {
        categorized['Workspace'].push(item);
      }
    });

    const result = {};
    for (const [key, items] of Object.entries(categorized)) {
      if (items.length > 0) result[key] = items;
    }
    return result;
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('role');
      navigate('/login');
    }
  };

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
    navigate(`/${targetRole}/dashboard`);
    window.location.reload();
  };

  const toggleSidebar = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSidebarOpen(!isSidebarOpen);
  };

  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [idleTimer, setIdleTimer] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isPausedByIdle, setIsPausedByIdle] = useState(false);
  const [trackerRawStatus, setTrackerRawStatus] = useState('offline');

  // 🔌 SOCKET INITIALIZATION
  useEffect(() => {
    if (!token) return;
    const s = io(window.location.origin, { withCredentials: true });

    s.on('connect', () => {
      const user = JSON.parse(sessionStorage.getItem('user'));
      if (user) s.emit('join_notifications', { userId: user._id || user.id, role: user.role });
    });

    s.on('notification', (data) => {
      const newAlert = {
        type: data.type || 'task',
        text: data.message,
        time: 'Just Now',
        path: data.type === 'task' ? `/${activeRole}/task-management` : `/${activeRole}/dashboard`
      };
      setLiveNotifications(prev => [newAlert, ...prev].slice(0, 50));
      toast(data.message, { icon: '🔔', style: { borderRadius: '5px', background: '#201515', color: '#fff', fontWeight: 900, fontSize: '12px' } });
    });

    s.on('timer_paused', () => {
      setIsTrackingActive(false);
      setIsPausedByIdle(true);
      setTrackerRawStatus('paused');
    });

    s.on('timer_stopped', () => {
      setIsTrackingActive(false);
      setIsPausedByIdle(true);
      setTrackerRawStatus('stopped');
    });

    s.on('timer_resumed', () => {
      setIsTrackingActive(true);
      setIsPausedByIdle(false);
      setTrackerRawStatus('active');
    });

    s.on('timer_update', () => {
      axios.get('/api/time/status', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const isRunning = !!(res.data?.isRunning && res.data?.status === 'active');
          setIsTrackingActive(isRunning);
          setIsPausedByIdle(!isRunning);
          setTrackerRawStatus(res.data?.status || 'offline');
        }).catch(() => { });
    });

    setSocket(s);
    return () => s.disconnect();
  }, [token, activeRole]);

  // 🛡️ STATUS FETCH & POLLING ONLY (Let desktop app handle tracking and idle events)
  useEffect(() => {
    const fetchStatus = async () => {
      if (!token) return;
      try {
        const res = await axios.get('/api/time/status', { headers: { Authorization: `Bearer ${token}` } });
        const isRunning = !!(res.data?.isRunning && res.data?.status === 'active');
        setIsTrackingActive(isRunning);
        setIsPausedByIdle(!isRunning);
        setTrackerRawStatus(res.data?.status || 'offline');

        if (res.data?.lastActiveTime && res.data?.serverTime) {
          const serverNow = Date.parse(res.data.serverTime);
          const serverLast = Date.parse(res.data.lastActiveTime);
          const localNow = Date.now();

          if (!isNaN(serverNow) && !isNaN(serverLast)) {
            const sinceLast = serverNow - serverLast;
            const adjustedLastActivity = localNow - sinceLast;
            if (adjustedLastActivity > lastActivity) {
              setLastActivity(adjustedLastActivity);
            }
          }
        }
      } catch (err) { console.error('Status fetch failed:', err); }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll status every 10s
    return () => clearInterval(interval);
  }, [token, lastActivity]);

  // 🛡️ REACTIVE IDLE TIMER REMOVED
  // Timer runs continuously until stopped or paused manually.

  const [lastServerSync, setLastServerSync] = useState(0);

  const reportActivity = async (type = 'heartbeat') => {
    if (!token || !isTrackingActive || isPausedByIdle || trackerRawStatus === 'idle') return;
    const now = Date.now();
    if (now - lastServerSync < 15000) return; // 15s throttle

    try {
      await axios.post('/api/time/timer/update', { type }, { headers: { Authorization: `Bearer ${token}` } });
      setLastServerSync(now);
    } catch (err) { console.error('Heartbeat failed:', err); }
  };

  // 🛡️ NOTIFICATION LOGIC REMOVED PER USER REQUEST
  // Absolute silence protocol active. No browser notifications will be sent.
  // 🛡️ IDLE TIMER REMOVED PER USER REQUEST
  // Timer will only pause on explicit user interaction.

  // 🔄 GLOBAL ACTIVITY TRACKER
  useEffect(() => {
    const handleActivity = (e) => {
      const now = Date.now();
      setLastActivity(now);
      reportActivity(e?.type || 'active');
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('focus', handleActivity);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // handleHidden logic if needed, but we keep tracking
      } else {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('focus', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTrackingActive]);

  const handleResume = async () => {
    try {
      await axios.post('/api/time/resume', {}, { headers: { Authorization: `Bearer ${token}` } });
      setLastActivity(Date.now());
      setIsPausedByIdle(false);
    } catch (err) { console.error('Resume failed:', err); }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const normalized = path.replace(/\\/g, '/');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#08100e] text-[#201515] dark:text-[#e2e8f0] transition-colors duration-300 ease-in-out overflow-x-clip w-full">
      {/* 1. FULL WIDTH TOP BAR (Fixed at top) */}
      <header
        className="fixed top-0 left-0 w-full z-[200] border-b bg-white dark:bg-[#08100e] flex items-center transition-colors duration-300 ease-in-out"
        style={{ height: '70px', borderColor: isDarkMode ? '#1a2d29' : '#e2eae7' }}
      >
        {/* Brand Block / Logo (Fixed width matching expanded sidebar) */}
        <Link
          to={`/${activeRole}/dashboard`}
          className="px-4 flex items-center no-underline hover:opacity-90 transition-all duration-300 gap-3 shrink-0 h-full overflow-hidden"
          style={{ width: showExpandedSidebar ? '250px' : '72px' }}
        >
          <div className="w-10 h-10 bg-[#00a76b] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-300 hover:scale-105">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c0 4.5-4.5 9-9 9 4.5 0 9 4.5 9 9 0-4.5 4.5-9 9-9-4.5 0-9-4.5-9-9z" />
              <path d="M18 5h4M20 3v4" strokeWidth="2" />
            </svg>
          </div>
          {showExpandedSidebar && (
            <div className="flex flex-col items-start leading-tight animate-in fade-in duration-200">
              <span className="text-[16px] font-bold text-[#1f2937] dark:text-white tracking-tight whitespace-nowrap">Fluid HR</span>
              <span className="text-[11px] font-semibold text-[#829e92] dark:text-[#a3b3af] whitespace-nowrap">Workforce OS</span>
            </div>
          )}
        </Link>

        {/* Top Bar Controls */}
        <div className="flex-1 flex items-center h-full px-3 md:px-6 gap-4">
          {/* Left Controls (Menu Toggle) */}
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="md:hidden flex items-center justify-center w-10 h-10 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-full text-[#374151] dark:text-[#cbd5e1] transition-all cursor-pointer border-none bg-transparent shrink-0"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Center Search Bar */}
          <div className="flex-1 flex justify-start md:justify-center px-2 md:px-8">
            <RoleSearchBar activeRole={activeRole} />
          </div>

          {/* Right Controls */}
          <div className="flex items-center h-full gap-3 md:gap-5 shrink-0 ml-auto">
            {/* Quick Action button */}
            <div className="relative" ref={quickActionRef}>
              <button
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-full font-bold text-xs transition-all cursor-pointer border-none shadow-sm shrink-0"
              >
                <Plus size={15} strokeWidth={2.8} />
                <span className="hidden sm:inline">Quick action</span>
              </button>

              {isQuickActionOpen && (
                <div className="absolute top-[45px] left-4 w-56 bg-white dark:bg-[#0c1512] border border-[#eceae3] dark:border-[#1a2d29] rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[110] p-2 flex flex-col">
                  {['admin', 'hr'].includes(activeRole) && (
                    <>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/create-user`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Add Employee
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/leave`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Apply Leave
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/notifications`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Create Announcement
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/payroll`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Generate Payroll
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/recruitment`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Schedule Interview
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/task-management/create`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Assign Task
                      </button>
                    </>
                  )}

                  {activeRole === 'manager' && (
                    <>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/task-management/create`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Assign / Reassign Task
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/leave`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Approve / Reject Leave
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/create-user`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Add Team Member
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/events`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Schedule
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/projects`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Create Project
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/reports`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Generate Report
                      </button>
                    </>
                  )}

                  {activeRole === 'employee' && (
                    <>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/leave`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Apply Leave
                      </button>
                      <button onClick={() => { setIsQuickActionOpen(false); navigate(`/${activeRole}/task-management/create`); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#162722] text-xs font-bold text-gray-700 dark:text-slate-300 rounded-xl transition-colors border-none bg-transparent cursor-pointer">
                        Assign Task
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ⏱️ GLOBAL INACTIVITY TRACKER */}
            {isTrackingActive ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#eceae3] dark:bg-[#111c18] rounded-full border border-[#c5c0b1] dark:border-[#1a2d29]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#24a148]"></div>
                <span className="text-[10px] font-black text-[#201515] dark:text-[#e2e8f0] uppercase tracking-widest tabular-nums">
                  Active
                </span>
              </div>
            ) : (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#00a76b] text-white rounded-full border-none cursor-pointer hover:bg-[#059669] transition-all"
              >
                <Play size={14} fill="currentColor" />
                <span className="text-[10px] font-black uppercase tracking-widest">Resume Timer</span>
              </button>
            )}

            {/* Language Selector Removed */}

            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative" ref={chatRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsChatPopupOpen(prev => !prev);
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative border-none cursor-pointer outline-none ${isChatPopupOpen ? 'bg-[#00a76b] text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <MessageSquare size={18} />
                {unreadChats.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm border border-white dark:border-[#111c18]">
                    {unreadChats.length > 10 ? '10+' : unreadChats.length}
                  </span>
                )}
              </button>

              {isChatPopupOpen && (
                <div className="absolute top-[48px] right-0 w-80 bg-white dark:bg-[#111c18] border border-[#c5c0b1] dark:border-[#1a2d29] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                  <div className="p-4 border-b border-[#eceae3] dark:border-[#1a2d29] bg-[#fffdf9] dark:bg-[#162722] flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#201515] dark:text-white">Unread Messages</span>
                    {unreadChats.length > 0 && (
                      <span className="px-2 py-0.5 bg-[#00a76b]/10 text-[#00a76b] text-[8px] font-black rounded-full uppercase">
                        {unreadChats.length} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {unreadChats.length === 0 ? (
                      <div className="p-8 text-center opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af]">No Unread Messages</p>
                      </div>
                    ) : (
                      unreadChats.map((c, i) => {
                        const currentUserId = (() => { try { return JSON.parse(atob(token.split('.')[1]))?.id; } catch { return null; } })();
                        const otherParticipant = c.isGroup ? null : c.participants.find(p => String(p._id) !== String(currentUserId));
                        const displayName = c.isGroup ? c.groupName : (otherParticipant?.name || 'User');

                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setUnreadChats(prev => prev.filter(chat => chat._id !== c._id));
                              navigate(`/${activeRole}/chat`, { state: { openChatId: c._id } });
                              setIsChatPopupOpen(false);
                            }}
                            className="p-4 border-b border-[#eceae3] dark:border-[#1a2d29] hover:bg-[#fffdf9] dark:hover:bg-[#162722]/50 transition-all cursor-pointer group"
                          >
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 border">
                                {c.isGroup ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                ) : displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-bold text-[#201515] dark:text-[#e2e8f0] leading-tight group-hover:text-[#00a76b] transition-colors truncate">
                                  {displayName}
                                </p>
                                <p className="text-[11px] text-[#54656F] dark:text-[#a3a094] truncate mt-0.5">
                                  {c.lastMessage?.message || (c.lastMessage?.attachment ? '📎 Attachment' : 'New Message')}
                                </p>
                              </div>
                              {c.unreadCount > 0 && (
                                <div className="min-w-[18px] h-[18px] px-1 bg-[#00a76b] text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm shrink-0 self-center">
                                  {c.unreadCount}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <button
                    onClick={() => { navigate(`/${activeRole}/chat`); setIsChatPopupOpen(false); }}
                    className="w-full py-3 bg-[#eceae3] dark:bg-[#162722] text-[10px] font-black text-[#201515] dark:text-white uppercase tracking-[0.2em] hover:bg-[#c5c0b1] dark:hover:bg-[#111c18] transition-all border-none cursor-pointer"
                  >
                    View All Messages
                  </button>
                </div>
              )}
            </div>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsNotificationsOpen(prev => !prev);
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative border-none cursor-pointer outline-none ${isNotificationsOpen ? 'bg-[#00a76b] text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <Bell size={18} />
                {liveNotifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm border border-white dark:border-[#111c18]">
                    {liveNotifications.filter(n => !n.read).length > 10 ? '10+' : liveNotifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute top-[48px] right-0 w-80 bg-white dark:bg-[#111c18] border border-[#c5c0b1] dark:border-[#1a2d29] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                  <div className="p-4 border-b border-[#eceae3] dark:border-[#1a2d29] bg-[#fffdf9] dark:bg-[#162722] flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#201515] dark:text-white">Intelligence Alerts</span>
                    {liveNotifications.filter(n => !n.read).length > 0 && (
                      <span className="px-2 py-0.5 bg-[#00a76b]/10 text-[#00a76b] text-[8px] font-black rounded-full uppercase">
                        {liveNotifications.filter(n => !n.read).length} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {liveNotifications.length === 0 ? (
                      <div className="p-8 text-center opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af]">No Active Alerts</p>
                      </div>
                    ) : (
                      liveNotifications.map((n, i) => (
                        <div
                          key={i}
                          onClick={async () => {
                            if (!n.read) {
                              try {
                                await axios.put(`/api/notifications/${n.id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                setLiveNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                              } catch (err) {
                                console.error('Failed to mark notification as read:', err);
                              }
                            }
                            navigate(n.path);
                            setIsNotificationsOpen(false);
                          }}
                          className="p-4 border-b border-[#eceae3] dark:border-[#1a2d29] hover:bg-[#fffdf9] dark:hover:bg-[#162722]/50 transition-all cursor-pointer group"
                        >
                          <div className="flex gap-3">
                            {!n.read && <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'rework' ? 'bg-red-500' : 'bg-[#00a76b]'}`}></div>}
                            <div className={n.read ? 'pl-4' : ''}>
                              <p className={`text-[12px] font-bold text-[#201515] dark:text-[#e2e8f0] leading-tight group-hover:text-[#00a76b] transition-colors ${n.read ? 'opacity-50' : ''}`}>{n.text}</p>
                              <p className="text-[9px] font-black text-[#939084] dark:text-[#a3b3af] uppercase tracking-widest mt-1">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex divide-x divide-[#eceae3] dark:divide-[#1a2d29]">
                    <button
                      onClick={async () => {
                        try {
                          await axios.put('/api/notifications/read-all', {}, { headers: { Authorization: `Bearer ${token}` } });
                          setLiveNotifications(prev => prev.map(item => ({ ...item, read: true })));
                        } catch (err) {
                          console.error('Failed to mark all notifications as read:', err);
                        }
                      }}
                      className="w-1/2 py-3 bg-[#eceae3]/50 dark:bg-[#162722]/50 text-[10px] font-black text-[#201515] dark:text-white uppercase tracking-wider hover:bg-[#c5c0b1] dark:hover:bg-[#111c18] transition-all border-none cursor-pointer"
                    >
                      Mark All Read
                    </button>
                    <button
                      onClick={() => { navigate(`/${activeRole}/notifications`); setIsNotificationsOpen(false); }}
                      className="w-1/2 py-3 bg-[#eceae3] dark:bg-[#162722] text-[10px] font-black text-[#201515] dark:text-white uppercase tracking-wider hover:bg-[#c5c0b1] dark:hover:bg-[#111c18] transition-all border-none cursor-pointer"
                    >
                      View All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Component */}
            <div className="relative" ref={profileRef}>
              {isProfileLoading ? (
                <div
                  className="flex items-center gap-3 px-1 md:px-3 h-11 rounded-full select-none opacity-60 animate-pulse bg-gray-50 dark:bg-[#111c18]"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0"></div>
                  <div className="hidden md:flex flex-col gap-1 items-start leading-none">
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-10 mt-1"></div>
                  </div>
                  <ChevronDown size={14} className="hidden md:block text-gray-400" />
                </div>
              ) : (
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsProfileDropdownOpen(prev => !prev);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsProfileDropdownOpen(prev => !prev);
                    }
                  }}
                  className={`flex items-center gap-3 px-1 md:px-3 h-11 rounded-full cursor-pointer transition-all select-none border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#00a76b]/50 ${isProfileDropdownOpen ? 'bg-gray-100 dark:bg-[#111c18]' : 'hover:bg-gray-100 dark:hover:bg-[#111c18]'}`}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#00a76b] text-white font-bold text-[13px] overflow-hidden shrink-0">
                    {userProfile?.profileImage ? (
                      <img src={getImageUrl(userProfile.profileImage)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="hidden md:flex flex-col items-start leading-none">
                    <span className="text-[12px] font-bold text-[#201515] dark:text-white truncate max-w-[120px]">{displayName}</span>
                    <span className="text-[9px] font-bold text-[#939084] dark:text-[#a3b3af] uppercase tracking-wider mt-1">{activeRoleTitle}</span>
                  </div>
                  <ChevronDown size={14} className={`hidden md:block text-gray-500 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              {isProfileDropdownOpen && (
                <div
                  ref={dropdownRef}
                  onKeyDown={handleDropdownKeyDown}
                  className="absolute top-[48px] right-0 w-72 bg-white dark:bg-[#111c18] border border-gray-100 dark:border-[#1a2d29] rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.3)] overflow-hidden z-[100] focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex="-1"
                >
                  <div className="px-6 pt-5 pb-4 flex flex-col">
                    <span className="text-[17px] font-semibold text-slate-900 dark:text-white leading-tight">{displayName}</span>
                    <span className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-none">{displayEmail}</span>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-slate-800/80 w-full" />
                  <div className="flex flex-col animate-fade-in">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate(`/${activeRole}/profile`);
                      }}
                      className="w-full px-6 py-2.5 flex items-center gap-3.5 text-left text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#162722]/50 hover:text-slate-900 dark:hover:text-white transition-colors border-none bg-transparent cursor-pointer outline-none"
                    >
                      <User size={16} className="text-slate-400 dark:text-[#829e92]" />
                      <span>My Profile</span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate(`/${activeRole}/settings`);
                      }}
                      className="w-full px-6 py-2.5 flex items-center gap-3.5 text-left text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#162722]/50 hover:text-slate-900 dark:hover:text-white transition-colors border-none bg-transparent cursor-pointer outline-none"
                    >
                      <Settings size={16} className="text-slate-400 dark:text-[#829e92]" />
                      <span>Settings</span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        setIsPasswordModalOpen(true);
                      }}
                      className="w-full px-6 py-2.5 flex items-center gap-3.5 text-left text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#162722]/50 hover:text-slate-900 dark:hover:text-white transition-colors border-none bg-transparent cursor-pointer outline-none"
                    >
                      <ShieldCheck size={16} className="text-slate-400 dark:text-[#829e92]" />
                      <span>Change Password</span>
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800/80 w-full my-1" />
                    <button
                      role="menuitem"
                      onClick={() => {
                        setIsLogoutModalOpen(true);
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full px-6 py-3 flex items-center gap-3.5 text-left text-[13px] font-semibold text-[#EF4444] dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors border-none bg-transparent cursor-pointer outline-none"
                    >
                      <LogOut size={16} className="text-[#EF4444] dark:text-red-400" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. BODY AREA (Sidebar + Content starts below top bar) */}
      <div className="flex flex-1 relative mt-[70px]">
        {/* Mobile Drawer Overlay */}
        {isSidebarOpen && (
          <div
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/40 z-30 md:hidden animate-in fade-in duration-200"
            style={{ top: '70px' }}
          />
        )}

        {/* Floating Expand/Collapse Arrow Button (Desktop only) */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex fixed top-[90px] z-[160] items-center justify-center w-7 h-7 bg-[#00a76b] text-white hover:bg-[#00915c] rounded-full shadow-md border border-[#00a76b] cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            left: showExpandedSidebar ? '236px' : '58px',
            transition: 'left 0.3s ease-in-out'
          }}
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <ChevronLeft size={16} strokeWidth={2.8} /> : <ChevronRight size={16} strokeWidth={2.8} />}
        </button>

        {/* SIDEBAR PLACEHOLDER (desktop spacing) */}
        <div
          className="hidden md:block shrink-0 transition-all duration-300 ease-in-out"
          style={{ width: isSidebarOpen ? '250px' : '72px' }}
        />

        {/* LEFT SIDEBAR */}
        <aside
          onMouseEnter={() => { if (!isSidebarOpen) setIsSidebarHovered(true); }}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`flex flex-col shrink-0 border-r transition-all duration-300 ease-in-out z-[150] fixed top-[70px] ${showExpandedSidebar
            ? 'left-0 w-[250px] translate-x-0 shadow-[10px_0_30px_rgba(0,0,0,0.15)]'
            : '-left-[250px] md:left-0 md:translate-x-0 md:w-[72px]'
            }`}
          style={{
            height: 'calc(100vh - 70px)',
            backgroundColor: isDarkMode ? '#08100e' : '#ffffff',
            borderColor: isDarkMode ? '#1a2d29' : '#e2eae7'
          }}
        >
          {/* Sidebar Navigation */}
          <div className="flex-1 flex flex-col pb-6 w-full pt-3 px-3 space-y-3.5 overflow-y-auto scrollbar-hide">
            {(() => {
              const categorized = getCategorizedMenuItems(activeRole);
              return Object.entries(categorized).map(([category, items]) => (
                <div key={category} className="space-y-0.5">
                  <p className={`px-3 text-[10px] font-bold text-[#829e92] dark:text-[#527068] uppercase tracking-[0.15em] mb-1.5 mt-0.5 transition-opacity duration-200 ${showExpandedSidebar ? 'opacity-100' : 'opacity-0 select-none pointer-events-none'}`}>
                    {category}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      let isActive = false;
                      const isDashboard = item.name === 'Dashboard';
                      if (isDashboard) {
                        isActive = location.pathname === item.path ||
                          location.pathname === `/${activeRole}` ||
                          location.pathname === `/${activeRole}/` ||
                          location.pathname.startsWith(item.path + '/');
                      } else {
                        isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                      }
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setIsSidebarOpen(false);
                            }
                          }}
                          className={`flex items-center h-9 text-[13px] font-semibold no-underline rounded-[5px] transition-all group ${showExpandedSidebar ? 'px-3 gap-2.5 w-full' : 'px-0 justify-center w-full'} ${isActive ? 'text-white bg-[#00a76b] shadow-sm' : 'text-[#475569] dark:text-[#a3b3af] hover:bg-[#eceae3]/40 dark:hover:bg-[#111c18]/50 hover:text-[#00a76b]'}`}
                          title={!showExpandedSidebar ? item.name : ""}
                        >
                          <div className={`shrink-0 flex items-center justify-center transition-all ${showExpandedSidebar ? 'w-5' : 'w-8'}`}>
                            <Icon size={16} className={isActive ? 'text-white' : 'text-slate-500 dark:text-[#829e92] group-hover:text-[#00a76b] transition-colors'} />
                          </div>
                          {showExpandedSidebar && <span className="truncate whitespace-nowrap overflow-hidden transition-opacity duration-200">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </aside>

        {/* Main Workspace content */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-[#f8fafc] dark:bg-[#08100e] relative flex flex-col p-3 md:px-6 md:pt-2 md:pb-6">
            {location.pathname.endsWith('/chat') ? (
              <div className="h-[calc(100vh-70px)] relative overflow-hidden">
                <ErrorBoundary key={location.pathname}>
                  <Outlet />
                </ErrorBoundary>
                {children}
              </div>
            ) : (
              <div className="animate-fade-in w-full min-h-full flex flex-col">
                <div className="flex-1 w-full">
                  <ErrorBoundary key={location.pathname}>
                    <Outlet />
                  </ErrorBoundary>
                  {children}
                </div>
              </div>
            )}
          </main>

          {!location.pathname.endsWith('/chat') && (
            <footer className="py-6 px-12 border-t border-[#c5c0b1] dark:border-[#1a2d29] bg-[#fffefb] dark:bg-[#08100e] flex justify-between items-center text-[11px] text-[#939084] dark:text-[#a3b3af] font-bold uppercase tracking-widest z-50" style={{ borderColor: isDarkMode ? '#1a2d29' : '#e2eae7' }}>
              <div className="flex gap-10 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00a76b] rounded-full animate-pulse"></div>
                  <span className="text-[#201515] dark:text-white">Connected</span>
                </div>
                <span>v2.4.0 Automator</span>
              </div>
              <span>© 2026 Fluid HR Infrastructure</span>
            </footer>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

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

export default MainLayout;
