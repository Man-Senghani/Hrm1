import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const CustomDatePicker = ({ name, value, onChange, maxDate, className, placeholder, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  // Parse initial date carefully
  const getInitialDate = () => {
    if (value) {
      const [y, m, d] = value.split('-');
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const [currentMonth, setCurrentMonth] = useState(getInitialDate());
  const wrapperRef = useRef(null);

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
    onChange({ target: { name, value: dateString } });
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
        className={`${className} flex items-center cursor-pointer select-none`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <Calendar size={14} className="absolute left-3 text-[#939084]" />
        <div className="pl-8 pr-2 w-full text-left truncate">
          {displayValue ? (
            <span className="text-[#201515] dark:text-white whitespace-nowrap">{displayValue}</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 whitespace-nowrap">{placeholder}</span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-50 mt-2 p-4 bg-white border border-[#eceae3] rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] w-72 ${align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'}`}>
          <div className="flex justify-between items-center mb-3.5">
            <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-[#eceae3] rounded-full transition-colors cursor-pointer">
              <ChevronLeft size={16} className="text-[#201515]" />
            </button>
            <div className="flex items-center gap-1 font-bold text-[#201515] text-sm tracking-wide">
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className="bg-transparent outline-none cursor-pointer hover:text-[#ff4f00] transition-colors text-center px-1 font-bold text-[#201515] text-sm"
                >
                  {monthNames[month]}
                </button>
                {isMonthDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsMonthDropdownOpen(false)}></div>
                    <div className="absolute z-[101] left-1/2 -translate-x-1/2 mt-2 w-28 bg-white dark:bg-[#1e293b] border border-[#eceae3] dark:border-gray-700 rounded-xl shadow-2xl py-1 max-h-48 overflow-y-auto">
                      {monthNames.map((m, i) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setCurrentMonth(new Date(year, i, 1));
                            setIsMonthDropdownOpen(false);
                          }}
                          className={`w-full text-center py-1.5 text-xs font-semibold hover:bg-orange-50 dark:hover:bg-gray-850 transition-colors cursor-pointer block ${month === i ? 'text-[#ff4f00] font-black' : 'text-[#201515] dark:text-gray-300'}`}
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
                  className="bg-transparent outline-none cursor-pointer hover:text-[#ff4f00] transition-colors text-center px-1 font-bold text-[#201515] text-sm"
                >
                  {year}
                </button>
                {isYearDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsYearDropdownOpen(false)}></div>
                    <div className="absolute z-[101] left-1/2 -translate-x-1/2 mt-2 w-24 bg-white dark:bg-[#1e293b] border border-[#eceae3] dark:border-gray-700 rounded-xl shadow-2xl py-1 max-h-40 overflow-y-auto">
                      {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - 20 + i).map(y => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            setCurrentMonth(new Date(y, month, 1));
                            setIsYearDropdownOpen(false);
                          }}
                          className={`w-full text-center py-1.5 text-xs font-semibold hover:bg-orange-50 dark:hover:bg-gray-850 transition-colors cursor-pointer block ${year === y ? 'text-[#ff4f00] font-black' : 'text-[#201515] dark:text-gray-300'}`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-[#eceae3] rounded-full transition-colors cursor-pointer">
              <ChevronRight size={16} className="text-[#201515]" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-[#939084] uppercase tracking-wider">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1.5 gap-x-0.5">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-8 w-8"></div>;

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
                    e.stopPropagation();
                    if (!isDisabled) handleDateSelect(day);
                  }}
                  disabled={isDisabled}
                  className={`
                    h-8 w-8 flex mx-auto items-center justify-center rounded-full text-xs font-semibold transition-all
                    ${isDisabled ? 'text-[#c5c0b1] opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSelected ? 'bg-[#ff4f00] text-white shadow-lg shadow-[#ff4f00]/30 scale-105' : ''}
                    ${!isSelected && !isDisabled ? 'hover:bg-[#fffdf9] hover:border hover:border-[#ff4f00] text-[#201515]' : ''}
                    ${isToday && !isSelected ? 'border border-[#ff4f00]/30 text-[#ff4f00]' : ''}
                  `}
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
