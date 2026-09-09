import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X, Search, Plus } from 'lucide-react';

const MultiProjectSelect = ({
  options = [],
  value = [], // Array of selected project strings e.g. ['HRMS', 'Aupanishad']
  onChange,   // (newSelectedArray: string[]) => void
  placeholder = 'Select or type project(s)...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize value to array
  const selectedList = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.trim()
    ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const toggleProject = (projectName) => {
    const trimmed = (projectName || '').trim();
    if (!trimmed) return;

    if (selectedList.includes(trimmed)) {
      const next = selectedList.filter((p) => p !== trimmed);
      onChange(next);
    } else {
      const next = [...selectedList, trimmed];
      onChange(next);
    }
  };

  const removeProject = (projectName) => {
    const next = selectedList.filter((p) => p !== projectName);
    onChange(next);
  };

  const handleCustomAdd = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (!selectedList.includes(trimmed)) {
      onChange([...selectedList, trimmed]);
    }
    setQuery('');
  };

  // Filter available options
  const sanitizedOptions = options
    .map((opt) => (typeof opt === 'object' ? opt.value || opt.label : opt))
    .filter(Boolean)
    .filter((opt) => opt !== 'Other');

  const filteredOptions = sanitizedOptions.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  const isExactMatch = sanitizedOptions.some(
    (opt) => opt.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* ── TRIGGER BOX (Selected Chips + Toggle) ── */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className={`min-h-[42px] w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] text-xs text-slate-900 dark:text-white flex items-center justify-between gap-2 cursor-pointer select-none transition-colors hover:border-emerald-500 focus-within:border-emerald-500 ${className}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 py-0.5">
          {selectedList.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              {placeholder}
            </span>
          ) : (
            selectedList.map((proj) => (
              <span
                key={proj}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-bold shadow-2xs transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <span className="truncate max-w-[140px]">{proj}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProject(proj);
                  }}
                  className="p-0.5 rounded-md hover:bg-emerald-200/70 dark:hover:bg-emerald-800/80 text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-100 transition-colors cursor-pointer"
                  title={`Remove ${proj}`}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400 dark:text-slate-500">
          {selectedList.length > 1 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {selectedList.length}
            </span>
          )}
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-500' : ''
            }`}
          />
        </div>
      </div>

      {/* ── DROPDOWN POPOVER ── */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-[9999] left-0 right-0 mt-1.5 bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 flex flex-col space-y-2 select-none"
        >
          {/* Quick Search & Custom Project Add Bar */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29]">
            <Search size={14} className="text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search or type custom project..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomAdd();
                }
              }}
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
            {query.trim() && !isExactMatch && (
              <button
                type="button"
                onClick={handleCustomAdd}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>Add</span>
              </button>
            )}
          </div>

          {/* Project Options List */}
          <div className="max-h-52 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {filteredOptions.map((opt) => {
              const isSelected = selectedList.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleProject(opt)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-extrabold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#111c18]'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && (
                    <Check
                      size={14}
                      className="text-emerald-600 dark:text-emerald-400 shrink-0 font-bold"
                    />
                  )}
                </button>
              );
            })}

            {/* If query entered is new and doesn't match existing */}
            {query.trim() && !isExactMatch && (
              <button
                type="button"
                onClick={handleCustomAdd}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus size={14} className="shrink-0" />
                <span className="truncate">Add "{query.trim()}"</span>
              </button>
            )}

            {filteredOptions.length === 0 && !query.trim() && (
              <div className="py-4 text-center text-slate-400 dark:text-slate-500 text-xs">
                No projects found
              </div>
            )}
          </div>

          {/* Popover Action Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#1a2d29] flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {selectedList.length === 0
                ? 'No project selected'
                : `${selectedList.length} selected`}
            </span>

            <div className="flex items-center gap-2">
              {selectedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer px-1 py-0.5"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                }}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiProjectSelect;
