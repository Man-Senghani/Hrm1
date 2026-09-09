import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const CustomDatePicker = ({ name, value, onChange, minDate, maxDate, isDateDisabled, className = '', placeholder = 'Select Date', align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'

  // Parse initial date carefully
  const getInitialDate = () => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return new Date();
  };

  const [currentMonth, setCurrentMonth] = useState(getInitialDate());
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setCurrentMonth(new Date(parts[0], parts[1] - 1, parts[2]));
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewMode === 'years') {
      setCurrentMonth(new Date(currentMonth.getFullYear() - 12, currentMonth.getMonth(), 1));
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewMode === 'years') {
      setCurrentMonth(new Date(currentMonth.getFullYear() + 12, currentMonth.getMonth(), 1));
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    }
  };

  const pad = (n) => n.toString().padStart(2, '0');

  const handleDateSelect = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${pad(currentMonth.getMonth() + 1)}-${pad(day)}`;
    if (minDate && dateString < minDate) return;
    if (maxDate && dateString > maxDate) return;
    if (isDateDisabled && isDateDisabled(dateString)) return;
    if (typeof onChange === 'function') {
      onChange({ target: { name, value: dateString } });
    }
    setIsOpen(false);
    setViewMode('days');
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = startDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const displayValue = value ? value.split('-').reverse().join('-') : '';
  const todayString = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  // Generate list of 24 years centered around current year
  const currentYear = new Date().getFullYear();
  const yearList = Array.from({ length: 30 }, (_, i) => currentYear - 15 + i);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] text-xs flex items-center justify-between cursor-pointer select-none transition-all hover:border-emerald-500 hover:shadow-xs ${className}`}
        onClick={() => {
          setIsOpen(!isOpen);
          setViewMode('days');
        }}
        tabIndex={0}
      >
        <span className={displayValue ? "font-bold text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}>
          {displayValue || placeholder}
        </span>
        <Calendar size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div
          className={`absolute z-[99999] mt-2 p-4 bg-white dark:bg-[#142621] border border-slate-200/90 dark:border-[#1e3831] rounded-2xl shadow-2xl w-72 transition-all animate-scaleUp ${
            align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Row */}
          <div className="flex justify-between items-center mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#1a332c] rounded-xl transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-xs tracking-wide">
              {/* Month Selector Badge */}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                  viewMode === 'months'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#0d1c18] hover:bg-emerald-50/80 dark:hover:bg-[#1b332b] text-slate-800 dark:text-slate-100 border-slate-200/80 dark:border-[#1e3831]'
                }`}
              >
                <span>{monthNamesFull[month]}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${viewMode === 'months' ? 'rotate-180' : ''}`} />
              </button>

              {/* Year Selector Badge */}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                  viewMode === 'years'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#0d1c18] hover:bg-emerald-50/80 dark:hover:bg-[#1b332b] text-slate-800 dark:text-slate-100 border-slate-200/80 dark:border-[#1e3831]'
                }`}
              >
                <span>{year}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${viewMode === 'years' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#1a332c] rounded-xl transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* VIEW MODE: MONTHS GRID */}
          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2 animate-fadeIn">
              {monthNamesShort.map((m, idx) => {
                const isSelected = month === idx;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCurrentMonth(new Date(year, idx, 1));
                      setViewMode('days');
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105'
                        : 'bg-slate-50 dark:bg-[#0d1c18] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-[#1e3831]'
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
            <div className="grid grid-cols-4 gap-1.5 py-2 max-h-48 overflow-y-auto pr-1 animate-fadeIn custom-scrollbar">
              {yearList.map((y) => {
                const isSelected = year === y;
                const isDisabled = (maxDate && `${y}-01-01` > maxDate) || (minDate && `${y}-12-31` < minDate);
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setCurrentMonth(new Date(y, month, 1));
                      setViewMode('days');
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105'
                        : isDisabled
                        ? 'opacity-30 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-[#0d1c18]'
                        : 'bg-slate-50 dark:bg-[#0d1c18] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-[#1e3831]'
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
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="h-8 w-8"></div>;

                  const dateString = `${year}-${pad(month + 1)}-${pad(day)}`;
                  const isSelected = value === dateString;
                  const isToday = todayString === dateString;
                  const isCustomDisabled = isDateDisabled ? isDateDisabled(dateString) : false;
                  const isDisabled = (maxDate && dateString > maxDate) || (minDate && dateString < minDate) || isCustomDisabled;

                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        if (isDisabled) return;
                        handleDateSelect(day);
                      }}
                      disabled={isDisabled}
                      title={isCustomDisabled ? 'Max 2 reports already submitted for this date' : isDisabled ? 'Date not allowed' : ''}
                      className={`h-8 w-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer relative ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105'
                          : isToday
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                          : isDisabled
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-35 line-through'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a332c]'
                      }`}
                    >
                      {day}
                      {isCustomDisabled && (
                        <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
