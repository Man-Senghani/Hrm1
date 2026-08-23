import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const UpcomingLeavesDrawer = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Mock list of upcoming leaves (next 7 days)
  const upcomingLeaves = [
    {
      id: 'emp1',
      name: 'Amit Sharma',
      role: 'Fullstack Developer',
      email: 'amit@example.com',
      leaveType: 'casual',
      startDate: '14 Aug 2026',
      endDate: '16 Aug 2026',
      totalDays: 2,
      reason: 'Attending family function'
    },
    {
      id: 'emp2',
      name: 'Karan Johar',
      role: 'Product Manager',
      email: 'karan@example.com',
      leaveType: 'earned',
      startDate: '18 Aug 2026',
      endDate: '20 Aug 2026',
      totalDays: 3,
      reason: 'Personal travel & vacation'
    }
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm pl-8 pr-6 py-6 bg-white dark:bg-[#1e293b] shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Leaves</h2>
            <p className="text-xs text-gray-500 mt-0.5">Approved leaves for the next 7 days</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="overflow-y-auto pr-1 flex-1 space-y-2.5 pb-2">
            {upcomingLeaves.map((emp) => (
              <div key={emp.id} className="border border-gray-150 dark:border-gray-800 rounded-xl p-2.5 px-3 flex flex-col gap-1.5 bg-gray-50 dark:bg-[#0f172a]/50">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100 shadow-sm shrink-0">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-gray-900 dark:text-white truncate">{emp.name}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate">{emp.role}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                    emp.leaveType === 'sick' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                    emp.leaveType === 'casual' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' :
                    'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                  }`}>
                    {emp.leaveType}
                  </span>
                </div>

                <div className="space-y-0.5 text-[11px] text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-400">Duration:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{emp.startDate} - {emp.endDate} ({emp.totalDays} days)</span>
                  </div>
                  <div className="text-[10.5px] text-gray-650 dark:text-gray-400 italic">
                    "{emp.reason}"
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs transition-colors w-full cursor-pointer">
              Close Panel
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default UpcomingLeavesDrawer;
