import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({
  options = [],
  value,
  onChange,
  name,
  placeholder = 'Select option...',
  className = '',
  iconMap = {},
  disabled = false,
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find(
    (opt) => (typeof opt === 'object' && opt !== null ? opt.value === value : opt === value)
  );

  const getOptionLabel = (opt) => {
    if (typeof opt === 'object' && opt !== null) return opt.label ?? opt.value ?? '';
    return opt ?? '';
  };
  const getOptionValue = (opt) => {
    if (typeof opt === 'object' && opt !== null) return opt.value;
    return opt;
  };

  const displayLabel = (selectedOption !== undefined && selectedOption !== null)
    ? getOptionLabel(selectedOption)
    : placeholder;

  const handleSelect = (optVal) => {
    if (disabled) return;
    if (name) {
      onChange({ target: { name, value: optVal } });
    } else {
      onChange(optVal);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#1a1714] border ${
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : isOpen
            ? 'border-[#00a76b] ring-1 ring-[#00a76b]'
            : 'border-slate-200 dark:border-[#38352e] hover:border-[#00a76b]'
        } text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between transition-all select-none focus:outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-[#14120f]' : 'cursor-pointer'
        } ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          {iconMap[value] && (
            <span className="shrink-0">{iconMap[value]}</span>
          )}
          <span className={`truncate ${!selectedOption && value !== '' ? 'text-slate-400' : ''}`}>
            {displayLabel}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 dark:text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#00a76b]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] left-0 right-0 mt-1.5 p-1.5 bg-white dark:bg-[#181612] border border-slate-200 dark:border-[#38352e] rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 space-y-1">
          {options.map((opt, idx) => {
            const optVal = getOptionValue(opt);
            const optLbl = getOptionLabel(opt);
            const isSelected = value === optVal;

            return (
              <button
                key={`${optVal}-${idx}`}
                type="button"
                onClick={() => handleSelect(optVal)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-[#00a76b] dark:text-emerald-400 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#25201b]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {iconMap[optVal] && (
                    <span className="shrink-0">{iconMap[optVal]}</span>
                  )}
                  <span className="truncate">{optLbl}</span>
                </div>
                {isSelected && (
                  <Check size={14} className="text-[#00a76b] dark:text-emerald-400 shrink-0" />
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
