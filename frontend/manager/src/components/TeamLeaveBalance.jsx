import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, X, Search } from 'lucide-react';

const TeamLeaveBalance = () => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isAllDrawerOpen, setIsAllDrawerOpen] = useState(false);
  const [allBalances, setAllBalances] = useState([]);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`/api/leaves/manager/balances?page=${currentPage}&limit=5`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const raw = res.data.data || [];
      const nonAdmin = raw.filter(b => {
        const role = (b.user?.role || b.employeeId?.role || '').toLowerCase();
        return role !== 'admin' && role !== 'hr';
      });
      setBalances(nonAdmin);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.pages);
        setTotalItems(nonAdmin.length || res.data.pagination.total);
      }
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Failed to load leave balances');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBalances = async () => {
    try {
      setDrawerLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`/api/leaves/manager/balances?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const raw = res.data.data || [];
      const nonAdmin = raw.filter(b => {
        const role = (b.user?.role || b.employeeId?.role || '').toLowerCase();
        return role !== 'admin' && role !== 'hr';
      });
      setAllBalances(nonAdmin);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Failed to load full leave balances');
      }
    } finally {
      setDrawerLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [currentPage]);

  const handleOpenDrawer = () => {
    setIsAllDrawerOpen(true);
    fetchAllBalances();
  };

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
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full transition-colors duration-300 hover:!border-emerald-500 dark:hover:!border-emerald-400">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white whitespace-nowrap">Team Leave Balance</h2>
        <button onClick={handleOpenDrawer} className="text-indigo-600 text-xs font-bold hover:underline cursor-pointer border-none bg-transparent">View all &rarr;</button>
      </div>

      <div className="overflow-hidden flex-1">
        <table className="w-full text-left border-collapse">
          <colgroup>
            <col style={{ width: '44%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 text-[10px] uppercase text-center">
              <th className="pb-2 font-bold text-left">Employee</th>
              <th className="pb-2 font-bold" title="Casual Leave">CL</th>
              <th className="pb-2 font-bold" title="Sick Leave">SL</th>
              <th className="pb-2 font-bold" title="Total Balance">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="4" className="py-6 text-center text-gray-500 text-xs">Loading...</td></tr>
            ) : displayBalances.length === 0 ? (
              <tr><td colSpan="4" className="py-6 text-center text-gray-500 text-xs">No balances found.</td></tr>
            ) : (
              displayBalances.map(bal => {
                const empName = bal.user?.name || bal.employeeId?.name || bal.name || 'Team Member';
                let avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=random`;
                const img = bal.user?.profileImage || bal.employeeId?.profileImage;
                if (img) {
                  avatar = img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || ''}${img}`;
                }

                const clUsed = bal.cl ?? bal.usedLeave?.casual ?? 0;
                const slUsed = bal.sl ?? bal.usedLeave?.sick ?? 0;
                const totalUsed = clUsed + slUsed;
                const clAlloc = bal.totalCL ?? bal.casualLeave ?? 1.5;
                const slAlloc = bal.totalSL ?? bal.sickLeave ?? 12;
                const totalAlloc = clAlloc + slAlloc;
                const overallPct = Math.min((totalUsed / (totalAlloc || 1)) * 100, 100);

                return (
                  <tr key={bal._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <td className="py-1.5 text-left pr-2">
                      <div className="flex items-center gap-2">
                        <img src={avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 shadow-sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-gray-900 dark:text-white truncate leading-tight" title={empName}>{empName}</span>
                          <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${overallPct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 text-center text-xs font-medium text-gray-600 dark:text-gray-400">{clUsed}/{clAlloc}</td>
                    <td className="py-1.5 text-center text-xs font-medium text-gray-600 dark:text-gray-400">{slUsed}/{slAlloc}</td>
                    <td className="py-1.5 text-center">{renderProgressBar(totalUsed, totalAlloc)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-auto pt-2 border-t border-gray-150 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
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

      {/* Slide-over Drawer for All Team Leave Balances */}
      {isAllDrawerOpen && (
        <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[999999] overflow-hidden flex justify-end">
          <div
            onClick={() => setIsAllDrawerOpen(false)}
            className="fixed inset-0 top-0 left-0 w-screen h-screen bg-black/50 backdrop-blur-md transition-opacity z-[999999]"
          />
          <div className="fixed top-0 right-0 bottom-0 h-screen z-[1000000] w-full max-w-[400px] bg-white dark:bg-[#161311] shadow-2xl flex flex-col border-l border-gray-200 dark:border-[#28251e]">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 dark:border-[#28251e] flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                All Team Leave Balances ({allBalances.length})
              </h2>
              <button
                onClick={() => setIsAllDrawerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1f1b17] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-6 pt-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search employee by name..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-3 space-y-3 custom-scrollbar">
              {drawerLoading ? (
                <div className="py-12 text-center text-gray-500 text-xs">Loading leave balances...</div>
              ) : (
                allBalances
                  .filter(b => ((b.user?.name || b.employeeId?.name || b.name || '')).toLowerCase().includes(drawerSearch.toLowerCase()))
                  .map(b => {
                    const empName = b.user?.name || b.employeeId?.name || b.name || 'Team Member';
                    let avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=random`;
                    const img = b.user?.profileImage || b.employeeId?.profileImage;
                    if (img) {
                      avatar = img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || ''}${img}`;
                    }
                    const clUsed = b.cl ?? b.usedLeave?.casual ?? 0;
                    const slUsed = b.sl ?? b.usedLeave?.sick ?? 0;
                    const totalUsed = clUsed + slUsed;
                    const clAlloc = b.totalCL ?? b.casualLeave ?? 1.5;
                    const slAlloc = b.totalSL ?? b.sickLeave ?? 12;
                    const totalAlloc = clAlloc + slAlloc;

                    return (
                      <div key={b._id} className="p-4 rounded-2xl border border-gray-100 dark:border-[#28251e] bg-white dark:bg-[#161311] shadow-xs flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm" />
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{empName}</h4>
                              <p className="text-xs text-gray-500">{b.user?.department || b.employeeId?.department || b.employeeId?.designation || b.user?.role || 'Employee'}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full">
                            {totalUsed} / {totalAlloc} Used
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-[#28251e] text-center text-xs">
                          <div className="bg-gray-50 dark:bg-[#1f1b17] p-2 rounded-xl">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase">Casual (CL)</span>
                            <span className="font-bold text-gray-900 dark:text-white">{clUsed}/{clAlloc}</span>
                          </div>
                          <div className="bg-gray-50 dark:bg-[#1f1b17] p-2 rounded-xl">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase">Sick (SL)</span>
                            <span className="font-bold text-gray-900 dark:text-white">{slUsed}/{slAlloc}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-[#28251e] flex justify-end">
              <button
                onClick={() => setIsAllDrawerOpen(false)}
                className="px-6 py-2.5 bg-gray-100 dark:bg-[#25201b] hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaveBalance;
