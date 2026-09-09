import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LogIn, LogOut, Clock, Loader2 } from 'lucide-react';
import { startDesktopTracker, stopDesktopTracker } from '@shared/services/desktopTrackerService';
import DesktopAppRequiredModal from './DesktopAppRequiredModal';

const token = () => sessionStorage.getItem('token') || localStorage.getItem('token');

const CheckInButton = ({ className = '', variant = 'default' }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  const fetchStatus = async () => {
    try {
      const t = token();
      if (!t) return;
      const headers = { Authorization: `Bearer ${t}` };

      // 1. Check today attendance record
      const attRes = await axios.get('/api/attendance/today', { headers }).catch(() => null);
      if (attRes?.data?.attendance) {
        const att = attRes.data.attendance;
        const hasClockedOut = Boolean((att.clockOut && att.clockOut !== '--') || att.checkOutTime);
        if (att.checkInTime || att.clockIn) {
          if (!hasClockedOut) {
            setIsCheckedIn(true);
            const inTime = att.checkInTime
              ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
              : att.clockIn;
            setCheckInTime(inTime);
            return;
          } else {
            setIsCheckedIn(false);
            setCheckInTime(null);
            return;
          }
        }
      }

      // 2. Check timer status fallback
      const timerRes = await axios.get('/api/time/timer-status', { headers }).catch(() => null);
      if (timerRes?.data?.isRunning) {
        setIsCheckedIn(true);
        if (timerRes.data.startTime) {
          setCheckInTime(new Date(timerRes.data.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
        }
      } else {
        setIsCheckedIn(false);
      }
    } catch (e) {
      console.error('Error checking check-in status:', e);
    } finally {
      setInitialChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const t = token();
      if (!t) {
        toast.error('Session expired. Please log in again.');
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${t}` };

      // 1. Launch/Start Desktop App Tracker
      const trackerResult = await startDesktopTracker(t);
      if (!trackerResult?.success) {
        setShowTrackerModal(true);
        setLoading(false);
        return;
      }

      // 2. Record attendance clock-in
      try {
        await axios.post('/api/attendance/clock-in', {}, { headers });
      } catch (err) {
        if (err.response?.status === 400 && (err.response?.data?.message?.includes('Already clocked in') || err.response?.data?.message?.includes('already'))) {
          setIsCheckedIn(true);
          await fetchStatus();
          toast.success('You are currently checked in.');
          return;
        }
        throw err;
      }

      // 3. Start time session
      try {
        await axios.post('/api/time/start', {}, { headers });
      } catch (_) {}

      setIsCheckedIn(true);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      setCheckInTime(nowStr);

      toast.success('Check-in successful & Desktop Tracker started!', {
        style: {
          borderRadius: '12px',
          background: '#0d2a22',
          color: '#fff',
          border: '1px solid #10b981',
          fontSize: '13px',
          fontWeight: '600'
        }
      });
      await fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const promptCheckOut = () => {
    // Bring desktop app forward to show confirmation
    stopDesktopTracker().catch(() => {});
    setShowCheckoutConfirm(true);
  };

  const confirmCheckOut = async () => {
    setShowCheckoutConfirm(false);
    setLoading(true);
    try {
      const t = token();
      const headers = { Authorization: `Bearer ${t}` };

      try {
        await stopDesktopTracker();
      } catch (_) {}

      await axios.put('/api/attendance/clock-out', {}, { headers }).catch(() => {});
      try {
        await axios.post('/api/time/stop', {}, { headers });
      } catch (_) {}

      setIsCheckedIn(false);
      setCheckInTime(null);

      toast.success('Checked out successfully!');
      await fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  const renderModals = () => (
    <>
      {/* CHECKOUT CONFIRMATION MODAL */}
      {showCheckoutConfirm && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowCheckoutConfirm(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white dark:bg-[#181612] border border-slate-200 dark:border-[#38352e] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-900/40">
              <LogOut size={26} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              End Workday?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">
              Are you sure you want to check out? This will finalize your work hours for today and stop the Desktop Tracker.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCheckoutConfirm(false)}
                className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#25201b] dark:hover:bg-[#2d2721] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCheckOut}
                disabled={loading}
                className="w-full sm:flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                <span>{loading ? 'Checking out...' : 'Yes, Check Out'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DESKTOP APP REQUIRED MODAL */}
      <DesktopAppRequiredModal
        isOpen={showTrackerModal}
        onClose={() => setShowTrackerModal(false)}
        onRetry={handleCheckIn}
        isRetrying={loading}
      />
    </>
  );

  if (initialChecking) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs font-semibold text-slate-400 animate-pulse ${className}`}>
        <Loader2 size={13} className="animate-spin text-emerald-500" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <>
        <div className={`inline-flex items-center gap-2 ${className}`}>
          {isCheckedIn ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="whitespace-nowrap text-[11px] font-extrabold">{checkInTime ? `In at ${checkInTime}` : 'Checked In'}</span>
              </div>

              <button
                type="button"
                onClick={promptCheckOut}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-[11px] rounded-full shadow-xs transition-all cursor-pointer border-none shrink-0 disabled:opacity-50"
                title="Click to Check Out"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                <span>{loading ? '...' : 'Check Out'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-extrabold text-[11px] rounded-full shadow-sm shadow-emerald-500/20 transition-all cursor-pointer border-none shrink-0 disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
              <span>{loading ? 'Checking in...' : 'Check In'}</span>
            </button>
          )}
        </div>
        {renderModals()}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        <div className={`w-full ${className}`}>
          {isCheckedIn ? (
            <button
              type="button"
              onClick={promptCheckOut}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              disabled={loading}
              className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl h-14 w-full transition-all duration-200 shadow-xs cursor-pointer disabled:opacity-50 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20"
              style={{
                borderColor: hovered ? '#ef4444' : undefined,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="inline-flex p-1.5 rounded-lg shrink-0 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/40">
                  {loading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-emerald-600 dark:text-emerald-400" /> : <Clock size={16} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 truncate">
                    CHECKED IN
                  </span>
                  <span className="text-[9px] font-extrabold text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5 leading-none">
                    {checkInTime ? `In at ${checkInTime}` : 'Active session'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-black shrink-0 text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                {loading ? 'Checking Out...' : 'Check Out'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckIn}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              disabled={loading}
              className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl h-14 w-full transition-all duration-200 shadow-xs cursor-pointer disabled:opacity-50 border border-gray-200 dark:border-[#28251e] bg-white dark:bg-[#151c28]"
              style={{
                borderColor: hovered ? '#10b981' : undefined,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="inline-flex p-1.5 rounded-lg shrink-0 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40">
                  {loading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-emerald-600 dark:text-emerald-400" /> : <LogIn size={16} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-[#829e92] truncate">
                    CHECK IN
                  </span>
                  <span className="text-[9px] font-extrabold text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5 leading-none">
                    Ready to start
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-black shrink-0 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {loading ? 'Checking In...' : 'Check In'}
              </span>
            </button>
          )}
        </div>
        {renderModals()}
      </>
    );
  }

  return (
    <>
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {isCheckedIn ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="whitespace-nowrap">{checkInTime ? `Checked in at ${checkInTime}` : 'Checked In'}</span>
            </div>

            <button
              type="button"
              onClick={promptCheckOut}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer border-none shrink-0 select-none disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              <span>{loading ? 'Processing...' : 'Check Out'}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer border-none shrink-0 select-none disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
            <span>{loading ? 'Checking in...' : 'Check In'}</span>
          </button>
        )}
      </div>
      {renderModals()}
    </>
  );
};

export default CheckInButton;
