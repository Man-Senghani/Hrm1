import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Calendar, ChevronDown, Check } from 'lucide-react';

const CustomSelectDropdown = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-[10px] font-extrabold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between shadow-sm hover:border-[#00a76b] dark:hover:border-[#00a76b] transition-all cursor-pointer group"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ml-1 ${isOpen ? 'rotate-180 text-[#00a76b]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-700/80 rounded-xl shadow-xl z-[10000] py-1 max-h-48 overflow-y-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] dark:text-[#00a76b] font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={13} className="text-[#00a76b] shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ViewHolidaysDrawer = ({ isOpen, onClose, holidays: initialHolidays }) => {
  const [rawHolidays, setRawHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedYear(new Date().getFullYear());

    const fetchHolidays = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/holidays?all=true', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setRawHolidays(res.data);
        } else if (initialHolidays && initialHolidays.length > 0) {
          setRawHolidays(initialHolidays);
        }
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
        if (initialHolidays && initialHolidays.length > 0) {
          setRawHolidays(initialHolidays);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, [isOpen, token, initialHolidays]);

  if (!isOpen) return null;

  const currentYearNum = new Date().getFullYear();
  // Show years up to current year starting from 2026.
  // In 2026: only 2026 is displayed (future years 2027 & 2028 are removed).
  // When year 2027 starts, 2027 will automatically appear in the filter.
  const yearsList = [];
  for (let yr = currentYearNum; yr >= 2026; yr--) {
    yearsList.push({ value: yr, label: String(yr) });
  }
  if (yearsList.length === 0) {
    yearsList.push({ value: currentYearNum, label: String(currentYearNum) });
  }

  const monthsList = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

  const processedHolidays = (rawHolidays || [])
    .filter(h => {
      if (!h || !h.date || h.isActive === false) return false;
      const hDate = new Date(h.date);
      if (isNaN(hDate.getTime())) return false;
      if (hDate.getFullYear() !== Number(selectedYear)) return false;
      if (selectedMonth !== 'all' && hDate.getMonth() !== Number(selectedMonth)) return false;
      return true;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pl-8 pr-6 py-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-250 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
        {/* Title Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Holidays</h2>
            <p className="text-[10px] text-gray-400 font-semibold">{selectedYear} Holiday List</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Filter Controls Header */}
        <div className="grid grid-cols-2 gap-2.5 mb-4 shrink-0 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <CustomSelectDropdown
            label="Year"
            value={selectedYear}
            options={yearsList}
            onChange={(val) => setSelectedYear(Number(val))}
          />
          <CustomSelectDropdown
            label="Month"
            value={selectedMonth}
            options={monthsList}
            onChange={setSelectedMonth}
          />
        </div>

        {/* List Body */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="overflow-y-auto flex-1 pr-1 space-y-2 pb-2">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading holidays...</div>
            ) : processedHolidays.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-medium text-xs">No holidays scheduled for selected filters.</div>
            ) : (
              processedHolidays.map((h, idx) => {
                const hDate = new Date(h.date);
                const dateStr = hDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const dayStr = hDate.toLocaleDateString('en-GB', { weekday: 'long' });
                
                return (
                  <div key={idx} className="flex items-center justify-between p-2.5 px-3 border border-gray-200 dark:border-gray-700/80 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 hover:border-[#00a76b] dark:hover:border-[#00a76b] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] dark:text-[#00a76b] flex items-center justify-center shrink-0 shadow-sm">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-950 dark:text-white text-xs">{dateStr}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">{dayStr}</p>
                      </div>
                    </div>
                    <div className="font-bold text-xs text-gray-700 dark:text-gray-300 text-right max-w-[140px] break-words">
                      {h.name || h.title || 'Holiday'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end mt-4 shrink-0">
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs transition-colors">
            Close Panel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ViewHolidaysDrawer;
