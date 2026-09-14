import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, CheckCircle2, Clock, AlertCircle, PauseCircle } from 'lucide-react';

export const STATUS_CONFIG = {
  'Completed': {
    label: 'Completed',
    Icon: CheckCircle2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    hoverBg: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40'
  },
  'In Progress': {
    label: 'In Progress',
    Icon: Clock,
    iconColor: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800/60',
    hoverBg: 'hover:bg-blue-50/80 dark:hover:bg-blue-950/40'
  },
  'Pending': {
    label: 'Pending',
    Icon: AlertCircle,
    iconColor: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    hoverBg: 'hover:bg-amber-50/80 dark:hover:bg-amber-950/40'
  },
  'On Hold': {
    label: 'On Hold',
    Icon: PauseCircle,
    iconColor: 'text-rose-500 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/50',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-200 dark:border-rose-800/60',
    hoverBg: 'hover:bg-rose-50/80 dark:hover:bg-rose-950/40'
  }
};

export const STATUS_OPTIONS = ['Completed', 'In Progress', 'Pending', 'On Hold'];

const StatusSelect = ({
  value = 'Completed',
  onChange,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentStatus = STATUS_CONFIG[value] || STATUS_CONFIG['Completed'];
  const CurrentIcon = currentStatus.Icon;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-[38px] px-3 py-2 rounded-xl bg-white dark:bg-[#162722] border transition-all flex items-center justify-between cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/15 shadow-sm'
            : 'border-slate-200 dark:border-[#1a2d29] hover:border-slate-300 dark:hover:border-[#263e38]'
        } ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${currentStatus.bgColor}`}>
            <CurrentIcon size={13} className={`${currentStatus.iconColor} shrink-0`} strokeWidth={2.5} />
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {currentStatus.label}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-[9999] left-0 right-0 mt-1.5 p-1.5 bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-0.5 select-none"
        >
          {STATUS_OPTIONS.map((st) => {
            const conf = STATUS_CONFIG[st];
            const OptionIcon = conf.Icon;
            const isSelected = value === st;

            return (
              <button
                key={st}
                type="button"
                onClick={() => {
                  onChange?.(st);
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer text-left ${
                  isSelected
                    ? `${conf.bgColor} ${conf.textColor} shadow-2xs border ${conf.borderColor}`
                    : `text-slate-700 dark:text-slate-200 ${conf.hoverBg}`
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${conf.bgColor} border ${conf.borderColor}`}>
                    <OptionIcon
                      size={13}
                      className={`${conf.iconColor} shrink-0`}
                      strokeWidth={2.5}
                    />
                  </span>
                  <span className={`truncate ${isSelected ? conf.textColor : 'text-slate-800 dark:text-slate-200'}`}>
                    {conf.label}
                  </span>
                </div>
                {isSelected && (
                  <Check size={14} className={`${conf.iconColor} shrink-0`} strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StatusSelect;
