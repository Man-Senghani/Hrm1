import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Settings as SettingsIcon, Shield, Bell, Key, Database, RefreshCw,
  Save, X, Globe, Cpu, Building2, FileText, Plug, ShieldCheck,
  Plus, Check, ChevronRight, CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight,
  Moon, Sun, Lock, User, Laptop
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const storedUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();
  const userRole = storedUser.role || 'employee';
  const isAdminOrHr = ['admin', 'hr'].includes(userRole.toLowerCase());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Admin/HR states
  const [designations, setDesignations] = useState([
    { title: 'Principal Engineer', department: 'Engineering', count: 12 },
    { title: 'Senior Product Designer', department: 'Design', count: 6 },
    { title: 'HR Lead Coordinator', department: 'HR', count: 2 },
    { title: 'Senior Payroll Specialist', department: 'Finance', count: 4 },
    { title: 'Growth Manager', department: 'Marketing', count: 8 }
  ]);
  const [newDesignation, setNewDesignation] = useState({ title: '', department: 'Engineering' });

  const handleAddDesignation = (e) => {
    e.preventDefault();
    if (!newDesignation.title.trim()) return;
    setDesignations(prev => [...prev, { title: newDesignation.title, department: newDesignation.department, count: 0 }]);
    setNewDesignation({ title: '', department: 'Engineering' });
    toast.success('Designation added successfully');
  };

  const handleSaveSettings = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast.success('Settings synchronized successfully');
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#e2eae7] dark:border-[#1a2d29] pb-6">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <SettingsIcon className="text-[#00a76b]" size={26} />
            System & Preferences Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#a3b3af] mt-1.5 font-medium">
            Manage your account preferences, notification alerts, security policies, and workspace configurations.
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={isSyncing}
          className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer border-none"
        >
          {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{isSyncing ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Appearance & Theme */}
        <div className="p-6 bg-white dark:bg-[#111c18] rounded-2xl border border-slate-200/80 dark:border-[#1a2d29] shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#1a2d29] pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#00a76b] flex items-center justify-center">
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Appearance & Theme</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#a3b3af]">Customize your visual workspace display</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Dark Mode</p>
              <p className="text-[11px] text-slate-400">Reduce eye strain with sleek dark themes</p>
            </div>
            <button
              onClick={() => {
                const nextDark = !isDark;
                setIsDark(nextDark);
                document.documentElement.classList.toggle('dark', nextDark);
                localStorage.setItem('theme', nextDark ? 'dark' : 'light');
              }}
              className="text-[#00a76b] cursor-pointer bg-transparent border-none"
            >
              {isDark ? <ToggleRight size={36} /> : <ToggleLeft size={36} className="text-slate-400" />}
            </button>
          </div>
        </div>

        {/* 2. Notification Preferences */}
        <div className="p-6 bg-white dark:bg-[#111c18] rounded-2xl border border-slate-200/80 dark:border-[#1a2d29] shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#1a2d29] pb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Alerts & Notifications</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#a3b3af]">Manage incoming message and task alerts</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Push Notifications</p>
                <p className="text-[11px] text-slate-400">Real-time announcement popups</p>
              </div>
              <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className="text-[#00a76b] cursor-pointer bg-transparent border-none">
                {notificationsEnabled ? <ToggleRight size={34} /> : <ToggleLeft size={34} className="text-slate-400" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Email Digest</p>
                <p className="text-[11px] text-slate-400">Receive daily shift and leave status emails</p>
              </div>
              <button onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)} className="text-[#00a76b] cursor-pointer bg-transparent border-none">
                {emailAlertsEnabled ? <ToggleRight size={34} /> : <ToggleLeft size={34} className="text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Security & Sessions */}
        <div className="p-6 bg-white dark:bg-[#111c18] rounded-2xl border border-slate-200/80 dark:border-[#1a2d29] shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#1a2d29] pb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security & Active Device</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#a3b3af]">Current session details and encryption status</p>
            </div>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400">Session Protocol</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">JWT 256-bit Encrypted</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400">Desktop Tracker Node</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">FluidHR Desktop Sync v1.2.8</span>
            </div>
          </div>
        </div>

        {/* 4. Organization Details */}
        <div className="p-6 bg-white dark:bg-[#111c18] rounded-2xl border border-slate-200/80 dark:border-[#1a2d29] shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#1a2d29] pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Information</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#a3b3af]">FluidHR enterprise cloud workspace</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-800 dark:text-slate-200">Organization: <span className="font-normal text-slate-500 dark:text-slate-400">FluidHR Production</span></p>
            <p className="font-bold text-slate-800 dark:text-slate-200">Timezone: <span className="font-normal text-slate-500 dark:text-slate-400">Asia/Kolkata (IST +05:30)</span></p>
            <p className="font-bold text-slate-800 dark:text-slate-200">Working Days: <span className="font-normal text-slate-500 dark:text-slate-400">Monday - Friday (09:30 AM - 06:30 PM)</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
