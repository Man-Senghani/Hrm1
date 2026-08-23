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

const AllocateLeaveModal = ({ isOpen, onClose, onSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    userId: '',
    leaveType: 'casual',
    days: 0,
    action: 'add'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      }).then(res => {
        const data = res.data;
        const list = (data && typeof data === 'object') 
          ? (data.employees || data.data || (Array.isArray(data) ? data : [])) 
          : [];
        setEmployees(list);
      }).catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/leaves/allocate', formData, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Leave allocated successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to allocate leave');
    } finally {
      setLoading(false);
    }
  };

  const employeeOptions = [
    { value: 'employees', label: 'All Employees' },
    { value: 'managers', label: 'All Managers' },
    ...employees.map(emp => ({ value: emp._id, label: emp.name || emp.email }))
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pt-3 px-6 pb-6 relative shadow-2xl flex flex-col justify-between border-l-2 border-gray-300 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Allocate Leave</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col justify-between h-full pt-4 overflow-hidden">
          <div className="overflow-y-auto pr-1 flex-1 space-y-4 pb-2">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Select Employee</label>
              <CustomSelect 
                value={formData.userId}
                onChange={val => setFormData({...formData, userId: val})}
                options={employeeOptions}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Leave Type</label>
                <CustomSelect 
                  value={formData.leaveType}
                  onChange={val => setFormData({...formData, leaveType: val})}
                  options={[
                    { value: 'casual', label: 'Casual Leave' },
                    { value: 'sick', label: 'Sick Leave' },
                    { value: 'earned', label: 'Earned Leave' },
                    { value: 'compOff', label: 'Comp Off' },
                    { value: 'optional', label: 'Optional Holiday' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Action</label>
                <CustomSelect 
                  value={formData.action}
                  onChange={val => setFormData({...formData, action: val})}
                  options={[
                    { value: 'add', label: 'Add' },
                    { value: 'deduct', label: 'Deduct' }
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Number of Days</label>
              <input 
                required type="number" min="0.5" step="0.5"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                value={formData.days} onChange={e => setFormData({...formData, days: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 text-xs transition-colors">
              {loading ? 'Allocating...' : 'Allocate'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default AllocateLeaveModal;
