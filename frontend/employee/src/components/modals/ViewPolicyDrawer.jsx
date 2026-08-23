import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X } from 'lucide-react';

const ViewPolicyDrawer = ({ isOpen, onClose }) => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    if (!isOpen) return;
    const fetchPolicies = async () => {
      try {
        setLoading(true);
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
    fetchPolicies();
  }, [isOpen, token]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pl-8 pr-6 py-6 relative shadow-2xl flex flex-col justify-between border-l border-gray-250 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Company Leave Policies</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          <div className="overflow-y-auto flex-1 pr-1 space-y-4">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading policy details...</div>
            ) : policies.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No leave policies found.</div>
            ) : (
              policies.map((policy) => (
                <div key={policy._id} className="p-4 border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 hover:border-indigo-500 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white capitalize text-sm">{policy.name}</h3>
                    <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                      {policy.type}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{policy.description || 'No description provided.'}</p>
                  
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase">Annual Allowance</span>
                      <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums">{policy.annualAllowance} Days</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase">Carry Forward Limit</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {policy.carryForwardLimit > 0 ? `${policy.carryForwardLimit} Days` : 'Not Allowed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
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

export default ViewPolicyDrawer;
