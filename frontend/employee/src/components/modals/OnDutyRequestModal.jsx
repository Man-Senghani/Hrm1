import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, Clock } from 'lucide-react';
import CustomDatePicker from '../CustomDatePicker';

const generateTimes = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const h24 = hour;
      const m = min;
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const display = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
      const value = `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      times.push({ value, display });
    }
  }
  return times;
};

const CustomTimePicker = ({ value, onChange, placeholder = "Select Time" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const times = generateTimes();
  const selectedTime = times.find(t => t.value === value);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#00a76b]/20 outline-none text-gray-900 dark:text-white flex items-center justify-between h-10 cursor-pointer text-left"
      >
        <span>{selectedTime ? selectedTime.display : placeholder}</span>
        <Clock size={14} className="text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1 w-full max-h-40 overflow-y-auto bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl z-50 py-1">
            {times.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => { onChange(t.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${value === t.value ? 'bg-[#00a76b]/10 text-[#00a76b]' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
              >
                {t.display}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const OnDutyRequestModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    isFullDay: true,
    fromTime: '',
    toTime: '',
    reason: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem('token');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Start Date, End Date, and Reason are required');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End Date cannot be before Start Date');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/api/on-duty', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('On Duty request submitted successfully');
      setFormData({ startDate: '', endDate: '', isFullDay: true, fromTime: '', toTime: '', reason: '', location: '' });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm pl-8 pr-6 py-6 bg-white dark:bg-[#1e293b] shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Submit On Duty Request</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
                <CustomDatePicker
                  name="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  placeholder="dd-mm-yyyy"
                  className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-250 dark:border-gray-700 rounded-xl h-10 flex items-center text-xs text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
                <CustomDatePicker
                  name="endDate"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  placeholder="dd-mm-yyyy"
                  align="right"
                  className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-255 dark:border-gray-700 rounded-xl h-10 flex items-center text-xs text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="fullDay"
                checked={formData.isFullDay}
                onChange={(e) => setFormData({...formData, isFullDay: e.target.checked})}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="fullDay" className="text-xs font-bold text-gray-700 dark:text-gray-300">Full Day</label>
            </div>

             {!formData.isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">From Time</label>
                  <CustomTimePicker
                    value={formData.fromTime}
                    onChange={(val) => setFormData({...formData, fromTime: val})}
                    placeholder="Select From Time"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">To Time</label>
                  <CustomTimePicker
                    value={formData.toTime}
                    onChange={(val) => setFormData({...formData, toTime: val})}
                    placeholder="Select To Time"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reason/Purpose *</label>
              <textarea 
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 resize-none outline-none text-gray-900 dark:text-white"
                rows={4}
                placeholder="E.g., Client meeting at their office"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Location (Optional)</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                placeholder="Where will you be?"
              />
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-4">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl flex-1 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-[#00a76b] hover:bg-[#00a76b]/95 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex-1"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OnDutyRequestModal;
