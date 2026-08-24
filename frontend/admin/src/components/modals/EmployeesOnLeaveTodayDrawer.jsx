import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Users } from 'lucide-react';
import axios from 'axios';

const EmployeesOnLeaveTodayDrawer = ({ isOpen, onClose }) => {
  const [employeesOnLeave, setEmployeesOnLeave] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchLeavesToday = async () => {
        setLoading(true);
        try {
          const res = await axios.get('/api/leaves/on-leave-today', {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          setEmployeesOnLeave(res.data || []);
        } catch (error) {
          console.error('Failed to fetch employees on leave today', error);
          setEmployeesOnLeave([]);
        } finally {
          setLoading(false);
        }
      };
      fetchLeavesToday();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm pl-8 pr-6 py-6 bg-white dark:bg-[#1e293b] shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">On Leave Today</h2>
            <p className="text-xs text-gray-500 mt-0.5">List of active team leaves for today</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-semibold">Loading leaves...</span>
            </div>
          ) : employeesOnLeave.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <Users className="w-10 h-10 mb-2 opacity-30 text-emerald-500" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No Employees on Leave Today</p>
              <p className="text-xs text-gray-400 mt-1">All active team members are present or working today.</p>
            </div>
          ) : (
            <div className="overflow-y-auto pr-1 flex-1 space-y-2.5 pb-2">
              {employeesOnLeave.map((emp) => (
                <div key={emp.id} className="border border-gray-150 dark:border-gray-800 rounded-xl p-2.5 px-3 flex flex-col gap-1.5 bg-gray-50 dark:bg-[#0f172a]/50">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100 shadow-sm shrink-0">
                        {emp.name ? emp.name.charAt(0).toUpperCase() : 'E'}
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
                      <span className="font-bold text-gray-900 dark:text-white">{emp.startDate} - {emp.endDate} ({emp.totalDays} {emp.totalDays === 1 ? 'day' : 'days'})</span>
                    </div>
                    <div className="text-[10.5px] text-gray-650 dark:text-gray-400 italic">
                      "{emp.reason}"
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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

export default EmployeesOnLeaveTodayDrawer;
