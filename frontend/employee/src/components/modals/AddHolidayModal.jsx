import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import CustomDatePicker from '../CustomDatePicker';

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

const AddHolidayModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'public', // public, optional
    description: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/holidays', formData, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Holiday added successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm pl-8 pr-6 py-6 bg-white dark:bg-[#1e293b] shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Holiday</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="overflow-y-auto pr-1 flex-1 space-y-4 pb-2">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Holiday Name</label>
              <input 
                required type="text" 
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Diwali"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Date</label>
                <CustomDatePicker
                  name="date"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  placeholder="dd-mm-yyyy"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl h-10 flex items-center bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Holiday Type</label>
                <CustomSelect 
                  value={formData.type}
                  onChange={val => setFormData({...formData, type: val})}
                  options={[
                    { value: 'public', label: 'Public Holiday' },
                    { value: 'optional', label: 'Restricted / Optional' }
                  ]}
                />
              </div>
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
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl font-bold text-white bg-pink-600 hover:bg-pink-700 text-xs transition-colors">
              {loading ? 'Adding...' : 'Add Holiday'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default AddHolidayModal;
