import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LeavePolicyOverview = ({ refreshTrigger }) => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/leave-policies', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPolicies(res.data || []);
      } catch (err) {
        console.error('Failed to fetch policies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, refreshTrigger]);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full transition-all duration-200 hover:border-indigo-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Policy Overview</h2>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Policy Name</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Days</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Carry Forward</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Policy Rules & Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">Loading policies...</td></tr>
            ) : policies.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">No leave policies defined.</td></tr>
            ) : (
              (() => {
                const getCatKey = (p) => {
                  const str = `${p?.type || ''} ${p?.name || ''}`.toLowerCase();
                  if (str.includes('casual') || str.includes('cl') || str.trim() === 'cl') return 'casual';
                  if (str.includes('sick') || str.includes('sl') || str.trim() === 'sl') return 'sick';
                  if (str.includes('earned') || str.includes('el') || str.trim() === 'el') return 'earned';
                  if (str.includes('comp') || str.includes('co') || str.trim() === 'co') return 'compoff';
                  if (str.includes('maternity')) return 'maternity';
                  if (str.includes('paternity')) return 'paternity';
                  return str.trim();
                };
                const uniqueMap = new Map();
                policies
                  .filter(p => !(`${p.type || ''} ${p.name || ''}`).toLowerCase().includes('maternity'))
                  .forEach(p => {
                    const key = getCatKey(p);
                    if (!uniqueMap.has(key)) uniqueMap.set(key, p);
                  });
                return Array.from(uniqueMap.values()).map((policy) => (
                  <tr key={policy._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-4 font-bold text-gray-900 dark:text-white text-xs whitespace-nowrap">{policy.name}</td>
                    <td className="px-4 py-4 text-xs font-black text-gray-900 dark:text-white text-center tabular-nums">{policy.annualAllowance || 0}</td>
                    <td className="px-4 py-4 text-xs font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">
                      {policy.carryForwardLimit > 0 ? `Yes (Max: ${policy.carryForwardLimit})` : 'No'}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">{policy.description || 'Standard company leave policy guidelines apply.'}</td>
                  </tr>
                ));
              })()
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeavePolicyOverview;
