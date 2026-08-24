import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Clock, Calendar, Users, CheckCircle, XCircle, AlertTriangle,
  Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight, ChevronDown,
  LogIn, LogOut, Timer, TrendingUp, ArrowUpRight, ArrowDownRight,
  Sun, Moon, Coffee, MoreVertical, Square, Activity, Zap
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import TimeTrackerWidget from '@shared/components/TimeTrackerWidget';
import ViewHolidaysDrawer from '../components/modals/ViewHolidaysDrawer';

// ─── ATTRACTIVE CUSTOM DATE PICKER ─────────────────────────
export const AttendanceDatePicker = ({ value, onChange, placeholder = 'dd-mm-yyyy' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const parsedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return null;
  }, [value]);

  const [viewDate, setViewDate] = useState(() => parsedDate || new Date());

  useEffect(() => {
    if (parsedDate) setViewDate(parsedDate);
  }, [parsedDate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const pad = (n) => String(n).padStart(2, '0');

  const formattedDisplay = useMemo(() => {
    if (!parsedDate) return '';
    return parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [parsedDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start (0=Mo, 6=Su)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleDateSelect = (day) => {
    const dStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    onChange(dStr);
    setIsOpen(false);
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSetToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const dStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    onChange(dStr);
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const todayStr = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button - Clickable anywhere on the button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-700 dark:text-white hover:border-emerald-500/50 hover:bg-slate-100/80 dark:hover:bg-[#133029] transition-all cursor-pointer shadow-xs select-none group"
      >
        <span className={formattedDisplay ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-400 dark:text-[#829e92]'}>
          {formattedDisplay || placeholder}
        </span>
        <Calendar size={13} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
      </button>

      {/* Modern Popover Calendar UI */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Header Controls */}
          <div className="flex items-center justify-between gap-1 mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={month}
                onChange={(e) => setViewDate(new Date(year, parseInt(e.target.value, 10), 1))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors py-0.5"
              >
                {monthNames.map((mName, i) => (
                  <option key={mName} value={i} className="bg-white dark:bg-[#0d2a22] text-slate-800 dark:text-white">
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setViewDate(new Date(parseInt(e.target.value, 10), month, 1))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors py-0.5"
              >
                {Array.from({ length: 20 }, (_, idx) => new Date().getFullYear() - 10 + idx).map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-[#0d2a22] text-slate-800 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((dayName, idx) => (
              <span
                key={dayName}
                className={`text-[10px] font-bold uppercase tracking-wider ${idx === 6 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-[#829e92]'
                  }`}
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}

            {Array.from({ length: totalDays }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${isSelected
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30 font-bold scale-105'
                    : isToday
                      ? 'border border-emerald-500/60 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-[#133029]'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#133029]'
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#e2eae7] dark:border-[#133029] text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className="px-3 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ATTRACTIVE CUSTOM STATUS DROPDOWN ─────────────────────────
const StatusFilterDropdown = ({ value, onChange, statusColors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeStatusColor = value !== 'All' ? statusColors[value] : null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-700 dark:text-white hover:border-emerald-500/50 hover:bg-slate-100/80 dark:hover:bg-[#133029] transition-all cursor-pointer shadow-xs select-none min-w-[130px] justify-between group"
      >
        <div className="flex items-center gap-2">
          {activeStatusColor ? (
            <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: activeStatusColor.dot }} />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shadow-sm" />
          )}
          <span>{value === 'All' ? 'All Status' : value}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full min-w-[140px] bg-white dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 py-1.5 select-none overflow-hidden">
          <div
            onClick={() => { onChange('All'); setIsOpen(false); }}
            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${value === 'All' ? 'bg-slate-100 dark:bg-[#133029]' : 'hover:bg-slate-50 dark:hover:bg-[#133029]/50'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shadow-sm" />
            <span className={`text-[13px] ${value === 'All' ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
              All Status
            </span>
          </div>

          {Object.entries(statusColors).map(([status, colors]) => {
            const isSelected = value === status;
            return (
              <div
                key={status}
                onClick={() => { onChange(status); setIsOpen(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-slate-100 dark:bg-[#133029]' : 'hover:bg-slate-50 dark:hover:bg-[#133029]/50'
                  }`}
              >
                <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: colors.dot }} />
                <span className={`text-[13px] ${isSelected ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Card component
const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] hover:border-emerald-500/70 dark:hover:border-emerald-500/70 rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300 ${className}`}>
    {children}
  </div>
);

// ────────────────────────────── SAMPLE DATA ──────────────────────────────
const SAMPLE_RECORDS = (() => {
  const names = [
    { name: 'Sara Lopez', role: 'Designer', dept: 'Design' },
    { name: 'Marcus Lee', role: 'Developer', dept: 'Engineering' },
    { name: 'Priya Sharma', role: 'HR Lead', dept: 'HR' },
    { name: 'Jonas Becker', role: 'Backend Dev', dept: 'Engineering' },
    { name: 'Mei Chen', role: 'QA Engineer', dept: 'Quality' },
    { name: 'Alex Rivera', role: 'PM', dept: 'Product' },
    { name: 'Emma Wilson', role: 'DevOps', dept: 'Engineering' },
    { name: 'David Kim', role: 'Data Analyst', dept: 'Analytics' },
    { name: 'Fatima Al-Hassan', role: 'Marketing', dept: 'Marketing' },
    { name: 'Liam Murphy', role: 'Sales Lead', dept: 'Sales' },
    { name: 'Nina Petrov', role: 'Frontend Dev', dept: 'Engineering' },
    { name: 'Carlos Garcia', role: 'Support', dept: 'Operations' },
    { name: 'Aisha Johnson', role: 'Finance', dept: 'Finance' },
    { name: 'Ravi Patel', role: 'Mobile Dev', dept: 'Engineering' },
    { name: 'Sophie Turner', role: 'Content Writer', dept: 'Marketing' },
  ];
  const statuses = ['Present', 'Present', 'Present', 'Present', 'Present', 'Late', 'Late', 'Half Day', 'Absent', 'Leave'];
  const records = [];
  const today = new Date();
  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip Saturdays and Sundays (Weekend Holidays)
    const dateStr = date.toISOString().split('T')[0];
    names.forEach((emp, idx) => {
      const status = statuses[(idx + d) % statuses.length];
      const clockInH = 8 + Math.floor(Math.random() * 2);
      const clockInM = Math.floor(Math.random() * 45);
      const clockOutH = 17 + Math.floor(Math.random() * 2);
      const clockOutM = Math.floor(Math.random() * 50);
      records.push({
        _id: `sample-${d}-${idx}`,
        user: { _id: `user-${idx}`, name: emp.name, role: emp.role, email: `${emp.name.split(' ')[0].toLowerCase()}@company.com` },
        date: dateStr,
        clockIn: `${String(clockInH).padStart(2, '0')}:${String(clockInM).padStart(2, '0')}`,
        clockOut: status === 'Half Day' ? `${String(12 + Math.floor(Math.random() * 2)).padStart(2, '0')}:${String(clockOutM).padStart(2, '0')}` :
          status === 'Absent' || status === 'Leave' ? null :
            `${String(clockOutH).padStart(2, '0')}:${String(clockOutM).padStart(2, '0')}`,
        status,
        department: emp.dept
      });
    });
  }
  return records;
})();


const MONTHLY_TREND = [
  { month: 'Jan', rate: 94 }, { month: 'Feb', rate: 92 }, { month: 'Mar', rate: 95 },
  { month: 'Apr', rate: 93 }, { month: 'May', rate: 96 }, { month: 'Jun', rate: 94 },
  { month: 'Jul', rate: 97 },
];

const STATUS_COLORS = {
  Present: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', dot: '#10b981' },
  Late: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: '#f59e0b' },
  Absent: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: '#ef4444' },
  'Half Day': { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: '#3b82f6' },
  Leave: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', dot: '#8b5cf6' },
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

// ────────────────────────────── HELPERS ──────────────────────────────
const getWorkingHours = (clockIn, clockOut, totalHours, record) => {
  // 1. Priority 1: Actual tracked active seconds (timer logs excluding breaks)
  const activeSecs = record?.totalActiveTime ?? record?.activeTime ?? record?.trackedTime;
  if (activeSecs !== undefined && activeSecs !== null && typeof activeSecs === 'number' && activeSecs > 0) {
    const h = Math.floor(activeSecs / 3600);
    const m = Math.floor((activeSecs % 3600) / 60);
    return `${h}h ${m}m`;
  }

  // 2. Priority 2: Backend decimal totalHours (handles both number and numeric strings e.g. "4.57")
  const hoursVal = totalHours ?? record?.totalHours;
  if (hoursVal !== undefined && hoursVal !== null && hoursVal !== '--') {
    const numericHours = typeof hoursVal === 'number' ? hoursVal : parseFloat(String(hoursVal));
    if (!isNaN(numericHours) && numericHours > 0) {
      const totalMins = Math.round(numericHours * 60);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${h}h ${m}m`;
    }
  }

  // 3. Priority 3: Direct timestamp calculation if checkInTime & checkOutTime exist
  if (record && record.checkInTime && record.checkOutTime) {
    const start = new Date(record.checkInTime).getTime();
    const end = new Date(record.checkOutTime).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const diffSecs = Math.floor((end - start) / 1000);
      const h = Math.floor(diffSecs / 3600);
      const m = Math.floor((diffSecs % 3600) / 60);
      return `${h}h ${m}m`;
    }
  }

  // 4. Fallback: Parse time strings (e.g., "10:30", "15:04")
  if (clockIn && clockOut && clockIn !== '--' && clockOut !== '--') {
    const parseTimeToMins = (tStr) => {
      const str = String(tStr).trim();
      if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
      }
      const match = str.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let hrs = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const ampm = match[3];
        if (ampm) {
          if (ampm.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
          if (ampm.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
        }
        return hrs * 60 + mins;
      }
      return null;
    };

    const inMins = parseTimeToMins(clockIn);
    const outMins = parseTimeToMins(clockOut);

    if (inMins !== null && outMins !== null && outMins >= inMins) {
      const diff = outMins - inMins;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m}m`;
    }
  }

  return '--';
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

// ────────────────────────────── TOOLTIP ──────────────────────────────
const ChartTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`backdrop-blur-md border p-3 rounded-2xl shadow-xl min-w-[150px] text-xs transition-all ${isDark ? 'bg-[#0a1f1a]/90 border-[#133029] text-white shadow-black/20' : 'bg-white/95 border-gray-100 text-gray-800 shadow-slate-200/50'
      }`}>
      <p className="font-extrabold text-[13px] mb-2.5 pb-2 border-b border-slate-100 dark:border-[#133029]">{label}</p>
      <div className="space-y-2">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full ring-2 ring-white/10" style={{ backgroundColor: item.color }}></span>
              <span className={isDark ? 'text-slate-300 font-semibold uppercase tracking-wider text-[10px]' : 'text-gray-500 font-semibold uppercase tracking-wider text-[10px]'}>
                {item.name}
              </span>
            </div>
            <span className="font-black tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ────────────────────────────── MAIN COMPONENT ──────────────────────────────
const getLocalYYYYMMDD = (d) => {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [weeklyChartData, setWeeklyChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [yearlyStats, setYearlyStats] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState('week'); // 'week' | 'month' | 'year'
  const [periodStats, setPeriodStats] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('week');
  const [chartStats, setChartStats] = useState(null);

  const [teamStatsPeriod, setTeamStatsPeriod] = useState('week');
  const [teamStats, setTeamStats] = useState(null);
  const [teamStatsLoading, setTeamStatsLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const userRole = (sessionStorage.getItem('role') || 'employee').toLowerCase();
  const isEmployeeRoute = location.pathname.includes('/employee');
  const [viewContext, setViewContext] = useState(isEmployeeRoute || userRole === 'employee' ? 'employee' : 'team');
  const [hoveredWeeklySlice, setHoveredWeeklySlice] = useState(null);
  const [hoveredStatusSlice, setHoveredStatusSlice] = useState(null);

  useEffect(() => {
    if (isEmployeeRoute) {
      setViewContext('employee');
    }
  }, [isEmployeeRoute]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSummaryIndex, setHoveredSummaryIndex] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [appViewMode, setAppViewMode] = useState('attendance'); // 'attendance' | 'timeTracker'
  const [viewMode, setViewMode] = useState('daily'); // daily | weekly | monthly
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // Calendar
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Theme observer
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const [todayLiveStatus, setTodayLiveStatus] = useState(null);
  const [teamLiveSessions, setTeamLiveSessions] = useState([]);
  const [isHolidaysDrawerOpen, setIsHolidaysDrawerOpen] = useState(false);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    const fetchHolidays = async () => {
      const token = sessionStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get('/api/holidays', { headers: { Authorization: `Bearer ${token}` } });
        setHolidays(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch holidays in Attendance:', err);
      }
    };
    fetchHolidays();
  }, []);

  useEffect(() => {
    if (viewContext === 'employee') return;

    const fetchTeamLive = async () => {
      const token = sessionStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get('/api/time/all', { headers: { Authorization: `Bearer ${token}` } });
        const raw = Array.isArray(res.data) ? res.data : [];
        const todayStr = getLocalYYYYMMDD(new Date());
        const todaySessions = raw.filter(s => s.date === todayStr);
        setTeamLiveSessions(todaySessions);
      } catch (e) { }
    };

    fetchTeamLive();
    const interval = setInterval(fetchTeamLive, 5000);
    return () => clearInterval(interval);
  }, [viewContext]);

  const todayRecord = useMemo(() => {
    const tStr = getLocalYYYYMMDD(new Date());
    return records.find(r => {
      if (!r.date) return false;
      const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : getLocalYYYYMMDD(new Date(r.date));
      return dStr === tStr;
    }) || null;
  }, [records]);

  const formatTime12h = (dateObjOrStr) => {
    if (!dateObjOrStr || dateObjOrStr === '--') return '--:--';
    if (typeof dateObjOrStr === 'string' && dateObjOrStr.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i)) {
      return dateObjOrStr;
    }
    // Handle ISO date strings or Date objects first before splitting simple time strings
    if (dateObjOrStr instanceof Date || (typeof dateObjOrStr === 'string' && (dateObjOrStr.includes('T') || dateObjOrStr.includes('-')))) {
      try {
        const d = new Date(dateObjOrStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
        }
      } catch (e) { }
    }
    if (typeof dateObjOrStr === 'string' && dateObjOrStr.includes(':')) {
      const parts = dateObjOrStr.trim().split(':');
      let h = parseInt(parts[0], 10);
      const m = parts[1] ? parts[1].slice(0, 2) : '00';
      if (!isNaN(h)) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
      }
    }
    try {
      const d = new Date(dateObjOrStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
      }
    } catch (e) {
      return String(dateObjOrStr);
    }
    return String(dateObjOrStr);
  };

  const todayCheckInDisplay = useMemo(() => {
    if (todayLiveStatus?.startTime) return formatTime12h(todayLiveStatus.startTime);
    if (todayRecord?.clockIn && todayRecord.clockIn !== '--') return formatTime12h(todayRecord.clockIn);
    if (todayRecord?.checkInTime) return formatTime12h(todayRecord.checkInTime);
    return '--:--';
  }, [todayLiveStatus, todayRecord]);

  const todayCheckOutDisplay = useMemo(() => {
    if (todayLiveStatus?.status === 'completed' && todayLiveStatus?.endTime) return formatTime12h(todayLiveStatus.endTime);
    if (todayRecord?.clockOut && todayRecord.clockOut !== '--') return formatTime12h(todayRecord.clockOut);
    if (todayRecord?.checkOutTime) return formatTime12h(todayRecord.checkOutTime);
    return '--:--';
  }, [todayLiveStatus, todayRecord]);

  const todayTotalHoursDisplay = useMemo(() => {
    if (todayLiveStatus?.activeTime && typeof todayLiveStatus.activeTime === 'number' && todayLiveStatus.activeTime > 0) {
      const secs = todayLiveStatus.activeTime;
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return `${h}h ${m}m`;
    }
    if (todayRecord) {
      return getWorkingHours(todayRecord.clockIn, todayRecord.clockOut, todayRecord.totalHours, todayRecord);
    }
    return '--';
  }, [todayLiveStatus, todayRecord]);

  const activeStats = useMemo(() => {
    return viewContext === 'employee'
      ? (statsPeriod === 'year' ? yearlyStats : periodStats)
      : teamStats;
  }, [viewContext, statsPeriod, yearlyStats, periodStats, teamStats]);

  const todayStr = getLocalYYYYMMDD(new Date());

  const todayRecords = useMemo(() => {
    return records.filter(r => {
      if (!r.date) return false;
      const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : getLocalYYYYMMDD(new Date(r.date));
      return dStr === todayStr;
    });
  }, [records, todayStr]);

  const todaySummaryFromBackend = useMemo(() => weeklyChartData.find(d => d.date === todayStr), [weeklyChartData, todayStr]);

  const summaryStats = useMemo(() => {
    if (viewContext === 'team' && teamStats) {
      const src = teamStats.today || teamStats;
      const present = src.present || 0;
      const late = src.late || 0;
      const halfDay = src.halfDay || 0;
      const absent = src.absent || 0;
      const leave = src.leave || 0;
      const total = src.total || (present + late + halfDay + absent + leave) || 1;
      const pct = src.pct !== undefined ? src.pct : Math.round(((present + late + halfDay) / total) * 100);
      return { present, late, absent, halfDay, leave, total, pct };
    }

    const present = todayRecords.filter(r => r.status === 'Present').length;
    const late = todayRecords.filter(r => r.status === 'Late').length;
    const halfDay = todayRecords.filter(r => r.status === 'Half Day').length;

    const absent = todaySummaryFromBackend ? todaySummaryFromBackend.Absent : 0;
    const leave = todaySummaryFromBackend ? todaySummaryFromBackend.Leave : 0;

    const total = present + late + halfDay + absent + leave || 1;
    const pct = Math.round(((present + late + halfDay) / total) * 100);
    return { present, late, absent, halfDay, leave, total, pct };
  }, [todayRecords, todaySummaryFromBackend, viewContext, teamStats]);

  const teamPresentCount = useMemo(() => {
    const uniquePresentUsers = new Set();

    records.forEach(r => {
      if (!r.date) return;
      const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : getLocalYYYYMMDD(new Date(r.date));
      if (dStr === todayStr) {
        const st = (r.status || '').toLowerCase();
        if (['present', 'late', 'half day', 'working'].includes(st) || (r.clockIn && r.clockIn !== '--') || r.checkInTime) {
          const empId = r.user?._id || r.user?.id || (typeof r.user === 'string' ? r.user : r._id);
          if (empId) uniquePresentUsers.add(String(empId));
        }
      }
    });

    teamLiveSessions.forEach(s => {
      if (!s.date) return;
      const dStr = typeof s.date === 'string' ? s.date.split('T')[0] : getLocalYYYYMMDD(new Date(s.date));
      if (dStr === todayStr) {
        const isSessionActiveOrDone = !!(s.startTime || s.isRunning || (s.status && ['active', 'working', 'paused', 'break', 'completed'].includes(s.status.toLowerCase())) || (s.activeTime && s.activeTime > 0));
        if (isSessionActiveOrDone) {
          const empId = s.employeeId?._id || s.employeeId?.id || (typeof s.employeeId === 'string' ? s.employeeId : s._id);
          if (empId) uniquePresentUsers.add(String(empId));
        }
      }
    });

    return uniquePresentUsers.size;
  }, [records, teamLiveSessions, summaryStats, todayStr]);

  const teamCurrentLiveCount = useMemo(() => {
    return teamLiveSessions.filter(s => {
      if (!s.date) return false;
      const dStr = typeof s.date === 'string' ? s.date.split('T')[0] : getLocalYYYYMMDD(new Date(s.date));
      return dStr === todayStr && s.isRunning && s.status === 'active';
    }).length;
  }, [teamLiveSessions, todayStr]);

  const teamOnBreakCount = useMemo(() => {
    return teamLiveSessions.filter(s => {
      if (!s.date) return false;
      const dStr = typeof s.date === 'string' ? s.date.split('T')[0] : getLocalYYYYMMDD(new Date(s.date));
      return dStr === todayStr && (s.status === 'idle' || s.status === 'paused' || s.status === 'break');
    }).length;
  }, [teamLiveSessions, todayStr]);

  const [dailyActivityDate, setDailyActivityDate] = useState(() => getLocalYYYYMMDD(new Date()));
  const [dailyActivityLog, setDailyActivityLog] = useState(null);

  const fetchDailyActivityLog = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`/api/time/my?startDate=${dailyActivityDate}&endDate=${dailyActivityDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const logs = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      setDailyActivityLog(logs[0] || null);
    } catch (e) {
      console.error('Error fetching daily activity log:', e);
    }
  }, [dailyActivityDate]);

  useEffect(() => {
    fetchDailyActivityLog();
    const interval = setInterval(fetchDailyActivityLog, 5000);
    return () => clearInterval(interval);
  }, [fetchDailyActivityLog]);

  const dailyActivityRows = useMemo(() => {
    if (!dailyActivityLog) return [];
    const log = dailyActivityLog;
    const checkinStr = log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
    const formatMinutes = (seconds) => {
      const totalSecs = parseInt(seconds) || 0;
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    };

    const rows = [];
    if (log.sessions && log.sessions.length > 0) {
      // Step 1: Deduplicate and filter out 0-second / instant session markers
      const cleanSessions = log.sessions.filter((sess, index, self) => {
        const startOrResume = sess.start || sess.resume;
        const pauseOrEnd = sess.pause || sess.end;
        if (!startOrResume) return false;

        // Deduplicate sessions starting within 10 seconds of previous session
        if (index > 0) {
          const prevSess = self[index - 1];
          const currTime = new Date(startOrResume).getTime();
          const prevTime = new Date(prevSess.start || prevSess.resume || 0).getTime();
          if (Math.abs(currTime - prevTime) < 10000) return false;
        }

        // Ignore instant zero-duration segments (duration <= 5 seconds with pause/end)
        if (pauseOrEnd) {
          const diffMs = new Date(pauseOrEnd).getTime() - new Date(startOrResume).getTime();
          if (diffMs <= 5000) return false;
        }

        return true;
      });

      // Step 2: Build clean daily activity rows
      cleanSessions.forEach((session, idx) => {
        const startOrResume = session.start || session.resume;
        const pauseOrEnd = session.pause || session.end;

        if (startOrResume) {
          const resumeStr = new Date(startOrResume).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          let pauseStr = 'Running...';
          let totalStr = '0m';

          if (pauseOrEnd) {
            pauseStr = new Date(pauseOrEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const diffSecs = Math.max(0, Math.floor((new Date(pauseOrEnd).getTime() - new Date(startOrResume).getTime()) / 1000));
            totalStr = formatMinutes(diffSecs);
          } else {
            const isLastSession = idx === cleanSessions.length - 1;
            const isToday = log.date === getLocalYYYYMMDD(new Date());

            if (isLastSession && isToday && log.status === 'active') {
              pauseStr = 'Running...';
              const diffSecs = Math.max(0, Math.floor((Date.now() - new Date(startOrResume).getTime()) / 1000));
              totalStr = formatMinutes(diffSecs);
            } else if (log.endTime) {
              pauseStr = new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
              const diffSecs = Math.max(0, Math.floor((new Date(log.endTime).getTime() - new Date(startOrResume).getTime()) / 1000));
              totalStr = formatMinutes(diffSecs);
            } else {
              pauseStr = '--:--';
              totalStr = '0m';
            }
          }

          rows.push({
            checkin: checkinStr,
            pauseNo: idx + 1,
            resumeTime: resumeStr,
            pauseTime: pauseStr,
            totalTime: totalStr
          });
        }
      });
    }
    return rows;
  }, [dailyActivityLog]);

  const fetchEmployeeStats = useCallback(async (period = statsPeriod) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(`/api/attendance/me/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPeriodStats(res.data);
      setYearlyStats(res.data);
    } catch (e) {
      console.error('Error fetching period stats:', e);
    }
  }, [statsPeriod]);

  const fetchChartStats = useCallback(async (period = chartPeriod) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(`/api/attendance/me/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChartStats(res.data);
    } catch (e) {
      console.error('Error fetching chart stats:', e);
    }
  }, [chartPeriod]);

  const fetchTeamStats = useCallback(async (period = teamStatsPeriod) => {
    const token = sessionStorage.getItem('token');
    setTeamStatsLoading(true);
    try {
      const res = await axios.get(`/api/attendance/summary/team-stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamStats(res.data);
    } catch (e) {
      console.error('Error fetching team stats:', e);
    } finally {
      setTeamStatsLoading(false);
    }
  }, [teamStatsPeriod]);

  const fetchSummaryChart = useCallback(async (period = chartPeriod) => {
    const token = sessionStorage.getItem('token');
    try {
      const url = viewContext === 'employee'
        ? `/api/attendance/summary/weekly?scope=personal&period=${period}`
        : `/api/attendance/summary/weekly?period=${period}`;
      const summaryRes = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setWeeklyChartData(summaryRes.data.this_week || []);
    } catch (e) {
      console.error('Error fetching summary chart:', e);
    }
  }, [viewContext, chartPeriod]);

  useEffect(() => {
    fetchSummaryChart(chartPeriod);
  }, [chartPeriod, fetchSummaryChart]);

  useEffect(() => {
    if (viewContext === 'employee') {
      fetchEmployeeStats(statsPeriod);
    }
  }, [viewContext, statsPeriod, fetchEmployeeStats]);

  useEffect(() => {
    if (viewContext === 'employee') {
      fetchChartStats(chartPeriod);
    }
  }, [viewContext, chartPeriod, fetchChartStats]);

  useEffect(() => {
    if (viewContext !== 'employee') {
      fetchTeamStats(teamStatsPeriod);
    }
  }, [viewContext, teamStatsPeriod, fetchTeamStats]);

  // Fetch data
  const fetchAttendance = useCallback(async () => {
    // Only show full loading spinner on initial load if no records exist yet
    if (records.length === 0) {
      setLoading(true);
    }
    setError(null);
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(
        viewContext === 'employee' ? '/api/attendance?scope=personal' : '/api/attendance',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSummaryChart(chartPeriod);

      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const uniqueRecordsMap = new Map();
      for (const item of data) {
        const uId = item.user?._id ? item.user._id.toString() : (item.user ? item.user.toString() : item._id);
        const key = `${uId}_${item.date}`;
        if (uId && !uniqueRecordsMap.has(key)) {
          uniqueRecordsMap.set(key, item);
        }
      }
      setRecords(Array.from(uniqueRecordsMap.values()));

      if (viewContext === 'employee') {
        fetchEmployeeStats(statsPeriod);
        fetchChartStats(chartPeriod);
      } else {
        fetchTeamStats(teamStatsPeriod);
      }
    } catch (err) {
      console.warn('Error fetching attendance data:', err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [viewContext, statsPeriod, chartPeriod, teamStatsPeriod, fetchEmployeeStats, fetchChartStats, fetchTeamStats, records.length]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);



  // ── Filtered & Sorted ──
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    if (userRole === 'hr') {
      filtered = filtered.filter(r => {
        const role = (r.user?.role || '').toLowerCase();
        const name = (r.user?.name || '').toLowerCase();
        if (role === 'admin' || role === 'superadmin') return false;
        if (name.includes('admin')) return false;
        return true;
      });
    } else if (userRole === 'manager') {
      filtered = filtered.filter(r => {
        const role = (r.user?.role || '').toLowerCase();
        const name = (r.user?.name || '').toLowerCase();
        if (role === 'admin' || role === 'hr' || role === 'superadmin') return false;
        if (name.includes('admin') || name.includes('hr manager')) return false;
        return true;
      });
    }

    const today = new Date();

    if (viewMode === 'daily') {
      const tStr = getLocalYYYYMMDD(today);
      filtered = filtered.filter(r => r.date === tStr);
    } else if (viewMode === 'weekly') {
      const day = today.getDay() || 7;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - day + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startStr = getLocalYYYYMMDD(startOfWeek);
      const endStr = getLocalYYYYMMDD(endOfWeek);
      filtered = filtered.filter(r => r.date >= startStr && r.date <= endStr);
    } else if (viewMode === 'monthly') {
      const monthPrefix = getLocalYYYYMMDD(today).slice(0, 7); // YYYY-MM
      filtered = filtered.filter(r => (r.date || '').startsWith(monthPrefix));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        (r.user?.name || '').toLowerCase().includes(q) ||
        (r.user?.email || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q) ||
        (r.date || '').includes(q)
      );
    }
    if (statusFilter !== 'All') {
      filtered = filtered.filter(r => {
        const rStatus = (r.status || '').toLowerCase().trim();
        const fStatus = statusFilter.toLowerCase().trim();
        if (fStatus === 'present') return rStatus === 'present' || rStatus === 'working' || rStatus === 'logged in';
        if (fStatus === 'leave' || fStatus === 'on leave') return rStatus === 'leave' || rStatus === 'on leave';
        return rStatus === fStatus;
      });
    }
    if (dateFilter) {
      filtered = filtered.filter(r => r.date === dateFilter);
    }
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = (a.date || '').localeCompare(b.date || '');
      else if (sortField === 'name') cmp = (a.user?.name || '').localeCompare(b.user?.name || '');
      else if (sortField === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      else if (sortField === 'clockIn') cmp = (a.clockIn || '').localeCompare(b.clockIn || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [records, searchQuery, statusFilter, dateFilter, sortField, sortDir, viewMode]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, dateFilter, viewMode]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Calendar Data ──
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayRecords = records.filter(r => {
        if (!r.date) return false;
        const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : getLocalYYYYMMDD(new Date(r.date));
        return dStr === dateStr;
      });
      const presentCount = dayRecords.filter(r => r.status === 'Present').length;
      const lateCount = dayRecords.filter(r => r.status === 'Late').length;
      const halfDayCount = dayRecords.filter(r => r.status === 'Half Day').length;
      const absentCount = isWeekend ? 0 : dayRecords.filter(r => r.status === 'Absent').length;
      const leaveCount = isWeekend ? 0 : dayRecords.filter(r => r.status === 'Leave').length;
      days.push({
        day: d,
        dateStr,
        isWeekend,
        present: presentCount,
        late: lateCount,
        halfDay: halfDayCount,
        absent: absentCount,
        leave: leaveCount,
        total: dayRecords.length
      });
    }
    return days;
  }, [calendarMonth, records]);

  // ── Pie Data ──
  const pieData = useMemo(() => {
    const activeStats = periodStats || yearlyStats;
    if (viewContext === 'employee' && activeStats) {
      return [
        { name: 'Present', value: activeStats.present || 0, fill: '#10b981' },
        { name: 'Late', value: activeStats.late || 0, fill: '#f59e0b' },
        { name: 'Absent', value: activeStats.absent || 0, fill: '#ef4444' },
        { name: 'Half Day', value: activeStats.halfDay || 0, fill: '#3b82f6' },
        { name: 'Leave', value: activeStats.leave || 0, fill: '#8b5cf6' },
      ].filter(d => d.value > 0);
    }
    return [
      { name: 'Present', value: summaryStats.present, fill: '#10b981' },
      { name: 'Late', value: summaryStats.late, fill: '#f59e0b' },
      { name: 'Absent', value: summaryStats.absent, fill: '#ef4444' },
      { name: 'Half Day', value: summaryStats.halfDay, fill: '#3b82f6' },
      { name: 'Leave', value: summaryStats.leave, fill: '#8b5cf6' },
    ].filter(d => d.value > 0);
  }, [summaryStats, periodStats, yearlyStats, viewContext]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['Date', 'Employee', 'Status', 'Clock In', 'Clock Out', 'Working Hours'];

    const formatCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatDateForCsv = (rawDate) => {
      if (!rawDate) return 'N/A';
      try {
        const cleanStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : rawDate;
        const parts = String(cleanStr).split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const monthIdx = parseInt(parts[1], 10) - 1;
          const day = parts[2];
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          if (monthIdx >= 0 && monthIdx < 12) {
            return `${day} ${monthNames[monthIdx]} ${year}`;
          }
        }
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      } catch (e) {}
      return String(rawDate);
    };

    const rows = filteredRecords.map(r => {
      const formattedDateText = formatDateForCsv(r.date);
      const employeeName = r.user?.name || r.userName || 'N/A';
      const status = r.status || 'N/A';

      const cInRaw = r.clockIn || r.clock_in || (r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) : null);
      const cOutRaw = r.clockOut || r.clock_out || (r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) : null);

      const clockIn = (cInRaw && cInRaw !== '--') ? formatTime12h(cInRaw) : 'N/A';
      const clockOut = (cOutRaw && cOutRaw !== '--') ? formatTime12h(cOutRaw) : 'N/A';
      const workingHoursRaw = getWorkingHours(cInRaw, cOutRaw, r.totalHours, r);
      const workingHours = (!workingHoursRaw || workingHoursRaw === '--') ? 'N/A' : workingHoursRaw;

      return [
        formatCsvCell(`="${formattedDateText}"`),
        formatCsvCell(employeeName),
        formatCsvCell(status),
        formatCsvCell(clockIn),
        formatCsvCell(clockOut),
        formatCsvCell(workingHours)
      ];
    });

    const csvString = '\uFEFF' + [headers.map(formatCsvCell).join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${viewMode}_${getLocalYYYYMMDD(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Override / Reopen Accidental Checkout
  const handleOverrideCheckout = async (record) => {
    const userId = record.user?._id || record.user?.id || record.user;
    if (!userId) {
      toast.error('Unable to identify employee for override.');
      return;
    }
    const empName = record.user?.name || 'Employee';
    const confirmOverride = window.confirm(`Reopen session for ${empName}? This will clear today's checkout and resume time tracking.`);
    if (!confirmOverride) return;

    try {
      const res = await axios.post(`/api/attendance/override-checkout/${userId}`, {}, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success(res.data?.message || `Checkout overridden for ${empName}! Session reopened.`);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to override checkout.');
    }
  };

  const periodLabel = statsPeriod === 'week' ? 'Week' : statsPeriod === 'month' ? 'Month' : 'Year';

  // ────────────────────────────── RENDER ──────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Attendance
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAttendance}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── TAB NAVIGATION & PERIOD TOGGLE ROW ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: View Mode Navigation Tabs */}
        <div>
          {userRole !== 'employee' && (
            <div className="inline-flex items-center bg-slate-100/90 dark:bg-[#112822] p-1.5 rounded-2xl border border-slate-200/70 dark:border-[#1a3830] shadow-xs gap-1 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => {
                  setAppViewMode('attendance');
                  setViewContext('employee');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${appViewMode === 'attendance' && viewContext === 'employee'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Calendar size={14} className={appViewMode === 'attendance' && viewContext === 'employee' ? 'text-white' : 'text-emerald-500'} />
                <span>My Attendance</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppViewMode('attendance');
                  setViewContext('team');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${appViewMode === 'attendance' && viewContext === 'team'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Users size={14} className={appViewMode === 'attendance' && viewContext === 'team' ? 'text-white' : 'text-emerald-500'} />
                <span>My Team Attendance</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Period Toggle (Week/Month/Year) */}
        {appViewMode === 'attendance' && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#133029] p-1 rounded-xl shrink-0">
            {['week', 'month', 'year'].map((p) => {
              const isEmployee = viewContext === 'employee';
              const currentPeriod = isEmployee ? statsPeriod : teamStatsPeriod;
              return (
                <button
                  key={p}
                  onClick={() => {
                    setStatsPeriod(p);
                    setTeamStatsPeriod(p);
                    setChartPeriod(p);
                  }}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${currentPeriod === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {(() => {
          const empPresent = activeStats?.present || 0;
          const empLate = activeStats?.late || 0;
          const empHalfDay = activeStats?.halfDay || 0;
          const empAbsent = activeStats?.absent || 0;
          const empLeave = activeStats?.leave || 0;
          const empTotal = empPresent + empLate + empHalfDay + empAbsent + empLeave;
          const empRate = empTotal > 0 ? Math.round(((empPresent + empLate + empHalfDay) / empTotal) * 100) : 0;

          const cards = viewContext === 'employee' ? [
            { label: 'Present', value: empPresent, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', trend: `${empRate}%`, borderColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.45)' },
            { label: 'Late', value: empLate, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgIcon: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40', borderColor: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.45)' },
            { label: 'Absent', value: empAbsent, icon: XCircle, color: 'text-red-600 dark:text-red-400', bgIcon: 'bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40', borderColor: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.45)' },
            { label: 'Half Day', value: empHalfDay, icon: Sun, color: 'text-blue-600 dark:text-blue-400', bgIcon: 'bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40', borderColor: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.45)' },
            { label: 'On Leave', value: empLeave, icon: Calendar, color: 'text-purple-600 dark:text-purple-400', bgIcon: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40', borderColor: '#8b5cf6', glowColor: 'rgba(139, 92, 246, 0.45)' },
          ] : [
            { label: 'Present', value: teamStats?.present || 0, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', trend: teamStats?.pct ? `${teamStats.pct}%` : '0%', borderColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.45)' },
            { label: 'Late', value: teamStats?.late || 0, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgIcon: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40', borderColor: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.45)' },
            { label: 'Absent', value: teamStats?.absent || 0, icon: XCircle, color: 'text-red-600 dark:text-red-400', bgIcon: 'bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40', borderColor: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.45)' },
            { label: 'Half Day', value: teamStats?.halfDay || 0, icon: Sun, color: 'text-blue-600 dark:text-blue-400', bgIcon: 'bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40', borderColor: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.45)' },
            { label: 'On Leave', value: teamStats?.leave || 0, icon: Calendar, color: 'text-purple-600 dark:text-purple-400', bgIcon: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40', borderColor: '#8b5cf6', glowColor: 'rgba(139, 92, 246, 0.45)' },
          ];

          return cards.map((card, i) => {
            const isHovered = hoveredSummaryIndex === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredSummaryIndex(i)}
                onMouseLeave={() => setHoveredSummaryIndex(null)}
                style={{
                  borderColor: isHovered ? card.borderColor : undefined
                }}
                className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl h-14 w-full transition-all duration-200 shadow-xs cursor-pointer border border-gray-200 dark:border-[#28251e] bg-white dark:bg-[#151c28]"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className={`inline-flex p-1.5 rounded-lg shrink-0 ${card.bgIcon}`}>
                    <card.icon size={16} strokeWidth={2.5} className={card.color} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate" title={card.label}>
                      {card.label}
                    </span>
                    {card.trend && (
                      <span className="text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <ArrowUpRight size={9} /> {card.trend}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 pl-1 text-right">
                  <h3 className={`text-xl font-black ${card.color} leading-none`}>{card.value}</h3>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* ── ATTENDANCE RATE BANNER (Hidden for employee since it's company-wide) ── */}
      {viewContext !== 'employee' && (
        <Card className="!py-2.5 !px-4 flex flex-col sm:flex-row items-center justify-between gap-3 !hover:border-teal-500 hover:border-teal-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-[#829e92]">Today's Attendance Rate</p>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none mt-0.5">{summaryStats.pct}%</h2>
            </div>
          </div>
          <div className="flex items-center gap-6 sm:gap-8 px-2">
            <div className="text-center px-1">
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">{summaryStats.present + summaryStats.late + summaryStats.halfDay}</p>
              <p className="text-[9.5px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">Working</p>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-[#133029] shrink-0" />
            <div className="text-center px-1">
              <p className="text-base font-extrabold text-red-500 dark:text-red-400 leading-tight">{summaryStats.absent}</p>
              <p className="text-[9.5px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">Absent</p>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-[#133029] shrink-0" />
            <div className="text-center px-1">
              <p className="text-base font-extrabold text-purple-500 dark:text-purple-400 leading-tight">{summaryStats.leave}</p>
              <p className="text-[9.5px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">Leave</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── TOP SECTION: DYNAMIC GRID (Summary Cards | Upcoming Holidays | Attendance Calendar in One Line) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Current Session Time Tracker Card (only in My Attendance mode) */}
        {viewContext !== 'team' && (
          <div className="flex flex-col">
            <TimeTrackerWidget isDark={isDark} className="h-full" />
          </div>
        )}

        {/* Middle Column: 3 Summary Cards (In Between Current Session & Calendar) */}
        <div className="flex flex-col justify-between gap-2">
          {viewContext === 'team' ? (
            <>
              {/* Card 1: Present Today */}
              <div className="py-3.5 px-5 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-[#10b981] dark:hover:!border-[#34d399] transition-colors duration-300 flex items-center gap-6 sm:gap-8 shadow-xs group flex-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">
                      Present Today
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {teamPresentCount}
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      Members
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Current Live */}
              <div className="py-3.5 px-5 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-[#3b82f6] dark:hover:!border-[#60a5fa] transition-colors duration-300 flex items-center gap-6 sm:gap-8 shadow-xs group flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Activity size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">
                      Current Live
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {teamCurrentLiveCount}
                    </span>
                    <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                      Working
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: On Break */}
              <div className="py-3.5 px-5 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-[#f59e0b] dark:hover:!border-[#fbbf24] transition-colors duration-300 flex items-center gap-6 sm:gap-8 shadow-xs group flex-1">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Coffee size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">
                      On Break
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {teamOnBreakCount}
                    </span>
                    <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                      Paused
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Card 1: Check-in Time */}
              <div className="py-3.5 px-5 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-[#10b981] dark:hover:!border-[#34d399] transition-colors duration-300 flex items-center gap-4 sm:gap-5 shadow-xs group flex-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">
                      Check-In Time
                    </span>
                  </div>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                    {todayCheckInDisplay}
                  </p>
                </div>
              </div>

              {/* Card 2: Check-out Time */}
              <div className="py-3.5 px-5 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-[#3b82f6] dark:hover:!border-[#60a5fa] transition-colors duration-300 flex items-center gap-4 sm:gap-5 shadow-xs group flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Square size={17} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">
                      Check-Out Time
                    </span>
                  </div>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight font-mono">
                    {todayCheckOutDisplay}
                  </p>
                </div>
              </div>

              {/* Card 3: Total Hours */}
              <div className="py-3.5 px-5 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-[#f59e0b] dark:hover:!border-[#fbbf24] transition-colors duration-300 flex items-center gap-4 sm:gap-5 shadow-xs group flex-1">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30 flex items-center justify-center shrink-0">
                  <Clock size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">
                      Total Hours
                    </span>
                  </div>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono">
                    {todayTotalHoursDisplay}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Middle Column 2 (only in My Team Attendance mode): Upcoming Holidays Card */}
        {viewContext === 'team' && (
          <Card className="h-full flex flex-col justify-between p-4 shadow-xs transition-colors duration-300 hover:!border-purple-500 dark:hover:!border-purple-400">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  Upcoming Holidays
                </h3>
                <button
                  type="button"
                  onClick={() => setIsHolidaysDrawerOpen(true)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                >
                  View Calendar
                </button>
              </div>

              <div className="space-y-2">
                {holidays.length > 0 ? (
                  holidays
                    .filter(h => {
                      if (!h || !h.date || h.isActive === false) return false;
                      const hDate = new Date(h.date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return !isNaN(hDate.getTime()) && hDate >= today;
                    })
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .slice(0, 5)
                    .map((h, idx) => {
                      const hDate = new Date(h.date);
                      const dateStr = hDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      const dayStr = hDate.toLocaleDateString('en-GB', { weekday: 'long' });

                      const accentThemes = [
                        { pillar: 'bg-purple-500 dark:bg-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400', bg: 'bg-slate-50/90 dark:bg-[#162420]/80 hover:bg-purple-50/60 dark:hover:bg-[#1e322c]' },
                        { pillar: 'bg-indigo-500 dark:bg-indigo-400', iconBg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400', bg: 'bg-slate-50/90 dark:bg-[#162420]/80 hover:bg-indigo-50/60 dark:hover:bg-[#1e322c]' },
                        { pillar: 'bg-pink-500 dark:bg-pink-400', iconBg: 'bg-pink-100 dark:bg-pink-950/70 text-pink-600 dark:text-pink-400', bg: 'bg-slate-50/90 dark:bg-[#162420]/80 hover:bg-pink-50/60 dark:hover:bg-[#1e322c]' },
                        { pillar: 'bg-emerald-500 dark:bg-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400', bg: 'bg-slate-50/90 dark:bg-[#162420]/80 hover:bg-emerald-50/60 dark:hover:bg-[#1e322c]' },
                        { pillar: 'bg-amber-500 dark:bg-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400', bg: 'bg-slate-50/90 dark:bg-[#162420]/80 hover:bg-amber-50/60 dark:hover:bg-[#1e322c]' }
                      ];
                      const theme = accentThemes[idx % accentThemes.length];

                      return (
                        <div
                          key={idx}
                          onClick={() => setIsHolidaysDrawerOpen(true)}
                          className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md hover:translate-x-0.5 ${theme.bg}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-1.5 h-6 rounded-full shrink-0 ${theme.pillar}`} />
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                              <Calendar size={14} />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-gray-900 dark:text-white leading-tight">{dateStr}</h4>
                              <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">{dayStr}</p>
                            </div>
                          </div>
                          <div className="font-bold text-xs text-gray-900 dark:text-white text-right">
                            {h.name || h.title}
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-6 text-gray-400 font-medium text-xs">
                    No upcoming holidays
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Right Column: Attendance Calendar */}
        <div className="flex flex-col">
          <Card className="h-full flex flex-col justify-between p-3 flex-1 transition-colors duration-300 hover:!border-indigo-500 dark:hover:!border-indigo-400">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  <Calendar size={16} className="text-emerald-500" />
                  <span>{calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-[#829e92]">Monthly Attendance Calendar</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-500 dark:text-[#829e92] transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCalendarMonth(new Date())}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-500 dark:text-[#829e92] transition-colors"
                  title="Next Month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Weekday Names Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-0.5">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
                <div key={d} className={`text-[9px] font-bold uppercase tracking-wider py-0.5 ${i >= 5 ? 'text-rose-400' : 'text-slate-400 dark:text-[#829e92]'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 flex-1">
              {calendarData.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="h-6 md:h-7" />;
                }

                const isToday = day.dateStr === todayStr;
                const isWeekend = day.isWeekend ?? (new Date(day.dateStr).getDay() === 0 || new Date(day.dateStr).getDay() === 6);

                // Color styling based on status
                let dayBg = 'hover:bg-slate-50 dark:hover:bg-[#0d2a22] text-slate-700 dark:text-slate-300';
                let dotColor = null;

                if (day.present > 0) {
                  dotColor = '#10b981';
                  dayBg = 'bg-emerald-50/70 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-300 font-bold';
                } else if (day.late > 0) {
                  dotColor = '#f59e0b';
                  dayBg = 'bg-amber-50/70 dark:bg-amber-950/25 text-amber-700 dark:text-amber-300 font-bold';
                } else if (day.halfDay > 0) {
                  dotColor = '#3b82f6';
                  dayBg = 'bg-blue-50/70 dark:bg-blue-950/25 text-blue-700 dark:text-blue-300 font-bold';
                } else if (day.leave > 0 && !isWeekend) {
                  dotColor = '#8b5cf6';
                  dayBg = 'bg-purple-50/70 dark:bg-purple-950/25 text-purple-700 dark:text-purple-300 font-bold';
                } else if (day.absent > 0 && !isWeekend) {
                  dotColor = '#ef4444';
                  dayBg = 'bg-red-50/60 dark:bg-red-950/20 text-red-600 dark:text-red-400';
                } else if (isWeekend) {
                  dayBg = 'text-slate-400 dark:text-[#557367] bg-slate-50/40 dark:bg-[#0a1814]/30';
                }

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => setDateFilter(dateFilter === day.dateStr ? '' : day.dateStr)}
                    className={`group relative h-6 md:h-7 rounded-lg p-0.5 flex flex-col items-center justify-center transition-all cursor-pointer text-[10px] ${dayBg} ${isToday ? 'ring-2 ring-emerald-500 shadow-xs' : ''
                      } ${dateFilter === day.dateStr ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40' : ''}`}
                  >
                    <span className="leading-none text-[11px] font-bold">{day.day}</span>
                    {dotColor && (
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-0.5"
                        style={{ backgroundColor: dotColor }}
                      />
                    )}

                    {/* Interactive Hover Popover Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col z-50 w-44 bg-white dark:bg-[#181612] border border-slate-200 dark:border-[#38352e] rounded-xl p-2.5 shadow-xl text-left pointer-events-none transition-all">
                      <p className="text-[11px] font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-[#282520] pb-1 mb-1.5">
                        {new Date(day.dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <div className="space-y-1 text-[10px] font-bold">
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Present
                          </span>
                          <span className="font-extrabold">{day.present}</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Late
                          </span>
                          <span className="font-extrabold">{day.late}</span>
                        </div>
                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Half Day
                          </span>
                          <span className="font-extrabold">{day.halfDay}</span>
                        </div>
                        <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Leave
                          </span>
                          <span className="font-extrabold">{day.leave}</span>
                        </div>
                        <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Absent
                          </span>
                          <span className="font-extrabold">{day.absent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Legend */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#133029] flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-[#829e92] flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Late</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Leave</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Absent</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── DAILY ACTIVITY TABLE (BETWEEN CARDS AND HISTORY TABLE - ONLY FOR MY ATTENDANCE VIEW) ── */}
      {viewContext === 'employee' && (
        <Card className="!p-4 my-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <span>DAILY ACTIVITY</span>
            </h3>
            <div className="flex items-center gap-2">
              <AttendanceDatePicker
                value={dailyActivityDate}
                onChange={setDailyActivityDate}
                placeholder="dd-mm-yyyy"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#e2eae7] dark:border-[#133029]">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#0d2a22] border-b border-[#e2eae7] dark:border-[#133029]">
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider">CHECK-IN TIME</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider text-center">NO. OF PAUSES</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider">RESUME TIME</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider">PAUSE TIME</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider text-right">TOTAL TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2eae7] dark:divide-[#133029]">
                {dailyActivityRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-[#829e92] font-semibold text-xs">
                      No daily activity recorded for this date.
                    </td>
                  </tr>
                ) : (
                  dailyActivityRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-[#0d2a22]/50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-white">{row.checkin}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-slate-600 dark:text-slate-300">{row.pauseNo}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200">{row.resumeTime}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200">{row.pauseTime}</td>
                      <td className="px-4 py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{row.totalTime}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── ATTENDANCE HISTORY TABLE ── */}
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2.5">
          <h3 className="text-[14px] font-extrabold text-slate-900 dark:text-white tracking-tight shrink-0">
            Attendance History
            <span className="ml-2 text-xs font-bold text-slate-400 dark:text-[#829e92]">({filteredRecords.length} records)</span>
          </h3>

          {/* Filters & View Mode Tabs in Same Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <StatusFilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              statusColors={STATUS_COLORS}
            />

            {/* Date Filter */}
            <AttendanceDatePicker
              value={dateFilter}
              onChange={setDateFilter}
              placeholder="dd-mm-yyyy"
            />

            {/* Clear Button */}
            {(searchQuery || statusFilter !== 'All' || dateFilter) && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateFilter(''); }}
                className="px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
              >
                Clear
              </button>
            )}

            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#133029] rounded-xl p-0.5 shadow-xs">
              {['daily', 'weekly', 'monthly'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${viewMode === mode
                    ? 'bg-white dark:bg-[#0a1f1a] text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-[#829e92] hover:text-slate-700 dark:hover:text-white'
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar for Non-Employee roles */}
        {viewContext !== 'employee' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2.5">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#829e92]" />
              <input
                type="text"
                placeholder="Search employees, dates, departments..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-[#829e92] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="h-[310px] min-h-[310px] max-h-[310px] overflow-x-auto overflow-y-hidden rounded-xl border border-[#e2eae7] dark:border-[#133029]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 dark:bg-[#0d2a22] border-b border-[#e2eae7] dark:border-[#133029]">
                {[
                  { key: 'name', label: 'Employee' },
                  { key: 'date', label: 'Date' },
                  { key: 'status', label: 'Status' },
                  { key: 'clockIn', label: 'Check In' },
                  { key: 'clockOut', label: 'Check Out' },
                  { key: 'hours', label: 'Working Hours' },
                  ...(userRole !== 'employee' ? [{ key: 'actions', label: 'Action' }] : [])
                ].map(col => (
                  <th key={col.key}
                    onClick={() => col.key !== 'hours' && col.key !== 'clockOut' && col.key !== 'actions' && handleSort(col.key)}
                    className={`px-3 py-1.5 text-left text-[9.5px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider ${col.key !== 'hours' && col.key !== 'clockOut' && col.key !== 'actions' ? 'cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 select-none' : ''
                      }`}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortField === col.key && (
                        <span className="text-emerald-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2eae7] dark:divide-[#133029]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={userRole !== 'employee' ? 7 : 6} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar size={28} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">No attendance records found</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.map((record, i) => {
                const sc = STATUS_COLORS[record.status] || STATUS_COLORS['Present'];
                const isToday = record.date === new Date().toISOString().split('T')[0];
                const hasCheckedOut = !!(record.clockOut || record.clock_out || record.checkOutTime);

                return (
                  <tr key={record._id || i} className="hover:bg-slate-50/50 dark:hover:bg-[#0d2a22]/50 transition-colors">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6.5 h-6.5 rounded-full bg-emerald-50 dark:bg-[#133029] text-emerald-600 dark:text-emerald-400 font-bold text-[9.5px] flex items-center justify-center shrink-0">
                          {getInitials(record.user?.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-[11.5px] leading-tight">{record.user?.name || 'Unknown'}</p>
                          <p className="text-[9.5px] text-slate-400 dark:text-[#829e92] leading-none mt-0.5">{record.department || record.user?.role || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{record.date}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                        {record.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1 text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">
                        <LogIn size={11.5} className="text-emerald-500" />
                        {formatTime12h(record.clockIn || record.clock_in || record.checkInTime)}
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1 text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">
                        <LogOut size={11.5} className="text-red-400" />
                        {formatTime12h(record.clockOut || record.clock_out || record.checkOutTime)}
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-[11.5px] font-bold text-slate-800 dark:text-white">
                        {(() => {
                          const cIn = record.clockIn || record.clock_in || (record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) : null);
                          const cOut = record.clockOut || record.clock_out || (record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) : null);
                          return getWorkingHours(cIn, cOut, record.totalHours, record);
                        })()}
                      </span>
                    </td>
                    {userRole !== 'employee' && (
                      <td className="px-3 py-1.5">
                        {isToday && hasCheckedOut ? (
                          <button
                            onClick={() => handleOverrideCheckout(record)}
                            title="Reopen accidental checkout"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white border border-amber-500/30 text-[10.5px] font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <Zap size={11} />
                            <span>Override</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-[11px] font-mono">--</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer - Always Reserved Height to Keep Container Fixed */}
        <div className="flex items-center justify-between mt-3.5 min-h-[36px]">
          <p className="text-xs font-semibold text-slate-400 dark:text-[#829e92]">
            {filteredRecords.length > 0
              ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredRecords.length)} of ${filteredRecords.length}`
              : 'Showing 0 records'}
          </p>
          {totalPages > 1 ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={14} className="text-slate-500 dark:text-[#829e92]" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page;
                if (totalPages <= 5) page = i + 1;
                else if (currentPage <= 3) page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else page = currentPage - 2 + i;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-xs font-bold rounded-lg transition-all ${currentPage === page
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-[#829e92] hover:bg-slate-100 dark:hover:bg-[#133029]'
                      }`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight size={14} className="text-slate-500 dark:text-[#829e92]" />
              </button>
            </div>
          ) : (
            <div className="h-7 w-1 shrink-0" />
          )}
        </div>
      </Card>

      {/* View Holidays Drawer */}
      <ViewHolidaysDrawer
        isOpen={isHolidaysDrawerOpen}
        onClose={() => setIsHolidaysDrawerOpen(false)}
        holidays={holidays}
      />
    </div>
  );
};

export default Attendance;
