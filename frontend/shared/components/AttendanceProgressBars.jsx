import React, { useMemo } from 'react';
import { Clock, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';

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
 * Automatically reflects real-time timer ticking, daily resets on day transition,
 * and weekly hour accumulations.
 */
const AttendanceProgressBars = ({
  todaySeconds = 0,
  todayTargetHours = 8.5,
  weeklySeconds = 0,
  weeklyTargetHours = 42.5,
  isLive = false,
  isRunning = false,
  onRefresh = null,
  isRefreshing = false,
  lastUpdated = null,
  className = ''
}) => {
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
      {/* ── Row 1: Today's Hours ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5">
        {/* Top / Left info on mobile & desktop */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 shrink-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide w-16 sm:w-20 shrink-0">
            Today
          </span>

          <div className="flex items-baseline gap-1 font-mono shrink-0">
            <span className="text-sm sm:text-[14px] font-black text-emerald-600 dark:text-emerald-400">
              {todayFormatted}
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              / {todayTargetFormatted}
            </span>
          </div>

          <span className="text-[11.5px] sm:text-xs font-medium text-slate-400 dark:text-slate-400 shrink-0 whitespace-nowrap">
            {todayMeta}
          </span>

          {/* On mobile: live badge shows at the top right */}
          <div className="sm:hidden flex items-center">
            {isRunning || isLive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Live
              </span>
            ) : null}
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="flex-1 min-w-[120px] h-2 sm:h-2.5 rounded-full bg-slate-100 dark:bg-[#25221c] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              todayPct >= 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-xs shadow-emerald-500/30'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
            }`}
            style={{ width: `${todayFillPct}%` }}
          />
        </div>

        {/* Desktop Right status: Live Session */}
        <div className="hidden sm:flex items-center justify-end min-w-[140px] shrink-0 text-right">
          {isRunning || isLive ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Session</span>
            </div>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Session Ready
            </span>
          )}
        </div>
      </div>

      {/* ── Subtle Divider ── */}
      <div className="h-px bg-slate-100 dark:bg-[#24211b] w-full" />

      {/* ── Row 2: Weekly Hours ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5">
        {/* Top / Left info on mobile & desktop */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 shrink-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide w-16 sm:w-20 shrink-0">
            This Week
          </span>

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

        {/* Progress Bar Track */}
        <div className="flex-1 min-w-[120px] h-2 sm:h-2.5 rounded-full bg-slate-100 dark:bg-[#25221c] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              weeklyPct >= 100
                ? 'bg-gradient-to-r from-purple-500 to-indigo-400 shadow-xs shadow-purple-500/30'
                : 'bg-gradient-to-r from-purple-500 to-indigo-500'
            }`}
            style={{ width: `${weeklyFillPct}%` }}
          />
        </div>

        {/* Desktop Right status: Updated timestamp + Refresh button (Matches screenshot 2) */}
        <div className="hidden sm:flex items-center justify-end gap-1.5 min-w-[140px] shrink-0 text-slate-400 dark:text-slate-400 text-xs font-medium">
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
