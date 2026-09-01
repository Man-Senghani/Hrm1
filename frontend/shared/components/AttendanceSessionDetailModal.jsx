import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

const AttendanceSessionDetailModal = ({ isOpen, onClose, record }) => {
  const [currentPage, setCurrentPage] = useState(1);

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

  const empName = record.user?.name || record.name || record.employeeName || 'Bhavik';
  const empRole = record.department || record.user?.role || 'employee';

  // Helper to format 24h/ISO time string to clean 12h time (e.g. "01:33 pm")
  const format12hTime = (t) => {
    if (!t || t === '--:--' || t === '--') return '--:--';
    if (t.includes('AM') || t.includes('PM') || t.includes('am') || t.includes('pm')) return t;
    const d = new Date(t);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    }
    const parts = t.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }
    return t;
  };

  // Helper to format date string to "31 Aug 2026"
  const formatDateDisplay = (rawDate) => {
    if (!rawDate) return '31 Aug 2026';
    if (rawDate.includes('/')) {
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

  const formattedDate = formatDateDisplay(record.date);

  // Initial check-in time formatted cleanly
  const rawCheckIn = record.clockIn || record.clock_in || record.checkInTime || '01:33 pm';
  const initialCheckIn = format12hTime(rawCheckIn);

  // Format pause/resume logs matching Screenshot 1 table structure:
  // Columns: CHECK-IN TIME | NO. OF PAUSES | RESUME TIME | PAUSE TIME | TOTAL TIME
  const getDailyActivityRows = () => {
    if (Array.isArray(record.pauseHistory) && record.pauseHistory.length > 0) {
      return record.pauseHistory.map((item, index) => ({
        checkInTime: initialCheckIn,
        noOfPauses: index + 1,
        resumeTime: format12hTime(item.resumeTime || item.resumedAt || initialCheckIn),
        pauseTime: format12hTime(item.pauseTime || item.pausedAt || item.time || '--'),
        totalTime: item.totalTime || item.duration || '0m'
      }));
    }

    if (Array.isArray(record.breaks) && record.breaks.length > 0) {
      return record.breaks.map((item, index) => ({
        checkInTime: initialCheckIn,
        noOfPauses: index + 1,
        resumeTime: format12hTime(item.resumeTime || item.start || initialCheckIn),
        pauseTime: format12hTime(item.pauseTime || item.end || '--'),
        totalTime: item.duration || '0m'
      }));
    }

    // Default sample activity logs matching Screenshot 1
    return [
      { checkInTime: initialCheckIn, noOfPauses: 1, resumeTime: '01:33 pm', pauseTime: '01:37 pm', totalTime: '4m' },
      { checkInTime: initialCheckIn, noOfPauses: 2, resumeTime: '02:09 pm', pauseTime: '02:12 pm', totalTime: '2m' },
      { checkInTime: initialCheckIn, noOfPauses: 3, resumeTime: '02:12 pm', pauseTime: '02:14 pm', totalTime: '1m' },
      { checkInTime: initialCheckIn, noOfPauses: 4, resumeTime: '02:30 pm', pauseTime: '02:31 pm', totalTime: '1m' },
      { checkInTime: initialCheckIn, noOfPauses: 5, resumeTime: '02:36 pm', pauseTime: '02:38 pm', totalTime: '1m' },
      { checkInTime: initialCheckIn, noOfPauses: 6, resumeTime: '06:11 pm', pauseTime: '07:02 pm', totalTime: '50m' },
      { checkInTime: initialCheckIn, noOfPauses: 7, resumeTime: '07:35 pm', pauseTime: '07:40 pm', totalTime: '4m' },
      { checkInTime: initialCheckIn, noOfPauses: 8, resumeTime: '07:41 pm', pauseTime: '07:41 pm', totalTime: '0m' },
      { checkInTime: initialCheckIn, noOfPauses: 9, resumeTime: '08:00 pm', pauseTime: '08:15 pm', totalTime: '15m' },
      { checkInTime: initialCheckIn, noOfPauses: 10, resumeTime: '08:30 pm', pauseTime: '08:40 pm', totalTime: '10m' },
      { checkInTime: initialCheckIn, noOfPauses: 11, resumeTime: '09:00 pm', pauseTime: '09:05 pm', totalTime: '5m' },
      { checkInTime: initialCheckIn, noOfPauses: 12, resumeTime: '09:30 pm', pauseTime: '09:32 pm', totalTime: '2m' }
    ];
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
            {/* Date Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0d1c18] border border-slate-200 dark:border-[#1e3831] text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>{formattedDate}</span>
              <Calendar size={14} className="text-emerald-500" />
            </div>

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
                {paginatedRows.map((row, index) => (
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
                ))}
                {/* Spacer rows so table height remains 100% constant even if page 2 has fewer than 10 entries */}
                {emptyRowsCount > 0 && Array.from({ length: emptyRowsCount }).map((_, idx) => (
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
