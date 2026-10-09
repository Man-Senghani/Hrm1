import React, { useMemo } from 'react';
import { Clock, RefreshCw, Zap, CheckCircle2, Pause, Play, AlertTriangle, Square } from 'lucide-react';

// 🏃 Athletic Running Person Silhouette SVG (Matches user's reference image)
export const RunningManIcon = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Head */}
    <circle cx="14" cy="3.5" r="2.2" />
    {/* Dynamic Athletic Runner Stride */}
    <path d="M10.8 18.8l1.1-4.2 2 1.9v5.5h2v-6.9l-2.1-2 .6-2.9c1.4 1.5 3.3 2.5 5.6 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.6.1-.9.2L6.8 11v4.5h2v-3.2l1.6-.7-1.4 7.2-4.2-.8-.4 2 5.4 1z" />
  </svg>
);

// 🧍 Standing / Stopped Person Silhouette SVG (When stopped / session ready)
export const StandingManIcon = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Head */}
    <circle cx="12" cy="4" r="2.2" />
    {/* Upright Standing Body and Legs */}
    <path d="M14 9h2V7H8v2h2v6.5l-1.5 6.5h2.1l1.4-6 1.4 6h2.1L14 15.5V9z" />
  </svg>
);

export const formatSecondsToHM = (totalSecs) => {
  if (!totalSecs || isNaN(totalSecs) || totalSecs <= 0) return '0h 0m';
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}h ${m}m`;
};

/**
 * AttendanceProgressBars
 * Displays two live-updating progress bars:
 * 1. Today's Hours (Target: default 8h 30m / 8.5h)
 * 2. Weekly Hours (Target: default 42h 30m / 42.5h)
 *
 * Supports live dynamic animations & visual badges for:
 * - Running: Active flowing specular shimmer + glowing tip beacon + live radar pill
 * - Paused: Calm static amber/emerald tint + steady paused pill
 * - Inactivity: Caution striped hazard animation + warning idle pill
 * - Session Ready: Clean minimalist neutral state
 */
const AttendanceProgressBars = ({
  todaySeconds = 0,
  todayTargetHours = 8.5,
  weeklySeconds = 0,
  weeklyTargetHours = 42.5,
  isLive = false,
  isRunning = false,
  sessionStatus = null, // 'active' | 'paused' | 'idle' | 'completed'
  hasActiveSession = false,
  idleSeconds = 0,
  onRefresh = null,
  isRefreshing = false,
  lastUpdated = null,
  className = ''
}) => {
  // ── Determine Effective Tracker State ──
  const effectiveStatus = useMemo(() => {
    if (sessionStatus) {
      const s = String(sessionStatus).toLowerCase();
      if (s === 'active' && isRunning) return 'running';
      if (s === 'idle') return 'idle';
      if (s === 'paused') return 'paused';
      if (s === 'completed') return 'completed';
    }
    if (isRunning || isLive) return 'running';
    if (hasActiveSession && !isRunning) return 'paused';
    if (idleSeconds > 0 && !isRunning && todaySeconds > 0) return 'idle';
    return 'ready';
  }, [sessionStatus, isRunning, isLive, hasActiveSession, idleSeconds, todaySeconds]);

  // ── Today's Stats ──
  const todayTargetSecs = Math.round((todayTargetHours || 8.5) * 3600);
  const todaySecs = Math.max(0, parseInt(todaySeconds, 10) || 0);
  const todayPct = todayTargetSecs > 0 ? Math.min(100, Math.round((todaySecs / todayTargetSecs) * 100)) : 0;
  const todayFillPct = todayTargetSecs > 0 ? Math.min(100, (todaySecs / todayTargetSecs) * 100) : 0;
  const todayFormatted = formatSecondsToHM(todaySecs);
  const todayTargetFormatted = formatSecondsToHM(todayTargetSecs);

  const todayMeta = useMemo(() => {
    if (todaySecs < todayTargetSecs) {
      const remaining = todayTargetSecs - todaySecs;
      return `${todayPct}% · ${formatSecondsToHM(remaining)} to go`;
    }
    const overtime = todaySecs - todayTargetSecs;
    if (overtime > 0) {
      return `100% · +${formatSecondsToHM(overtime)} overtime`;
    }
    return '100% · Goal completed';
  }, [todaySecs, todayTargetSecs, todayPct]);

  // ── Weekly Stats ──
  const weeklyTargetSecs = Math.round((weeklyTargetHours || 42.5) * 3600);
  const weekSecs = Math.max(0, parseInt(weeklySeconds, 10) || 0);
  const weeklyPct = weeklyTargetSecs > 0 ? Math.min(100, Math.round((weekSecs / weeklyTargetSecs) * 100)) : 0;
  const weeklyFillPct = weeklyTargetSecs > 0 ? Math.min(100, (weekSecs / weeklyTargetSecs) * 100) : 0;
  const weeklyFormatted = formatSecondsToHM(weekSecs);
  const weeklyTargetFormatted = formatSecondsToHM(weeklyTargetSecs);

  const weeklyMeta = useMemo(() => {
    if (weekSecs < weeklyTargetSecs) {
      const remaining = weeklyTargetSecs - weekSecs;
      return `${weeklyPct}% · ${formatSecondsToHM(remaining)} to go`;
    }
    const overtime = weekSecs - weeklyTargetSecs;
    if (overtime > 0) {
      return `100% · +${formatSecondsToHM(overtime)} overtime`;
    }
    return '100% · Goal completed';
  }, [weekSecs, weeklyTargetSecs, weeklyPct]);

  const displayTime = useMemo(() => {
    if (lastUpdated) {
      if (lastUpdated instanceof Date) {
        return lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      return String(lastUpdated);
    }
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }, [lastUpdated]);

  return (
    <div
      className={`bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-4 sm:py-3.5 sm:px-5 shadow-xs transition-all duration-300 space-y-3.5 my-6 ${className}`}
    >
      <style>{`
        @keyframes progressShimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(250%); }
        }
        @keyframes progressStripes {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
        @keyframes runnerStride {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-2px) rotate(3deg);
          }
          75% {
            transform: translateY(1px) rotate(-2deg);
          }
        }
        @keyframes runnerPulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.6), 0 0 16px rgba(16, 185, 129, 0.3);
          }
          50% {
            box-shadow: 0 0 14px rgba(16, 185, 129, 0.9), 0 0 24px rgba(16, 185, 129, 0.5);
          }
        }
        @keyframes weeklyRunnerPulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(168, 85, 247, 0.6), 0 0 16px rgba(168, 85, 247, 0.3);
          }
          50% {
            box-shadow: 0 0 14px rgba(168, 85, 247, 0.9), 0 0 24px rgba(168, 85, 247, 0.5);
          }
        }
      `}</style>

      {/* ── Row 1: Today's Hours ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5">
        {/* Top / Left info on mobile & desktop */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5 min-w-0 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-wide">
              Today
            </span>
          </div>

          <div className="flex items-baseline gap-1 font-mono shrink-0">
            <span className={`text-sm sm:text-[14px] font-black transition-colors ${
              effectiveStatus === 'idle'
                ? 'text-amber-600 dark:text-amber-400'
                : effectiveStatus === 'paused'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {todayFormatted}
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              / {todayTargetFormatted}
            </span>
          </div>

          <span className="text-[11.5px] sm:text-xs font-medium text-slate-400 dark:text-slate-400 shrink-0 whitespace-nowrap">
            {todayMeta}
          </span>
        </div>

        {/* Progress Bar Track Container with Floating Traveling Runner Icon Pin */}
        <div className="flex-1 min-w-[140px] relative flex items-center py-1">
          {/* Track Bar */}
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-[#25221c] overflow-hidden relative shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
                effectiveStatus === 'idle'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-xs shadow-orange-500/30'
                  : effectiveStatus === 'paused'
                  ? 'bg-gradient-to-r from-amber-500/90 to-amber-600/90'
                  : todayPct >= 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-xs shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs shadow-emerald-500/20'
              }`}
              style={{ width: `${Math.max(todayFillPct > 0 ? todayFillPct : (effectiveStatus === 'running' ? 2 : 0), 0)}%` }}
            >
              {/* 🟢 RUNNING STATE: Specular highlight beam flowing left to right */}
              {effectiveStatus === 'running' && (
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/45 to-transparent w-full"
                  style={{
                    animation: 'progressShimmer 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                />
              )}

              {/* ⚠️ INACTIVITY / IDLE STATE: Animated diagonal hazard caution stripes */}
              {effectiveStatus === 'idle' && (
                <div
                  className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.22)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.22)_75%,transparent_75%,transparent)] bg-[length:12px_12px]"
                  style={{
                    animation: 'progressStripes 1.2s linear infinite'
                  }}
                />
              )}

              {/* ⏸️ PAUSED STATE: Subtle static frosted stripes (indicates timer held) */}
              {effectiveStatus === 'paused' && (
                <div
                  className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.12)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.12)_75%,transparent_75%,transparent)] bg-[length:12px_12px] opacity-75"
                />
              )}
            </div>
          </div>

          {/* 📍 FLOATING TRAVELING STATUS PIN ON TODAY'S BAR */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out z-20 pointer-events-none select-none"
            style={{
              left: `clamp(14px, ${todayFillPct}%, calc(100% - 14px))`
            }}
          >
            {/* 🟢 RUNNING STATE: Athletic Runner Icon actively running with radar ping & stride motion */}
            {effectiveStatus === 'running' && (
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute h-7 w-7 rounded-full bg-emerald-400 opacity-60"></span>
                <div
                  className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 border-2 border-white dark:border-[#181612] flex items-center justify-center text-white"
                  style={{ animation: 'runnerPulse 2s infinite ease-in-out' }}
                >
                  <div style={{ animation: 'runnerStride 0.6s infinite ease-in-out' }}>
                    <RunningManIcon size={15} className="fill-white drop-shadow-xs ml-0.5" />
                  </div>
                </div>
              </div>
            )}

            {/* ⏸️ PAUSED STATE: Standing Person with Amber Pause Pill */}
            {effectiveStatus === 'paused' && (
              <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 border-2 border-white dark:border-[#181612] shadow-md flex items-center justify-center text-white">
                <StandingManIcon size={14} className="fill-white" />
              </div>
            )}

            {/* ⚠️ INACTIVITY / IDLE STATE: Bouncing Orange Alert Pin */}
            {effectiveStatus === 'idle' && (
              <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 border-2 border-white dark:border-[#181612] shadow-md flex items-center justify-center text-white animate-bounce">
                <AlertTriangle size={13} className="text-white" />
              </div>
            )}

            {/* ⏹️ STOPPED / SESSION READY STATE: Positioned at 0% Start Notch */}
            {effectiveStatus === 'ready' && (
              <div className="w-6.5 h-6.5 rounded-full bg-white dark:bg-[#25221c] border-2 border-slate-300 dark:border-slate-600 shadow-sm flex items-center justify-center text-slate-500 dark:text-slate-400">
                <StandingManIcon size={14} className="fill-slate-500 dark:fill-slate-400" />
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right status: Subtle status label */}
        <div className="hidden sm:flex items-center justify-end min-w-[130px] shrink-0 text-right">
          {effectiveStatus === 'running' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <RunningManIcon size={14} className="fill-emerald-600 dark:fill-emerald-400" />
              <span>Timer Running</span>
            </div>
          )}

          {effectiveStatus === 'paused' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Timer Paused</span>
            </div>
          )}

          {effectiveStatus === 'idle' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"></span>
              <span>Inactive</span>
            </div>
          )}

          {effectiveStatus === 'completed' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <CheckCircle2 size={12} className="text-blue-500" />
              <span>Completed</span>
            </div>
          )}

          {effectiveStatus === 'ready' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
              <StandingManIcon size={13} className="fill-slate-400 dark:fill-slate-500" />
              <span>Timer Stopped</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Subtle Divider ── */}
      <div className="h-px bg-slate-100 dark:bg-[#24211b] w-full" />

      {/* ── Row 2: Weekly Hours ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5">
        {/* Top / Left info on mobile & desktop */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5 min-w-0 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-wide">
              This Week
            </span>
          </div>

          <div className="flex items-baseline gap-1 font-mono shrink-0">
            <span className="text-sm sm:text-[14px] font-black text-purple-600 dark:text-purple-400">
              {weeklyFormatted}
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              / {weeklyTargetFormatted}
            </span>
          </div>

          <span className="text-[11.5px] sm:text-xs font-medium text-slate-400 dark:text-slate-400 shrink-0 whitespace-nowrap">
            {weeklyMeta}
          </span>

          {/* On mobile: refresh button shows at top right */}
          <div className="sm:hidden flex items-center">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh attendance"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-purple-600' : ''} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar Track Container with Floating Traveling Runner Icon Pin on This Week */}
        <div className="flex-1 min-w-[140px] relative flex items-center py-1">
          {/* Background Track */}
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-[#25221c] overflow-hidden relative shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
                weeklyPct >= 100
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-400 shadow-xs shadow-purple-500/30'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-xs shadow-purple-500/20'
              }`}
              style={{ width: `${weeklyFillPct}%` }}
            >
              {/* If tracking is actively running, show synchronized subtle shimmer on week bar */}
              {effectiveStatus === 'running' && (
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full"
                  style={{
                    animation: 'progressShimmer 2.8s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                />
              )}
            </div>
          </div>

          {/* 📍 FLOATING TRAVELING STATUS PIN ON THIS WEEK'S BAR (Positions at Weekly Progress Tip - Box 2) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out z-20 pointer-events-none select-none"
            style={{
              left: `clamp(14px, ${weeklyFillPct}%, calc(100% - 14px))`
            }}
          >
            {effectiveStatus === 'running' ? (
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute h-7 w-7 rounded-full bg-purple-400 opacity-60"></span>
                <div
                  className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 via-purple-500 to-indigo-500 border-2 border-white dark:border-[#181612] flex items-center justify-center text-white"
                  style={{ animation: 'weeklyRunnerPulse 2s infinite ease-in-out' }}
                >
                  <div style={{ animation: 'runnerStride 0.6s infinite ease-in-out' }}>
                    <RunningManIcon size={15} className="fill-white drop-shadow-xs ml-0.5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 border-2 border-white dark:border-[#181612] shadow-sm flex items-center justify-center text-white">
                <RunningManIcon size={13} className="fill-white" />
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right status: Updated timestamp + Refresh button (Matches screenshot 2) */}
        <div className="hidden sm:flex items-center justify-end gap-1.5 min-w-[150px] shrink-0 text-slate-400 dark:text-slate-400 text-xs font-medium">
          <Clock size={12} className="text-slate-400 shrink-0" />
          <span className="whitespace-nowrap text-[11px] font-semibold">Updated {displayTime}</span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh attendance stats"
              className="p-1 hover:text-slate-700 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-[#25221c] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-purple-600 dark:text-purple-400' : ''} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceProgressBars;
