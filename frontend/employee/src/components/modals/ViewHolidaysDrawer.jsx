import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Calendar } from 'lucide-react';

const ViewHolidaysDrawer = ({ isOpen, onClose, holidays: initialHolidays }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    if (!isOpen) return;

    const processHolidays = (data) => {
      console.log('ViewHolidaysDrawer processHolidays input:', data);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      const res = (data || [])
        .filter(h => {
          if (!h || !h.date || h.isActive === false) return false;
          const hDate = new Date(h.date);
          return !isNaN(hDate.getTime()) && hDate >= now;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 15); // Max 15 holidays
      console.log('ViewHolidaysDrawer processHolidays output:', res);
      return res;
    };

    if (initialHolidays && initialHolidays.length > 0) {
      console.log('ViewHolidaysDrawer using initialHolidays prop:', initialHolidays);
      setHolidays(processHolidays(initialHolidays));
      setLoading(false);
      return;
    }

    const fetchHolidays = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/holidays', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHolidays(processHolidays(res.data));
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, [isOpen, token, initialHolidays]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pl-8 pr-6 py-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-250 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Holidays</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          <div className="overflow-y-auto flex-1 pr-1 space-y-2">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading holidays...</div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-medium text-xs">No upcoming holidays scheduled.</div>
            ) : (
              holidays.map((h, idx) => {
                const hDate = new Date(h.date);
                const dateStr = hDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const dayStr = hDate.toLocaleDateString('en-GB', { weekday: 'long' });
                
                return (
                  <div key={idx} className="flex items-center justify-between p-2 px-3 border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 hover:border-indigo-500 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-950 dark:text-white text-xs">{dateStr}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">{dayStr}</p>
                      </div>
                    </div>
                    <div className="font-bold text-xs text-gray-700 dark:text-gray-300 text-right max-w-[150px] break-words">
                      {h.name || h.title || 'Holiday'}
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

export default ViewHolidaysDrawer;
