import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';

const ViewLeaveRequestsDrawer = ({ isOpen, onClose, leaves, onSelectLeave }) => {
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

  const sortedLeaves = (leaves || []).sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pl-8 pr-6 py-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-250 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Requests History</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          <div className="overflow-y-auto flex-1 pr-1 space-y-2">
            {sortedLeaves.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-medium text-xs">No leave requests found.</div>
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
