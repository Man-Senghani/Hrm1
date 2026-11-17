import React, { useState, useEffect, useRef } from 'react';
import { Camera, Clock, Save, RefreshCw, X, CheckCircle2, AlertCircle, Laptop, ChevronDown, Check, Sparkles } from 'lucide-react';
import api from '@shared/services/api';

const INACTIVITY_OPTIONS = [
  { value: 5, label: '5 Minutes' },
  { value: 10, label: '10 Minutes (Default)' },
  { value: 15, label: '15 Minutes' },
  { value: 20, label: '20 Minutes' },
  { value: 25, label: '25 Minutes' },
  { value: 30, label: '30 Minutes' },
  { value: 45, label: '45 Minutes' },
  { value: 60, label: '60 Minutes (Maximum)' },
];

const TrackerSettingsModal = ({ isOpen, onClose, onUpdated }) => {
  const [screenshotMinutes, setScreenshotMinutes] = useState(15);
  const [inactivityMinutes, setInactivityMinutes] = useState(10);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  // Click outside to close custom dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.get('/tracker-settings');
      if (res.data?.settings) {
        setScreenshotMinutes(res.data.settings.screenshotIntervalMinutes || 15);
        setInactivityMinutes(res.data.settings.inactivityTimeoutMinutes || 10);
      }
    } catch (err) {
      console.error('Failed to load tracker settings:', err);
      setFeedback({ type: 'error', message: 'Failed to load current settings from server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    const intervalNum = parseInt(screenshotMinutes, 10);
    const inactivityNum = parseInt(inactivityMinutes, 10);

    if (isNaN(intervalNum) || intervalNum < 1 || intervalNum > 120) {
      setFeedback({ type: 'error', message: 'Screenshot interval must be between 1 and 120 minutes.' });
      return;
    }

    if (isNaN(inactivityNum) || inactivityNum < 1 || inactivityNum > 60) {
      setFeedback({ type: 'error', message: 'Inactivity timeout must be between 1 and 60 minutes.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.put('/tracker-settings', {
        screenshotIntervalMinutes: intervalNum,
        inactivityTimeoutMinutes: inactivityNum
      });

      if (res.data?.success) {
        setFeedback({ 
          type: 'success', 
          message: 'Settings saved! Desktop apps will automatically apply these rules in real time.' 
        });
        if (onUpdated) onUpdated(res.data.settings);
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } else {
        setFeedback({ type: 'error', message: res.data?.message || 'Failed to save settings.' });
      }
    } catch (err) {
      console.error('Save error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.message || 'Server error while saving tracker settings.' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedInactivity = INACTIVITY_OPTIONS.find(o => o.value === inactivityMinutes) || {
    value: inactivityMinutes,
    label: `${inactivityMinutes} Minutes`
  };

  const minsNum = parseInt(screenshotMinutes, 10);
  const capturesPerHour = !isNaN(minsNum) && minsNum > 0 ? (60 / minsNum).toFixed(1).replace('.0', '') : '4';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#0c1815] rounded-[24px] border border-slate-200 dark:border-[#1a3830] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-[#16312a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-[#132c25] flex items-center justify-center text-[#00a76b]">
              <Laptop size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Desktop Tracker Rules</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure automated screenshot and idle rules</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#16312a] transition-all cursor-pointer border-none bg-transparent"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-[#00a76b]" />
              <p className="text-xs font-semibold">Loading current tracker rules...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* FEEDBACK ALERT */}
              {feedback && (
                <div className={`p-4 rounded-xl flex items-start gap-3 text-xs font-medium ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' 
                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40'
                }`}>
                  {feedback.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">{feedback.message}</div>
                </div>
              )}

              {/* 1. SCREENSHOT INTERVAL (TEXTBOX / MINUTES) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={14} className="text-[#00a76b]" />
                    Screenshot Frequency (Minutes)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">Min 1m • Max 120m</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={screenshotMinutes}
                    onChange={(e) => setScreenshotMinutes(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full bg-slate-50 dark:bg-[#11241f] border border-slate-200 dark:border-[#1e443a] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#00a76b] focus:bg-white dark:focus:bg-[#0c1815] transition-all pr-20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    Minutes
                  </span>
                </div>
                
                {/* Dynamic Explanation Card */}
                <div className="p-3 bg-slate-50 dark:bg-[#11241f]/60 rounded-xl border border-slate-100 dark:border-[#1a3830] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <Sparkles size={13} className="text-[#00a76b]" />
                    <span>How {minsNum || 15}-minute window works:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Hour is split into {minsNum || 15}-minute blocks (~{capturesPerHour} captures/hr). In each block, the app captures 1 random screen at an unpredictable second, so employees cannot predict when it happens.
                  </p>
                </div>
              </div>

              {/* 2. INACTIVITY TIMEOUT (CUSTOM MODERN DROPDOWN) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} className="text-[#00a76b]" />
                    Inactivity Timeout (Dropdown)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">Max 60 Minutes</span>
                </div>
                
                {/* CUSTOM MODERN DROPDOWN */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className={`w-full bg-slate-50 dark:bg-[#11241f] border ${
                      isDropdownOpen ? 'border-[#00a76b] ring-2 ring-[#00a76b]/15 bg-white dark:bg-[#0c1815]' : 'border-slate-200 dark:border-[#1e443a]'
                    } rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between outline-none transition-all cursor-pointer shadow-xs hover:border-[#00a76b]`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock size={16} className="text-[#00a76b]" />
                      <span>{selectedInactivity.label}</span>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#00a76b]' : ''}`} 
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-2 p-1.5 bg-white dark:bg-[#0c1815] border border-slate-200 dark:border-[#1a3830] rounded-2xl shadow-2xl max-h-56 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      {INACTIVITY_OPTIONS.map((opt) => {
                        const isSelected = opt.value === inactivityMinutes;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setInactivityMinutes(opt.value);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer text-left border-none ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-[#132c25] text-[#00a76b]'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#14231f]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#00a76b]' : 'bg-transparent'}`} />
                              <span>{opt.label}</span>
                            </div>
                            {isSelected && <Check size={14} className="text-[#00a76b]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#11241f]/60 rounded-xl border border-slate-100 dark:border-[#1a3830] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <Clock size={13} className="text-[#00a76b]" />
                    <span>Inactivity trigger ({inactivityMinutes} mins):</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    If no keyboard or mouse activity is detected for {inactivityMinutes} continuous minutes, tracking pauses and the employee is prompted.
                  </p>
                </div>
              </div>

              {/* REAL-TIME SYNC NOTICE */}
              <div className="p-3 bg-emerald-50/50 dark:bg-[#132c25]/30 rounded-xl border border-emerald-100 dark:border-[#1a3830] flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#00a76b] animate-ping" />
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Changes sync automatically to active Desktop Apps via WebSocket. No app reinstall required.
                </span>
              </div>

              {/* MODAL FOOTER BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e443a] bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#16312a] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#00a76b] hover:bg-[#00915c] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 border-none"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{saving ? 'Saving...' : 'Apply & Broadcast'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackerSettingsModal;
