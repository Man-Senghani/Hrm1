import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Calendar, AlertTriangle, Search } from 'lucide-react';

const CompanyShutdownsDrawer = ({ isOpen, onClose }) => {
  const [shutdowns, setShutdowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/hr-dashboard/company-shutdowns', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success) {
          setShutdowns(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch shutdowns:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, token]);

  if (!isOpen) return null;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const filtered = shutdowns.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.reason?.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm pl-8 pr-6 py-6 bg-white dark:bg-[#1e293b] shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800 animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Company Shutdown Days</h2>
            <p className="text-xs text-gray-500 mt-0.5">All scheduled company shutdowns</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-xl px-3 py-2">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shutdowns..."
              className="flex-1 bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none placeholder-gray-400"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="overflow-y-auto pr-1 flex-1 space-y-2.5 pb-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400">Loading shutdowns...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Calendar size={28} className="text-gray-300" />
                <p className="text-xs font-bold text-gray-400">No shutdowns found.</p>
              </div>
            ) : (
              filtered.map((sd) => (
                <div
                  key={sd._id}
                  className="border border-gray-150 dark:border-gray-800 rounded-xl p-2.5 px-3 flex flex-col gap-1.5 bg-gray-50 dark:bg-[#0f172a]/50"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-50 to-orange-50 text-rose-600 flex items-center justify-center font-bold text-xs border border-rose-100 shadow-sm shrink-0">
                        <AlertTriangle size={13} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-gray-900 dark:text-white truncate">{sd.name}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate">
                          {formatDate(sd.startDate)} – {formatDate(sd.endDate)}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
                      {sd.days} day{sd.days !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[11px] text-gray-700 dark:text-gray-300">
                    {sd.reason && (
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-400">Reason:</span>
                        <span className="font-bold text-gray-900 dark:text-white text-right max-w-[65%]">{sd.reason}</span>
                      </div>
                    )}
                    {sd.applicableTo && (
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-400">Applicable To:</span>
                        <span className="font-bold text-gray-900 dark:text-white text-right max-w-[65%]">
                          {Array.isArray(sd.applicableTo) ? sd.applicableTo.join(', ') : sd.applicableTo}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs transition-colors w-full cursor-pointer"
            >
              Close Panel
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default CompanyShutdownsDrawer;
