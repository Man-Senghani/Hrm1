import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Timer,
  Coffee,
  Activity,
  Square,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';
import CustomDatePicker from './CustomDatePicker';

const ITEMS_PER_PAGE = 10;

const AttendanceSessionDetailModal = ({
  isOpen,
  onClose,
  record,
  allRecords = [],
  onOpenFullPage
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [activeRecord, setActiveRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // Sync initial record when modal opens or record changes
  useEffect(() => {
    if (record && isOpen) {
      setActiveRecord(record);
      const dateStr = parseToYYYYMMDD(record.date);
      setSelectedDate(dateStr);
      setCurrentPage(1);
      handleDateChange(dateStr);
    }
  }, [record, isOpen]);

  // Close modal when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch activity log for selected date
  const handleDateChange = async (newDateStr) => {
    if (!newDateStr) return;
    if (newDateStr > todayStr) return;

    setSelectedDate(newDateStr);
    setCurrentPage(1);

    try {
      setIsLoading(true);
      const userId =
        record.user?._id ||
        record.user?.id ||
        (typeof record.user === 'string' ? record.user : null) ||
        record.userId;
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      const response = await axios.get(
        `/api/attendance?date=${newDateStr}${userId ? `&userId=${userId}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const resData = response.data?.attendance || response.data?.logs || response.data || [];
      let match = Array.isArray(resData)
        ? resData.find((r) => {
            const rDate = r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : '') : '';
            const rUserId = r.user?._id || r.user?.id || (typeof r.user === 'string' ? r.user : null);
            return rDate === newDateStr && (!userId || String(rUserId) === String(userId));
          })
        : resData.date === newDateStr
        ? resData
        : null;

      if (userId && (!match || !Array.isArray(match.sessions) || match.sessions.length === 0)) {
        try {
          const dailyRes = await axios.get(`/api/time/daily/${userId}/${newDateStr}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (dailyRes.data && (dailyRes.data.sessions || dailyRes.data.pauseEvents)) {
            const fetchedSessions = dailyRes.data.sessions || dailyRes.data.pauseEvents || [];
            if (match) {
              match.sessions = fetchedSessions;
              if (dailyRes.data.startTime) match.startTime = dailyRes.data.startTime;
              if (dailyRes.data.endTime) match.endTime = dailyRes.data.endTime;
              if (dailyRes.data.totalWorkedDuration !== undefined)
                match.totalWorkedDuration = dailyRes.data.totalWorkedDuration;
              if (dailyRes.data.totalPauseDuration !== undefined)
                match.totalPauseDuration = dailyRes.data.totalPauseDuration;
            } else {
              match = {
                date: newDateStr,
                user: record.user,
                name: record.name,
                employeeName: record.employeeName,
                department: record.department,
                checkInTime: dailyRes.data.startTime,
                startTime: dailyRes.data.startTime,
                endTime: dailyRes.data.endTime,
                totalWorkedDuration: dailyRes.data.totalWorkedDuration,
                totalPauseDuration: dailyRes.data.totalPauseDuration,
                sessions: fetchedSessions
              };
            }
          }
        } catch (dailyErr) {}
      }

      if (match) {
        setActiveRecord(match);
      } else {
        setActiveRecord({
          date: newDateStr,
          user: record.user,
          name: record.name,
          employeeName: record.employeeName,
          department: record.department,
          sessions: [],
          pauseHistory: [],
          breaks: []
        });
      }
    } catch (err) {
      console.warn('Could not fetch activity for selected date:', err);
      setActiveRecord({
        date: newDateStr,
        user: record.user,
        name: record.name,
        employeeName: record.employeeName,
        department: record.department,
        sessions: [],
        pauseHistory: [],
        breaks: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format minutes cleanly
  const formatMinutes = (seconds) => {
    const totalSecs = parseInt(seconds) || 0;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Helper to format 24h/ISO time string to clean 12h time (e.g. "01:33 pm")
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
        const m = parts[1];
        const ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
      }
    }
    return t;
  };

  // Helper to format date string
  const formatDateDisplay = (rawDate) => {
    if (!rawDate) return 'Select Date';
    if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        const d = new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    }
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return rawDate;
  };

  if (!isOpen || !record) return null;

  const currentRecord = activeRecord || record;
  const empName = currentRecord.user?.name || currentRecord.name || currentRecord.employeeName || 'Employee';
  const empRole = currentRecord.department || currentRecord.user?.role || 'employee';
  const formattedDate = formatDateDisplay(selectedDate || currentRecord.date);

  // Initial check-in & check-out times
  const rawCheckIn =
    currentRecord.startTime ||
    currentRecord.clockIn ||
    currentRecord.clock_in ||
    currentRecord.checkInTime ||
    '--:--';
  const initialCheckIn = format12hTime(rawCheckIn);
  const defaultCheckIn =
    initialCheckIn && initialCheckIn !== '--:--' && initialCheckIn !== '--' ? initialCheckIn : '--:--';

  const rawCheckOut =
    currentRecord.endTime ||
    currentRecord.clockOut ||
    currentRecord.clock_out ||
    currentRecord.checkOutTime ||
    '--:--';
  const initialCheckOut = format12hTime(rawCheckOut);
  const defaultCheckOut =
    initialCheckOut && initialCheckOut !== '--:--' && initialCheckOut !== '--' ? initialCheckOut : '--:--';

  // Format pause/resume logs matching table structure
  const getDailyActivityRows = () => {
    if (Array.isArray(currentRecord.sessions) && currentRecord.sessions.length > 0) {
      const cleanSessions = currentRecord.sessions.filter((sess, index, self) => {
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
          let durationSecs = 0;

          if (pauseOrEnd) {
            pauseStr = format12hTime(pauseOrEnd);
            durationSecs = Math.max(
              0,
              Math.floor((new Date(pauseOrEnd).getTime() - new Date(startOrResume).getTime()) / 1000)
            );
            totalStr = formatMinutes(durationSecs);
          } else if (isLastSession) {
            const isToday = parseToYYYYMMDD(currentRecord.date) === todayStr;

            if (isToday && (currentRecord.status === 'active' || currentRecord.isRunning)) {
              pauseStr = 'Running...';
              durationSecs = Math.max(0, Math.floor((Date.now() - new Date(startOrResume).getTime()) / 1000));
              totalStr = formatMinutes(durationSecs);
            } else {
              const effectiveEnd =
                currentRecord.idleStart ||
                currentRecord.endTime ||
                currentRecord.checkOutTime ||
                currentRecord.updatedAt ||
                Date.now();
              pauseStr = format12hTime(effectiveEnd);
              durationSecs = Math.max(
                0,
                Math.floor((new Date(effectiveEnd).getTime() - new Date(startOrResume).getTime()) / 1000)
              );
              totalStr = formatMinutes(durationSecs);
            }
          }

          rows.push({
            checkInTime: defaultCheckIn,
            noOfPauses: idx + 1,
            resumeTime: resumeStr,
            pauseTime: pauseStr,
            totalTime: totalStr,
            durationSecs
          });
        }
      });

      if (rows.length > 0) return rows;
    }

    if (Array.isArray(currentRecord.pauseHistory) && currentRecord.pauseHistory.length > 0) {
      return currentRecord.pauseHistory.map((item, index) => ({
        checkInTime: defaultCheckIn,
        noOfPauses: index + 1,
        resumeTime: format12hTime(item.resumeTime || item.resumedAt || defaultCheckIn),
        pauseTime: format12hTime(item.pauseTime || item.pausedAt || item.time || '--'),
        totalTime: item.totalTime || item.duration || '0m',
        durationSecs: typeof item.durationSecs === 'number' ? item.durationSecs : 0
      }));
    }

    if (Array.isArray(currentRecord.breaks) && currentRecord.breaks.length > 0) {
      return currentRecord.breaks.map((item, index) => ({
        checkInTime: defaultCheckIn,
        noOfPauses: index + 1,
        resumeTime: format12hTime(item.resumeTime || item.start || defaultCheckIn),
        pauseTime: format12hTime(item.pauseTime || item.end || '--'),
        totalTime: item.duration || '0m',
        durationSecs: typeof item.durationSecs === 'number' ? item.durationSecs : 0
      }));
    }

    return [];
  };

  const rawRows = getDailyActivityRows();
  const effectiveRows = rawRows;

  const computeSummaryStats = () => {

    let activeSecs = 0;
    let idleSecs = 0;

    if (typeof currentRecord.activeTime === 'number' && currentRecord.activeTime > 0) {
      activeSecs = currentRecord.activeTime;
    } else if (typeof currentRecord.totalWorkedDuration === 'number' && currentRecord.totalWorkedDuration > 0) {
      activeSecs = currentRecord.totalWorkedDuration * 60;
    } else if (typeof currentRecord.workingHours === 'number' && currentRecord.workingHours > 0) {
      activeSecs = Math.round(currentRecord.workingHours * 3600);
    } else if (typeof currentRecord.workHours === 'number' && currentRecord.workHours > 0) {
      activeSecs = Math.round(currentRecord.workHours * 3600);
    }

    if (typeof currentRecord.idleTime === 'number' && currentRecord.idleTime > 0) {
      idleSecs = currentRecord.idleTime;
    } else if (typeof currentRecord.totalPauseDuration === 'number' && currentRecord.totalPauseDuration > 0) {
      idleSecs = currentRecord.totalPauseDuration * 60;
    } else if (typeof currentRecord.inactiveHours === 'number' && currentRecord.inactiveHours > 0) {
      idleSecs = Math.round(currentRecord.inactiveHours * 3600);
    } else if (typeof currentRecord.idleHours === 'number' && currentRecord.idleHours > 0) {
      idleSecs = Math.round(currentRecord.idleHours * 3600);
    }

    if (activeSecs === 0 && rawRows.length > 0) {
      rawRows.forEach((r) => {
        if (r.durationSecs) activeSecs += r.durationSecs;
      });
    }

    let totalSecs = 0;
    if (typeof currentRecord.totalHours === 'number' && currentRecord.totalHours > 0) {
      totalSecs = Math.round(currentRecord.totalHours * 3600);
    } else {
      totalSecs = activeSecs + idleSecs;
    }

    const totalSessions = rawRows.length > 0 ? rawRows.length : activeSecs > 0 ? 1 : 0;

    return {
      activeSecs,
      idleSecs,
      totalSecs,
      formattedActive: formatMinutes(activeSecs),
      formattedIdle: formatMinutes(idleSecs),
      formattedTotal: formatMinutes(totalSecs),
      decimalHours: (totalSecs / 3600).toFixed(2),
      totalSessions
    };
  };

  const summaryStats = computeSummaryStats();

  const sortedRows = rawRows.length > 0 ? [...rawRows].reverse() : [...effectiveRows];
  const totalPages = Math.ceil(sortedRows.length / ITEMS_PER_PAGE) || 1;
  const paginatedRows = sortedRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const emptyRowsCount = ITEMS_PER_PAGE - paginatedRows.length;

  const handleTriggerFullPage = () => {
    if (onOpenFullPage) {
      onOpenFullPage(currentRecord);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn cursor-pointer"
    >
      <div
        className="bg-white dark:bg-[#11241f] border border-slate-200 dark:border-[#1e3831] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col min-h-0 h-auto max-h-[90vh] animate-scaleUp cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-[#1e3831] bg-white dark:bg-[#11241f]">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  DAILY ACTIVITY
                </h3>
                <span className="text-xs text-slate-400 font-bold">
                  ({empName} - {empRole})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenFullPage && (
              <button
                type="button"
                onClick={handleTriggerFullPage}
                title="Open in full page view"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 text-xs font-black transition-all cursor-pointer shadow-xs"
              >
                <ExternalLink size={13} />
                <span>Open Full Page</span>
              </button>
            )}

            {/* Custom Interactive Date Picker */}
            <CustomDatePicker
              name="dailyActivityDate"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              maxDate={todayStr}
              align="right"
              placeholder={formattedDate}
            />

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1a332c] hover:bg-slate-200 dark:hover:bg-[#23443b] text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Metric KPI Strip (The 6 Cards Cleanly Formatted) ── */}
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-[#0d1c18] border-b border-slate-200/80 dark:border-[#1e3831] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Card 1: Check-in Time */}
          <div className="py-2 px-3 rounded-xl bg-white dark:bg-[#11241f] border border-slate-200/80 dark:border-[#1e3831] flex items-center gap-2 shadow-xs group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[9px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Check-In
                </span>
              </div>
              <p className="text-xs sm:text-[13px] font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono whitespace-nowrap">
                {defaultCheckIn}
              </p>
            </div>
          </div>

          {/* Card 2: Check-out Time */}
          <div className="py-2 px-3 rounded-xl bg-white dark:bg-[#11241f] border border-slate-200/80 dark:border-[#1e3831] flex items-center gap-2 shadow-xs group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Square size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-[9px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Check-Out
                </span>
              </div>
              <p className="text-xs sm:text-[13px] font-black text-blue-600 dark:text-blue-400 tracking-tight font-mono whitespace-nowrap">
                {defaultCheckOut}
              </p>
            </div>
          </div>

          {/* Card 3: Working Hours */}
          <div className="py-2 px-3 rounded-xl bg-white dark:bg-[#11241f] border border-slate-200/80 dark:border-[#1e3831] flex items-center gap-2 shadow-xs group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Activity size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <span className="text-[9px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Working
                </span>
              </div>
              <div className="flex items-baseline gap-1 min-w-0">
                <p className="text-xs sm:text-[13px] font-black text-teal-600 dark:text-teal-400 tracking-tight font-mono whitespace-nowrap">
                  {summaryStats.formattedActive}
                </p>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                  / 8h 30m
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Inactivity Hours */}
          <div className="py-2 px-3 rounded-xl bg-white dark:bg-[#11241f] border border-slate-200/80 dark:border-[#1e3831] flex items-center gap-2 shadow-xs group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Coffee size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-[9px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Inactivity
                </span>
              </div>
              <p className="text-xs sm:text-[13px] font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono whitespace-nowrap">
                {summaryStats.formattedIdle}
              </p>
            </div>
          </div>

          {/* Card 5: Total Hours */}
          <div className="py-2 px-3 rounded-xl bg-white dark:bg-[#11241f] border border-slate-200/80 dark:border-[#1e3831] flex items-center gap-2 shadow-xs group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white shadow-xs flex items-center justify-center shrink-0">
              <Clock size={15} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[9px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Total Hours
                </span>
              </div>
              <p className="text-xs sm:text-[13px] font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono whitespace-nowrap">
                {summaryStats.formattedTotal}
              </p>
            </div>
          </div>

          {/* Card 6: Sessions */}
          <div className="py-2 px-3 rounded-xl bg-white dark:bg-[#11241f] border border-slate-200/80 dark:border-[#1e3831] flex items-center gap-2 shadow-xs group min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-500 text-white shadow-xs flex items-center justify-center shrink-0">
              <Timer size={15} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span className="text-[9px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                  Sessions
                </span>
              </div>
              <p className="text-xs sm:text-[13px] font-black text-purple-600 dark:text-purple-400 tracking-tight font-mono whitespace-nowrap">
                {summaryStats.totalSessions} {summaryStats.totalSessions === 1 ? 'Session' : 'Sessions'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body / Table Content */}
        <div className="p-0 overflow-y-auto flex-1 flex flex-col justify-between">
          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f7f6] dark:bg-[#0d1c18] border-b border-slate-200/80 dark:border-[#1e3831] text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-6">CHECK-IN TIME</th>
                  <th className="py-3 px-6 text-center">NO. OF PAUSES</th>
                  <th className="py-3 px-6">RESUME TIME</th>
                  <th className="py-3 px-6">PAUSE TIME</th>
                  <th className="py-3 px-6 text-right">TOTAL TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1e3831] font-medium text-slate-700 dark:text-slate-200">
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400 dark:text-slate-500 font-semibold italic">
                      No daily pause or break activity recorded for this date.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, index) => (
                    <tr
                      key={index}
                      className="h-[41px] hover:bg-slate-50/60 dark:hover:bg-[#0d1c18]/60 transition-colors"
                    >
                      <td className="py-2.5 px-6 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {row.checkInTime}
                      </td>
                      <td className="py-2.5 px-6 text-center font-semibold text-slate-600 dark:text-slate-400">
                        {row.noOfPauses}
                      </td>
                      <td className="py-2.5 px-6 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {row.resumeTime}
                      </td>
                      <td className="py-2.5 px-6 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {row.pauseTime}
                      </td>
                      <td className="py-2.5 px-6 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {row.totalTime}
                      </td>
                    </tr>
                  ))
                )}
                {sortedRows.length > 0 &&
                  emptyRowsCount > 0 &&
                  Array.from({ length: emptyRowsCount }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="h-[41px]">
                      <td colSpan={5} className="py-2.5 px-6">
                        &nbsp;
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer with Pagination Controls */}
        <div className="p-4 border-t border-slate-200/80 dark:border-[#1e3831] bg-slate-50/50 dark:bg-[#0d1c18] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedRows.length)} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, sortedRows.length)} of {sortedRows.length} entries
          </div>

          <div className="flex items-center gap-3">
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a332c] border border-slate-200 dark:border-[#1e3831] hover:bg-slate-100 dark:hover:bg-[#23443b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-[#1a332c] rounded-lg text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a332c] border border-slate-200 dark:border-[#1e3831] hover:bg-slate-100 dark:hover:bg-[#23443b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {onOpenFullPage && (
              <button
                type="button"
                onClick={handleTriggerFullPage}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Open Full Page</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AttendanceSessionDetailModal;
