import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const CustomDatePicker = ({ name, value, onChange, maxDate, className = '', placeholder = 'Select Date', align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

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
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const pad = (n) => n.toString().padStart(2, '0');

  const handleDateSelect = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${pad(currentMonth.getMonth() + 1)}-${pad(day)}`;
    if (maxDate && dateString > maxDate) return;
    if (typeof onChange === 'function') {
      onChange({ target: { name, value: dateString } });
    }
    setIsOpen(false);
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

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const displayValue = value ? value.split('-').reverse().join('-') : '';
  const todayString = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] text-xs flex items-center justify-between cursor-pointer select-none transition-colors hover:border-emerald-500 ${className}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span className={displayValue ? "font-bold text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}>
          {displayValue || placeholder}
        </span>
        <Calendar size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
      </div>

      {isOpen && (
        <div className={`absolute z-[9999] mt-2 p-3.5 bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl shadow-2xl w-64 ${align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'}`}>
          <div className="flex justify-between items-center mb-3">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-[#111c18] rounded-lg transition-colors cursor-pointer text-slate-600 dark:text-slate-300">
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1 font-extrabold text-slate-900 dark:text-white text-xs tracking-wide">
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className="bg-transparent outline-none cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-center px-1 font-bold"
                >
                  {monthNames[month]}
                </button>
                {isMonthDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsMonthDropdownOpen(false)}></div>
                    <div className="absolute z-[101] left-1/2 -translate-x-1/2 mt-2 w-28 bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-xl shadow-2xl py-1 max-h-48 overflow-y-auto">
                      {monthNames.map((m, i) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setCurrentMonth(new Date(year, i, 1));
                            setIsMonthDropdownOpen(false);
                          }}
                          className={`w-full text-center py-1.5 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer block ${month === i ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  className="bg-transparent outline-none cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-center px-1 font-bold"
                >
                  {year}
                </button>
                {isYearDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsYearDropdownOpen(false)}></div>
                    <div className="absolute z-[101] left-1/2 -translate-x-1/2 mt-2 w-24 bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-xl shadow-2xl py-1 max-h-40 overflow-y-auto">
                      {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - 20 + i).map(y => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            setCurrentMonth(new Date(y, month, 1));
                            setIsYearDropdownOpen(false);
                          }}
                          className={`w-full text-center py-1.5 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer block ${year === y ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-[#111c18] rounded-lg transition-colors cursor-pointer text-slate-600 dark:text-slate-300">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-7 w-7"></div>;

              const dateString = `${year}-${pad(month + 1)}-${pad(day)}`;
              const isSelected = value === dateString;
              const isToday = todayString === dateString;
              const isDisabled = maxDate && dateString > maxDate;

              return (
                <button
                  type="button"
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDateSelect(day);
                  }}
                  disabled={isDisabled}
                  className={`h-7 w-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs scale-105'
                      : isToday
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                      : isDisabled
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#111c18]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
