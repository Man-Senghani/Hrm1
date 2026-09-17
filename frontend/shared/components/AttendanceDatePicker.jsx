import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const getLocalYYYYMMDD = (d) => {
  if (!d) return '';
  if (typeof d === 'string') return d.split('T')[0];
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const AttendanceDatePicker = ({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  allowRange = true,
  disableFuture = false,
  triggerClassName = '',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'
  const [selectingField, setSelectingField] = useState('start'); // 'start' | 'end'
  const [hoverDate, setHoverDate] = useState(null);
  const [rangeNotice, setRangeNotice] = useState('');
  const dropdownRef = useRef(null);

  const pad = (n) => String(n).padStart(2, '0');

  const parseDateStr = (str) => {
    if (!str || typeof str !== 'string') return null;
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    return null;
  };

  // Parse current value (single 'YYYY-MM-DD' or range 'start:end')
  const { startDateStr, endDateStr } = useMemo(() => {
    if (!value) return { startDateStr: '', endDateStr: '' };
    if (typeof value === 'string' && value.includes(':')) {
      const [s, e] = value.split(':');
      return { startDateStr: s, endDateStr: e };
    }
    return { startDateStr: value, endDateStr: '' };
  }, [value]);

  const todayStr = useMemo(() => getLocalYYYYMMDD(new Date()), []);
  const todayDate = useMemo(() => new Date(), []);
  const currentYear = todayDate.getFullYear();
  const currentMonthNumber = todayDate.getMonth();

  // Internal draft states for From / To selection inside popover
  const [draftStart, setDraftStart] = useState(startDateStr || '');
  const [draftEnd, setDraftEnd] = useState(endDateStr || '');

  const [viewDate, setViewDate] = useState(() => {
    if (startDateStr) {
      const parsed = parseDateStr(startDateStr);
      if (parsed) return parsed;
    }
    return new Date();
  });

  // Keep draft in sync when value changes or when opened
  useEffect(() => {
    if (startDateStr) {
      setDraftStart(startDateStr);
      setDraftEnd(endDateStr || '');
      const parsed = parseDateStr(startDateStr);
      if (parsed) setViewDate(parsed);
    } else {
      setDraftStart('');
      setDraftEnd('');
    }
  }, [startDateStr, endDateStr, isOpen]);

  // Click outside to apply draft and close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        if (draftStart && draftEnd) {
          if (draftStart === draftEnd) {
            onChange(draftStart);
          } else {
            onChange(`${draftStart}:${draftEnd}`);
          }
        } else if (draftStart) {
          onChange(draftStart);
        }
        setIsOpen(false);
        setViewMode('days');
        setHoverDate(null);
        setRangeNotice('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, draftStart, draftEnd, onChange]);

  const formatDateDisplay = (dStr) => {
    const d = parseDateStr(dStr);
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const yr = d.getFullYear();
    return `${day}/${month}/${yr}`;
  };

  const formattedDisplay = useMemo(() => {
    if (!value) return '';
    if (typeof value === 'string' && value.includes(':')) {
      const [s, e] = value.split(':');
      if (!e || s === e) return formatDateDisplay(s);
      return `${formatDateDisplay(s)} - ${formatDateDisplay(e)}`;
    }
    return formatDateDisplay(value);
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start (0=Mo, 6=Su)

  const isCurrentOrFutureMonth = disableFuture && (year > currentYear || (year === currentYear && month >= currentMonthNumber));

  const monthNamesFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearList = Array.from({ length: 30 }, (_, idx) => currentYear - 20 + idx);

  // Selected range duration
  const selectedDaysCount = useMemo(() => {
    if (!draftStart) return 0;
    if (!draftEnd || draftStart === draftEnd) return 1;
    const d1 = parseDateStr(draftStart);
    const d2 = parseDateStr(draftEnd);
    if (!d1 || !d2) return 1;
    return Math.abs(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))) + 1;
  }, [draftStart, draftEnd]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMode === 'years') {
      setViewDate(new Date(year - 12, month, 1));
    } else {
      setViewDate(new Date(year, month - 1, 1));
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (isCurrentOrFutureMonth) return;
    if (viewMode === 'years') {
      const targetYear = Math.min(year + 12, disableFuture ? currentYear : year + 12);
      setViewDate(new Date(targetYear, month, 1));
    } else {
      setViewDate(new Date(year, month + 1, 1));
    }
  };

  const handleDateSelect = (day) => {
    const clickedStr = `${year}-${pad(month + 1)}-${pad(day)}`;

    if (disableFuture && clickedStr > todayStr) {
      return;
    }

    if (!allowRange) {
      setDraftStart(clickedStr);
      setDraftEnd('');
      onChange(clickedStr);
      setIsOpen(false);
      return;
    }

    if (selectingField === 'start') {
      setDraftStart(clickedStr);
      if (draftEnd && draftEnd < clickedStr) {
        setDraftEnd('');
      }
      setSelectingField('end');
    } else {
      let s = draftStart;
      let e = clickedStr;

      if (!s) {
        setDraftStart(clickedStr);
        setSelectingField('end');
        return;
      }

      if (e < s) {
        setDraftStart(e);
        setDraftEnd('');
        setSelectingField('end');
        return;
      }

      const d1 = parseDateStr(s);
      const d2 = parseDateStr(e);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 30) {
        const maxDate = new Date(d1.getTime() + 29 * 24 * 60 * 60 * 1000);
        let cappedStr = getLocalYYYYMMDD(maxDate);
        if (disableFuture && cappedStr > todayStr) {
          cappedStr = todayStr;
        }
        e = cappedStr;
        setRangeNotice('Max range is 30 days. Auto-adjusted to 30 days.');
        setTimeout(() => setRangeNotice(''), 3000);
      }

      setDraftEnd(e);
      setSelectingField('start');
    }
  };

  const handleApply = (e) => {
    e?.stopPropagation();
    if (draftStart && draftEnd) {
      if (draftStart === draftEnd) {
        onChange(draftStart);
      } else {
        onChange(`${draftStart}:${draftEnd}`);
      }
    } else if (draftStart) {
      onChange(draftStart);
    }
    setIsOpen(false);
    setViewMode('days');
    setHoverDate(null);
    setRangeNotice('');
  };

  const handleSetToday = (e) => {
    e?.stopPropagation();
    setDraftStart(todayStr);
    setDraftEnd(todayStr);
    setViewDate(new Date());
    onChange(todayStr);
    setIsOpen(false);
    setViewMode('days');
    setHoverDate(null);
    setRangeNotice('');
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    setDraftStart('');
    setDraftEnd('');
    onChange('');
    setIsOpen(false);
    setViewMode('days');
    setHoverDate(null);
    setRangeNotice('');
  };

  const defaultTriggerClass = "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-700 dark:text-white hover:border-emerald-500/50 hover:bg-slate-100/80 dark:hover:bg-[#133029] transition-all cursor-pointer shadow-xs select-none group";

  const alignClass = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div className="relative inline-block w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          setViewMode('days');
          setHoverDate(null);
          setRangeNotice('');
          setSelectingField('start');
        }}
        className={triggerClassName || defaultTriggerClass}
      >
        <span className={formattedDisplay ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-400 dark:text-[#829e92]'}>
          {formattedDisplay || placeholder}
        </span>
        <Calendar size={15} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${alignClass} top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-3rem)] bg-white dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none`}
        >
          {/* FROM / TO Custom Date Selectors */}
          {allowRange ? (
            <div className="mb-2.5">
              <div className="flex items-center gap-2">
                {/* FROM BOX */}
                <button
                  type="button"
                  onClick={() => setSelectingField('start')}
                  className={`flex-1 px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                    selectingField === 'start'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50 dark:bg-[#12382e] border-slate-200 dark:border-[#1e483c] hover:border-slate-300 dark:hover:border-[#2a5a4c]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#829e92] shrink-0">
                      FROM
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {draftStart ? formatDateDisplay(draftStart) : 'Select date'}
                    </span>
                  </div>
                  {selectingField === 'start' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </button>

                <span className="text-slate-400 dark:text-slate-500 font-bold text-xs shrink-0">→</span>

                {/* TO BOX */}
                <button
                  type="button"
                  onClick={() => setSelectingField('end')}
                  className={`flex-1 px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                    selectingField === 'end'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50 dark:bg-[#12382e] border-slate-200 dark:border-[#1e483c] hover:border-slate-300 dark:hover:border-[#2a5a4c]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#829e92] shrink-0">
                      TO
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {draftEnd ? formatDateDisplay(draftEnd) : 'Select date'}
                    </span>
                  </div>
                  {selectingField === 'end' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </button>
              </div>

              {/* Range Duration & Max 30 Days indicator */}
              <div className="flex items-center justify-between px-1 mt-2 text-[11px]">
                <span className="text-slate-500 dark:text-[#829e92] font-semibold">
                  {selectedDaysCount > 1 ? `${selectedDaysCount} days selected` : '1 day selected'}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
                  Max 30 days
                </span>
              </div>
            </div>
          ) : (
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#12382e] border border-slate-200 dark:border-[#1e483c] mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#829e92]">
                SELECTED DATE
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                {draftStart ? formatDateDisplay(draftStart) : 'Select date'}
              </span>
            </div>
          )}

          {/* Range Selection Notification Banner */}
          {rangeNotice && (
            <div className="text-[10px] font-semibold text-center py-1 px-2 mb-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
              {rangeNotice}
            </div>
          )}

          {/* Header Controls (Month & Year) */}
          <div className="flex items-center justify-between gap-1 mb-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5 font-extrabold text-slate-800 dark:text-white text-xs">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                  viewMode === 'months'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#12382e] hover:bg-emerald-50 dark:hover:bg-[#174438] text-slate-800 dark:text-white border-slate-200 dark:border-[#1e483c]'
                }`}
              >
                <span>{monthNamesFull[month]}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${viewMode === 'months' ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                  viewMode === 'years'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#12382e] hover:bg-emerald-50 dark:hover:bg-[#174438] text-slate-800 dark:text-white border-slate-200 dark:border-[#1e483c]'
                }`}
              >
                <span>{year}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${viewMode === 'years' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              disabled={isCurrentOrFutureMonth}
              onClick={handleNextMonth}
              className={`p-1.5 rounded-lg transition-colors ${
                isCurrentOrFutureMonth
                  ? 'opacity-25 cursor-not-allowed text-slate-300 dark:text-slate-600'
                  : 'hover:bg-slate-100 dark:hover:bg-[#133029] text-slate-600 dark:text-slate-300 cursor-pointer'
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* VIEW MODE: MONTHS GRID */}
          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2 animate-in fade-in duration-150">
              {monthNamesShort.map((m, idx) => {
                const isSelected = month === idx;
                const isFutureMonth = disableFuture && year === currentYear && idx > currentMonthNumber;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isFutureMonth}
                    onClick={() => {
                      if (!isFutureMonth) {
                        setViewDate(new Date(year, idx, 1));
                        setViewMode('days');
                      }
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                      isFutureMonth
                        ? 'opacity-25 cursor-not-allowed text-slate-300 dark:text-slate-600 bg-slate-50/50 dark:bg-[#12382e]/50'
                        : isSelected
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105 cursor-pointer'
                        : 'bg-slate-50 dark:bg-[#12382e] hover:bg-emerald-50 dark:hover:bg-[#174438] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-[#1e483c] cursor-pointer'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW MODE: YEARS GRID */}
          {viewMode === 'years' && (
            <div className="grid grid-cols-4 gap-1.5 py-2 max-h-48 overflow-y-auto pr-1 animate-in fade-in duration-150 custom-scrollbar">
              {yearList.map((y) => {
                const isSelected = year === y;
                const isFutureYear = disableFuture && y > currentYear;
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={isFutureYear}
                    onClick={() => {
                      if (!isFutureYear) {
                        setViewDate(new Date(y, month, 1));
                        setViewMode('days');
                      }
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                      isFutureYear
                        ? 'opacity-25 cursor-not-allowed text-slate-300 dark:text-slate-600 bg-slate-50/50 dark:bg-[#12382e]/50'
                        : isSelected
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105 cursor-pointer'
                        : 'bg-slate-50 dark:bg-[#12382e] hover:bg-emerald-50 dark:hover:bg-[#174438] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-[#1e483c] cursor-pointer'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW MODE: DAYS CALENDAR GRID */}
          {viewMode === 'days' && (
            <>
              {/* Weekday Names Header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((dayName, idx) => (
                  <span
                    key={dayName}
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      idx === 6 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-[#829e92]'
                    }`}
                  >
                    {dayName}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: startDay }).map((_, idx) => (
                  <span key={`blank-${idx}`} className="h-7 w-7" />
                ))}

                {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                  const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
                  const isToday = todayStr === dateStr;
                  const isFuture = disableFuture && dateStr > todayStr;

                  let isStart = draftStart === dateStr;
                  let isEnd = draftEnd === dateStr;
                  let isInRange = false;

                  if (draftStart && draftEnd) {
                    let s = draftStart;
                    let e = draftEnd;
                    if (s > e) [s, e] = [e, s];
                    if (dateStr > s && dateStr < e) {
                      isInRange = true;
                    }
                  }

                  if (selectingField === 'end' && draftStart && hoverDate && !isFuture) {
                    let s = draftStart;
                    let h = hoverDate;
                    if (s > h) [s, h] = [h, s];
                    if (dateStr > s && dateStr <= h) {
                      isInRange = true;
                      if (dateStr === hoverDate) isEnd = true;
                    }
                  }

                  return (
                    <button
                      type="button"
                      key={d}
                      disabled={isFuture}
                      onClick={() => !isFuture && handleDateSelect(d)}
                      onMouseEnter={() => !isFuture && selectingField === 'end' && setHoverDate(dateStr)}
                      className={`h-7 w-7 text-xs font-bold flex items-center justify-center transition-all ${
                        isFuture
                          ? 'text-slate-300 dark:text-slate-600/40 cursor-not-allowed opacity-30 hover:bg-transparent select-none'
                          : isStart || isEnd
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105 rounded-lg z-10 cursor-pointer'
                          : isInRange
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold rounded-none cursor-pointer'
                          : isToday
                          ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50/50 dark:bg-emerald-500/10 rounded-lg cursor-pointer'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#133029] rounded-lg cursor-pointer'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-[#133029]">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer px-1 py-0.5"
                >
                  Clear
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetToday}
                    className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#133029] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={handleApply}
                    className="text-[11px] font-extrabold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceDatePicker;
