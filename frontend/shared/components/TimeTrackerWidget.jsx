import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Clock, Play, Pause, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const formatTime = (seconds = 0) => {
  const totalSecs = Math.max(0, parseInt(seconds) || 0);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const TimeTrackerWidget = ({ className = '', isDark = false, showControls = false }) => {
  const [session, setSession] = useState(null);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const timerRef = useRef(null);

  const fetchTimeRef = useRef(Date.now());

  const getAuth = () => {
    const token = sessionStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : null;
  };

  const fetchStatus = useCallback(async () => {
    const auth = getAuth();
    if (!auth) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get('/api/time/status', auth);
      const data = res.data;
      setSession(data);
      fetchTimeRef.current = Date.now();
      setTimer(data?.activeTime || 0);
    } catch (err) {
      console.error('Failed to fetch timer status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    let socket = null;
    try {
      socket = io(window.location.origin, { withCredentials: true });
      socket.on('timer_update', () => fetchStatus());
      socket.on('timer_paused', () => fetchStatus());
      socket.on('timer_resumed', () => fetchStatus());
      socket.on('timer_stopped', () => fetchStatus());
    } catch (e) {}

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [fetchStatus]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (session && session.hasActiveSession && session.isRunning && session.status === 'active') {
      const baseActive = session.activeTime || 0;
      const baseTimestamp = fetchTimeRef.current || Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - baseTimestamp) / 1000);
        setTimer(baseActive + Math.max(0, elapsed));
      }, 1000);
    } else {
      setTimer(session?.activeTime || 0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  const handleStart = async () => {
    const auth = getAuth();
    if (!auth) return;
    setActionLoading(true);
    try {
      await axios.post('/api/time/start', {}, auth);
      toast.success('Timer started');
      fetchStatus();
    } catch (e) {
      toast.error('Failed to start');
    } finally { setActionLoading(false); }
  };

  const handlePause = async () => {
    const auth = getAuth();
    if (!auth) return;
    setActionLoading(true);
    try {
      await axios.post('/api/time/pause', {}, auth);
      toast.error('Timer paused');
      fetchStatus();
    } catch (e) {
      toast.error('Failed to pause');
    } finally { setActionLoading(false); }
  };

  const handleResume = async () => {
    const auth = getAuth();
    if (!auth) return;
    setActionLoading(true);
    try {
      await axios.post('/api/time/resume', {}, auth);
      toast.success('Timer resumed');
      fetchStatus();
    } catch (e) {
      toast.error('Failed to resume');
    } finally { setActionLoading(false); }
  };

  const handleStop = async () => {
    const auth = getAuth();
    if (!auth) return;
    setActionLoading(true);
    try {
      await axios.post('/api/time/stop', {}, auth);
      toast.success('Timer stopped');
      fetchStatus();
    } catch (e) {
      toast.error('Failed to stop');
    } finally { setActionLoading(false); }
  };

  const isRunning = !!(session?.hasActiveSession && session?.isRunning && session?.status === 'active');

  const statusText = !session?.hasActiveSession || session?.status === 'completed'
    ? 'NOT STARTED'
    : (session?.status === 'active' && session?.isRunning)
    ? 'WORKING'
    : (session?.status === 'paused' || session?.status === 'idle' ? 'ON BREAK' : 'STOPPED');

  const statusDotClass = !session?.hasActiveSession || session?.status === 'completed'
    ? 'bg-slate-400 dark:bg-slate-500'
    : (session?.status === 'active' && session?.isRunning)
    ? 'bg-[#10B981] animate-pulse'
    : 'bg-amber-500';

  return (
    <div className={`bg-white dark:bg-[#181612] rounded-[24px] border border-gray-200/90 dark:border-[#38352e] hover:!border-[#10b981] dark:hover:!border-[#34d399] transition-colors duration-300 p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden min-h-[170px] shadow-sm select-none ${className}`}>
      {/* Header Matching Image */}
      <div className="flex justify-between items-start mb-1 relative z-10">
        <div>
          <h2 className="text-base font-bold text-[#1e293b] dark:text-white tracking-tight mb-0.5">Current Session</h2>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusDotClass}`}></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-[#a3a094]">
              {statusText}
            </span>
          </div>
        </div>

        {/* Top Right Clock Circle Icon */}
        <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
          <Clock size={16} strokeWidth={1.75} />
        </div>
      </div>

      {/* Center Giant Timer Display Matching Image */}
      <div className="text-center my-auto py-1 relative z-10">
        <div className="text-3xl sm:text-4xl md:text-[44px] font-black text-[#0f172a] dark:text-white font-mono tracking-tight leading-none mb-1 tabular-nums">
          {formatTime(timer)}
        </div>
        <p className="text-[9px] text-slate-400 dark:text-[#a3a094] font-extrabold tracking-[0.25em] uppercase">
          TOTAL TIME TRACKED
        </p>
      </div>

      {/* Control Action Buttons */}
      {showControls && (
        <div className="pt-2 border-t border-slate-100 dark:border-[#282520] flex items-center justify-center gap-3 relative z-10">
          {!session?.hasActiveSession || session?.status === 'completed' ? (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border-none"
            >
              <Play size={14} className="fill-current" />
              <span>Start Tracking</span>
            </button>
          ) : isRunning ? (
            <>
              <button
                onClick={handlePause}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border-none"
              >
                <Pause size={14} className="fill-current" />
                <span>Pause</span>
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border-none"
              >
                <Square size={14} className="fill-current" />
                <span>Stop</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleResume}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border-none"
              >
                <Play size={14} className="fill-current" />
                <span>Resume</span>
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border-none"
              >
                <Square size={14} className="fill-current" />
                <span>Stop</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeTrackerWidget;
