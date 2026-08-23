import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock } from 'lucide-react';

const ViewUpcomingLeavesDrawer = ({ isOpen, onClose, leaves }) => {
  if (!isOpen) return null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400';
      case 'pending': return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400';
      case 'rejected': return 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400';
      default: return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  const upcomingLeaves = (leaves || [])
    .filter(l => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return new Date(l.startDate) >= now && (l.status === 'approved' || l.status === 'pending');
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pl-8 pr-6 py-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-250 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Leaves</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          <div className="overflow-y-auto flex-1 pr-1 space-y-3">
            {upcomingLeaves.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-medium text-xs">No upcoming leaves found.</div>
            ) : (
              upcomingLeaves.map((l, idx) => {
                const startDate = new Date(l.startDate);
                const endDate = new Date(l.endDate);
                
                return (
                  <div key={idx} className="flex gap-4 p-3 border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 hover:border-indigo-500 transition-colors">
                    <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-lg p-2.5 flex flex-col items-center justify-center min-w-[65px] shrink-0">
                      <span className="text-[9px] font-bold uppercase">{startDate.toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-base font-black leading-none my-0.5">{startDate.getDate()}</span>
                      <span className="text-[8px] font-semibold uppercase">{startDate.toLocaleString('default', { weekday: 'short' })}</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-gray-950 dark:text-white text-xs capitalize">{l.leaveType} Leave</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1"><span className="font-semibold">Reason:</span> {l.reason || 'N/A'}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">Until: {endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-800/50">
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{l.totalDays} Day(s)</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(l.status)} capitalize`}>{l.status}</span>
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

export default ViewUpcomingLeavesDrawer;
