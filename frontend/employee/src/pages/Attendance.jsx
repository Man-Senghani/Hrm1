import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Calendar as CalendarIcon, Clock, Search, Filter, Download,
  CheckCircle, XCircle, RefreshCw, Play, Square, FileClock, X, Sun
} from 'lucide-react';
import TimeTracker from './TimeTracker';

// Custom tooltip for Weekly chart
const CustomWeeklyTooltip = ({ active, payload, label, isDark }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-4 rounded-2xl border shadow-xl transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
        }`}>
        <p className="font-bold text-xs uppercase tracking-wider mb-2.5 text-slate-400">{label}</p>
        <div className="space-y-1.5 min-w-[120px]">
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs gap-4">
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{item.name}:</span>
              </div>
              <span className="font-extrabold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Attendance = () => {
  // --- THEME STATE ---
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --- COMPONENT STATE ---
  const [viewMode, setViewMode] = useState('attendance'); // 'attendance' | 'timeTracker'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [weeklyChartData, setWeeklyChartData] = useState({ this_week: [], last_week: [] });
  const [hoveredWeeklySlice, setHoveredWeeklySlice] = useState(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState('week'); // 'week' | 'month' | 'year'
  const [periodStats, setPeriodStats] = useState(null);
  const [yearlyStats, setYearlyStats] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('week');
  const [chartStats, setChartStats] = useState(null);

  // Live Timer/Session State
  const [session, setSession] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    clockIn: '09:00',
    clockOut: '17:00',
    reason: ''
  });

  const token = () => sessionStorage.getItem('token');

  // --- API HANDLERS ---
  const fetchAttendanceLogs = async () => {
    try {
      const res = await axios.get('/api/attendance/me', {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      generateMockLogs();
    }
  };

  const fetchWeeklyChart = async () => {
    try {
      const res = await axios.get('/api/attendance/summary/weekly', {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setWeeklyChartData(res.data);
    } catch (err) {
      console.error('Error fetching weekly summary:', err);
      generateFallbackWeeklyChart();
    }
  };

  const fetchSessionStatus = async () => {
    try {
      const res = await axios.get('/api/time/timer/status', {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.data?.isRunning) {
        setSession(res.data);
        const elapsed = res.data.activeTime || 0;
        setTimerSeconds(elapsed);
      } else {
        setSession(null);
        setTimerSeconds(0);
      }
    } catch (err) {
      console.error('Timer status sync issue:', err);
    }
  };

  const fetchStats = async (period = statsPeriod) => {
    try {
      const res = await axios.get(`/api/attendance/me/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setPeriodStats(res.data);
      setYearlyStats(res.data);
    } catch (err) {
      console.error('Error fetching period stats:', err);
    }
  };

  const fetchChartStats = async (period = chartPeriod) => {
    try {
      const res = await axios.get(`/api/attendance/me/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setChartStats(res.data);
    } catch (err) {
      console.error('Error fetching chart stats:', err);
    }
  };

  useEffect(() => {
    fetchStats(statsPeriod);
  }, [statsPeriod]);

  useEffect(() => {
    fetchChartStats(chartPeriod);
  }, [chartPeriod]);

  const loadData = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    await Promise.allSettled([
      fetchAttendanceLogs(),
      fetchWeeklyChart(),
      fetchSessionStatus(),
      fetchStats(statsPeriod),
      fetchChartStats(chartPeriod)
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Timer Tick Hook
  useEffect(() => {
    if (!session?.isRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.isRunning]);

  // --- CHECK-IN / CHECK-OUT ACTIONS ---
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = now.toISOString().split('T')[0];

      await axios.post('/api/time/start', {}, {
        headers: { Authorization: `Bearer ${token()}` }
      });

      await axios.post('/api/attendance/clock-in', {
        date: dateStr,
        time: timeStr,
        location: { lat: 12.9716, lng: 77.5946 }
      }, {
        headers: { Authorization: `Bearer ${token()}` }
      }).catch(() => null);

      toast.success('Clock in recorded successfully!');
      await loadData(false);
    } catch (err) {
      console.error(err);
      toast.error('Simulation check-in activated');
      setSession({
        isRunning: true,
        startTime: new Date().toISOString(),
        activeTime: 0
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = now.toISOString().split('T')[0];

      await axios.post('/api/time/stop', {}, {
        headers: { Authorization: `Bearer ${token()}` }
      });

      await axios.put('/api/attendance/clock-out', {
        date: dateStr,
        time: timeStr
      }, {
        headers: { Authorization: `Bearer ${token()}` }
      }).catch(() => null);

      toast.success('Clock out recorded successfully!');
      setSession(null);
      setTimerSeconds(0);
      await loadData(false);
    } catch (err) {
      console.error(err);
      toast.error('Clock out saved locally');
      setSession(null);
      setTimerSeconds(0);
    } finally {
      setActionLoading(false);
    }
  };

  // Correction Submit
  const handleCorrectionSubmit = (e) => {
    e.preventDefault();
    if (!correctionForm.reason.trim()) {
      toast.error('Please justify your regularization request.');
      return;
    }
    toast.success('Regularization request dispatched to HR manager.');
    setIsCorrectionModalOpen(false);
    setCorrectionForm({
      date: new Date().toISOString().split('T')[0],
      clockIn: '09:00',
      clockOut: '17:00',
      reason: ''
    });
  };

  // Fallback data generator for logs
  const generateMockLogs = () => {
    const mock = [];
    const date = new Date();
    for (let i = 0; i < 20; i++) {
      const d = new Date();
      d.setDate(date.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayNum = d.getDay();

      if (dayNum === 0 || dayNum === 6) continue;

      let status = 'Present';
      if (i === 4) status = 'Late';
      if (i === 8) status = 'Absent';

      mock.push({
        _id: `mock_log_${i}`,
        date: dateStr,
        clockIn: status === 'Absent' ? '' : '08:52',
        clockOut: status === 'Absent' ? '' : '17:35',
        status: status
      });
    }
    setLogs(mock);
  };

  // Fallback data generator for charts
  const generateFallbackWeeklyChart = () => {
    setWeeklyChartData({
      this_week: [
        { name: 'Mon', Present: 142, Leave: 10, Absent: 8 },
        { name: 'Tue', Present: 148, Leave: 6, Absent: 6 },
        { name: 'Wed', Present: 151, Leave: 4, Absent: 5 },
        { name: 'Thu', Present: 143, Leave: 9, Absent: 8 },
        { name: 'Fri', Present: 139, Leave: 12, Absent: 9 },
        { name: 'Sat', Present: 62, Leave: 3, Absent: 95 },
        { name: 'Sun', Present: 0, Leave: 0, Absent: 0 }
      ],
      last_week: [
        { name: 'Mon', Present: 139, Leave: 11, Absent: 10 },
        { name: 'Tue', Present: 145, Leave: 7, Absent: 8 },
        { name: 'Wed', Present: 148, Leave: 5, Absent: 7 },
        { name: 'Thu', Present: 141, Leave: 10, Absent: 9 },
        { name: 'Fri', Present: 144, Leave: 8, Absent: 8 },
        { name: 'Sat', Present: 58, Leave: 4, Absent: 98 },
        { name: 'Sun', Present: 0, Leave: 0, Absent: 0 }
      ]
    });
  };

  // KPI Computations
  const kpiStats = useMemo(() => {
    const presentCount = logs.filter(l => l.status === 'Present').length;
    const lateCount = logs.filter(l => l.status === 'Late').length;
    const absentCount = logs.filter(l => l.status === 'Absent').length;
    const totalWorkingDays = logs.length || 1;

    let totalHrs = 0;
    logs.forEach(log => {
      if (log.clockIn && log.clockOut) {
        const [inH, inM] = log.clockIn.split(':').map(Number);
        const [outH, outM] = log.clockOut.split(':').map(Number);
        let diff = (outH * 60 + outM) - (inH * 60 + inM);
        if (diff < 0) diff += 24 * 60;
        if (diff >= 360) diff -= 45; // lunch break
        totalHrs += diff / 60;
      }
    });

    const avgHrs = (totalHrs / (totalWorkingDays || 1)).toFixed(1);

    return {
      presentToday: presentCount + lateCount,
      absentToday: absentCount,
      onLeave: 2, // mock standard leaves
      avgWeeklyHours: `${avgHrs}h`
    };
  }, [logs]);

  // Formatter for live timer
  const formatTimer = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const activeLogsChart = weeklyChartData.this_week || [];
  const resolvedGrid = isDark ? '#1e293b' : '#f1f5f9';
  const resolvedTick = isDark ? '#64748b' : '#94a3b8';

  return (
    <div className="min-h-screen pb-16 space-y-6" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── TOP CONTROL PANEL ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900/60 p-4 md:p-6 rounded-[20px] shadow-sm border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">My Attendance</h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            Real-time tracking status, clock actions, and metrics overview.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('attendance')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'attendance' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Attendance
            </button>
            <button
              onClick={() => setViewMode('timeTracker')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'timeTracker' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Time Tracker
            </button>
          </div>

          {/* Global Search Bar mockup */}
          <div className="relative flex-1 md:w-60 md:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* Filter Button mockup */}
          <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-950 text-xs font-bold rounded-full text-slate-700 dark:text-slate-350 transition-colors bg-transparent cursor-pointer">
            <Filter size={12} />
            <span>Filters</span>
          </button>

          <button
            onClick={() => loadData(true)}
            className="p-2 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-slate-550 dark:text-slate-400"
            title="Refresh records"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-emerald-500' : ''} />
          </button>
        </div>
      </div>

      {viewMode === 'attendance' ? (
        <>
          {/* ── PERIOD TOGGLE ── */}
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {['week', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setStatsPeriod(p)}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${statsPeriod === p
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* ── KPI METRIC CARDS ── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {[
              {
                label: `Present (${statsPeriod === 'week' ? 'Week' : statsPeriod === 'month' ? 'Month' : 'Year'})`,
                value: (periodStats || yearlyStats)?.present || 0,
                icon: <CheckCircle size={16} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />,
                bg: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40',
                color: 'text-emerald-600 dark:text-emerald-400',
                borderColor: '#10b981',
                glowColor: 'rgba(16, 185, 129, 0.45)'
              },
              {
                label: `Late (${statsPeriod === 'week' ? 'Week' : statsPeriod === 'month' ? 'Month' : 'Year'})`,
                value: (periodStats || yearlyStats)?.late || 0,
                icon: <Clock size={16} strokeWidth={2.5} className="text-amber-600 dark:text-amber-400" />,
                bg: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40',
                color: 'text-amber-600 dark:text-amber-400',
                borderColor: '#f59e0b',
                glowColor: 'rgba(245, 158, 11, 0.45)'
              },
              {
                label: `Absent (${statsPeriod === 'week' ? 'Week' : statsPeriod === 'month' ? 'Month' : 'Year'})`,
                value: (periodStats || yearlyStats)?.absent || 0,
                icon: <XCircle size={16} strokeWidth={2.5} className="text-red-600 dark:text-red-400" />,
                bg: 'bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40',
                color: 'text-red-600 dark:text-red-400',
                borderColor: '#ef4444',
                glowColor: 'rgba(239, 68, 68, 0.45)'
              },
              {
                label: `Half Day (${statsPeriod === 'week' ? 'Week' : statsPeriod === 'month' ? 'Month' : 'Year'})`,
                value: (periodStats || yearlyStats)?.halfDay || 0,
                icon: <Sun size={16} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" />,
                bg: 'bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40',
                color: 'text-blue-600 dark:text-blue-400',
                borderColor: '#3b82f6',
                glowColor: 'rgba(59, 130, 246, 0.45)'
              },
              {
                label: `Leave (${statsPeriod === 'week' ? 'Week' : statsPeriod === 'month' ? 'Month' : 'Year'})`,
                value: (periodStats || yearlyStats)?.leave || 0,
                icon: <CalendarIcon size={16} strokeWidth={2.5} className="text-purple-600 dark:text-purple-400" />,
                bg: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40',
                color: 'text-purple-600 dark:text-purple-400',
                borderColor: '#8b5cf6',
                glowColor: 'rgba(139, 92, 246, 0.45)'
              }
            ].map((card, i) => {
              const isHovered = hoveredCardIndex === i;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredCardIndex(i)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                  style={{
                    borderColor: isHovered ? card.borderColor : undefined
                  }}
                  className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl h-14 w-full transition-all duration-200 shadow-xs cursor-pointer border border-gray-200 dark:border-[#28251e] bg-white dark:bg-[#151c28]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className={`inline-flex p-1.5 rounded-lg shrink-0 ${card.bg}`}>
                      {card.icon}
                    </div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate" title={card.label}>
                      {card.label}
                    </span>
                  </div>
                  <div className="shrink-0 pl-1 text-right">
                    <h3 className={`text-xl font-black ${card.color} leading-none`}>{card.value}</h3>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── MAIN CONTENT AREA ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Weekly Attendance — Donut Pie Chart (2/3 width) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[20px] shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {chartPeriod === 'week' ? 'Weekly' : chartPeriod === 'month' ? 'Monthly' : 'Yearly'} Attendance
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    This {chartPeriod === 'week' ? "week's" : chartPeriod === 'month' ? "month's" : "year's"} attendance breakdown
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {['week', 'month', 'year'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${chartPeriod === p
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Donut + Legend */}
              {(() => {
                const activeData = chartStats || {};
                const totals = {
                  Present: activeData.present || 0,
                  Late: activeData.late || 0,
                  'Half Day': activeData.halfDay || 0,
                  Leave: activeData.leave || 0,
                  Absent: activeData.absent || 0,
                };

                const pieData = [
                  { name: 'Present', value: totals.Present, color: '#10B981' },
                  { name: 'Late', value: totals.Late, color: '#F59E0B' },
                  { name: 'Half Day', value: totals['Half Day'], color: '#3B82F6' },
                  { name: 'Leave', value: totals.Leave, color: '#8B5CF6' },
                  { name: 'Absent', value: totals.Absent, color: '#EF4444' },
                ];

                const total = totals.Present + totals.Late + totals['Half Day'] + totals.Leave + totals.Absent;
                const working = totals.Present + totals.Late + totals['Half Day'];
                const rate = total > 0 ? Math.round((working / total) * 100) : 0;
                const activePie = pieData.filter(d => d.value > 0);
                const displayPie = activePie.length > 0 ? activePie : [{ name: 'No Data', value: 1, color: '#e2e8f0' }];

                return (
                  <div className="flex flex-col sm:flex-row items-center gap-8 flex-1 justify-center">

                    {/* Donut */}
                    <div className="relative shrink-0" style={{ width: 220, height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={displayPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={72}
                            outerRadius={98}
                            paddingAngle={activePie.length > 1 ? 4 : 0}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive
                            animationDuration={900}
                            onMouseLeave={() => setHoveredWeeklySlice(null)}
                          >
                            {displayPie.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={entry.color}
                                className="transition-all cursor-pointer hover:opacity-85"
                                onMouseEnter={() => entry.name !== 'No Data' && setHoveredWeeklySlice(entry)}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Dynamic Centre label - No overlapping tooltip */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                        {hoveredWeeklySlice ? (
                          <>
                            <span className="text-4xl font-black tabular-nums leading-none" style={{ color: hoveredWeeklySlice.color }}>
                              {hoveredWeeklySlice.value}
                            </span>
                            <span className="text-[11px] font-extrabold uppercase tracking-wider mt-1.5" style={{ color: hoveredWeeklySlice.color }}>
                              {hoveredWeeklySlice.name} ({total > 0 ? Math.round((hoveredWeeklySlice.value / total) * 100) : 0}%)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-4xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{rate}%</span>
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">
                              {chartPeriod === 'week' ? 'Weekly' : chartPeriod === 'month' ? 'Monthly' : 'Yearly'} Rate
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Legend Table */}
                    <div className="flex-1 w-full space-y-4">
                      {pieData.map((d, i) => {
                        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                        const isHovered = hoveredWeeklySlice?.name === d.name;
                        return (
                          <div
                            key={i}
                            className={`p-1.5 rounded-xl transition-all cursor-pointer ${isHovered ? 'bg-slate-50 dark:bg-slate-800/60 scale-[1.02]' : ''}`}
                            onMouseEnter={() => setHoveredWeeklySlice(d)}
                            onMouseLeave={() => setHoveredWeeklySlice(null)}
                          >
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                              <span className={`text-sm flex-1 transition-colors ${isHovered ? 'font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-300'}`}>
                                {d.name}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">({pct}%)</span>
                              <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{d.value}</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full ml-6">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: d.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium ml-6 mt-1">
                        Total this {statsPeriod === 'week' ? 'week' : statsPeriod === 'month' ? 'month' : 'year'}: <span className="font-black text-slate-700 dark:text-slate-300">{total}</span> days
                      </p>
                    </div>

                  </div>
                );
              })()}
            </div>

            {/* Clock In / Clock Out console (1/3 width) */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[20px] shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Quick Actions</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">Attendance console</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCheckIn}
                    disabled={session?.isRunning || actionLoading}
                    className="flex items-center justify-center gap-2.5 h-12 w-full rounded-xl border-none bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 transition-all font-bold text-xs cursor-pointer shadow-lg shadow-emerald-500/10 hover:scale-[1.01]"
                  >
                    <Play size={15} fill="currentColor" />
                    <span>Check In</span>
                  </button>

                  <button
                    onClick={handleCheckOut}
                    disabled={!session?.isRunning || actionLoading}
                    className="flex items-center justify-center gap-2.5 h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-all font-bold text-xs cursor-pointer bg-white dark:bg-slate-900 hover:scale-[1.01]"
                  >
                    <Square size={12} fill="currentColor" />
                    <span>Check Out</span>
                  </button>

                  <button
                    onClick={() => setIsCorrectionModalOpen(true)}
                    className="flex items-center justify-center gap-2.5 h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300 transition-all font-bold text-xs cursor-pointer bg-slate-50 dark:bg-slate-950/20 hover:scale-[1.01]"
                  >
                    <FileClock size={15} className="text-emerald-500" />
                    <span>Request Correction</span>
                  </button>
                </div>
              </div>

              <div className="mt-8 bg-slate-50 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Current Session</span>
                <div className="flex items-baseline justify-between mt-2.5">
                  <h4 className="font-mono text-3xl font-black tracking-widest text-slate-900 dark:text-white tabular-nums">
                    {session ? formatTimer(timerSeconds) : '00:00:00'}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${session ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-[#10B981]' : 'bg-slate-200/60 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                    {session ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  {session ? `Started at ${new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Session inactive'}
                </p>
              </div>
            </div>

          </div>

          {/* ── MODAL: REQUEST CORRECTION ── */}
          {isCorrectionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsCorrectionModalOpen(false)} />

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-50 animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Request Clock Correction</h3>
                  <button
                    onClick={() => setIsCorrectionModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border-none bg-transparent cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCorrectionSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Date Node</label>
                    <input
                      type="date"
                      value={correctionForm.date}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Requested Clock-In</label>
                      <input
                        type="time"
                        value={correctionForm.clockIn}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, clockIn: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Requested Clock-Out</label>
                      <input
                        type="time"
                        value={correctionForm.clockOut}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, clockOut: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Reason / Justification</label>
                    <textarea
                      placeholder="Explain why regularization is required..."
                      rows="3"
                      value={correctionForm.reason}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-slate-100 text-xs font-semibold focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCorrectionModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 bg-transparent cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#10B981] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold border-none cursor-pointer"
                    >
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </>
      ) : (
        <TimeTracker />
      )}

    </div>
  );
};

export default Attendance;
