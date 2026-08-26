import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check } from 'lucide-react';

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
      <label className="block text-[10px] font-extrabold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
        {label}
      </label>
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

const ViewLeaveRequestsDrawer = ({ isOpen, onClose, leaves, onSelectLeave }) => {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  if (!isOpen) return null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400';
      case 'pending': return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400';
      case 'rejected': return 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400';
      case 'cancelled': return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
      default: return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

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

  const statusList = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const filteredLeaves = (leaves || []).filter(l => {
    if (selectedMonth !== 'all') {
      const d = new Date(l.startDate || l.createdAt);
      if (d.getMonth() !== parseInt(selectedMonth, 10)) return false;
    }
    if (selectedStatus !== 'all') {
      if (l.status?.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    }
    return true;
  });

  const sortedLeaves = filteredLeaves.sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pl-8 pr-6 py-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-250 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Requests History</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Filter Controls Header */}
        <div className="grid grid-cols-2 gap-2.5 mb-4 shrink-0 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <CustomSelectDropdown
            label="Month"
            value={selectedMonth}
            options={monthsList}
            onChange={setSelectedMonth}
          />
          <CustomSelectDropdown
            label="Status"
            value={selectedStatus}
            options={statusList}
            onChange={setSelectedStatus}
          />
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="overflow-y-auto flex-1 pr-1 space-y-2">
            {sortedLeaves.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-medium text-xs">No leave requests found for selected filters.</div>
            ) : (
              sortedLeaves.map((l, idx) => {
                const startDate = new Date(l.startDate);
                const endDate = new Date(l.endDate);
                
                const utc1 = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const utc2 = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                const exactDays = (!isNaN(utc1) && !isNaN(utc2)) ? Math.max(1, Math.floor((utc2 - utc1) / (1000 * 3600 * 24)) + 1) : (l.totalDays || 1);
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => { if (onSelectLeave) onSelectLeave(l); }}
                    className="p-3 border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 hover:border-indigo-500 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className="font-bold text-gray-950 dark:text-white text-xs capitalize">
                        {l.leaveType ? (l.leaveType.toLowerCase().endsWith('leave') ? l.leaveType : `${l.leaveType} Leave`) : 'Leave'}
                      </h4>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(l.status)} capitalize`}>{l.status}</span>
                    </div>
                    
                    <div className="space-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <p><span className="font-semibold text-gray-400">Duration:</span> {startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} to {endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ({exactDays} {exactDays === 1 ? 'day' : 'days'})</p>
                      <div className="flex justify-between items-end">
                        <p className="line-clamp-2 pr-2"><span className="font-semibold text-gray-400">Reason:</span> {l.reason || 'N/A'}</p>
                        <p className="text-[9px] text-gray-400 shrink-0 pb-0.5 font-medium">Applied: {new Date(l.createdAt || l.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end mt-4">
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs">
            Close Panel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ViewLeaveRequestsDrawer;
