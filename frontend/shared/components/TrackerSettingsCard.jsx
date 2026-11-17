import React, { useState, useEffect, useRef } from 'react';
import { Camera, Clock, Save, RefreshCw, CheckCircle2, AlertCircle, Laptop, ChevronDown, Check, Sparkles } from 'lucide-react';
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

const TrackerSettingsCard = () => {
  const [screenshotMinutes, setScreenshotMinutes] = useState(15);
  const [inactivityMinutes, setInactivityMinutes] = useState(10);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Click outside listener for custom dropdown
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
          message: 'Tracker rules updated! Connected desktop apps received the update in real time.' 
        });
      } else {
        setFeedback({ type: 'error', message: res.data?.message || 'Failed to update settings.' });
      }
    } catch (err) {
      console.error('Save error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to update settings on server.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedInactivity = INACTIVITY_OPTIONS.find(o => o.value === inactivityMinutes) || {
    value: inactivityMinutes,
    label: `${inactivityMinutes} Minutes`
  };

  const minsNum = parseInt(screenshotMinutes, 10);
  const capturesPerHour = !isNaN(minsNum) && minsNum > 0 ? (60 / minsNum).toFixed(1).replace('.0', '') : '4';

  return (
    <div className="bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] rounded-[24px] p-8 shadow-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-[#11241f] rounded-xl text-[#00a76b] shadow-xs">
            <Laptop size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Desktop Tracker & Monitoring Rules
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure automated screenshot frequency and system inactivity timeout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-[#11241f] rounded-full border border-emerald-100 dark:border-[#1a3830]">
          <span className="w-2 h-2 rounded-full bg-[#00a76b] animate-pulse" />
          <span className="text-[11px] font-bold text-[#00a76b]">Live App Sync Active</span>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <RefreshCw size={16} className="animate-spin text-[#00a76b]" />
          <span>Loading configuration...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. SCREENSHOT INTERVAL (TEXTBOX / MINUTES) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#829e92] flex items-center gap-1.5">
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
                  className="w-full bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#133029] rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00a76b] focus:bg-white dark:focus:bg-[#0c1815] transition-all pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  Minutes
                </span>
              </div>
              
              {/* Dynamic Explanation Card */}
              <div className="p-3 bg-slate-50 dark:bg-[#111c18]/60 rounded-xl border border-slate-100 dark:border-[#133029] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Sparkles size={13} className="text-[#00a76b]" />
                  <span>How {minsNum || 15}-minute window works:</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Hour is split into {minsNum || 15}-minute blocks (~{capturesPerHour} captures/hr). Inside each block, the app captures 1 random screen at an unpredictable second, so employees cannot predict when it happens.
                </p>
              </div>
            </div>

            {/* 2. INACTIVITY TIMEOUT (CUSTOM MODERN DROPDOWN) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#829e92] flex items-center gap-1.5">
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
                  className={`w-full bg-slate-50 dark:bg-[#111c18] border ${
                    isDropdownOpen ? 'border-[#00a76b] ring-2 ring-[#00a76b]/15 bg-white dark:bg-[#0c1815]' : 'border-slate-200 dark:border-[#133029]'
                  } rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white flex items-center justify-between outline-none transition-all cursor-pointer shadow-xs hover:border-[#00a76b]`}
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
                  <div className="absolute z-50 left-0 right-0 mt-2 p-1.5 bg-white dark:bg-[#0c1815] border border-slate-200 dark:border-[#1a3830] rounded-2xl shadow-2xl max-h-64 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150">
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

              {/* Inactivity Explanation Card */}
              <div className="p-3 bg-slate-50 dark:bg-[#111c18]/60 rounded-xl border border-slate-100 dark:border-[#133029] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Clock size={13} className="text-[#00a76b]" />
                  <span>Inactivity trigger ({inactivityMinutes} mins):</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  If the employee touches neither mouse nor keyboard across the OS for {inactivityMinutes} continuous minutes, tracking pauses and alerts them.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-[#133029]">
            <p className="text-[11px] text-slate-400">
              Settings update immediately across all connected employee tracker apps without reinstallation.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-xl shadow-xs transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Updating Rules...' : 'Save Tracker Rules'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TrackerSettingsCard;
