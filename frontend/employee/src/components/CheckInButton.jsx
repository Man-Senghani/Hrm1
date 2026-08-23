import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LogIn, LogOut, Clock, Loader2 } from 'lucide-react';
import { startDesktopTracker, stopDesktopTracker } from '@shared/services/desktopTrackerService';

const token = () => sessionStorage.getItem('token') || localStorage.getItem('token');

const CheckInButton = ({ className = '' }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);

  const fetchStatus = async () => {
    try {
      const t = token();
      if (!t) return;
      const headers = { Authorization: `Bearer ${t}` };

      // 1. Check today attendance record
      const attRes = await axios.get('/api/attendance/today', { headers }).catch(() => null);
      if (attRes?.data?.attendance) {
        const att = attRes.data.attendance;
        const hasClockedOut = Boolean(att.clockOut && att.clockOut !== '--' || att.checkOutTime);
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
  }, []);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const t = token();
      const headers = { Authorization: `Bearer ${t}` };

      try {
        await startDesktopTracker(t);
      } catch (_) {}

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

      try {
        await axios.post('/api/time/start', {}, { headers });
      } catch (_) {}

      setIsCheckedIn(true);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      setCheckInTime(nowStr);

      toast.success('Check-in successful & Time tracking started!', {
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

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const t = token();
      const headers = { Authorization: `Bearer ${t}` };

      try {
        await stopDesktopTracker();
      } catch (_) {}

      await axios.put('/api/attendance/clock-out', {}, { headers });
      try {
        await axios.post('/api/time/stop', {}, { headers });
      } catch (_) {}

      setIsCheckedIn(false);
      setCheckInTime(null);

      toast.success('Checked out successfully!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  if (initialChecking) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs font-semibold text-slate-400 animate-pulse ${className}`}>
        <Loader2 size={14} className="animate-spin text-emerald-500" />
        <span>Syncing status...</span>
      </div>
    );
  }

  return (
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
            onClick={handleCheckOut}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer select-none disabled:opacity-50"
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
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer select-none disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
          <span>{loading ? 'Checking in...' : 'Check In'}</span>
        </button>
      )}
    </div>
  );
};

export default CheckInButton;
