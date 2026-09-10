import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import axios from 'axios';
import CustomDatePicker from './CustomDatePicker';

const ITEMS_PER_PAGE = 10;

const AttendanceSessionDetailModal = ({ isOpen, onClose, record }) => {
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
    if (record) {
      setActiveRecord(record);
      const dateStr = parseToYYYYMMDD(record.date);
      setSelectedDate(dateStr);
      setCurrentPage(1);

      // If initial record has no sessions array, fetch it immediately from daily endpoint
      const userId = record.user?._id || record.user?.id || (typeof record.user === 'string' ? record.user : null) || record.userId;
      if (userId && (!Array.isArray(record.sessions) || record.sessions.length === 0)) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        axios.get(`/api/time/daily/${userId}/${dateStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(dailyRes => {
          if (dailyRes.data && (dailyRes.data.sessions || dailyRes.data.pauseEvents)) {
            setActiveRecord(prev => ({
              ...(prev || record),
              sessions: dailyRes.data.sessions || dailyRes.data.pauseEvents || [],
              startTime: dailyRes.data.startTime || prev?.startTime || record.startTime || record.checkInTime
            }));
          }
        }).catch(() => {});
      }
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

  if (!isOpen || !record) return null;

  const currentRecord = activeRecord || record;
  const empName = currentRecord.user?.name || currentRecord.name || currentRecord.employeeName || 'Employee';
  const empRole = currentRecord.department || currentRecord.user?.role || 'employee';

  // Helper to format minutes cleanly
  const formatMinutes = (seconds) => {
    const totalSecs = parseInt(seconds) || 0;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Fetch activity log for selected date
  const handleDateChange = async (newDateStr) => {
    if (!newDateStr) return;
    // Reject future dates if typed manually
    if (newDateStr > todayStr) {
      return;
    }

    setSelectedDate(newDateStr);
    setCurrentPage(1);

    try {
      setIsLoading(true);
      const userId = record.user?._id || record.user?.id || (typeof record.user === 'string' ? record.user : null) || record.userId;
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await axios.get(`/api/attendance?date=${newDateStr}${userId ? `&userId=${userId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const resData = response.data?.attendance || response.data?.logs || response.data || [];
      let match = Array.isArray(resData) 
        ? resData.find(r => {
            const rDate = r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : r.date) : '';
            const rUserId = r.user?._id || r.user?.id || (typeof r.user === 'string' ? r.user : null);
            return rDate === newDateStr && (!userId || String(rUserId) === String(userId));
          })
        : (resData.date === newDateStr ? resData : null);

      // If attendance record doesn't have sessions, fetch from daily endpoint
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
            } else {
              match = {
                date: newDateStr,
                user: record.user,
                name: record.name,
                employeeName: record.employeeName,
                department: record.department,
                checkInTime: dailyRes.data.startTime,
                startTime: dailyRes.data.startTime,
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

  // Helper to format date string to "31 Aug 2026"
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

  const formattedDate = formatDateDisplay(selectedDate || currentRecord.date);

  // Initial check-in time formatted cleanly
  const rawCheckIn = currentRecord.startTime || currentRecord.clockIn || currentRecord.clock_in || currentRecord.checkInTime || '--:--';
  const initialCheckIn = format12hTime(rawCheckIn);

  // Format pause/resume logs matching table structure:
  // Columns: CHECK-IN TIME | NO. OF PAUSES | RESUME TIME | PAUSE TIME | TOTAL TIME
  const getDailyActivityRows = () => {
    // 1. Primary: TimeTrack sessions array
    if (Array.isArray(currentRecord.sessions) && currentRecord.sessions.length > 0) {
      const cleanSessions = currentRecord.sessions.filter((sess, index, self) => {
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

        // Ignore instant zero-duration segments (<= 5 seconds)
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
            const diffSecs = Math.max(0, Math.floor((new Date(pauseOrEnd).getTime() - new Date(startOrResume).getTime()) / 1000));
            totalStr = formatMinutes(diffSecs);
          } else if (isLastSession) {
            const isToday = parseToYYYYMMDD(currentRecord.date) === todayStr;

            if (isToday && (currentRecord.status === 'active' || currentRecord.isRunning)) {
              pauseStr = 'Running...';
              const diffSecs = Math.max(0, Math.floor((Date.now() - new Date(startOrResume).getTime()) / 1000));
              totalStr = formatMinutes(diffSecs);
            } else {
              const effectiveEnd = currentRecord.idleStart || currentRecord.endTime || currentRecord.checkOutTime || currentRecord.updatedAt || Date.now();
              pauseStr = format12hTime(effectiveEnd);
              const diffSecs = Math.max(0, Math.floor((new Date(effectiveEnd).getTime() - new Date(startOrResume).getTime()) / 1000));
              totalStr = formatMinutes(diffSecs);
            }
          }

          rows.push({
            checkInTime: initialCheckIn,
            noOfPauses: idx + 1,
            resumeTime: resumeStr,
            pauseTime: pauseStr,
            totalTime: totalStr
          });
        }
      });

      if (rows.length > 0) return rows;
    }

    // 2. Fallback: pauseHistory
    if (Array.isArray(currentRecord.pauseHistory) && currentRecord.pauseHistory.length > 0) {
      return currentRecord.pauseHistory.map((item, index) => ({
        checkInTime: initialCheckIn,
        noOfPauses: index + 1,
        resumeTime: format12hTime(item.resumeTime || item.resumedAt || initialCheckIn),
        pauseTime: format12hTime(item.pauseTime || item.pausedAt || item.time || '--'),
        totalTime: item.totalTime || item.duration || '0m'
      }));
    }

    // 3. Fallback: breaks
    if (Array.isArray(currentRecord.breaks) && currentRecord.breaks.length > 0) {
      return currentRecord.breaks.map((item, index) => ({
        checkInTime: initialCheckIn,
        noOfPauses: index + 1,
        resumeTime: format12hTime(item.resumeTime || item.start || initialCheckIn),
        pauseTime: format12hTime(item.pauseTime || item.end || '--'),
        totalTime: item.duration || '0m'
      }));
    }

    return [];
  };

  const rawRows = getDailyActivityRows();

  // Show latest entries on top (reverse order so newest entry appears at the top)
  const sortedRows = [...rawRows].reverse();

  // Pagination (10 entries per page)
  const totalPages = Math.ceil(sortedRows.length / ITEMS_PER_PAGE) || 1;
  const paginatedRows = sortedRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const emptyRowsCount = ITEMS_PER_PAGE - paginatedRows.length;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn cursor-pointer"
    >
      {/* Modal Container with reduced crisp border radius (rounded-2xl) and fixed height */}
      <div
        className="bg-white dark:bg-[#11241f] border border-slate-200 dark:border-[#1e3831] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col min-h-[580px] max-h-[90vh] animate-scaleUp cursor-default"
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
                <span className="text-xs text-slate-400 font-bold">({empName} - {empRole})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Custom Interactive Date Picker - RESTRICTED TO PAST DATES & TODAY ONLY */}
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

        {/* Modal Body / Table Content (Padding 0 so table touches edges full width) */}
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
                  <tr key={index} className="h-[41px] hover:bg-slate-50/60 dark:hover:bg-[#0d1c18]/60 transition-colors">
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
                {/* Spacer rows so table height remains 100% constant even if page 2 has fewer than 10 entries */}
                {sortedRows.length > 0 && emptyRowsCount > 0 && Array.from({ length: emptyRowsCount }).map((_, idx) => (
                  <tr key={`empty-${idx}`} className="h-[41px]">
                    <td colSpan={5} className="py-2.5 px-6">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer with Pagination Controls */}
        <div className="p-4 border-t border-slate-200/80 dark:border-[#1e3831] bg-slate-50/50 dark:bg-[#0d1c18] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedRows.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedRows.length)} of {sortedRows.length} entries
          </div>

          <div className="flex items-center gap-3">
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
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
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a332c] border border-slate-200 dark:border-[#1e3831] hover:bg-slate-100 dark:hover:bg-[#23443b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
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
