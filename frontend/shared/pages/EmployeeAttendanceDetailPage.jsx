import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  Calendar,
  CalendarRange,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Square,
  Activity,
  Coffee,
  Timer,
  Play,
  Pause
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AttendanceProgressBars from '@shared/components/AttendanceProgressBars';

// Standard Card component matching the FluidHR attendance theme
const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:border-emerald-500/70 dark:hover:border-emerald-500/70 rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300 ${className}`}>
    {children}
  </div>
);

// ─── STYLISH POPUP DATE PICKER ─────────────────────────
const StylishDatePicker = ({ value, onChange, placeholder = 'DD-MM-YYYY' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'
  const popoverRef = useRef(null);

  const pad = (n) => String(n).padStart(2, '0');

  const parseDateStr = (str) => {
    if (!str || typeof str !== 'string') return new Date();
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState(() => parseDateStr(value));

  // Sync internal view date when external value changes
  useEffect(() => {
    if (value) {
      setViewDate(parseDateStr(value));
    }
  }, [value]);

  // Click outside listener to dismiss popover
  useEffect(() => {
    const handleOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start (0=Mo, 6=Su)

  const monthNamesFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const yearList = Array.from({ length: 25 }, (_, idx) => currentYear - 15 + idx);

  // Formatted trigger label: DD-MM-YYYY
  const displayFormatted = useMemo(() => {
    if (!value) return placeholder;
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return value;
  }, [value, placeholder]);

  const daysGrid = useMemo(() => {
    const arr = [];
    for (let i = 0; i < startDay; i++) arr.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      arr.push({ day: d, dateStr });
    }
    return arr;
  }, [year, month, startDay, totalDays]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const handlePrev = (e) => {
    e.stopPropagation();
    if (viewMode === 'years') {
      setViewDate(new Date(year - 12, month, 1));
    } else {
      setViewDate(new Date(year, month - 1, 1));
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (viewMode === 'years') {
      setViewDate(new Date(year + 12, month, 1));
    } else {
      setViewDate(new Date(year, month + 1, 1));
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Sleek Trigger Pill */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setViewMode('days');
        }}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs select-none group text-xs font-bold ${
          isOpen
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
            : 'bg-white dark:bg-[#181612] border-slate-200/90 dark:border-[#38352e] hover:border-emerald-500/80 dark:hover:border-emerald-500/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1f1d18]'
        }`}
      >
        <span className="font-mono tracking-tight text-slate-800 dark:text-slate-100">{displayFormatted}</span>
        <Calendar size={13} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
        <ChevronDown size={12} className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
      </button>

      {/* Ultra Stylish Floating Popover Card */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 w-80 p-3.5 bg-white dark:bg-[#181612] border border-slate-200/90 dark:border-[#38352e] rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Header Row: Month / Year with Chevrons */}
          <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-slate-100 dark:border-[#282520]">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#282520] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1 text-xs font-black">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  viewMode === 'months'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#201d18] hover:bg-emerald-50 dark:hover:bg-[#282520] text-slate-800 dark:text-slate-100 border-slate-200 dark:border-[#38352e]'
                }`}
              >
                <span>{monthNamesFull[month]}</span>
                <ChevronDown size={11} className={`inline-block ml-1 transition-transform ${viewMode === 'months' ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  viewMode === 'years'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#201d18] hover:bg-emerald-50 dark:hover:bg-[#282520] text-slate-800 dark:text-slate-100 border-slate-200 dark:border-[#38352e]'
                }`}
              >
                <span>{year}</span>
                <ChevronDown size={11} className={`inline-block ml-1 transition-transform ${viewMode === 'years' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#282520] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* VIEW: MONTHS GRID */}
          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-1.5 py-2">
              {monthNamesShort.map((m, idx) => {
                const isSelected = month === idx;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(year, idx, 1));
                      setViewMode('days');
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'bg-slate-50 dark:bg-[#201d18] hover:bg-emerald-50 dark:hover:bg-[#282520] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-[#38352e]'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW: YEARS GRID */}
          {viewMode === 'years' && (
            <div className="grid grid-cols-4 gap-1.5 py-2 max-h-48 overflow-y-auto pr-1">
              {yearList.map((y) => {
                const isSelected = year === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(y, month, 1));
                      setViewMode('days');
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'bg-slate-50 dark:bg-[#201d18] hover:bg-emerald-50 dark:hover:bg-[#282520] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-[#38352e]'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW: DAYS GRID */}
          {viewMode === 'days' && (
            <>
              {/* Weekday Names Header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-extrabold uppercase text-slate-400 dark:text-[#829e92]">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
                  <span key={d} className={i >= 5 ? 'text-rose-400' : ''}>{d}</span>
                ))}
              </div>

              {/* Days Numbers */}
              <div className="grid grid-cols-7 gap-1">
                {daysGrid.map((item, idx) => {
                  if (!item) return <div key={`empty-${idx}`} className="h-7 w-7" />;
                  const isSelected = item.dateStr === value;
                  const isToday = item.dateStr === todayStr;
                  const dayDate = new Date(item.dateStr);
                  const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => {
                        onChange(item.dateStr);
                        setIsOpen(false);
                      }}
                      className={`h-7 w-7 mx-auto rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-500/30 scale-105'
                          : isToday
                          ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black hover:bg-emerald-50 dark:hover:bg-[#201d18]'
                          : isWeekend
                          ? 'text-rose-400/80 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-[#201d18] hover:text-emerald-600 dark:hover:text-emerald-400'
                      }`}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer Quick Actions */}
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-[#282520] flex items-center justify-between text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                const yr = d.getFullYear();
                const mo = pad(d.getMonth() + 1);
                const da = pad(d.getDate());
                onChange(`${yr}-${mo}-${da}`);
                setIsOpen(false);
              }}
              className="px-2 py-0.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-[#282520] transition-colors cursor-pointer"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TARGET_WEEKLY_HOURS = 42.5;
const TARGET_WEEKLY_SECONDS = 42.5 * 3600; // 153,000s = 42h 30m

const EmployeeAttendanceDetailPage = ({
  record,
  allRecords = [],
  onBack,
  userId: propUserId
}) => {
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();

  const parseToYYYYMMDD = (rawDate) => {
    if (!rawDate) return getTodayStr();
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
    if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return getTodayStr();
  };

  const [selectedDate, setSelectedDate] = useState(() => {
    if (record?.date) return parseToYYYYMMDD(record.date);
    return getTodayStr();
  });
  const [activeRecord, setActiveRecord] = useState(record || null);
  const [isLoading, setIsLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = last week, 3 = 3 weeks ago
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [hoveredLegendStatus, setHoveredLegendStatus] = useState(null);

  // Helper to calculate Monday-based week range
  const getWeekRange = (offset = 0) => {
    const now = new Date();
    const currentDay = now.getDay();
    const distToMon = currentDay === 0 ? -6 : 1 - currentDay;

    const mon = new Date(now);
    mon.setDate(now.getDate() + distToMon - (offset * 7));
    mon.setHours(0, 0, 0, 0);

    const sat = new Date(mon);
    sat.setDate(mon.getDate() + 5);
    sat.setHours(23, 59, 59, 999);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);

    const formatYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      offset,
      startStr: formatYMD(mon),
      endStr: formatYMD(sun),
      satStr: formatYMD(sat),
      mon,
      sat,
      sun
    };
  };

  // Detect which week offset a date belongs to
  const getWeekOffsetForDate = useCallback((dateStr) => {
    if (!dateStr) return 0;
    const w0 = getWeekRange(0);
    const w1 = getWeekRange(1);
    const w3 = getWeekRange(3);
    if (dateStr >= w0.startStr && dateStr <= w0.endStr) return 0;
    if (dateStr >= w1.startStr && dateStr <= w1.endStr) return 1;
    if (dateStr >= w3.startStr && dateStr <= w3.endStr) return 3;

    const now = new Date();
    const d = new Date(dateStr);
    const diffDays = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.floor(diffDays / 7));
  }, []);

  const targetUserId = useMemo(() => {
    return (
      propUserId ||
      activeRecord?.user?._id ||
      activeRecord?.user?.id ||
      (typeof activeRecord?.user === 'string' ? activeRecord.user : null) ||
      activeRecord?.userId ||
      record?.user?._id ||
      record?.user?.id ||
      (typeof record?.user === 'string' ? record.user : null) ||
      record?.userId
    );
  }, [propUserId, activeRecord, record]);

  const empName = useMemo(() => {
    return activeRecord?.user?.name || activeRecord?.name || activeRecord?.employeeName || record?.user?.name || record?.name || record?.employeeName || 'Employee';
  }, [activeRecord, record]);

  const empRole = useMemo(() => {
    return activeRecord?.department || activeRecord?.user?.role || record?.department || record?.user?.role || 'Staff';
  }, [activeRecord, record]);

  const empEmail = useMemo(() => {
    return activeRecord?.user?.email || activeRecord?.email || record?.user?.email || record?.email || '';
  }, [activeRecord, record]);

  const empInitials = useMemo(() => {
    return empName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'EM';
  }, [empName]);

  // Sync initial record when prop changes
  useEffect(() => {
    if (record) {
      setActiveRecord(record);
      const dateStr = parseToYYYYMMDD(record.date);
      setSelectedDate(dateStr);
      setWeekOffset(getWeekOffsetForDate(dateStr));
      const parsedD = new Date(dateStr);
      if (!isNaN(parsedD.getTime())) {
        setCalendarMonth(new Date(parsedD.getFullYear(), parsedD.getMonth(), 1));
      }
    }
  }, [record, getWeekOffsetForDate]);

  // Lookup record from allRecords for any date
  const getRecordForDate = useCallback((dateStr) => {
    if (!dateStr) return null;
    const targetIdStr = targetUserId ? String(targetUserId) : '';
    const targetNameStr = empName.toLowerCase().trim();

    // 1. Search in allRecords
    if (Array.isArray(allRecords) && allRecords.length > 0) {
      const found = allRecords.find((r) => {
        if (!r.date) return false;
        const rDate = typeof r.date === 'string' ? r.date.split('T')[0] : parseToYYYYMMDD(r.date);
        if (rDate !== dateStr) return false;

        const rUid = r.user?._id || r.user?.id || (typeof r.user === 'string' ? r.user : r.userId);
        if (targetIdStr && rUid && String(rUid) === targetIdStr) return true;

        const rName = (r.user?.name || r.name || r.employeeName || '').toLowerCase().trim();
        if (targetNameStr && rName && rName === targetNameStr) return true;

        return false;
      });
      if (found) return found;
    }

    // 2. Check activeRecord
    if (activeRecord) {
      const aDate = typeof activeRecord.date === 'string' ? activeRecord.date.split('T')[0] : parseToYYYYMMDD(activeRecord.date);
      if (aDate === dateStr) return activeRecord;
    }

    // 3. Check initial prop record
    if (record) {
      const pDate = typeof record.date === 'string' ? record.date.split('T')[0] : parseToYYYYMMDD(record.date);
      if (pDate === dateStr) return record;
    }

    return null;
  }, [allRecords, targetUserId, empName, activeRecord, record]);

  // Active record for the currently selected date
  const selectedDayRecord = useMemo(() => {
    return getRecordForDate(selectedDate);
  }, [getRecordForDate, selectedDate]);

  // Fetch activity logs when date changes
  const handleDateChange = async (newDateStr) => {
    if (!newDateStr) return;
    setSelectedDate(newDateStr);
    setWeekOffset(getWeekOffsetForDate(newDateStr));

    // Try fetching fine-grained daily tracking sessions from backend API if available
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (targetUserId) {
        try {
          const dailyRes = await axios.get(`/api/time/daily/${targetUserId}/${newDateStr}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (dailyRes.data && (dailyRes.data.sessions || dailyRes.data.startTime)) {
            setActiveRecord(prev => ({
              ...(prev || {}),
              date: newDateStr,
              checkInTime: dailyRes.data.startTime,
              startTime: dailyRes.data.startTime,
              endTime: dailyRes.data.endTime,
              clockIn: dailyRes.data.startTime,
              clockOut: dailyRes.data.endTime,
              activeTime: dailyRes.data.totalWorkedDuration ? dailyRes.data.totalWorkedDuration * 60 : undefined,
              idleTime: dailyRes.data.totalPauseDuration ? dailyRes.data.totalPauseDuration * 60 : undefined,
              status: dailyRes.data.status || 'Present',
              isRunning: dailyRes.data.isRunning ?? (dailyRes.data.status === 'active')
            }));
            return;
          }
        } catch (dailyErr) {}
      }

      // If already present in allRecords, update activeRecord with it
      const matched = getRecordForDate(newDateStr);
      if (matched) {
        setActiveRecord(matched);
      }
    } catch (err) {
      console.warn('Could not fetch activity for selected date:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await handleDateChange(selectedDate);
      toast.success('Attendance data refreshed');
    } catch (e) {
      toast.error('Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper formatting routines
  const formatTimerDigital = (seconds = 0) => {
    const totalSecs = Math.max(0, parseInt(seconds) || 0);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHoursMinutes = (seconds = 0) => {
    const totalSecs = Math.max(0, parseInt(seconds) || 0);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const format12hTime = (t) => {
    if (!t || t === '--:--' || t === '--') return '--:--';
    if (typeof t === 'string' && (t.includes('AM') || t.includes('PM') || t.includes('am') || t.includes('pm'))) return t;
    const d = new Date(t);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    }
    if (typeof t === 'string' && t.includes(':')) {
      const parts = t.split(':');
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1].slice(0, 2);
        const ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
      }
    }
    return t;
  };

  const formatDisplayDate = (rawDate) => {
    if (!rawDate) return 'Select Date';
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return rawDate;
  };

  // Determine status of selected date
  const selectedDayStatus = useMemo(() => {
    if (selectedDayRecord?.status) return selectedDayRecord.status;
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'Weekend';
    if (selectedDate > todayStr) return 'Upcoming';
    if (selectedDate === todayStr) return 'Not Started';
    return 'Absent';
  }, [selectedDayRecord, selectedDate, todayStr]);

  const isPresentDay = useMemo(() => {
    const s = (selectedDayStatus || '').toLowerCase();
    return s === 'present' || s === 'working' || s === 'on break' || s === 'active' || s === 'half day';
  }, [selectedDayStatus]);

  const isWeekendDay = selectedDayStatus === 'Weekend';
  const isAbsentDay = selectedDayStatus === 'Absent';
  const isLeaveDay = selectedDayStatus === 'Leave';

  // Check-In and Check-Out displays for the selected date
  const checkInDisplay = useMemo(() => {
    if (!isPresentDay) return '--:--';
    const raw = selectedDayRecord?.clockIn || selectedDayRecord?.startTime || selectedDayRecord?.checkInTime || selectedDayRecord?.clock_in;
    if (raw && raw !== '--' && raw !== '--:--') return format12hTime(raw);
    return '--:--';
  }, [isPresentDay, selectedDayRecord]);

  const checkOutDisplay = useMemo(() => {
    if (!isPresentDay) return '--:--';
    const raw = selectedDayRecord?.clockOut || selectedDayRecord?.endTime || selectedDayRecord?.checkOutTime || selectedDayRecord?.clock_out;
    if (raw && raw !== '--' && raw !== '--:--') return format12hTime(raw);
    return '--:--';
  }, [isPresentDay, selectedDayRecord]);

  // Working & Inactivity seconds for selected date
  const dayActiveSeconds = useMemo(() => {
    if (!isPresentDay) return 0;
    if (typeof selectedDayRecord?.activeTime === 'number' && selectedDayRecord.activeTime > 0) return selectedDayRecord.activeTime;
    if (typeof selectedDayRecord?.totalActiveTime === 'number' && selectedDayRecord.totalActiveTime > 0) return selectedDayRecord.totalActiveTime;
    if (typeof selectedDayRecord?.totalWorkedDuration === 'number' && selectedDayRecord.totalWorkedDuration > 0) return selectedDayRecord.totalWorkedDuration * 60;
    if (typeof selectedDayRecord?.totalHours === 'number' && selectedDayRecord.totalHours > 0) return Math.round(selectedDayRecord.totalHours * 3600);
    if (typeof selectedDayRecord?.workHours === 'number' && selectedDayRecord.workHours > 0) return Math.round(selectedDayRecord.workHours * 3600);
    if (selectedDayRecord?.workingHours) {
      const str = String(selectedDayRecord.workingHours);
      const hMatch = str.match(/(\d+)\s*h/);
      const mMatch = str.match(/(\d+)\s*m/);
      const h = hMatch ? parseInt(hMatch[1], 10) : 0;
      const m = mMatch ? parseInt(mMatch[1], 10) : 0;
      if (h > 0 || m > 0) return h * 3600 + m * 60;
    }
    return 0;
  }, [isPresentDay, selectedDayRecord]);

  const dayIdleSeconds = useMemo(() => {
    if (!isPresentDay) return 0;
    if (typeof selectedDayRecord?.idleTime === 'number' && selectedDayRecord.idleTime > 0) return selectedDayRecord.idleTime;
    if (typeof selectedDayRecord?.totalPauseDuration === 'number' && selectedDayRecord.totalPauseDuration > 0) return selectedDayRecord.totalPauseDuration * 60;
    return 0;
  }, [isPresentDay, selectedDayRecord]);

  const dayTotalSeconds = dayActiveSeconds + dayIdleSeconds;

  // Formatted KPI string displays for the 6 cards matching media_1791542308762.png
  const workingHoursDisplay = formatTimerDigital(dayActiveSeconds); // e.g. 08:30:00 or 00:00:00
  const inactiveHoursDisplay = formatTimerDigital(dayIdleSeconds); // e.g. 01:25:00 or 00:00:00
  const totalHoursDisplay = formatTimerDigital(dayTotalSeconds); // e.g. 09:55:00 or 00:00:00

  // Calculate Weekly Stats for employee based on week offset
  const weeklyStats = useMemo(() => {
    const activeWeek = getWeekRange(weekOffset);
    let workedSecs = 0;

    if (Array.isArray(allRecords) && allRecords.length > 0) {
      const userRecordsThisWeek = allRecords.filter((r) => {
        const rUid = r.user?._id || r.user?.id || (typeof r.user === 'string' ? r.user : r.userId);
        const rDate = r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : '') : '';
        const targetIdStr = targetUserId ? String(targetUserId) : '';
        const targetNameStr = empName.toLowerCase().trim();
        const rName = (r.user?.name || r.name || r.employeeName || '').toLowerCase().trim();

        const isUserMatch = (targetIdStr && rUid && String(rUid) === targetIdStr) || (targetNameStr && rName && rName === targetNameStr);
        return isUserMatch && rDate >= activeWeek.startStr && rDate <= activeWeek.endStr;
      });

      userRecordsThisWeek.forEach((r) => {
        if (typeof r.activeTime === 'number' && r.activeTime > 0) {
          workedSecs += r.activeTime;
        } else if (typeof r.totalWorkedDuration === 'number' && r.totalWorkedDuration > 0) {
          workedSecs += r.totalWorkedDuration * 60;
        } else if (typeof r.totalHours === 'number' && r.totalHours > 0) {
          workedSecs += Math.round(r.totalHours * 3600);
        } else if (typeof r.workHours === 'number' && r.workHours > 0) {
          workedSecs += Math.round(r.workHours * 3600);
        }
      });
    }

    const overtimeSecs = Math.max(0, workedSecs - TARGET_WEEKLY_SECONDS);
    const hasOvertime = overtimeSecs > 0;

    return {
      workedSecs,
      formattedWorked: formatHoursMinutes(workedSecs),
      overtimeSecs,
      hasOvertime,
      formattedOvertime: hasOvertime ? `+${formatHoursMinutes(overtimeSecs)}` : '0h 0m'
    };
  }, [allRecords, targetUserId, empName, weekOffset]);

  // Session table rows calculation for selected date
  const sessionRows = useMemo(() => {
    if (!isPresentDay) return [];

    if (Array.isArray(selectedDayRecord?.sessions) && selectedDayRecord.sessions.length > 0) {
      const cleanSessions = selectedDayRecord.sessions.filter((sess, index, self) => {
        const startOrResume = sess.start || sess.resume;
        const pauseOrEnd = sess.pause || sess.end;
        if (!startOrResume) return false;

        if (index > 0) {
          const prevSess = self[index - 1];
          const currTime = new Date(startOrResume).getTime();
          const prevTime = new Date(prevSess.start || prevSess.resume || 0).getTime();
          if (Math.abs(currTime - prevTime) < 10000) return false;
        }

        if (pauseOrEnd) {
          const diffMs = new Date(pauseOrEnd).getTime() - new Date(startOrResume).getTime();
          if (diffMs <= 5000) return false;
        }

        return true;
      });

      const rows = [];
      cleanSessions.forEach((session, idx) => {
        const startOrResume = session.start || session.resume;
        const isLastSession = idx === cleanSessions.length - 1;
        const nextSession = cleanSessions[idx + 1];

        let pauseOrEnd = session.pause || session.end;
        if (!pauseOrEnd && nextSession) {
          pauseOrEnd = nextSession.start || nextSession.resume;
        }

        if (startOrResume) {
          const resumeStr = format12hTime(startOrResume);
          let pauseStr = '--:--';
          let totalStr = '0m';

          if (pauseOrEnd) {
            pauseStr = format12hTime(pauseOrEnd);
            const durationSecs = Math.max(0, Math.floor((new Date(pauseOrEnd).getTime() - new Date(startOrResume).getTime()) / 1000));
            totalStr = formatHoursMinutes(durationSecs);
          } else if (isLastSession) {
            const isToday = parseToYYYYMMDD(selectedDayRecord?.date) === todayStr;
            if (isToday && (selectedDayRecord?.status === 'active' || selectedDayRecord?.isRunning)) {
              pauseStr = 'Running...';
              const durationSecs = Math.max(0, Math.floor((Date.now() - new Date(startOrResume).getTime()) / 1000));
              totalStr = formatHoursMinutes(durationSecs);
            } else {
              const effectiveEnd =
                selectedDayRecord?.idleStart ||
                selectedDayRecord?.endTime ||
                selectedDayRecord?.checkOutTime ||
                selectedDayRecord?.updatedAt ||
                Date.now();
              pauseStr = format12hTime(effectiveEnd);
              const durationSecs = Math.max(0, Math.floor((new Date(effectiveEnd).getTime() - new Date(startOrResume).getTime()) / 1000));
              totalStr = formatHoursMinutes(durationSecs);
            }
          }

          rows.push({
            checkInTime: checkInDisplay,
            noOfPauses: idx + 1,
            resumeTime: resumeStr,
            pauseTime: pauseStr,
            totalTime: totalStr
          });
        }
      });

      if (rows.length > 0) return rows;
    }

    return [];
  }, [isPresentDay, selectedDayRecord, checkInDisplay, todayStr]);

  // Calendar calculations matching Attendance.jsx
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Monday start (0=Mo, 6=Su)
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const dayRecords = (allRecords || []).filter(r => {
        if (!r.date) return false;
        const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : parseToYYYYMMDD(r.date);
        if (dStr !== dateStr) return false;
        const rUid = r.user?._id || r.user?.id || (typeof r.user === 'string' ? r.user : r.userId);
        if (targetUserId && rUid && String(rUid) !== String(targetUserId)) return false;
        return true;
      });

      const isPresent = dayRecords.some(r => {
        const s = (r.status || '').toLowerCase();
        return s === 'present' || s === 'working' || s === 'active';
      });
      const isHalfDay = dayRecords.some(r => (r.status || '').toLowerCase() === 'half day');
      const isLeave = dayRecords.some(r => (r.status || '').toLowerCase().includes('leave'));
      const isAbsent = !isWeekend && (dayRecords.some(r => (r.status || '').toLowerCase() === 'absent') || (dateStr < todayStr && !isPresent && !isHalfDay && !isLeave));

      days.push({
        day: d,
        dateStr,
        isWeekend,
        present: isPresent ? 1 : 0,
        late: 0,
        halfDay: isHalfDay ? 1 : 0,
        leave: isLeave ? 1 : 0,
        absent: isAbsent ? 1 : 0
      });
    }
    return days;
  }, [calendarMonth, allRecords, targetUserId, todayStr]);

  const calendarMonthTotals = useMemo(() => {
    let present = 0, halfDay = 0, leave = 0, absent = 0;
    calendarData.forEach(day => {
      if (!day) return;
      if (day.present > 0) present += day.present;
      if (day.halfDay > 0) halfDay += day.halfDay;
      if (day.leave > 0) leave += day.leave;
      if (day.absent > 0) absent += day.absent;
    });
    return { present, halfDay, leave, absent };
  }, [calendarData]);

  // Status for Current Session card
  const isSelectedDateToday = selectedDate === todayStr;
  const isCheckedOut = isPresentDay && checkOutDisplay && checkOutDisplay !== '--:--';
  const hasActiveProgress = isPresentDay && (dayActiveSeconds > 0 || (checkInDisplay && checkInDisplay !== '--:--'));

  const isRunning = isSelectedDateToday && (
    selectedDayRecord?.status === 'active' ||
    selectedDayRecord?.isRunning ||
    (hasActiveProgress && !isCheckedOut && selectedDayRecord?.status !== 'paused' && selectedDayRecord?.status !== 'idle')
  );
  const isPaused = isSelectedDateToday && (selectedDayRecord?.status === 'paused' || selectedDayRecord?.status === 'idle');

  const sessionStatusText = isRunning
    ? 'WORKING'
    : isPaused
    ? 'ON BREAK'
    : isCheckedOut
    ? 'COMPLETED'
    : isSelectedDateToday && !hasActiveProgress
    ? 'NOT STARTED'
    : isPresentDay
    ? 'COMPLETED'
    : isLeaveDay
    ? 'ON LEAVE'
    : isWeekendDay
    ? 'WEEKEND'
    : 'ABSENT';

  const sessionStatusDotClass = isRunning
    ? 'bg-emerald-500 animate-pulse'
    : isPaused
    ? 'bg-amber-500'
    : isCheckedOut
    ? 'bg-blue-500'
    : isSelectedDateToday && !hasActiveProgress
    ? 'bg-slate-400'
    : isPresentDay
    ? 'bg-emerald-500'
    : isLeaveDay
    ? 'bg-purple-500'
    : isAbsentDay
    ? 'bg-red-500'
    : 'bg-slate-400 dark:bg-slate-500';

  // Export CSV Handler
  const handleExportCSV = () => {
    try {
      const headers = ['Check-in Time', 'No. of Pauses', 'Resume Time', 'Pause Time', 'Total Time'];
      const rows = sessionRows.map(r => [
        `"${r.checkInTime}"`,
        r.noOfPauses,
        `"${r.resumeTime}"`,
        `"${r.pauseTime}"`,
        `"${r.totalTime}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Attendance_${empName.replace(/\s+/g, '_')}_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Activity CSV exported successfully');
    } catch (e) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── TOP HEADER (Clean "Back" button + Employee Info + Actions) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* ONLY "Back" button, removing "to Attendance" as requested */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:border-emerald-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs cursor-pointer group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform text-emerald-600 dark:text-emerald-400" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/20">
              {empInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {empName}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  {empRole}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isPresentDay
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : isLeaveDay
                    ? 'bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400'
                    : 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                }`}>
                  {selectedDayStatus}
                </span>
              </div>
              {empEmail && (
                <p className="text-xs text-slate-400 dark:text-[#829e92] mt-0.5">{empEmail}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-emerald-600' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── PERIOD & WEEK SELECTOR ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-[#829e92]">
          <CalendarRange size={15} className="text-emerald-500" />
          <span>Viewing logs for: <strong className="text-slate-800 dark:text-slate-200">{formatDisplayDate(selectedDate)}</strong></span>
        </div>

        <div className="bg-white dark:bg-[#181612] p-1 rounded-xl border border-slate-200/80 dark:border-[#38352e] shadow-xs inline-flex items-center self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setWeekOffset(0);
              handleDateChange(todayStr);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              weekOffset === 0
                ? 'bg-[#00a76b] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => {
              setWeekOffset(1);
              const d = new Date();
              d.setDate(d.getDate() - 7);
              handleDateChange(parseToYYYYMMDD(d));
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              weekOffset === 1
                ? 'bg-[#00a76b] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Last Week
          </button>
          <button
            type="button"
            onClick={() => {
              setWeekOffset(3);
              const d = new Date();
              d.setDate(d.getDate() - 21);
              handleDateChange(parseToYYYYMMDD(d));
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              weekOffset === 3
                ? 'bg-[#00a76b] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            3 Weeks Ago
          </button>
        </div>
      </div>

      {/* ── TOP 3-COLUMN SECTION: Current Session | 6 KPI Cards | Attendance Calendar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Current Session Time Tracker Card */}
        <div className="flex flex-col">
          <div className="bg-white dark:bg-[#181612] rounded-[24px] border border-gray-200/90 dark:border-[#38352e] hover:!border-[#10b981] dark:hover:!border-[#34d399] transition-colors duration-300 p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden min-h-[170px] shadow-sm select-none h-full">
            <div className="flex justify-between items-start mb-1 relative z-10">
              <div>
                <h2 className="text-base font-bold text-[#1e293b] dark:text-white tracking-tight mb-0.5">Current Session</h2>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${sessionStatusDotClass}`}></span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-[#a3a094]">
                    {sessionStatusText}
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
                <Clock size={16} strokeWidth={1.75} />
              </div>
            </div>

            <div className="text-center my-auto py-1 relative z-10">
              <div className="text-3xl sm:text-4xl md:text-[44px] font-black text-[#0f172a] dark:text-white font-mono tracking-tight leading-none mb-1 tabular-nums">
                {workingHoursDisplay}
              </div>
              <p className="text-[9px] text-slate-400 dark:text-[#a3a094] font-extrabold tracking-[0.25em] uppercase">
                TOTAL TIME TRACKED
              </p>
            </div>
          </div>
        </div>

        {/* Column 2: 6 KPI Cards in 2x3 Grid */}
        <div className="grid grid-cols-2 gap-2.5 h-full">
          {/* Card 1: Check-in Time */}
          <div className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-[#10b981] dark:hover:!border-[#34d399] transition-colors duration-300 flex items-center gap-3 shadow-xs group min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Check-In Time
                </span>
              </div>
              <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono truncate">
                {checkInDisplay}
              </p>
            </div>
          </div>

          {/* Card 2: Check-out Time */}
          <div className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-[#3b82f6] dark:hover:!border-[#60a5fa] transition-colors duration-300 flex items-center gap-3 shadow-xs group min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Square size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Check-Out Time
                </span>
              </div>
              <p className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight font-mono truncate">
                {checkOutDisplay}
              </p>
            </div>
          </div>

          {/* Card 3: Working Hours */}
          <div className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-teal-500 dark:hover:!border-teal-400 transition-colors duration-300 flex items-center gap-3 shadow-xs group min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Activity size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                <span className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Working Hours
                </span>
              </div>
              <div className="flex items-baseline gap-1 min-w-0 flex-wrap">
                <p className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 tracking-tight font-mono truncate">
                  {workingHoursDisplay}
                </p>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                  / 8 hrs 30 mins
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Inactivity Hours */}
          <div className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-rose-500 dark:hover:!border-rose-400 transition-colors duration-300 flex items-center gap-3 shadow-xs group min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Coffee size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Inactivity Hours
                </span>
              </div>
              <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono truncate">
                {inactiveHoursDisplay}
              </p>
            </div>
          </div>

          {/* Card 5: Today's Hours / Daily Hours */}
          <div className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-[#f59e0b] dark:hover:!border-[#fbbf24] transition-colors duration-300 flex items-center gap-3 shadow-xs group min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30 flex items-center justify-center shrink-0">
              <Clock size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  {selectedDate === todayStr ? "Today's Hours" : "Daily Hours"}
                </span>
              </div>
              <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono truncate">
                {totalHoursDisplay}
              </p>
            </div>
          </div>

          {/* Card 6: Weekly Hours */}
          <div className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-2xl bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] hover:!border-purple-500 dark:hover:!border-purple-400 transition-colors duration-300 flex items-center gap-3 shadow-xs group min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500 text-white shadow-md shadow-purple-500/30 flex items-center justify-center shrink-0">
              <Timer size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <span className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Weekly Hours
                </span>
              </div>
              <div className="flex items-baseline gap-1 min-w-0 flex-wrap">
                <p className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 tracking-tight font-mono truncate">
                  {weeklyStats.formattedWorked}
                </p>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                  / 42 hrs 30 mins
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Attendance Calendar */}
        <div className="flex flex-col">
          <Card className="h-full flex flex-col justify-between p-3 flex-1 transition-colors duration-300 hover:!border-indigo-500 dark:hover:!border-indigo-400">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  <Calendar size={16} className="text-emerald-500" />
                  <span>{calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                </h3>
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
                  onClick={() => {
                    const now = new Date();
                    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    handleDateChange(todayStr);
                  }}
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
                const isSelected = day.dateStr === selectedDate;
                const isWeekend = day.isWeekend ?? (new Date(day.dateStr).getDay() === 0 || new Date(day.dateStr).getDay() === 6);

                let statusType = null;
                let dotColor = null;

                if (day.present > 0) {
                  statusType = 'present';
                  dotColor = '#10b981';
                } else if (day.halfDay > 0) {
                  statusType = 'halfDay';
                  dotColor = '#3b82f6';
                } else if (day.leave > 0 && !isWeekend) {
                  statusType = 'leave';
                  dotColor = '#8b5cf6';
                } else if (day.absent > 0 && !isWeekend) {
                  statusType = 'absent';
                  dotColor = '#ef4444';
                }

                const isMatchingHover = hoveredLegendStatus && statusType === hoveredLegendStatus;
                const isDimmed = hoveredLegendStatus && statusType !== hoveredLegendStatus;

                let textColor = isWeekend ? 'text-slate-400 dark:text-[#557367]' : 'text-slate-700 dark:text-slate-300';
                if (isMatchingHover) {
                  if (statusType === 'present') textColor = 'text-emerald-600 dark:text-emerald-400 font-black scale-110';
                  else if (statusType === 'halfDay') textColor = 'text-blue-600 dark:text-blue-400 font-black scale-110';
                  else if (statusType === 'leave') textColor = 'text-purple-600 dark:text-purple-400 font-black scale-110';
                  else if (statusType === 'absent') textColor = 'text-red-600 dark:text-red-400 font-black scale-110';
                }

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => handleDateChange(day.dateStr)}
                    className={`group relative h-6 md:h-7 rounded-lg p-0.5 flex flex-col items-center justify-center transition-all cursor-pointer text-[10px] bg-transparent ${textColor} ${
                      isDimmed ? 'opacity-25' : 'opacity-100'
                    } ${
                      isSelected
                        ? 'ring-2 ring-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 font-black shadow-xs'
                        : isToday
                        ? 'font-black text-emerald-600 dark:text-emerald-400'
                        : ''
                    }`}
                  >
                    <span className="leading-none text-[11px] font-bold">{day.day}</span>
                    {dotColor && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-transform ${isMatchingHover ? 'scale-150 ring-2 ring-white dark:ring-slate-900' : ''}`}
                        style={{ backgroundColor: dotColor }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Legend with Month Counts & Status Filter */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#133029] flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-[#829e92] flex-wrap gap-1 select-none">
              <div
                onMouseEnter={() => setHoveredLegendStatus('present')}
                onMouseLeave={() => setHoveredLegendStatus(null)}
                className={`flex items-center gap-1 cursor-pointer transition-all px-1 py-0.5 rounded-md ${
                  hoveredLegendStatus === 'present' ? 'bg-emerald-50 dark:bg-emerald-950/50 font-bold scale-105' : 'hover:opacity-80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Present</span>
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 ml-0.5">
                  {calendarMonthTotals.present}
                </span>
              </div>

              <div
                onMouseEnter={() => setHoveredLegendStatus('halfDay')}
                onMouseLeave={() => setHoveredLegendStatus(null)}
                className={`flex items-center gap-1 cursor-pointer transition-all px-1 py-0.5 rounded-md ${
                  hoveredLegendStatus === 'halfDay' ? 'bg-blue-50 dark:bg-blue-950/50 font-bold scale-105' : 'hover:opacity-80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span>Half Day</span>
                <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 ml-0.5">
                  {calendarMonthTotals.halfDay}
                </span>
              </div>

              <div
                onMouseEnter={() => setHoveredLegendStatus('leave')}
                onMouseLeave={() => setHoveredLegendStatus(null)}
                className={`flex items-center gap-1 cursor-pointer transition-all px-1 py-0.5 rounded-md ${
                  hoveredLegendStatus === 'leave' ? 'bg-purple-50 dark:bg-purple-950/50 font-bold scale-105' : 'hover:opacity-80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <span>Leave</span>
                <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 ml-0.5">
                  {calendarMonthTotals.leave}
                </span>
              </div>

              <div
                onMouseEnter={() => setHoveredLegendStatus('absent')}
                onMouseLeave={() => setHoveredLegendStatus(null)}
                className={`flex items-center gap-1 cursor-pointer transition-all px-1 py-0.5 rounded-md ${
                  hoveredLegendStatus === 'absent' ? 'bg-red-50 dark:bg-red-950/50 font-bold scale-105' : 'hover:opacity-80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span>Absent</span>
                <span className="text-[9px] font-black text-red-600 dark:text-red-400 ml-0.5">
                  {calendarMonthTotals.absent}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── LIVE PREVIEW ATTENDANCE PROGRESS BARS ── */}
      <AttendanceProgressBars
        todaySeconds={dayActiveSeconds}
        todayTargetHours={8.5}
        weeklySeconds={weeklyStats.workedSecs}
        weeklyTargetHours={42.5}
        isLive={isRunning}
        isRunning={isRunning}
        sessionStatus={selectedDayStatus}
        hasActiveSession={isRunning || isPaused}
        idleSeconds={dayIdleSeconds}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {/* ── DAILY ACTIVITY TABLE (Accurately reflects selected date) ── */}
      <Card className="!p-4 my-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <span>DAILY ACTIVITY</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-[#829e92] mt-0.5">
              Chronological log of check-in, pauses, and resumes for {formatDisplayDate(selectedDate)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Replaced ugly native browser date picker with ultra stylish custom date picker */}
            <StylishDatePicker
              value={selectedDate}
              onChange={(val) => handleDateChange(val)}
              placeholder="DD-MM-YYYY"
            />
            <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
              {sessionRows.length} Entries Logged
            </span>
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
              {sessionRows.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-xs text-slate-400 dark:text-[#829e92]">
                    {isWeekendDay
                      ? 'Weekend - Non-working day.'
                      : isLeaveDay
                      ? 'On approved leave for this date.'
                      : isAbsentDay
                      ? 'No daily activity recorded for this date (Absent).'
                      : 'No daily activity recorded for this date.'}
                  </td>
                </tr>
              ) : (
                sessionRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#0d2a22]/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      {row.checkInTime}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-[#133029] text-[11px] font-black text-slate-700 dark:text-slate-200 shadow-xs">
                        {row.noOfPauses}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                        <Play size={11} className="fill-current" />
                        <span>{row.resumeTime}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-bold text-rose-500 dark:text-rose-400">
                        <Pause size={11} className="fill-current" />
                        <span>{row.pauseTime}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {row.totalTime}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-3 mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-[#829e92]">
          <span>Showing {sessionRows.length > 0 ? `1 to ${sessionRows.length}` : 0} of {sessionRows.length} entries</span>
        </div>
      </Card>
    </div>
  );
};

export default EmployeeAttendanceDetailPage;
