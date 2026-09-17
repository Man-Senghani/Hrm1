import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Send, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AttendanceDatePicker from '../AttendanceDatePicker';

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 1; hour <= 12; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const hStr = hour.toString().padStart(2, '0');
      const mStr = min.toString().padStart(2, '0');
      slots.push(`${hStr}:${mStr}`);
    }
  }
  return slots;
};

const CustomThemeTimePicker = ({
  label,
  timeValue,
  ampmValue,
  onTimeChange,
  onAmPmChange,
  placeholder = "09:30"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeSlots = generateTimeSlots();

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
        <Clock size={13} className="text-[#00a76b]" />
        {label}
      </label>

      <div className="flex items-center gap-1">
        {/* Text Input for Time Digits Only + Clock Button */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={timeValue}
            onChange={(e) => onTimeChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-2 pr-5 py-1.5 text-xs font-bold rounded-xl border border-[#d8e6e1] dark:border-[#1b3d33] bg-[#f8faf9] dark:bg-[#081d17] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:border-[#00a76b] transition-all shadow-2xs text-center"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-[#00a76b] transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
            title="Select time preset"
          >
            <Clock size={12} />
          </button>

          {/* Preset Dropdown */}
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute left-0 mt-1.5 w-full max-h-48 overflow-y-auto bg-white dark:bg-[#0d2a22] border border-[#d8e6e1] dark:border-[#1b3d33] rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                {timeSlots.map((slot) => {
                  const isSelected = timeValue === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        onTimeChange(slot);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border-none flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#00a76b]/10 dark:bg-[#00a76b]/20 text-[#00a76b] dark:text-emerald-400 font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-[#f0f7f4] dark:hover:bg-[#16382f]'
                      }`}
                    >
                      <span>{slot}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a76b] dark:bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Outer AM / PM Pill Toggle Buttons */}
        <div className="flex items-center p-0.5 rounded-xl bg-[#f0f7f4] dark:bg-[#081d17] border border-[#d8e6e1] dark:border-[#1b3d33] shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => onAmPmChange('AM')}
            className={`px-1.5 py-1 text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer border-none ${
              ampmValue === 'AM'
                ? 'bg-[#00a76b] text-white shadow-xs scale-[1.02]'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => onAmPmChange('PM')}
            className={`px-1.5 py-1 text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer border-none ${
              ampmValue === 'PM'
                ? 'bg-[#00a76b] text-white shadow-xs scale-[1.02]'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
};

const MyCompOffOnDutyRequestsDrawer = ({ isOpen, onClose, onRefresh }) => {
  const [requestType, setRequestType] = useState('comp-off'); // 'comp-off' or 'on-duty'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dayType, setDayType] = useState('full-day'); // 'half-day' or 'full-day'
  const [fromTime, setFromTime] = useState('09:30');
  const [fromAmPm, setFromAmPm] = useState('AM');
  const [toTime, setToTime] = useState('01:30');
  const [toAmPm, setToAmPm] = useState('PM');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }
    if (!endDate) {
      toast.error('Please select an end date');
      return;
    }
    if (dayType === 'half-day') {
      if (!fromTime || !fromTime.trim()) {
        toast.error('Please enter From Time');
        return;
      }
      if (!toTime || !toTime.trim()) {
        toast.error('Please enter To Time');
        return;
      }
    }
    if (!reason || !reason.trim()) {
      toast.error('Please enter a reason');
      return;
    }

    const token = sessionStorage.getItem('token');
    try {
      setIsSubmitting(true);
      const isFullDay = dayType === 'full-day';
      const formattedFrom = isFullDay ? '' : `${fromTime} ${fromAmPm}`;
      const formattedTo = isFullDay ? '' : `${toTime} ${toAmPm}`;

      if (requestType === 'comp-off') {
        await axios.post(
          '/api/comp-off',
          {
            dateWorked: startDate,
            endDate,
            isFullDay,
            fromTime: formattedFrom,
            toTime: formattedTo,
            reason
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Comp-Off request submitted successfully!');
      } else {
        await axios.post(
          '/api/on-duty',
          {
            startDate,
            endDate,
            isFullDay,
            fromTime: formattedFrom,
            toTime: formattedTo,
            reason
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('On-Duty request submitted successfully!');
      }

      setStartDate('');
      setEndDate('');
      setReason('');
      setDayType('full-day');
      setFromTime('09:30');
      setFromAmPm('AM');
      setToTime('01:30');
      setToAmPm('PM');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error('Request failed:', err);
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dateValue = startDate && endDate
    ? (startDate === endDate ? startDate : `${startDate}:${endDate}`)
    : (startDate || endDate || '');

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-xs transition-opacity duration-300 flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm h-full bg-white dark:bg-[#111c18] text-gray-900 dark:text-gray-100 shadow-2xl flex flex-col justify-between border-l border-gray-150 dark:border-gray-800 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#111c18]">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles size={18} className="text-[#00a76b]" />
              Comp-Off / On-Duty Request
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Submit compensatory off or on-duty work requests.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* ROW 1: Request Type */}
            <div>
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
                Request Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  onClick={() => setRequestType('comp-off')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    requestType === 'comp-off'
                      ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#162722]/30 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="requestType"
                    checked={requestType === 'comp-off'}
                    onChange={() => setRequestType('comp-off')}
                    className="w-4 h-4 accent-[#00a76b] rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold">Comp-Off</span>
                </label>

                <label
                  onClick={() => setRequestType('on-duty')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    requestType === 'on-duty'
                      ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#162722]/30 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="requestType"
                    checked={requestType === 'on-duty'}
                    onChange={() => setRequestType('on-duty')}
                    className="w-4 h-4 accent-[#00a76b] rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold">On-Duty</span>
                </label>
              </div>
            </div>

            {/* ROW 2: Select Date Range */}
            <div>
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
                Select Date Range
              </label>
              <AttendanceDatePicker
                value={dateValue}
                onChange={(val) => {
                  if (!val) {
                    setStartDate('');
                    setEndDate('');
                  } else if (val.includes(':')) {
                    const [s, e] = val.split(':');
                    setStartDate(s);
                    setEndDate(e);
                  } else {
                    setStartDate(val);
                    setEndDate(val);
                  }
                }}
                placeholder="dd/mm/yyyy"
                allowRange={true}
                disableFuture={false}
                triggerClassName="w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-800 dark:text-white hover:border-[#00a76b] dark:hover:border-[#00a76b] transition-all cursor-pointer shadow-2xs group"
              />
            </div>

            {/* ROW 3: Day Type (Half-Day / Full-Day) */}
            <div>
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
                Day Type
              </label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label
                  onClick={() => setDayType('half-day')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    dayType === 'half-day'
                      ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#162722]/30 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="dayType"
                    checked={dayType === 'half-day'}
                    onChange={() => setDayType('half-day')}
                    className="w-4 h-4 accent-[#00a76b] rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold">Half-Day</span>
                </label>

                <label
                  onClick={() => setDayType('full-day')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    dayType === 'full-day'
                      ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#162722]/30 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="dayType"
                    checked={dayType === 'full-day'}
                    onChange={() => setDayType('full-day')}
                    className="w-4 h-4 accent-[#00a76b] rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold">Full-Day</span>
                </label>
              </div>

              {/* Time Range Pickers for Half-Day */}
              {dayType === 'half-day' && (
                <div className="flex gap-2 p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 animate-in fade-in duration-200">
                  <CustomThemeTimePicker
                    label="From Time"
                    timeValue={fromTime}
                    ampmValue={fromAmPm}
                    onTimeChange={(val) => setFromTime(val)}
                    onAmPmChange={(ampm) => setFromAmPm(ampm)}
                    placeholder="09:30"
                  />
                  <CustomThemeTimePicker
                    label="To Time"
                    timeValue={toTime}
                    ampmValue={toAmPm}
                    onTimeChange={(val) => setToTime(val)}
                    onAmPmChange={(ampm) => setToAmPm(ampm)}
                    placeholder="01:30"
                  />
                </div>
              )}
            </div>

            {/* ROW 4: Reason Textarea */}
            <div>
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                Reason / Justification
              </label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State your reason for Comp-Off / On-Duty..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e2eae7] dark:border-[#133029] bg-slate-50/80 dark:bg-[#0d2a22] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] dark:focus:border-[#00a76b] transition-all resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Fixed Bottom Action Row */}
          <div className="shrink-0 border-t border-gray-150 dark:border-gray-800 px-6 py-4 bg-gray-50/80 dark:bg-[#162722]/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold bg-[#00a76b] hover:bg-[#00915c] text-white text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={14} />
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default MyCompOffOnDutyRequestsDrawer;
