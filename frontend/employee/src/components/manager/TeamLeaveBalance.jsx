import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TeamLeaveBalance = () => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/leaves/manager/balances?page=${currentPage}&limit=5`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setBalances(res.data.data || []);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.pages);
        setTotalItems(res.data.pagination.total);
      }
    } catch (err) {
      toast.error('Failed to load leave balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [currentPage]);

  const displayBalances = balances || [];
  const displayTotalItems = totalItems || 0;
  const displayTotalPages = totalPages || 1;

  const startEntry = displayTotalItems === 0 ? 0 : (currentPage - 1) * 5 + 1;
  const endEntry = Math.min(currentPage * 5, displayTotalItems);

  const renderProgressBar = (used, total) => {
    return (
      <span className="text-xs font-bold text-gray-900 dark:text-white">{used} / {total}</span>
    );
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full transition-colors duration-300 hover:!border-emerald-500 dark:hover:!border-emerald-400">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Team Leave Balance</h2>
        <button className="text-indigo-600 text-sm font-bold hover:underline cursor-pointer">View all</button>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <colgroup>
            <col style={{ width: '38%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 text-[10px] uppercase text-center">
              <th className="pb-3 font-bold text-left">Employee</th>
              <th className="pb-3 font-bold" title="Casual Leave">CL</th>
              <th className="pb-3 font-bold" title="Sick Leave">SL</th>
              <th className="pb-3 font-bold" title="Earned Leave">EL</th>
              <th className="pb-3 font-bold" title="Comp Off">CO</th>
              <th className="pb-3 font-bold" title="Total Balance">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="6" className="py-8 text-center text-gray-500 text-xs">Loading...</td></tr>
            ) : displayBalances.length === 0 ? (
              <tr><td colSpan="6" className="py-8 text-center text-gray-500 text-xs">No balances found.</td></tr>
            ) : (
              displayBalances.map(bal => {
                const empName = bal.employeeId?.name || 'Unknown';
                let avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=random`;
                if (bal.employeeId?.profileImage) {
                  avatar = bal.employeeId.profileImage.startsWith('http') ? bal.employeeId.profileImage : `${import.meta.env.VITE_API_URL || ''}${bal.employeeId.profileImage}`;
                }

                const totalUsed = bal.usedLeave?.total || 0;
                const totalAlloc = bal.totalLeave || 1;
                const overallPct = Math.min((totalUsed / totalAlloc) * 100, 100);

                return (
                  <tr key={bal._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <td className="py-3.5 text-left pr-2">
                      <div className="flex items-center gap-2">
                        <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-gray-900 dark:text-white truncate" title={empName}>{empName}</span>
                          <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${overallPct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {bal.usedLeave?.casual || 0}/{bal.casualLeave}
                    </td>
                    <td className="py-3.5 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {bal.usedLeave?.sick || 0}/{bal.sickLeave}
                    </td>
                    <td className="py-3.5 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {bal.usedLeave?.earned || 0}/{bal.earnedLeave}
                    </td>
                    <td className="py-3.5 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {bal.usedLeave?.compOff || 0}/{bal.compOff}
                    </td>
                    <td className="py-3.5 text-center whitespace-nowrap">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{totalUsed}/{totalAlloc}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-150 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          {startEntry}-{endEntry} of {displayTotalItems}
        </span>
        <div className="flex gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
          </button>

          {Array.from({ length: displayTotalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-6 h-6 rounded-md text-xs font-bold cursor-pointer ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === displayTotalPages || displayTotalPages === 0}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamLeaveBalance;
