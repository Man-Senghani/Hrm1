import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Edit2 } from 'lucide-react';
import ViewHolidaysDrawer from './modals/ViewHolidaysDrawer';

const HolidayManagement = ({ refreshTrigger }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/holidays?all=true', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHolidays(res.data || []);
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, refreshTrigger]);

  const handleImportGoogleHolidays = async () => {
    try {
      setLoading(true);
      const res = await axios.post('/api/holidays/bulk-import', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(res.data?.message || 'Holidays imported successfully!');

      const updatedRes = await axios.get('/api/holidays?all=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHolidays(updatedRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to import holidays.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHolidayActive = async (holiday, newValue) => {
    try {
      await axios.put(`/api/holidays/${holiday._id}`, {
        isActive: newValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Holiday status updated successfully');

      const res = await axios.get('/api/holidays?all=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHolidays(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update holiday status');
    }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcomingHolidays = holidays
    .filter(h => {
      if (!h || !h.date) return false;
      const hDate = new Date(h.date);
      return !isNaN(hDate.getTime()) && hDate >= now;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 7);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex flex-col h-full transition-all duration-200 hover:border-pink-500">
      <div className="flex justify-between items-center mb-3.5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Upcoming Holidays</h2>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          View Calendar
        </button>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-wider">Holiday Name</th>
              <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-wider text-center">Type</th>
              <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-wider text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="4" className="text-center py-6 text-gray-450 text-xs font-semibold">Loading holidays...</td></tr>
            ) : upcomingHolidays.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-6 text-gray-450 text-xs font-semibold">No holidays defined.</td></tr>
            ) : (
              upcomingHolidays.map((holiday) => (
                <tr key={holiday._id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative">
                  <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white text-xs">{holiday.name}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {new Date(holiday.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${holiday.type === 'Public' || holiday.type === 'National' || holiday.type === 'public' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600'
                      }`}>
                      {holiday.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center relative">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${holiday.isActive !== false
                          ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800'
                          : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800'
                        }`}>
                        {holiday.isActive !== false ? 'Given' : 'Not Given'}
                      </span>

                      {/* Edit Button - Visible on hover of the row */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === holiday._id ? null : holiday._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Change Status"
                      >
                        <Edit2 size={11} />
                      </button>
                    </div>

                    {/* Edit Dropdown Menu */}
                    {activeDropdownId === holiday._id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)}></div>
                        <div className="absolute right-4 mt-1 w-28 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-1 text-left">
                          <button
                            onClick={() => {
                              handleToggleHolidayActive(holiday, true);
                              setActiveDropdownId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[11px] font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/25 transition-colors"
                          >
                            Given
                          </button>
                          <button
                            onClick={() => {
                              handleToggleHolidayActive(holiday, false);
                              setActiveDropdownId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/25 transition-colors"
                          >
                            Not Given
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ViewHolidaysDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} holidays={holidays} />
    </div>
  );
};

export default HolidayManagement;
