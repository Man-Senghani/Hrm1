import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';

const AttendanceReconciliation = () => {
  const [deptData, setDeptData] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/hr-dashboard/attendance-reconciliation', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success) {
          setDeptData(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch reconciliation:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const totalEmployees = deptData.reduce((acc, curr) => acc + curr.total, 0);
  const totalReconciled = deptData.reduce((acc, curr) => acc + curr.reconciled, 0);
  const totalPending = deptData.reduce((acc, curr) => acc + curr.pending, 0);
  
  const reconciledPercent = totalEmployees > 0 ? ((totalReconciled / totalEmployees) * 100).toFixed(1) : 0;
  const pendingPercent = totalEmployees > 0 ? ((totalPending / totalEmployees) * 100).toFixed(1) : 0;

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Attendance Reconciliation</h2>
        <button className="text-xs font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300">
          This Month ▼
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Employees</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{totalEmployees.toLocaleString()}</span>
        </div>
        <div className="flex-1 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Reconciled</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{totalReconciled.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-gray-400">({reconciledPercent}%)</span>
          </div>
        </div>
        <div className="flex-1 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Pending</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{totalPending.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-gray-400">({pendingPercent}%)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Total Employees</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Reconciled</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Pending</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">Loading reconciliation data...</td></tr>
            ) : deptData.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">No reconciliation data available.</td></tr>
            ) : (
              deptData.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                  <td className="px-2 py-3 font-bold text-gray-900 dark:text-white text-xs">{row.dept}</td>
                  <td className="px-2 py-3 text-xs font-black text-gray-700 dark:text-gray-300 tabular-nums text-center">{row.total}</td>
                  <td className="px-2 py-3 text-xs font-black text-gray-700 dark:text-gray-300 tabular-nums text-center">{row.reconciled}</td>
                  <td className="px-2 py-3 text-xs font-black text-gray-700 dark:text-gray-300 tabular-nums text-center">{row.pending}</td>
                  <td className="px-2 py-3 text-center">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${row.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button className="mt-6 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all w-max">
        View Reconciliation Report <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default AttendanceReconciliation;
