import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  iconMap = {}
}) => {
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

  const selectedOption = options.find(
    (opt) => (typeof opt === 'object' ? opt.value === value : opt === value)
  );

  const getOptionLabel = (opt) => (typeof opt === 'object' ? opt.label : opt);
  const getOptionValue = (opt) => (typeof opt === 'object' ? opt.value : opt);

  const displayLabel = selectedOption ? getOptionLabel(selectedOption) : placeholder;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] text-xs text-slate-900 dark:text-white flex items-center justify-between cursor-pointer select-none transition-colors hover:border-emerald-500 focus:outline-none ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          {iconMap[value] && (
            <span className="shrink-0">{iconMap[value]}</span>
          )}
          <span className="truncate font-semibold">{displayLabel}</span>
        </div>
        <ChevronDown
          size={15}
          className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-500' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] left-0 right-0 mt-1.5 p-1.5 bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl shadow-2xl max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 space-y-1">
          {options.map((opt) => {
            const optVal = getOptionValue(opt);
            const optLbl = getOptionLabel(opt);
            const isSelected = value === optVal;

            return (
              <button
                key={optVal}
                type="button"
                onClick={() => {
                  onChange(optVal);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-extrabold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#111c18]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {iconMap[optVal] && (
                    <span className="shrink-0">{iconMap[optVal]}</span>
                  )}
                  <span className="truncate">{optLbl}</span>
                </div>
                {isSelected && (
                  <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
