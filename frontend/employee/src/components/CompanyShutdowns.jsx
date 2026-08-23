import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar } from 'lucide-react';
import CompanyShutdownsDrawer from './modals/CompanyShutdownsDrawer';

const CompanyShutdowns = () => {
  const [shutdowns, setShutdowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
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
  }, [token]);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full transition-all duration-200 hover:border-rose-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Company Shutdown Days</h2>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
        >
          View All
        </button>
      </div>

      <div className="overflow-x-auto flex-1 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Shutdown</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Days</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Applicable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">Loading shutdowns...</td></tr>
            ) : shutdowns.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Calendar size={24} className="text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-gray-400">No company shutdowns scheduled.</p>
                  </div>
                </td>
              </tr>
            ) : (
              shutdowns.map((shutdown) => (
                <tr key={shutdown._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-2 py-4 font-bold text-gray-900 dark:text-white text-xs">{shutdown.name}</td>
                  <td className="px-2 py-4 text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {new Date(shutdown.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(shutdown.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-2 py-4 text-xs font-black text-gray-900 dark:text-white text-center tabular-nums">{shutdown.days}</td>
                  <td className="px-2 py-4 text-xs font-medium text-gray-600 dark:text-gray-400">{shutdown.reason}</td>
                  <td className="px-2 py-4 text-xs font-bold text-gray-700 dark:text-gray-300">
                    {Array.isArray(shutdown.applicableTo) ? shutdown.applicableTo.join(', ') : shutdown.applicableTo}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


      <CompanyShutdownsDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};

export default CompanyShutdowns;
