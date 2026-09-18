import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import CreatePolicyModal from './modals/CreatePolicyModal';

const LeavePolicyOverview = ({ refreshTrigger }) => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [policyToEdit, setPolicyToEdit] = useState(null);

  const getAuthToken = () => sessionStorage.getItem('token') || localStorage.getItem('token') || '';

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await axios.get('/api/leave-policies', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPolicies(res.data || []);
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleDeletePolicy = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name || 'this policy'}"?`)) return;
    try {
      const token = getAuthToken();
      await axios.delete(`/api/leave-policies/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success('Policy deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete policy');
    }
  };

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
  const displayPolicies = Array.from(uniqueMap.values());

  const userRole = (sessionStorage.getItem('role') || localStorage.getItem('role') || '').toLowerCase();
  const canManagePolicy = ['admin', 'hr'].includes(userRole);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full transition-all duration-200 hover:border-indigo-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Policy Overview</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Define and manage company-wide leave entitlements and carry-forward rules</p>
        </div>
        {canManagePolicy && (
          <button
            onClick={() => { setPolicyToEdit(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-emerald-500/20 transition-all cursor-pointer border-none shrink-0 group"
          >
            <Plus size={15} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-200" />
            <span>Create Policy</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Policy Name</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Days</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Carry Forward</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Policy Rules & Description</th>
              {canManagePolicy && (
                <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {loading ? (
              <tr><td colSpan={canManagePolicy ? 5 : 4} className="text-center py-8 text-gray-400">Loading policies...</td></tr>
            ) : displayPolicies.length === 0 ? (
              <tr>
                <td colSpan={canManagePolicy ? 5 : 4} className="text-center py-10">
                  <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">No leave policies defined.</p>
                  {canManagePolicy && (
                    <button
                      onClick={() => { setPolicyToEdit(null); setIsModalOpen(true); }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer border-none"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>Create First Policy</span>
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              displayPolicies.map((policy) => (
                <tr key={policy._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-4 font-bold text-gray-900 dark:text-white text-xs whitespace-nowrap">{policy.name}</td>
                  <td className="px-4 py-4 text-xs font-black text-gray-900 dark:text-white text-center tabular-nums">{policy.annualAllowance || 0}</td>
                  <td className="px-4 py-4 text-xs font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">
                    {policy.carryForwardLimit > 0 ? `Yes (Max: ${policy.carryForwardLimit})` : 'No'}
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">{policy.description || 'Standard company leave policy guidelines apply.'}</td>
                  {canManagePolicy && (
                    <td className="px-4 py-4 text-xs text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setPolicyToEdit(policy); setIsModalOpen(true); }}
                          className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                          title="Edit Policy"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeletePolicy(policy._id, policy.name)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                          title="Delete Policy"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canManagePolicy && (
        <CreatePolicyModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setPolicyToEdit(null); }}
          onSuccess={fetchData}
          policyToEdit={policyToEdit}
        />
      )}
    </div>
  );
};

export default LeavePolicyOverview;
