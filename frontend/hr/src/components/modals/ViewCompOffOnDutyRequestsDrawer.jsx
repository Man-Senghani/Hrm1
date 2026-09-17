import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check, HandCoins, Calendar } from 'lucide-react';

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

const ViewCompOffOnDutyRequestsDrawer = ({ isOpen, onClose, compOffs = [], onDutys = [] }) => {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  if (!isOpen) return null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400';
      case 'pending':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400';
      case 'rejected':
        return 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
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

  // Combine Comp-Off and On-Duty requests into a unified normalized array
  const formattedCompOffs = (compOffs || []).map((item) => ({
    ...item,
    requestCategory: 'comp-off',
    effectiveDate: item.dateWorked || item.startDate || item.createdAt,
  }));

  const formattedOnDutys = (onDutys || []).map((item) => ({
    ...item,
    requestCategory: 'on-duty',
    effectiveDate: item.startDate || item.createdAt,
  }));

  const combinedRequests = [...formattedCompOffs, ...formattedOnDutys];

  const filteredRequests = combinedRequests.filter((req) => {
    if (selectedMonth !== 'all') {
      const d = new Date(req.effectiveDate || req.createdAt);
      if (d.getMonth() !== parseInt(selectedMonth, 10)) return false;
    }
    if (selectedStatus !== 'all') {
      if (req.status?.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    }
    return true;
  });

  const sortedRequests = filteredRequests.sort(
    (a, b) => new Date(b.effectiveDate || b.createdAt) - new Date(a.effectiveDate || a.createdAt)
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pl-8 pr-6 py-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-250 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Comp-Off / On-Duty History</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
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

        {/* List Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="overflow-y-auto flex-1 pr-1 space-y-2">
            {sortedRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-medium text-xs">
                No requests found for selected filters.
              </div>
            ) : (
              sortedRequests.map((req, idx) => {
                const isCompOff = req.requestCategory === 'comp-off';
                const startDateStr = req.dateWorked || req.startDate;
                const endDateStr = req.endDate;
                const sDate = startDateStr ? new Date(startDateStr) : null;
                const eDate = endDateStr ? new Date(endDateStr) : null;

                return (
                  <div
                    key={req._id || idx}
                    className="p-3 border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 hover:border-[#00a76b] transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${
                          isCompOff
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50'
                        }`}
                      >
                        {isCompOff ? <HandCoins size={11} /> : <Calendar size={11} />}
                        {isCompOff ? 'Comp-Off' : 'On-Duty'}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <p>
                        <span className="font-semibold text-gray-400">Duration:</span>{' '}
                        {isCompOff ? (
                          <span>
                            {sDate ? sDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}{' '}
                            ({req.isFullDay !== false ? 'Full Day' : `Half Day${req.fromTime && req.toTime ? ` ${req.fromTime} - ${req.toTime}` : ''}`})
                          </span>
                        ) : (
                          <span>
                            {sDate ? sDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                            {eDate && sDate && sDate.getTime() !== eDate.getTime()
                              ? ` to ${eDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : ''}{' '}
                            ({req.isFullDay !== false ? 'Full Day' : `Half Day${req.fromTime && req.toTime ? ` ${req.fromTime} - ${req.toTime}` : ''}`})
                          </span>
                        )}
                      </p>
                      <div className="flex justify-between items-end">
                        <p className="line-clamp-2 pr-2">
                          <span className="font-semibold text-gray-400">Reason:</span> {req.reason || 'N/A'}
                        </p>
                        <p className="text-[9px] text-gray-400 shrink-0 pb-0.5 font-medium">
                          Applied:{' '}
                          {req.createdAt
                            ? new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs transition-colors cursor-pointer text-center"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ViewCompOffOnDutyRequestsDrawer;
