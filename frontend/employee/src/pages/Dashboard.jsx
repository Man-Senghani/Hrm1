import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, LineChart, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Clock, Calendar, FileText, CheckCircle,
  LogIn, LogOut, Briefcase, Target, Bell, Star,
  CalendarCheck, CalendarX, Cake, Gift, ArrowRight, CalendarPlus, User, Download,
  PartyPopper, Sparkles, Heart, Smile, TrendingUp, ChevronDown,
  AlertTriangle, Monitor, X, ExternalLink, RefreshCw, Activity
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { startDesktopTracker, stopDesktopTracker } from '@shared/services/desktopTrackerService';
import DesktopAppRequiredModal from '@shared/components/DesktopAppRequiredModal';

// ─── HELPERS ─────────────────────────────────────────────────
const token = () => sessionStorage.getItem('token');
const api = (url, opts = {}) => axios.get(url, { headers: { Authorization: `Bearer ${token()}` }, ...opts });

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const fmtDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const fmtHrs = (secs) => {
  if (!secs && secs !== 0) return '0h 0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtCurrency = (n) => n != null ? `₹ ${Number(n).toLocaleString('en-IN')}` : '--';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── STYLED COMPONENTS ───────────────────────────────────────
const Card = ({ children, className = '', onClick, ...props }) => (
  <div
    className={`bg-white dark:bg-[#0f0d0a] border border-[#c5c0b1] dark:border-[#38352e] rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] ${className}`}
    onClick={onClick}
    {...props}
  >
    {children}
  </div>
);

const SectionHeader = ({ title, action }) => (
  <div className="flex justify-between items-center mb-5">
    <h2 className="font-bold text-[#201515] dark:text-white" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '18px' }}>{title}</h2>
    {action && (typeof action === 'string' ? <span className="text-[#00a76b] font-semibold text-sm cursor-pointer hover:underline flex items-center gap-1">{action}</span> : action)}
  </div>
);

const DEMO_EVENTS = [
  {
    id: 'demo-1',
    name: 'Sarah Jenkins',
    role: 'Senior UI/UX Designer',
    department: 'Design Team',
    type: 'birthday',
    daysLeft: 0,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    date: 'Today'
  },
  {
    id: 'demo-2',
    name: 'David Chen',
    role: 'Full Stack Engineer',
    department: 'Engineering',
    type: 'anniversary',
    years: 3,
    daysLeft: 2,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    date: 'In 2 days'
  },
  {
    id: 'demo-3',
    name: 'Emily Watson',
    role: 'HR Manager',
    department: 'Human Resources',
    type: 'birthday',
    daysLeft: 5,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    date: 'In 5 days'
  },
  {
    id: 'demo-4',
    name: 'Alex Rivera',
    role: 'Product Manager',
    department: 'Product',
    type: 'anniversary',
    years: 1,
    daysLeft: 9,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    date: 'In 9 days'
  }
];

// ─── DASHBOARD ───────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // State
  const [profile, setProfile] = useState(null);
  const [timerStatus, setTimerStatus] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [payroll, setPayroll] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveQuotas, setLeaveQuotas] = useState({ sick: 10, earned: 20, casual: 12, compOff: 3, optionalHoliday: 1 });
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [dbHolidays, setDbHolidays] = useState([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [wishedEvents, setWishedEvents] = useState([]);
  const [attMetrics, setAttMetrics] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [trackerMissingModal, setTrackerMissingModal] = useState(false);
  const [timer, setTimer] = useState(0);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const clockInterval = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Charts
  const [timeRange, setTimeRange] = useState('weekly');
  const [hoveredTaskIndex, setHoveredTaskIndex] = useState(null);
  const [hoveredSummaryCardIndex, setHoveredSummaryCardIndex] = useState(null);
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);
  const timeRangeRef = useRef(null);
  const [weeklyChart, setWeeklyChart] = useState([]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (timeRangeRef.current && !timeRangeRef.current.contains(e.target)) {
        setTimeRangeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAll = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const uidParam = id ? `?userId=${id}` : '';
      const uidParamAmp = id ? `&userId=${id}` : '';

      const [profileRes, timerRes, dashRes, payrollRes, leaveRes, taskRes, notifRes, attRes, eventsRes, assignedEventsRes, quotasRes, holidaysRes] = await Promise.allSettled([
        api(id ? `/api/employees/${id}` : '/api/auth/me'),
        api(`/api/time/timer/status${uidParam}`),
        api(`/api/time/dashboard?timeRange=${timeRange}${uidParamAmp}`),
        api(`/api/payroll/me${uidParam}`),
        api(`/api/leaves/my${uidParam}`),
        api(`/api/tasks${uidParam}`),
        api(`/api/notifications${uidParam}`),
        api(`/api/attendance/me${uidParam}`),
        api(`/api/employees/events${uidParam}`),
        api(`/api/events/assigned${uidParam}`),
        api(`/api/leaves/my-quotas${uidParam}`),
        api('/api/holidays')
      ]);

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      if (timerRes.status === 'fulfilled') setTimerStatus(timerRes.value.data);

      if (dashRes.status === 'fulfilled') {
        setDashData(dashRes.value.data);
      }

      if (payrollRes.status === 'fulfilled') setPayroll(Array.isArray(payrollRes.value.data) ? payrollRes.value.data : []);
      if (leaveRes.status === 'fulfilled') setLeaves(Array.isArray(leaveRes.value.data) ? leaveRes.value.data : []);
      if (quotasRes.status === 'fulfilled' && quotasRes.value.data) setLeaveQuotas(quotasRes.value.data);
      if (taskRes.status === 'fulfilled') setTasks(Array.isArray(taskRes.value.data) ? taskRes.value.data : (taskRes.value.data?.data || []));
      if (notifRes.status === 'fulfilled') setNotifications(Array.isArray(notifRes.value.data) ? notifRes.value.data : []);

      if (eventsRes.status === 'fulfilled') {
        const rawEvents = Array.isArray(eventsRes.value.data) ? eventsRes.value.data : [];
        const filtered = rawEvents.filter(e => e.daysLeft >= 0);
        setEvents(filtered.length > 0 ? filtered : DEMO_EVENTS);
      } else {
        setEvents(DEMO_EVENTS);
      }
      if (assignedEventsRes && assignedEventsRes.status === 'fulfilled') {
        setAssignedEvents(Array.isArray(assignedEventsRes.value.data?.data) ? assignedEventsRes.value.data.data : []);
      }

      if (holidaysRes.status === 'fulfilled') {
        const rawHolidays = Array.isArray(holidaysRes.value.data) ? holidaysRes.value.data : (holidaysRes.value.data?.data || []);
        if (rawHolidays.length > 0) {
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const parsed = rawHolidays.map(h => {
            const hDate = new Date(h.date || h.startDate);
            const diffTime = hDate - todayDate;
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return {
              name: h.title || h.name,
              type: h.type || 'Holiday',
              date: hDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              daysLeft
            };
          }).filter(h => h.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3);
          setDbHolidays(parsed);
        }
      }

      if (attRes.status === 'fulfilled') {
        const att = Array.isArray(attRes.value.data) ? attRes.value.data : [];
        const fetchedLeaves = leaveRes && leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value.data) ? leaveRes.value.data : [];
        setAttendance(att);

        const formatDateKey = (d) => {
          if (!d) return '';
          if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
          const obj = new Date(d);
          if (isNaN(obj.getTime())) return '';
          const y = obj.getFullYear();
          const m = String(obj.getMonth() + 1).padStart(2, '0');
          const day = String(obj.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        const now = new Date();
        const todayStr = formatDateKey(now);

        let startDate, endDate;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        if (timeRange === 'weekly') {
          startDate = new Date(startOfWeek);
          endDate = new Date(startOfWeek);
          endDate.setDate(startOfWeek.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        const startStr = formatDateKey(startDate);
        const endStr = formatDateKey(endDate);

        // Attendance records within selected period
        const periodAtt = att.filter(a => {
          const dStr = formatDateKey(a.date);
          return dStr >= startStr && dStr <= endStr;
        });

        // Present count in selected period from MongoDB
        const periodPresentCount = periodAtt.filter(a => String(a.status).toLowerCase() === 'present').length;

        // Half Day count in selected period from MongoDB
        const periodHalfDayCount = periodAtt.filter(a => String(a.status).toLowerCase() === 'half day').length;

        // Late Arrivals count in selected period from MongoDB
        const periodLateCount = periodAtt.filter(a => String(a.status).toLowerCase() === 'late').length;

        // Absences count in selected period from MongoDB (weekdays up to today without clock-in and without approved leave)
        let periodAbsentCount = 0;
        const calcEnd = now < endDate ? now : endDate;

        for (let d = new Date(startDate); d <= calcEnd; d.setDate(d.getDate() + 1)) {
          const dStr = formatDateKey(d);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          const record = att.find(a => formatDateKey(a.date) === dStr);
          if (record) {
            if (String(record.status).toLowerCase() === 'absent') {
              periodAbsentCount++;
            }
          } else {
            const dTime = d.getTime();
            const hasLeave = fetchedLeaves.some(l => {
              if (String(l.status).toLowerCase() !== 'approved') return false;
              const lStart = new Date(l.startDate).setHours(0, 0, 0, 0);
              const lEnd = new Date(l.endDate).setHours(23, 59, 59, 999);
              return dTime >= lStart && dTime <= lEnd;
            });

            if (!hasLeave && !isWeekend && dStr <= todayStr) {
              periodAbsentCount++;
            }
          }
        }

        const thisMonthAtt = att.filter(a => {
          const d = new Date(a.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        let workingDays = 0;
        for (let i = 1; i <= now.getDate(); i++) {
          if (new Date(now.getFullYear(), now.getMonth(), i).getDay() !== 0) workingDays++;
        }

        const halfDays = thisMonthAtt.filter(a => String(a.status).toLowerCase() === 'half day').length;
        const presentMonth = thisMonthAtt.filter(a => ['present', 'late'].includes(String(a.status).toLowerCase())).length;
        const effectiveMonth = presentMonth + (halfDays * 0.5);

        setAttMetrics({
          thisWeek: periodAtt.length,
          thisMonth: effectiveMonth,
          workingDays: workingDays,
          presentCount: periodPresentCount,
          halfDayCount: periodHalfDayCount,
          lateCount: periodLateCount,
          absentCount: periodAbsentCount,
          halfDays: halfDays,
          percentage: workingDays > 0 ? Math.round((effectiveMonth / workingDays) * 100) : 100
        });

        const getDayValue = (dateObj) => {
          if (dateObj > now) return null;
          const dStr = formatDateKey(dateObj);
          const record = att.find(a => formatDateKey(a.date) === dStr);
          if (!record) return 0;
          const statusLower = String(record.status).toLowerCase();
          if (statusLower === 'present' || statusLower === 'late') return 100;
          if (statusLower === 'half day') return 50;
          return 0;
        };

        let chart = [];
        if (timeRange === 'weekly') {
          chart = WEEK_DAYS.map((dayName, i) => {
            const dateObj = new Date(startOfWeek);
            dateObj.setDate(startOfWeek.getDate() + i);
            return { day: dayName, active: getDayValue(dateObj) };
          });
        } else {
          const daysInMonth = now.getDate();
          for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(now.getFullYear(), now.getMonth(), i);
            const dStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            chart.push({ day: dStr, active: getDayValue(dateObj) });
          }
        }
        setWeeklyChart(chart);
      }
    } catch (e) {
      console.error('Dashboard fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!timerStatus) return;
    const isRunning = timerStatus.isRunning !== undefined ? timerStatus.isRunning : timerStatus.status === 'active';
    const baseTime = timerStatus.activeTime || 0;

    if (isRunning) {
      const receivedAt = Date.now();
      const interval = setInterval(() => {
        const elapsedSincePoll = Math.floor((Date.now() - receivedAt) / 1000);
        setTimer(baseTime + Math.max(0, elapsedSincePoll));
      }, 1000);
      setTimer(baseTime);
      return () => clearInterval(interval);
    } else {
      setTimer(baseTime);
    }
  }, [timerStatus]);

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const trackerRes = await startDesktopTracker(token());
      if (!trackerRes.success) {
        setTrackerMissingModal(true);
        return;
      }

      await axios.post('/api/attendance/clock-in', {}, { headers: { Authorization: `Bearer ${token()}` } });
      try {
        await axios.post('/api/time/start', {}, { headers: { Authorization: `Bearer ${token()}` } });
      } catch (_) { }

      setTimerStatus(s => ({ ...s, isRunning: true }));
      toast.success('Check-in successful & Desktop Tracker started!', {
        duration: 3500,
        style: {
          borderRadius: '12px',
          background: '#1c1917',
          color: '#fff',
          border: '1px solid #10b981',
          fontSize: '13px',
          fontWeight: '600'
        }
      });
      fetchAll(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-in failed');
    } finally { setCheckInLoading(false); }
  };

  const handleCheckOut = async () => {
    setCheckInLoading(true);
    try {
      // 1. Attempt to open desktop tracker window & show confirmation modal
      const trackerActive = await stopDesktopTracker();
      if (trackerActive) {
        toast('Please confirm check-out in FluidHR Tracker app.', {
          icon: '⚡',
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#1c1917',
            color: '#fff',
            border: '1px solid #00a76b',
            fontSize: '13px',
            fontWeight: '600'
          }
        });
        setCheckInLoading(false);
        return;
      }

      // 2. Fallback if desktop app is not running: check out directly
      await axios.put('/api/attendance/clock-out', {}, { headers: { Authorization: `Bearer ${token()}` } });
      try {
        await axios.post('/api/time/stop', {}, { headers: { Authorization: `Bearer ${token()}` } });
      } catch (_) { }
      setTimerStatus(s => ({ ...s, isRunning: false }));
      toast.success('Checked out successfully & Tracker stopped.');
      fetchAll(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-out failed');
    } finally { setCheckInLoading(false); }
  };

  // ── Derived Data from MongoDB ──
  const isCheckedIn = Boolean(
    timerStatus?.isRunning ||
    timerStatus?.hasActiveSession ||
    ['active', 'paused', 'idle'].includes(timerStatus?.status) ||
    (attMetrics?.today?.checkInTime && !attMetrics?.today?.checkOutTime)
  );
  const checkInTime = attMetrics?.today?.checkInTime
    ? new Date(attMetrics.today.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : (timerStatus?.startTime ? new Date(timerStatus.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : null);
  const displayName = profile?.name || (profile?.profile ? `${profile.profile.firstName || ''} ${profile.profile.lastName || ''}`.trim() : '') || 'Employee';
  const firstName = displayName.split(' ')[0];

  const todayHours = fmtHrs(timer);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const todayDateStr = now.toISOString().split('T')[0];

  const pastDaysWeeklySeconds = attendance
    .filter(a => {
      const d = new Date(a.date);
      return d >= startOfWeek && a.date !== todayDateStr;
    })
    .reduce((sum, a) => sum + ((Number(a.totalHours) || 0) * 3600), 0);

  const totalWeeklySeconds = pastDaysWeeklySeconds + (timer || 0);
  const weeklyHours = fmtHrs(totalWeeklySeconds);

  const getCatKey = (typeStr) => {
    if (!typeStr) return '';
    const str = String(typeStr).toLowerCase().trim();
    if (str.includes('casual') || str.includes('cl') || str === 'cl') return 'casual';
    if (str.includes('sick') || str.includes('sl') || str === 'sl') return 'sick';
    if (str.includes('earned') || str.includes('el') || str.includes('annual') || str === 'el') return 'earned';
    if (str.includes('comp') || str === 'co') return 'compoff';
    if (str.includes('optional') || str.includes('oh')) return 'optional';
    return str;
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const utc1 = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
    const utc2 = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
    return Math.max(1, Math.floor((utc2 - utc1) / (1000 * 3600 * 24)) + 1);
  };

  const getLeaveDays = (l) => {
    if (!l) return 0;
    if (l.startDate && l.endDate) {
      return calculateDays(l.startDate, l.endDate);
    }
    return l.totalDays || 1;
  };

  const approvedLeavesArray = leaves.filter(l => l.status?.toLowerCase() === 'approved');
  const usedEarned = approvedLeavesArray.filter(l => getCatKey(l.leaveType) === 'earned').reduce((acc, curr) => acc + getLeaveDays(curr), 0);
  const usedSick = approvedLeavesArray.filter(l => getCatKey(l.leaveType) === 'sick').reduce((acc, curr) => acc + getLeaveDays(curr), 0);
  const usedCasual = approvedLeavesArray.filter(l => getCatKey(l.leaveType) === 'casual').reduce((acc, curr) => acc + getLeaveDays(curr), 0);
  const usedCompOff = approvedLeavesArray.filter(l => getCatKey(l.leaveType) === 'compoff').reduce((acc, curr) => acc + getLeaveDays(curr), 0);
  const usedOptional = approvedLeavesArray.filter(l => getCatKey(l.leaveType) === 'optional').reduce((acc, curr) => acc + getLeaveDays(curr), 0);

  const totalAllocated = Math.round((leaveQuotas.earned || 20) + (leaveQuotas.sick || 10) + (leaveQuotas.casual || 12) + (leaveQuotas.compOff || 3) + (leaveQuotas.optionalHoliday || 1));
  const totalUsedLeaves = Math.round(usedEarned + usedSick + usedCasual + usedOptional + usedCompOff);
  const totalLeaveBalance = Math.round(Math.max(0, totalAllocated - totalUsedLeaves));

  const approvedLeavesDays = Math.round(approvedLeavesArray.reduce((acc, curr) => acc + getLeaveDays(curr), 0));
  const pendingLeaves = leaves.filter(l => l.status?.toLowerCase() === 'pending' || l.status?.toLowerCase() === 'cancellation_pending').length;
  const leavesTakenThisMonth = leaves.filter(l => l.status === 'approved' && new Date(l.startDate).getMonth() === new Date().getMonth()).length;

  const completedTasks = tasks.filter(t => ['completed', 'done'].includes((t.status || '').toLowerCase())).length;
  const ongoingTasks = tasks.filter(t => ['in progress', 'in-progress', 'ongoing'].includes((t.status || '').toLowerCase())).length;
  const overdueTasks = tasks.filter(t => (t.status || '').toLowerCase() === 'overdue' || (t.dueDate && new Date(t.dueDate) < new Date() && !['completed', 'done'].includes((t.status || '').toLowerCase()))).length;
  const pendingTasks = tasks.filter(t => ['pending', 'to do', 'todo', 'upcoming'].includes((t.status || '').toLowerCase()) && !(t.dueDate && new Date(t.dueDate) < new Date())).length;
  const totalTasks = tasks.length;

  const recentPayslips = payroll.length > 0 ? payroll.slice(0, 3) : [
    { month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }), createdAt: new Date(), netPay: 45000, amount: 45000 },
    { month: new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('default', { month: 'long', year: 'numeric' }), createdAt: new Date(new Date().setMonth(new Date().getMonth() - 1)), netPay: 45000, amount: 45000 }
  ];

  const allHolidaysFallback = [
    { name: 'Makar Sankranti', dateStr: '2026-01-14', type: 'Festival' },
    { name: 'Republic Day', dateStr: '2026-01-26', type: 'National' },
    { name: 'Maha Shivaratri', dateStr: '2026-02-14', type: 'Festival' },
    { name: 'Holi', dateStr: '2026-03-03', type: 'Festival' },
    { name: 'Ram Navami', dateStr: '2026-03-27', type: 'Festival' },
    { name: 'Independence Day', dateStr: '2026-08-15', type: 'National' },
    { name: 'Raksha Bandhan', dateStr: '2026-08-28', type: 'Festival' },
    { name: 'Janmashtami', dateStr: '2026-09-04', type: 'Festival' },
    { name: 'Ganesh Chaturthi', dateStr: '2026-09-14', type: 'Festival' },
    { name: 'Gandhi Jayanti', dateStr: '2026-10-02', type: 'National' },
    { name: 'Dussehra', dateStr: '2026-10-19', type: 'Festival' },
    { name: 'Diwali', dateStr: '2026-11-08', type: 'Festival' },
    { name: 'Christmas', dateStr: '2026-12-25', type: 'Festival' }
  ];

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const holidaysList = dbHolidays.length > 0 ? dbHolidays : allHolidaysFallback
    .map(h => {
      const parts = h.dateStr.split('-');
      const hDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const diffTime = hDate - todayDate;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        name: h.name,
        type: h.type,
        date: hDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        daysLeft
      };
    })
    .filter(h => h.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const todayDateMidnight = new Date();
  todayDateMidnight.setHours(0, 0, 0, 0);

  const upcomingEvents = assignedEvents
    .filter(e => new Date(e.date) >= todayDateMidnight)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-[#F8F9FB] dark:bg-[#110e0c] w-full h-full">
        <div className="relative flex justify-center items-center h-20 w-20">
          <div className="absolute animate-ping w-16 h-16 rounded-full bg-[#00a76b] opacity-20"></div>
          <Activity className="animate-bounce text-[#00a76b] relative z-10" size={42} />
        </div>
        <p className="font-bold text-xl text-gray-800 dark:text-gray-200 mt-2 tracking-wide">
          Loading Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-0 pb-4 font-['Inter',sans-serif]" style={{ color: 'var(--zap-charcoal)' }}>

      {/* 1. WELCOME SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p className="text-[#939084] mt-1">Have a productive day at work.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 whitespace-nowrap bg-white dark:bg-[#161311] border border-gray-200 dark:border-[#28251e] px-4 py-2 rounded-xl shadow-xs text-xs font-bold text-gray-700 dark:text-gray-200 font-mono tabular-nums">
            <Clock size={16} className="text-[#00a76b] shrink-0 animate-pulse" />
            <span>{liveTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap bg-white dark:bg-[#161311] border border-gray-200 dark:border-[#28251e] px-4 py-2 rounded-xl shadow-xs text-xs font-semibold text-gray-700 dark:text-gray-200">
            <Calendar size={16} className="text-[#00a76b] shrink-0" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* 2. TODAY'S SUMMARY (5 cards) */}
      <SectionHeader title="Today's Summary" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {[
          {
            title: "Today's Attendance",
            value: isCheckedIn ? 'Present' : 'Not Checked-In',
            subValue: isCheckedIn && checkInTime ? `(${checkInTime})` : null,
            icon: CheckCircle,
            color: 'text-emerald-600 dark:text-emerald-400',
            hoverClass: 'hover:!border-[#10b981] dark:hover:!border-[#34d399]',
            borderColor: '#10b981',
            glowColor: 'rgba(16, 185, 129, 0.45)',
            bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40',
            onClick: () => navigate('/employee/attendance')
          },
          {
            title: 'Working Hours',
            value: todayHours,
            icon: Clock,
            color: 'text-sky-600 dark:text-sky-400',
            hoverClass: 'hover:!border-[#0284c7] dark:hover:!border-[#38bdf8]',
            borderColor: '#0284c7',
            glowColor: 'rgba(2, 132, 199, 0.45)',
            bgIcon: 'bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/40',
            onClick: () => navigate('/employee/attendance')
          },
          {
            title: 'Total Weekly Hours',
            value: weeklyHours,
            icon: TrendingUp,
            color: 'text-indigo-600 dark:text-indigo-400',
            hoverClass: 'hover:!border-[#6366f1] dark:hover:!border-[#818cf8]',
            borderColor: '#6366f1',
            glowColor: 'rgba(99, 102, 241, 0.45)',
            bgIcon: 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40',
            onClick: () => navigate('/employee/attendance')
          },
          {
            title: 'Pending Tasks',
            value: pendingTasks,
            icon: Briefcase,
            color: 'text-purple-600 dark:text-purple-400',
            hoverClass: 'hover:!border-[#9333ea] dark:hover:!border-[#c084fc]',
            borderColor: '#9333ea',
            glowColor: 'rgba(147, 51, 234, 0.45)',
            bgIcon: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40',
            onClick: () => navigate('/employee/task-management')
          },
          {
            title: 'Leave Balance',
            value: Math.round(totalLeaveBalance),
            icon: CalendarCheck,
            color: 'text-amber-600 dark:text-amber-400',
            hoverClass: 'hover:!border-[#ea580c] dark:hover:!border-[#fb923c]',
            borderColor: '#ea580c',
            glowColor: 'rgba(234, 88, 12, 0.45)',
            bgIcon: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40',
            onClick: () => navigate('/employee/leave')
          }
        ].map((card, i) => {
          return (
            <Card
              key={i}
              onClick={card.onClick}
              className={`!p-4 cursor-pointer transition-colors duration-200 h-full flex flex-col justify-between ${card.hoverClass}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${card.bgIcon}`}>
                  <card.icon size={16} strokeWidth={2.5} className={card.color} />
                </div>
                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{card.title}</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm font-black text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>{card.value}</span>
                {card.subValue && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{card.subValue}</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* 3. ATTENDANCE SUMMARY */}
        <Card className="flex-1 flex flex-col justify-between hover:!border-[#00a76b] dark:hover:!border-[#34d399] transition-colors duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-[#201515] dark:text-white text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>Attendance Overview</h2>
            <div className="relative" ref={timeRangeRef}>
              <button
                type="button"
                onClick={() => setTimeRangeOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#d5d0c1] dark:border-[#38352e] bg-white dark:bg-[#1a1714] text-xs font-semibold text-[#36342e] dark:text-[#e5e2da] hover:border-[#00a76b] hover:bg-[#f7f6f2] dark:hover:bg-[#25211e] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer select-none"
              >
                <Calendar size={13} className="text-[#00a76b]" />
                <span>{timeRange === 'weekly' ? 'This Week' : 'This Month'}</span>
                <ChevronDown size={13} className={`text-[#939084] transition-transform duration-200 ${timeRangeOpen ? 'rotate-180 text-[#00a76b]' : ''}`} />
              </button>

              {timeRangeOpen && (
                <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-[#1a1714] border border-[#d5d0c1] dark:border-[#38352e] rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.08)] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setTimeRange('weekly'); setTimeRangeOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${timeRange === 'weekly'
                      ? 'bg-[#00a76b]/10 text-[#00a76b] font-bold'
                      : 'text-[#4b4841] dark:text-[#cac6ba] hover:bg-[#f5f3ee] dark:hover:bg-[#25211e] font-medium'
                      }`}
                  >
                    <span>This Week</span>
                    {timeRange === 'weekly' && <span className="w-1.5 h-1.5 rounded-full bg-[#00a76b]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTimeRange('monthly'); setTimeRangeOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${timeRange === 'monthly'
                      ? 'bg-[#00a76b]/10 text-[#00a76b] font-bold'
                      : 'text-[#4b4841] dark:text-[#cac6ba] hover:bg-[#f5f3ee] dark:hover:bg-[#25211e] font-medium'
                      }`}
                  >
                    <span>This Month</span>
                    {timeRange === 'monthly' && <span className="w-1.5 h-1.5 rounded-full bg-[#00a76b]" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyChart} margin={{ top: 25, right: 20, left: 15, bottom: 5 }}>
                <defs>
                  <linearGradient id="attendanceGradientEmp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00a76b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00a76b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.07)' : '#f0f0f0'} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: isDark ? '#a09c8d' : '#939084' }}
                  dy={5}
                  minTickGap={timeRange === 'monthly' ? 20 : 0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: isDark ? '#a09c8d' : '#939084' }}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 125]}
                  ticks={[0, 50, 100]}
                  width={48}
                  tickMargin={6}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const val = payload[0].value;
                      return (
                        <div className="bg-white dark:bg-[#1a1714] border border-gray-200 dark:border-[#38352e] px-3 py-2 rounded-xl shadow-xl text-xs">
                          <p className="text-gray-400 font-medium text-[11px] mb-0.5">{label}</p>
                          <p className="text-[#00a76b] font-extrabold text-sm">{val}% Attendance</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  stroke="#00a76b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#attendanceGradientEmp)"
                  dot={{ fill: '#00a76b', stroke: '#ffffff', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 7, fill: '#00a76b', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stat Cards below Attendance Chart */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-2.5 h-14 w-full flex-wrap">
            <div className="flex items-center gap-1.5 transition-all">
              <span className="w-2 h-2 rounded-full bg-[#00a76b] shrink-0"></span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">Present</span>
              <span className="text-sm font-black text-emerald-800 dark:text-emerald-300 ml-1" style={{ fontFamily: 'Manrope, sans-serif' }}>{attMetrics?.presentCount || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 transition-all">
              <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0"></span>
              <span className="text-xs text-blue-700 dark:text-blue-400 font-bold">Half Day</span>
              <span className="text-sm font-black text-blue-800 dark:text-blue-300 ml-1" style={{ fontFamily: 'Manrope, sans-serif' }}>{attMetrics?.halfDayCount || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 transition-all">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] shrink-0"></span>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-bold">Late Arrivals</span>
              <span className="text-sm font-black text-amber-800 dark:text-amber-300 ml-1" style={{ fontFamily: 'Manrope, sans-serif' }}>{attMetrics?.lateCount || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 transition-all">
              <span className="w-2 h-2 rounded-full bg-[#ef4444] shrink-0"></span>
              <span className="text-xs text-rose-700 dark:text-rose-400 font-bold">Absences</span>
              <span className="text-sm font-black text-rose-800 dark:text-rose-300 ml-1" style={{ fontFamily: 'Manrope, sans-serif' }}>{attMetrics?.absentCount || 0}</span>
            </div>
          </div>
        </Card>

        {/* 4. MY TASKS OVERVIEW */}
        <Card className="flex-1 flex flex-col justify-between hover:!border-[#8b5cf6] dark:hover:!border-[#c084fc] transition-colors duration-300">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-[#201515] dark:text-white text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>My Tasks Overview</h2>
          </div>
          <div className="h-52 relative flex items-center justify-center">
            {(() => {
              const taskPieData = [
                { name: 'Pending', value: pendingTasks, color: '#3b82f6' },
                { name: 'In Progress', value: ongoingTasks, color: '#f59e0b' },
                { name: 'Completed', value: completedTasks, color: '#8b5cf6' },
                { name: 'Overdue', value: overdueTasks, color: '#ef4444' }
              ];
              const displayPieData = totalTasks === 0 ? [{ name: 'No Tasks', value: 1, color: '#e5e7eb' }] : taskPieData;
              const isHoveredValid = hoveredTaskIndex !== null && totalTasks > 0 && taskPieData[hoveredTaskIndex];

              return (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        dataKey="value"
                        stroke="none"
                        paddingAngle={3}
                        onMouseEnter={(_, index) => setHoveredTaskIndex(index)}
                        onMouseLeave={() => setHoveredTaskIndex(null)}
                      >
                        {displayPieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            opacity={hoveredTaskIndex === null || hoveredTaskIndex === index ? 1 : 0.35}
                            style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                    <span
                      className="text-2xl font-black leading-none transition-all duration-150"
                      style={{
                        color: isHoveredValid ? taskPieData[hoveredTaskIndex].color : undefined
                      }}
                    >
                      {isHoveredValid ? taskPieData[hoveredTaskIndex].value : totalTasks}
                    </span>
                    <span className="text-[10px] font-bold text-[#939084] tracking-wider uppercase mt-1 transition-all duration-150">
                      {isHoveredValid ? taskPieData[hoveredTaskIndex].name : 'Total Tasks'}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* 4 Stat Items below Pie Chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 h-14 items-center">
            <div className="px-2 py-1.5 flex items-center justify-between transition-all">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0"></span>
                <span className="text-xs text-blue-700 dark:text-blue-400 font-bold truncate">Pending</span>
              </div>
              <span className="text-sm font-black text-blue-800 dark:text-blue-300 ml-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>{pendingTasks}</span>
            </div>

            <div className="px-2 py-1.5 flex items-center justify-between transition-all">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] shrink-0"></span>
                <span className="text-xs text-amber-700 dark:text-amber-400 font-bold truncate">In Progress</span>
              </div>
              <span className="text-sm font-black text-amber-800 dark:text-amber-300 ml-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>{ongoingTasks}</span>
            </div>

            <div className="px-2 py-1.5 flex items-center justify-between transition-all">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6] shrink-0"></span>
                <span className="text-xs text-purple-700 dark:text-purple-400 font-bold truncate">Completed</span>
              </div>
              <span className="text-sm font-black text-purple-800 dark:text-purple-300 ml-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>{completedTasks}</span>
            </div>

            <div className="px-2 py-1.5 flex items-center justify-between transition-all">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#ef4444] shrink-0"></span>
                <span className="text-xs text-red-700 dark:text-red-400 font-bold truncate">Overdue</span>
              </div>
              <span className="text-sm font-black text-red-800 dark:text-red-300 ml-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>{overdueTasks}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. QUICK ACTIONS */}
      <SectionHeader title="Quick Actions" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {isCheckedIn ? (
          <button
            onClick={handleCheckOut}
            disabled={checkInLoading}
            className="flex items-center justify-start gap-2.5 px-4 py-2.5 rounded-2xl w-full h-14 transition-all duration-200 shadow-xs cursor-pointer border border-gray-200 dark:border-[#38352e] bg-white dark:bg-[#1a1714] hover:!border-[#ef4444] dark:hover:!border-[#f87171]"
          >
            <div className="inline-flex p-1.5 rounded-lg shrink-0 bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40">
              {checkInLoading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-rose-600 dark:text-rose-400" /> : <LogOut size={16} strokeWidth={2.5} className="text-rose-600 dark:text-rose-400" />}
            </div>
            <span className="text-xs font-bold text-[#201515] dark:text-white whitespace-nowrap">
              {checkInLoading ? 'Checking Out...' : 'Check Out'}
            </span>
          </button>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={checkInLoading}
            className="flex items-center justify-start gap-2.5 px-4 py-2.5 rounded-2xl w-full h-14 transition-all duration-200 shadow-xs cursor-pointer border border-gray-200 dark:border-[#38352e] bg-white dark:bg-[#1a1714] hover:!border-[#10b981] dark:hover:!border-[#34d399]"
          >
            <div className="inline-flex p-1.5 rounded-lg shrink-0 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40">
              {checkInLoading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-emerald-600 dark:text-emerald-400" /> : <LogIn size={16} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />}
            </div>
            <span className="text-xs font-bold text-[#201515] dark:text-white whitespace-nowrap">
              {checkInLoading ? 'Checking In...' : 'Check In'}
            </span>
          </button>
        )}

        {[
          { icon: <CalendarPlus size={16} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" />, label: 'Apply Leave', hoverClass: 'hover:!border-[#3b82f6] dark:hover:!border-[#60a5fa]', iconBg: 'bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40', to: '/employee/leave' },
          { icon: <Briefcase size={16} strokeWidth={2.5} className="text-purple-600 dark:text-purple-400" />, label: 'My Tasks', hoverClass: 'hover:!border-[#8b5cf6] dark:hover:!border-[#a78bfa]', iconBg: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40', to: '/employee/task-management' },
          { icon: <Clock size={16} strokeWidth={2.5} className="text-amber-600 dark:text-amber-400" />, label: 'Attendance', hoverClass: 'hover:!border-[#f59e0b] dark:hover:!border-[#fbbf24]', iconBg: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40', to: '/employee/attendance' },
          { icon: <FileText size={16} strokeWidth={2.5} className="text-pink-600 dark:text-pink-400" />, label: 'Payslip', hoverClass: 'hover:!border-[#ec4899] dark:hover:!border-[#f472b6]', iconBg: 'bg-pink-50 dark:bg-pink-950/50 border border-pink-100 dark:border-pink-900/40', to: '/employee/payslips' },
          { icon: <User size={16} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />, label: 'My Profile', hoverClass: 'hover:!border-[#10b981] dark:hover:!border-[#34d399]', iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', to: '/employee/profile' }
        ].map((act, i) => (
          <button
            key={i}
            onClick={() => navigate(act.to)}
            className={`flex items-center justify-start gap-2.5 px-4 py-2.5 rounded-2xl w-full h-14 transition-all duration-200 shadow-xs cursor-pointer border border-gray-200 dark:border-[#38352e] bg-white dark:bg-[#1a1714] ${act.hoverClass}`}
          >
            <div className={`inline-flex p-1.5 rounded-lg shrink-0 ${act.iconBg}`}>
              {act.icon}
            </div>
            <span className="text-xs font-bold text-[#201515] dark:text-white whitespace-nowrap">{act.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* 8. UPCOMING HOLIDAYS */}
        <div className="cursor-pointer" onClick={() => navigate('/employee/holidays')}>
          <Card className="h-72 overflow-hidden transition-colors duration-300 hover:!border-[#6366f1] dark:hover:!border-[#818cf8]">
            <h3 className="font-bold text-[#201515] dark:text-white text-sm mb-2.5 pb-1.5 border-b border-[#eceae3] dark:border-[#38352e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Upcoming Holidays
            </h3>
            <div className="space-y-2.5">
              {holidaysList.slice(0, 3).map((h, i) => (
                <div key={i} className="flex gap-3 items-center border-b border-[#eceae3] dark:border-[#38352e] pb-2 last:border-0 last:pb-0">
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-center min-w-[46px] p-1.5 border border-indigo-100 dark:border-indigo-800/50">
                    <p className="text-base font-bold leading-none">{h.date.split(' ')[0]}</p>
                    <p className="text-[9px] font-bold uppercase mt-0.5">{h.date.split(' ')[1]}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-[#201515] dark:text-white truncate">{h.name}</p>
                    <p className="text-[10px] text-[#939084] mt-0.5 truncate">{h.type}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 px-2 py-0.5 rounded-full whitespace-nowrap shadow-2xs">
                    In {h.daysLeft} days
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 9. UPCOMING EVENTS */}
        <div className="cursor-pointer" onClick={() => navigate('/employee/events')}>
          <Card className="h-72 overflow-y-auto transition-colors duration-300 hover:!border-[#f97316] dark:hover:!border-[#fb923c]">
            <h3 className="font-bold text-[#201515] dark:text-white text-sm mb-3.5 pb-2 border-b border-[#eceae3] dark:border-[#38352e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Upcoming Events
            </h3>
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? upcomingEvents.map((e, i) => {
                const isUnread = !e.readBy?.includes(profile?._id || profile?.employeeId);
                const evtDate = new Date(e.date);
                return (
                  <div key={i} className="flex gap-4 items-center border-b border-[#eceae3] dark:border-[#38352e] pb-4 last:border-0 last:pb-0 relative">
                    {isUnread && (
                      <div className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full z-10 border border-white"></div>
                    )}
                    <div className="bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl text-center min-w-[56px] p-2 border border-orange-100 dark:border-orange-800/50 relative">
                      <p className="text-xl font-bold leading-none">{evtDate.getDate()}</p>
                      <p className="text-[10px] font-bold uppercase mt-1">{evtDate.toLocaleString('default', { month: 'short' })}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-[#201515] dark:text-white">{e.title}</p>
                      <p className="text-xs text-[#939084] line-clamp-1 mt-0.5">{e.description || 'No description'}</p>
                    </div>
                    <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 px-2.5 py-0.5 rounded-full whitespace-nowrap">{e.startTime}</p>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-800/40 flex items-center justify-center text-orange-500 mb-2.5">
                    <Calendar size={22} />
                  </div>
                  <p className="text-sm font-semibold text-[#201515] dark:text-white">No Upcoming Events</p>
                  <p className="text-xs text-[#939084] mt-0.5">No meetings or events scheduled</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 11. LATEST PAYSLIP */}
        <div className="cursor-pointer" onClick={() => navigate('/employee/payslips')}>
          <Card className="h-72 overflow-y-auto transition-colors duration-300 hover:!border-[#10b981] dark:hover:!border-[#34d399]">
            <h3 className="font-bold text-[#201515] dark:text-white text-sm mb-3.5 pb-2 border-b border-[#eceae3] dark:border-[#38352e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Latest Payslips
            </h3>
            <div className="space-y-3">
              {recentPayslips.length > 0 ? recentPayslips.map((ps, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-[#eceae3] dark:border-[#38352e] rounded-xl bg-white dark:bg-[#14120e] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#f0fdf4] dark:bg-[#064e3b] border border-[#bbf7d0] dark:border-[#047857] rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-[#00a76b] dark:text-[#a7f3d0]" />
                    </div>
                    <div>
                      <p className="font-bold text-[13px] text-[#201515] dark:text-white">{ps.month || 'Payslip'}</p>
                      <p className="text-[11px] text-[#939084] mt-0.5">{new Date(ps.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <FileText size={32} className="mx-auto mb-3 text-[#939084]" />
                  <p className="text-sm font-medium text-[#939084]">No payslips available</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 6. LEAVE SUMMARY */}
      <div>
        <SectionHeader title="Leave Summary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Total Leaves */}
          <div
            onClick={() => navigate('/employee/leave')}
            className="group border border-gray-200/80 dark:border-gray-800/80 hover:!border-blue-500 dark:hover:!border-blue-400 transition-all duration-300 rounded-xl px-3.5 py-2.5 flex items-center justify-between bg-white dark:bg-[#151c28] cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-blue-50 dark:bg-blue-950/60 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 transition-colors duration-300 border border-blue-100 dark:border-blue-900/40 shrink-0">
                <Calendar size={16} />
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider truncate">TOTAL LEAVES</p>
            </div>
            <span className="text-xl font-black text-gray-900 dark:text-white ml-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{totalAllocated}</span>
          </div>

          {/* Used Leaves */}
          <div
            onClick={() => navigate('/employee/leave')}
            className="group border border-gray-200/80 dark:border-gray-800/80 hover:!border-amber-500 dark:hover:!border-amber-400 transition-all duration-300 rounded-xl px-3.5 py-2.5 flex items-center justify-between bg-white dark:bg-[#151c28] cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-amber-50 dark:bg-amber-950/60 p-1.5 rounded-lg text-amber-600 dark:text-amber-400 transition-colors duration-300 border border-amber-100 dark:border-amber-900/40 shrink-0">
                <CalendarCheck size={16} />
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider truncate">USED LEAVES</p>
            </div>
            <span className="text-xl font-black text-gray-900 dark:text-white ml-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{totalUsedLeaves}</span>
          </div>

          {/* Pending Leaves */}
          <div
            onClick={() => navigate('/employee/leave')}
            className="group border border-gray-200/80 dark:border-gray-800/80 hover:!border-purple-500 dark:hover:!border-purple-400 transition-all duration-300 rounded-xl px-3.5 py-2.5 flex items-center justify-between bg-white dark:bg-[#151c28] cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-purple-50 dark:bg-purple-950/60 p-1.5 rounded-lg text-purple-600 dark:text-purple-400 transition-colors duration-300 border border-purple-100 dark:border-purple-900/40 shrink-0">
                <CalendarX size={16} />
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider truncate">PENDING LEAVES</p>
            </div>
            <span className="text-xl font-black text-gray-900 dark:text-white ml-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{pendingLeaves}</span>
          </div>

          {/* Approved Leaves */}
          <div
            onClick={() => navigate('/employee/leave')}
            className="group border border-gray-200/80 dark:border-gray-800/80 hover:!border-emerald-500 dark:hover:!border-emerald-400 transition-all duration-300 rounded-xl px-3.5 py-2.5 flex items-center justify-between bg-white dark:bg-[#151c28] cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-emerald-50 dark:bg-emerald-950/60 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors duration-300 border border-emerald-100 dark:border-emerald-900/40 shrink-0">
                <CheckCircle size={16} />
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider truncate">APPROVED LEAVES</p>
            </div>
            <span className="text-xl font-black text-gray-900 dark:text-white ml-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{approvedLeavesDays}</span>
          </div>
        </div>
      </div>

      {/* 12. BIRTHDAYS & ANNIVERSARIES */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-5 overflow-hidden hover:!border-[#00a76b] dark:hover:!border-[#34d399] transition-colors duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#eceae3] dark:border-[#38352e]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-[#00a76b] shadow-xs">
                <PartyPopper size={18} />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[#201515] dark:text-white text-lg tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Birthdays & Anniversaries
                </h2>
                {events.length > 0 && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                    {events.length} Upcoming
                  </span>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#f4f2eb] dark:bg-[#1a1713] rounded-xl border border-[#e4dfd3] dark:border-[#2f2b24] self-start sm:self-auto">
              {[
                { id: 'all', label: 'All Celebrations', icon: PartyPopper, count: events.length },
                { id: 'birthday', label: 'Birthdays', icon: Cake, count: events.filter(e => e.type === 'birthday').length },
                { id: 'anniversary', label: 'Anniversaries', icon: Sparkles, count: events.filter(e => e.type === 'anniversary').length },
              ].map((tab) => {
                const isActive = eventFilter === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setEventFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${isActive
                      ? 'bg-[#00a76b] text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                  >
                    <Icon size={14} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                      }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {events.filter(e => eventFilter === 'all' || e.type === eventFilter).length > 0 ? (
            <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-neutral-800 snap-x">
              {events
                .filter(e => eventFilter === 'all' || e.type === eventFilter)
                .map((ann, i) => {
                  const isToday = ann.daysLeft === 0;
                  const isPast = ann.daysLeft < 0;
                  const isWished = wishedEvents.includes(ann.id || `event-${i}`);
                  const isBirthday = ann.type === 'birthday';
                  const yrSuffix = ann.years ? ((ann.years % 10 === 1 && ann.years !== 11) ? 'st' : (ann.years % 10 === 2 && ann.years !== 12) ? 'nd' : (ann.years % 10 === 3 && ann.years !== 13) ? 'rd' : 'th') : '';

                  return (
                    <div
                      key={ann.id || i}
                      className="relative overflow-hidden rounded-2xl p-3.5 transition-all duration-200 flex flex-col justify-between border shrink-0 w-[260px] sm:w-[calc(50%-5px)] lg:w-[calc(25%-7.5px)] snap-start bg-white dark:bg-[#14120e] border-[#eceae3] dark:border-[#38352e] hover:!border-[#10b981] dark:hover:!border-[#34d399]"
                    >
                      {/* Top Row: Avatar + Info */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {ann.avatar ? (
                            <img
                              src={ann.avatar.startsWith('http') || ann.avatar.startsWith('/') ? ann.avatar : `/${ann.avatar}`}
                              alt={ann.name}
                              className="w-11 h-11 rounded-xl object-cover ring-2 ring-white dark:ring-[#14120e] shadow-sm shrink-0"
                            />
                          ) : (
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm shrink-0"
                              style={{
                                background: 'linear-gradient(135deg, #00a76b 0%, #059669 100%)'
                              }}
                            >
                              {ann.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-white dark:bg-[#14120e] shadow-sm flex items-center justify-center border border-gray-100 dark:border-[#2f2b24]">
                            {isBirthday ? (
                              <Cake size={10} className="text-amber-500" />
                            ) : (
                              <Sparkles size={10} className="text-amber-500" />
                            )}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {ann.name}
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {ann.role}
                          </p>
                          {ann.department && (
                            <span className="inline-block text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md mt-1 truncate max-w-full">
                              {ann.department}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Celebration Status / Timing & Action (Tightly grouped with minimal gap) */}
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#282520] flex items-center gap-2.5 flex-wrap">
                        {isToday ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <Sparkles size={12} /> {isBirthday ? 'Birthday Today!' : `${ann.years ? ann.years + yrSuffix + ' ' : ''}Anniversary Today!`}
                          </span>
                        ) : isPast ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-50/70 dark:bg-emerald-950/30 text-[#00a76b] dark:text-emerald-400 border border-emerald-200/50">
                            <Sparkles size={12} className="text-[#00a76b]" />
                            {isBirthday ? `Celebrated ${Math.abs(ann.daysLeft)}d ago` : `${ann.years ? ann.years + yrSuffix + ' ' : ''}Anniversary (${Math.abs(ann.daysLeft)}d ago)`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300">
                            <Calendar size={12} className="text-gray-400" />
                            {ann.daysLeft === 1 ? (isBirthday ? 'Tomorrow' : `Tomorrow (${ann.years ? ann.years + yrSuffix : '1st'})`) : (isBirthday ? `In ${ann.daysLeft} days` : `${ann.years ? ann.years + yrSuffix + ' ' : ''}Anniversary in ${ann.daysLeft}d`)}
                          </span>
                        )}

                        {/* Quick Wish Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const eventKey = ann.id || `event-${i}`;
                            if (!wishedEvents.includes(eventKey)) {
                              setWishedEvents(prev => [...prev, eventKey]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shrink-0 cursor-pointer ${isWished
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] dark:text-emerald-400 border border-[#00a76b]/30 dark:border-emerald-800/40 shadow-xs'
                            : isToday || isPast
                              ? 'bg-[#00a76b] hover:bg-[#008f5b] text-white shadow-sm shadow-[#00a76b]/20 active:scale-95'
                              : 'bg-white hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-neutral-700 active:scale-95'
                            }`}
                        >
                          {isWished ? (
                            <>
                              <Heart size={12} className="fill-[#00a76b] text-[#00a76b]" />
                              <span>Wished! 💖</span>
                            </>
                          ) : (
                            <>
                              <PartyPopper size={12} />
                              <span>{isToday || isPast ? 'Wish Now' : 'Wish'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
                <Cake size={32} />
              </div>
              <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">No Upcoming Celebrations</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                {eventFilter === 'all'
                  ? 'There are no team birthdays or work anniversaries scheduled in the next 14 days.'
                  : `No ${eventFilter === 'birthday' ? 'birthdays' : 'work anniversaries'} found in this category.`}
              </p>
            </div>
          )}

          {/* Bottom Footer Directory Link */}
          <div className="mt-5 pt-3.5 border-t border-[#eceae3] dark:border-[#38352e] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span>✨</span>
              <span>Connect with colleagues and celebrate milestones together!</span>
            </span>
          </div>
        </Card>
      </div>

      {/* ⚠️ FluidHR Desktop Application Missing Modal */}
      <DesktopAppRequiredModal
        isOpen={trackerMissingModal}
        onClose={() => setTrackerMissingModal(false)}
        onRetry={handleCheckIn}
        token={token()}
        isRetrying={checkInLoading}
      />
    </div>
  );
};

export default Dashboard;
