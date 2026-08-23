import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-xs font-semibold text-left flex justify-between items-center focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        <span>{selectedOption ? selectedOption.label : 'Select...'}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[10000]" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-[10001] w-full mt-1 bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                  value === opt.value 
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const CreatePolicyModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'casual',
    annualAllowance: 0,
    applicableTo: 'all', // 'employee', 'manager', 'all'
    syncMode: 'update_total', // 'update_total', 'add_difference'
    description: ''
  });
  const [existingPolicies, setExistingPolicies] = useState([]);
  const [currentAllowance, setCurrentAllowance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      axios.get('/api/leave-policies', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      }).then(res => {
        setExistingPolicies(res.data || []);
      }).catch(err => console.error(err));
    }
  }, [isOpen]);

  useEffect(() => {
    const policy = existingPolicies.find(p => p.type === formData.type && p.status === 'Active');
    setCurrentAllowance(policy ? policy.annualAllowance : 0);
  }, [formData.type, existingPolicies]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/leave-policies', formData, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Policy created successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pt-3 px-6 pb-6 relative shadow-2xl flex flex-col justify-between border-l-2 border-gray-300 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Create Leave Policy</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col justify-between h-full pt-4 overflow-hidden">
          <div className="overflow-y-auto pr-1 flex-1 space-y-4 pb-2">
            
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Policy Name</label>
              <input 
                required type="text" 
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Leave Type</label>
              <CustomSelect 
                value={formData.type} 
                onChange={val => setFormData({...formData, type: val})}
                options={[
                  { value: 'casual', label: 'Casual Leave' },
                  { value: 'sick', label: 'Sick Leave' },
                  { value: 'earned', label: 'Earned Leave' },
                  { value: 'maternity', label: 'Maternity Leave' },
                  { value: 'paternity', label: 'Paternity Leave' }
                ]}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Target Audience</label>
              <CustomSelect 
                value={formData.applicableTo} 
                onChange={val => setFormData({...formData, applicableTo: val})}
                options={[
                  { value: 'all', label: 'Both Employees & Managers' },
                  { value: 'employee', label: 'All Employees' },
                  { value: 'manager', label: 'All Managers' }
                ]}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Balance Sync Mode</label>
              <CustomSelect 
                value={formData.syncMode} 
                onChange={val => setFormData({...formData, syncMode: val})}
                options={[
                  { value: 'update_total', label: 'Update all balances to new total' },
                  { value: 'add_difference', label: 'Add/Deduct difference only' }
                ]}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Annual Allowance (Days)</label>
              <input 
                required type="number" min="0" 
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                value={formData.annualAllowance} onChange={e => setFormData({...formData, annualAllowance: e.target.value})} 
              />
              <p className="text-[9px] text-gray-400 mt-1 font-semibold">
                Current active policy: <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentAllowance} Days</span>.
                {formData.annualAllowance > 0 && (
                  <span> Adjustment difference: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formData.annualAllowance - currentAllowance >= 0 ? `+${formData.annualAllowance - currentAllowance}` : formData.annualAllowance - currentAllowance} Days</span></span>
                )}
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Description (Optional)</label>
              <textarea 
                rows="3"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 text-xs transition-colors">
              {loading ? 'Creating...' : 'Create Policy'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default CreatePolicyModal;
