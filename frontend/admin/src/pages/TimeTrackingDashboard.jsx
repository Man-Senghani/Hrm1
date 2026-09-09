/**
 * ============================================================
 * TIME ENGINE v2 — FRONTEND DISPLAY ONLY
 * ============================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Play, Pause, Square, Clock, Zap, TrendingUp, BarChart3,
  Calendar as CalendarIcon, Search, ArrowRight, Timer,
  ChevronLeft, ChevronRight, Activity, AlertCircle, Plus, ShieldCheck, Target, Send, X, RefreshCw, MessageSquare, FileText, Download, Calendar, Users, Filter, ChevronDown, UserCheck, ClipboardList, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailView from '../components/TaskDetailView';
import WeeklyAttendanceChart from '@shared/components/WeeklyAttendanceChart';

const API_BASE = '/api/time';
const POLL_INTERVAL_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 10000;

// Robust Date Formatter for Manual Comparison
const getYYYYMMDD = (dateInput) => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) { return ''; }
};

// ABSOLUTE ASSET NORMALIZER
const getEvidenceUrl = (file) => {
  if (!file) return '';
  if (file instanceof File) return URL.createObjectURL(file);
  const rawUrl = file.fileUrl || file.url || file.path || '';
  if (!rawUrl) return '';
  const normalizedUrl = rawUrl.replace(/\\/g, '/');
  if (normalizedUrl.startsWith('http') || normalizedUrl.startsWith('/')) {
    return normalizedUrl;
  }
  return `/${normalizedUrl}`;
};

const formatTime = (seconds) => {
  const s = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const formatMinutes = (seconds) => `${Math.floor((seconds || 0) / 60)}m`;

const TimeTrackingDashboard = ({ user: propUser, socket }) => {
  const [activeTime, setActiveTime] = useState(0);
  const [idleTime, setIdleTime] = useState(0);
  const [inactivityCount, setInactivityCount] = useState(0);
  const [status, setStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isIdle, setIsIdle] = useState(false);

  // Identity extraction for role-based visibility
  const userRole = sessionStorage.getItem('role')?.toLowerCase() || 'employee';
  const isHigherRole = userRole === 'admin' || userRole === 'hr' || userRole === 'manager';

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const today = getYYYYMMDD(new Date());
  const [viewDate, setViewDate] = useState(today);
  const [registryDate, setRegistryDate] = useState(today);

  const [roleFilter, setRoleFilter] = useState(userRole === 'employee' ? 'Employee' : 'All');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [showPersonalCalendar, setShowPersonalCalendar] = useState(false);
  const [showRegistryCalendar, setShowRegistryCalendar] = useState(false);
  const [showViewCalendar, setShowViewCalendar] = useState(false);
  const [personalCalendarMonth, setPersonalCalendarMonth] = useState(new Date());
  const [registryCalendarMonth, setRegistryCalendarMonth] = useState(new Date());
  const [viewCalendarMonth, setViewCalendarMonth] = useState(new Date());
  const personalCalendarRef = useRef(null);
  const registryCalendarRef = useRef(null);
  const viewCalendarRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [myTimeLogs, setMyTimeLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [quickTask, setQuickTask] = useState({ title: '', description: '' });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [previewGallery, setPreviewGallery] = useState({ items: [], index: 0 });

  const currentPage = 1;
  const itemsPerPage = 10;
  const heartbeatRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const getAuth = () => {
    const token = sessionStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : null;
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) { return dateStr; }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    const firstDayIndex = new Date(y, m, 1).getDay();
    const numDays = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= numDays; i++) days.push(new Date(y, m, i));
    return days;
  };

  const fetchRegistryTasks = useCallback(async (date = registryDate) => {
    const auth = getAuth();
    if (!auth) return;
    try {
      setLoadingTasks(true);
      const res = await axios.get(`/api/tasks?date=${date}`, auth);
      if (res.data) setTasks(res.data.data || res.data || []);
    } catch (err) { console.error('Task registry error'); }
    finally { setLoadingTasks(false); }
  }, [registryDate]);

  useEffect(() => {
    if (viewDate) {
      const parsedDate = new Date(viewDate);
      if (!isNaN(parsedDate.getTime())) {
        setViewCalendarMonth(parsedDate);
      }
    }
  }, [viewDate]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [pulseFilter, setPulseFilter] = useState('30days');
  const [summary, setSummary] = useState({
    stats: { active: 0, idle: 0, total: 0, productivity: 0 },
    logs: [], chartData: []
  });
  const [tasks, setTasks] = useState([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTask, setQuickTask] = useState({ title: '', description: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [myTimeLogs, setMyTimeLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [statusNote, setStatusNote] = useState({ taskId: null, nextStatus: null, note: '' });
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showTaskDetailView, setShowTaskDetailView] = useState(false);

  const heartbeatRef = useRef(null);
  const pollRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const navigate = useNavigate();

  const getAuth = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : null;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowRoleDropdown(false);
      }
      if (personalCalendarRef.current && !personalCalendarRef.current.contains(event.target)) {
        setShowPersonalCalendar(false);
      }
      if (registryCalendarRef.current && !registryCalendarRef.current.contains(event.target)) {
        setShowRegistryCalendar(false);
      }
      if (viewCalendarRef.current && !viewCalendarRef.current.contains(event.target)) {
        setShowViewCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [previewGallery, setPreviewGallery] = useState({ items: [], index: 0 });

  const applyServerState = useCallback((data) => {
    if (!data) return;
    setStatus(data);
    setIsRunning(data.isRunning ?? false);
    setIsIdle(data.isIdle ?? false);
    setActiveTime(data.activeTime ?? 0);
    setIdleTime(data.idleTime ?? 0);
    setInactivityCount(data.inactivityCount ?? 0);
  }, []);

  const pollStatus = useCallback(async () => {
    const auth = getAuth();
    if (!auth) return;
    try {
      const res = await axios.get(`${API_BASE}/status`, auth);
      applyServerState(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        sessionStorage.clear();
        localStorage.clear();
        navigate('/login');
      }
      console.error('[POLL ERROR]', err.message);
    }
  }, [applyServerState, navigate]);

  const fetchCurrentUser = useCallback(async () => {
    const auth = getAuth();
    if (!auth) return;
    try {
      const res = await axios.get('/api/auth/me', auth);
      if (res.data) setCurrentUser(res.data);
    } catch (err) { console.error('User fetch failed'); }
  }, []);

  const fetchSummary = useCallback(async (date = viewDate, timeRange = pulseFilter) => {
    const auth = getAuth();
    if (!auth) return;
    try {
      setIsSyncing(true);
      const res = await axios.get(`${API_BASE}/summary?date=${date}&timeRange=${timeRange}`, auth);
      if (res.data) setSummary(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        sessionStorage.clear(); localStorage.clear();
        navigate('/login');
      }
      console.error('[SUMMARY ERROR]', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [viewDate]);

  const fetchMyTime = useCallback(async () => {
    const auth = getAuth();
    if (!auth) return;
    try {
      const res = await axios.get('/api/time/my', auth);
      if (res.data) setMyTimeLogs(res.data);
    } catch (err) {
      console.error('My time logs fetch failed', err.message);
    }
  }, []);

  const fetchLeaves = useCallback(async () => {
    const auth = getAuth();
    if (!auth) return;
    try {
      const res = await axios.get('/api/leaves/me', auth);
      if (res.data) setLeaves(res.data);
    } catch (err) {
      console.error('Leaves fetch failed', err.message);
    }
  }, []);

  const fetchRegistryTasks = useCallback(async (date = registryDate) => {
    const auth = getAuth();
    if (!auth) return;
    try {
      setIsSyncing(true);
      const res = await axios.get(`/api/tasks?date=${date}`, auth);
      if (res.data.success) {
        setTasks(res.data.data);
        setCurrentPage(1);
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        sessionStorage.clear(); localStorage.clear();
        navigate('/login');
      }
      console.error('[REGISTRY FETCH ERROR]', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [registryDate, navigate]);

  const handleStatusClick = (taskId, nextStatus) => {
    if (nextStatus === 'Completed' || nextStatus === 'Review' || nextStatus === 'Need to Improve') {
      updateTaskStatus(taskId, nextStatus, 'Mission Milestone Reached');
    } else {
      setStatusNote({ taskId, nextStatus, note: '' });
    }
  };

  const updateTaskStatus = async (id, newStatus, note) => {
    const auth = getAuth();
    try {
      await axios.put(`/api/tasks/${id}`, { status: newStatus, progressNote: note }, auth);
      toast.success('Updated successfully');
      setStatusNote({ taskId: null, nextStatus: null, note: '' });
      fetchRegistryTasks(registryDate);
    } catch (err) { toast.error('Update failed'); }
  };

  const handleAction = async (action) => {
    const auth = getAuth();
    if (!auth) return;
    try {
      const res = await axios.post(`${API_BASE}/${action}`, {}, auth);
      applyServerState(res.data);
      await fetchSummary();
      await fetchMyTime();
      toast.success(`Session ${action === 'start' ? 'Initialized' : action.toUpperCase()}`);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        sessionStorage.clear();
        localStorage.clear();
        toast.error('Session expired. Redirecting to login...');
        navigate('/login');
      } else {
        toast.error(`Action Failed: ${err.message}`);
      }
    }
  };

  const handleQuickAddTask = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    try {
      const res = await axios.post('/api/tasks', { ...quickTask, date: registryDate }, auth);
      toast.success('Quick Task Injected');
      setQuickTask({ title: '', description: '' });
      setShowQuickAdd(false);
      setTimeout(() => fetchRegistryTasks(registryDate), 1000);
    } catch (err) { toast.error('Injection Failed'); }
  };

  const openGallery = (attachments, startIndex = 0) => {
    if (!attachments || attachments.length === 0) return;

    const galleryItems = attachments.map(file => {
      const url = getEvidenceUrl(file);
      const fileType = file.fileType || file.type || '';
      const fileName = file.fileName || file.name || 'Evidence';
      const isImage = (fileType.startsWith('image/')) || (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i));

      return { url, name: fileName, isImage };
    });

    setPreviewGallery({ items: galleryItems, index: startIndex });
  };

  useEffect(() => {
    pollStatus(); fetchSummary(); fetchRegistryTasks(registryDate); fetchCurrentUser();
    fetchMyTime(); fetchLeaves();
    const pollId = setInterval(pollStatus, POLL_INTERVAL_MS);
    heartbeatRef.current = setInterval(() => {
      const auth = getAuth();
      if (!auth || !isRunning) return;
      const type = Date.now() - lastActivityRef.current < 60000 ? 'heartbeat' : 'idle';
      axios.post(`${API_BASE}/activity`, { type }, auth).catch(() => { });
    }, HEARTBEAT_INTERVAL_MS);

    const taskInterval = setInterval(() => fetchRegistryTasks(registryDate), 30000);

    return () => {
      clearInterval(pollId);
      clearInterval(heartbeatRef.current);
      clearInterval(taskInterval);
    };
  }, [isRunning, fetchSummary, fetchRegistryTasks, pollStatus, registryDate, fetchCurrentUser, fetchMyTime, fetchLeaves]);

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('focus', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('focus', handleActivity);
    };
  }, []);

  useEffect(() => { fetchSummary(viewDate, pulseFilter); }, [viewDate, pulseFilter, fetchSummary]);
  useEffect(() => { fetchRegistryTasks(registryDate); }, [registryDate, fetchRegistryTasks]);

  const myTasks = tasks.filter(task => task.employeeId === currentUser?._id || task.employeeName === currentUser?.fullName);

  const filteredTasks = tasks.filter(task => {
    if (userRole === 'hr' && task.employeeRole?.toLowerCase() === 'hr') {
      return false;
    }
    if (roleFilter === 'All') return true;
    return task.employeeRole?.toLowerCase() === roleFilter.toLowerCase();
  });

  const startedAtTime = status?.startTime ? new Date(status.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:18 AM';

  const handleExport = () => {
    alert('Initiating Excel ledger generation for current matrix attendance logs...');
  };

  const totalDaysWorked = myTimeLogs.filter(log => log.activeTime > 0).length;
  const totalLeavesTaken = leaves.filter(l => l.status === 'approved').reduce((sum, l) => sum + (l.totalDays || 0), 0);

  const totalActiveSeconds = myTimeLogs.reduce((sum, log) => sum + (log.activeTime || 0), 0);
  const totalHoursWorked = (totalActiveSeconds / 3600).toFixed(1);

  // Group unique weeks
  const uniqueWeeks = new Set();
  myTimeLogs.forEach(log => {
    if (log.date) {
      const date = new Date(log.date);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const tempDate = new Date(date.valueOf());
        tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
        const yearStart = new Date(tempDate.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
        uniqueWeeks.add(`${year}-W${weekNo}`);
      }
    }
  });
  const weeksCount = Math.max(1, uniqueWeeks.size);
  const avgWeeklyHours = (parseFloat(totalHoursWorked) / weeksCount).toFixed(1);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: isDark ? '#08100e' : '#f9fdfc', minHeight: 'calc(100vh - 56px)', color: isDark ? '#cbd5e1' : '#3b3e3c', width: '100%', boxSizing: 'border-box', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <div style={{ width: '100%', maxWidth: '100%', padding: '32px 32px 60px', boxSizing: 'border-box' }}>

        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 600, color: isDark ? '#fff' : '#2c302e', margin: 0, letterSpacing: '-0.75px' }}>Attendance</h1>
            <p style={{ fontSize: '15px', color: isDark ? '#a3b3af' : '#8c918f', margin: '4px 0 0', fontWeight: 500 }}>Track check-ins, hours and shifts.</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleExport} className="verdant-btn-outline">
              <Download size={16} /> Export
            </button>
            <button onClick={() => alert('New shift initialization protocol requested.')} className="verdant-btn-primary">
              <Plus size={16} /> New shift
            </button>
          </div>
        </div>

        {/* SEARCH AND FILTERS */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={18} color={isDark ? '#a3b3af' : '#8c918f'} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Search..." className="verdant-input with-search-icon" />
          </div>
          <button className="verdant-btn-outline">
            <Filter size={15} /> Filters
          </button>
        </div>

        {/* 4 STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>

          {/* Card 1: Total Days Worked */}
          <div className="verdant-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: isDark ? 'rgba(0,167,107,0.08)' : '#f2fbf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} color="#00a76b" />
              </div>
            </div>
            <p style={{ fontSize: '38px', fontWeight: 800, color: isDark ? '#fff' : '#3b3e3c', margin: '16px 0 4px', letterSpacing: '-1.5px', lineHeight: 1 }}>
              {totalDaysWorked}
            </p>
            <p style={{ fontSize: 14, color: isDark ? '#a3b3af' : '#8c918f', margin: 0, fontWeight: 600 }}>Total days worked</p>
          </div>

          {/* Card 2: Leaves Taken */}
          <div className="verdant-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: isDark ? 'rgba(199,101,95,0.08)' : '#fbf2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarIcon size={20} color="#c7655f" />
              </div>
            </div>
            <p style={{ fontSize: '38px', fontWeight: 800, color: isDark ? '#fff' : '#3b3e3c', margin: '16px 0 4px', letterSpacing: '-1.5px', lineHeight: 1 }}>
              {totalLeavesTaken}
            </p>
            <p style={{ fontSize: 14, color: isDark ? '#a3b3af' : '#8c918f', margin: 0, fontWeight: 600 }}>Leaves taken (days)</p>
          </div>

          {/* Card 3: Total Hours Worked */}
          <div className="verdant-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: isDark ? 'rgba(94,139,181,0.08)' : '#f0f5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="#5e8bb5" />
              </div>
            </div>
            <p style={{ fontSize: '38px', fontWeight: 800, color: isDark ? '#fff' : '#3b3e3c', margin: '16px 0 4px', letterSpacing: '-1.5px', lineHeight: 1 }}>
              {totalHoursWorked}h
            </p>
            <p style={{ fontSize: 14, color: isDark ? '#a3b3af' : '#8c918f', margin: 0, fontWeight: 600 }}>Total active hours</p>
          </div>

          {/* Card 4: Average Hours / Week */}
          <div className="verdant-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: isDark ? 'rgba(0,167,107,0.08)' : '#f2fbf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} color="#00a76b" />
              </div>
            </div>
            <p style={{ fontSize: '38px', fontWeight: 800, color: isDark ? '#fff' : '#3b3e3c', margin: '16px 0 4px', letterSpacing: '-1.5px', lineHeight: 1 }}>
              {avgWeeklyHours}h
            </p>
            <p style={{ fontSize: 14, color: isDark ? '#a3b3af' : '#8c918f', margin: 0, fontWeight: 600 }}>Avg. hours / week</p>
          </div>

        </div>

        {/* ROW 2: CHART + QUICK ACTIONS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 28 }}>

          {/* Chart card */}
          <div className="verdant-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#3b3e3c', marginBottom: 20, marginTop: 0 }}>This week</h3>
            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataToRender} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2eae7" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8c918f', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8c918f' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2eae7', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="active" stackId="a" fill="#00a76b" />
                  <Bar dataKey="idle" stackId="a" fill="#dfb479" />
                  <Bar dataKey="overtime" stackId="a" fill="#d0746e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="verdant-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: isDark ? '#fff' : '#3b3e3c', marginBottom: 20, marginTop: 0 }}>Quick actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={() => !isRunning && handleAction('start')}
                  disabled={isRunning}
                  className={isRunning ? "verdant-btn-secondary text-[#a3a3a3]" : "verdant-btn-primary"}
                  style={{ width: '100%' }}>
                  <Play size={16} fill="currentColor" /> Check in
                </button>
                <button
                  onClick={() => isRunning && handleAction('stop')}
                  disabled={!isRunning}
                  className={!isRunning ? "verdant-btn-secondary text-[#a3a3a3]" : "verdant-btn-primary"}
                  style={{ width: '100%', backgroundColor: isRunning ? (isDark ? '#1a2d29' : '#3b3e3c') : undefined }}>
                  <Square size={14} fill="currentColor" /> Check out
                </button>
                <button
                  onClick={() => alert('Attendance correction request initiated.')}
                  className="verdant-btn-outline"
                  style={{ width: '100%' }}>
                  Request correction
                </button>
              </div>
            </div>

            <div className="verdant-highlight-box" style={{ marginTop: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#8c918f', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Current session</p>
              <h4 style={{ fontSize: '28px', fontWeight: 800, color: isDark ? '#fff' : '#3b3e3c', margin: '0 0 4px', fontFamily: 'monospace' }}>
                {formatTime(activeTime)}
              </h4>
              <p style={{ fontSize: 12, color: isDark ? '#a3b3af' : '#8c918f', margin: 0, fontWeight: 500 }}>
                {isRunning ? `Started at ${startedAtTime}` : 'Session inactive'}
              </p>
            </div>
          </div>

        </div>

        {/* SYSTEM REGISTRY TABLE */}
        <div className="verdant-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '24px 24px 20px', borderBottom: isDark ? '1px solid #1a2d29' : '1px solid #e2eae7', background: isDark ? '#111c18' : '#f9fdfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: isDark ? '#fff' : '#3b3e3c', margin: 0 }}>System Registry</h3>
              <p style={{ fontSize: 13, color: isDark ? '#a3b3af' : '#8c918f', margin: '4px 0 0', fontWeight: 500 }}>Matrix activity logs and system ticks.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: isDark ? '#a3b3af' : '#8c918f', fontWeight: 600 }}>Active Date:</span>
              <div style={{ position: 'relative' }} ref={viewCalendarRef}>
                <button onClick={() => setShowViewCalendar(!showViewCalendar)} className="verdant-btn-outline" style={{ height: 38, padding: '0 16px' }}>
                  <CalendarIcon size={15} color="#00a76b" /> {formatDateDisplay(viewDate)}
                </button>
                {showViewCalendar && (
                  <div style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 8, width: 280, background: isDark ? '#111c18' : '#fff', border: isDark ? '1px solid #1a2d29' : '1px solid #e2eae7', borderRadius: 16, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.06)', zIndex: 100 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <button type="button" onClick={() => setViewCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        style={{ border: 'none', background: isDark ? '#162722' : '#f3f4f6', color: isDark ? '#fff' : '#000', cursor: 'pointer', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justify: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={14} />
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#fff' : '#3b3e3c' }}>
                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][viewCalendarMonth.getMonth()]} {viewCalendarMonth.getFullYear()}
                      </span>
                      <button type="button" onClick={() => setViewCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        style={{ border: 'none', background: isDark ? '#162722' : '#f3f4f6', color: isDark ? '#fff' : '#000', cursor: 'pointer', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justify: 'center', justifyContent: 'center' }}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => <div key={w} style={{ fontSize: 10, fontWeight: 800, color: '#8c918f' }}>{w}</div>)}
                      {getDaysInMonth(viewCalendarMonth).map((day, idx) => {
                        if (!day) return <div key={idx} />;
                        const dStr = getYYYYMMDD(day);
                        const isSel = dStr === viewDate;
                        const isTdy = dStr === today;
                        return (
                          <button key={idx} type="button" onClick={() => { setViewDate(dStr); setShowViewCalendar(false); }}
                            style={{ border: 'none', background: isSel ? '#00a76b' : isTdy ? (isDark ? 'rgba(0,167,107,0.1)' : '#f2fbf6') : 'transparent', color: isSel ? '#fff' : isTdy ? '#00a76b' : (isDark ? '#cbd5e1' : '#3b3e3c'), cursor: 'pointer', borderRadius: 8, height: 28, fontSize: 11, fontWeight: (isSel || isTdy) ? 700 : 500 }}>
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TABLE LOG DISPLAY */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: 600 }}>
              <thead>
                <tr style={{ background: isDark ? '#111c18' : '#f9fdfc', borderBottom: isDark ? '1px solid #1a2d29' : '1px solid #e2eae7' }}>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#8c918f', textTransform: 'uppercase' }}>Sequence ID</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#8c918f', textTransform: 'uppercase' }}>Active Date</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#8c918f', textTransform: 'uppercase' }}>Active Time</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#8c918f', textTransform: 'uppercase' }}>Idle Duration</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#8c918f', textTransform: 'uppercase' }}>Status Code</th>
                </tr>
              </thead>
              <tbody>
                {myTimeLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: isDark ? '#a3b3af' : '#8c918f' }}>
                      No activity logs recorded.
                    </td>
                  </tr>
                ) : (
                  myTimeLogs.map((log, index) => (
                    <tr key={log._id || index} style={{ borderBottom: isDark ? '1px solid #111c18' : '1px solid #f3f4f6' }}>
                      <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: isDark ? '#fff' : '#2c302e' }}>
                        Pulse-{myTimeLogs.length - index}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: 13, color: isDark ? '#cbd5e1' : '#3b3e3c' }}>
                        {formatDateDisplay(log.date)}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: 13, fontFamily: 'monospace', color: isDark ? '#cbd5e1' : '#3b3e3c' }}>
                        {formatTime(log.activeTime)}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: 13, fontFamily: 'monospace', color: '#d0746e' }}>
                        {formatTime(log.idleTime)}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: isDark ? 'rgba(0,167,107,0.08)' : '#f2fbf6', color: '#00a76b' }}>
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODALS */}
      <CreateTaskModal isOpen={showCreateTaskModal} onClose={() => setShowCreateTaskModal(false)} onCreated={() => fetchRegistryTasks(registryDate)} employeeId={currentUser?._id} employeeName={currentUser?.fullName} />
      <TaskDetailView isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} task={selectedTask} onUpdated={() => fetchRegistryTasks(registryDate)} isHigherRole={isHigherRole} />
    </div>
  );
};

export default TimeTrackingDashboard;
