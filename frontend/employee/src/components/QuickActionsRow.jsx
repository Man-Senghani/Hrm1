import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LogIn, LogOut, CalendarPlus, Briefcase, Clock, FileText, User, Loader2 } from 'lucide-react';
import { startDesktopTracker, stopDesktopTracker } from '@shared/services/desktopTrackerService';
import DesktopAppRequiredModal from '@shared/components/DesktopAppRequiredModal';

const token = () => sessionStorage.getItem('token') || localStorage.getItem('token');

const QuickActionsRow = ({ role = 'admin', title = 'Quick Actions' }) => {
  const navigate = useNavigate();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [checkInHovered, setCheckInHovered] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchStatus = async () => {
    try {
      const t = token();
      if (!t) return;
      const headers = { Authorization: `Bearer ${t}` };

      // Fetch time status and attendance in parallel for instant response
      const [timerRes, attRes] = await Promise.all([
        axios.get('/api/time/status', { headers }).catch(() => null),
        axios.get('/api/attendance/today', { headers }).catch(() => null)
      ]);

      if (timerRes?.data?.hasActiveSession || ['active', 'paused', 'idle'].includes(timerRes?.data?.status)) {
        setIsCheckedIn(true);
        return;
      }

      if (attRes?.data?.attendance) {
        const att = attRes.data.attendance;
        if (att.status === 'present' && att.inTime && !att.outTime) {
          setIsCheckedIn(true);
          return;
        }
      }

      setIsCheckedIn(false);
    } catch (_) {
    } finally {
      setInitialChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const t = token();
      if (!t) {
        toast.error('Session expired. Please login again.');
        setCheckInLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${t}` };

      // 1. Direct Backend Check-in (instant attendance record)
      await axios.post('/api/attendance/clock-in', {}, { headers }).catch(() => null);

      // 2. Start Desktop App Tracker
      const trackerResult = await startDesktopTracker(t);
      if (!trackerResult.success) {
        setShowTrackerModal(true);
        setCheckInLoading(false);
        return;
      }

      // 3. Start Web Work Session
      await axios.post('/api/time/start', { taskName: 'General Work' }, { headers }).catch(() => null);

      setIsCheckedIn(true);
      toast.success('Check-in successful & Desktop Tracker started!', {
        style: {
          borderRadius: '12px',
          background: '#1c1917',
          color: '#fff',
          border: '1px solid #00a76b',
          fontSize: '13px',
          fontWeight: '600'
        }
      });
      await fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckInLoading(true);
    try {
      const t = token();
      if (!t) return;
      const headers = { Authorization: `Bearer ${t}` };

      // 1. Stop Desktop Tracker
      const trackerResult = await stopDesktopTracker();
      if (!trackerResult.success) {
        toast.error(trackerResult.message || 'Please close/stop the Desktop Tracker application first to check out.', {
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

      // 2. Direct backend clock-out
      try {
        await axios.put('/api/attendance/clock-out', {}, { headers });
      } catch (_) { }

      try {
        await axios.post('/api/time/stop', {}, { headers });
      } catch (_) { }

      setIsCheckedIn(false);
      toast.success('Check-out successful & Desktop Tracker stopped!', {
        style: {
          borderRadius: '12px',
          background: '#2a0d0d',
          color: '#fff',
          border: '1px solid #ef4444',
          fontSize: '13px',
          fontWeight: '600'
        }
      });
      await fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-out failed');
    } finally {
      setCheckInLoading(false);
    }
  };

  // Role based target URLs
  const getRoutes = () => {
    const prefix = role ? `/${role}` : '/admin';
    return {
      leave: `${prefix}/leave`,
      tasks: role === 'employee' ? '/employee/task-management' : `${prefix}/tasks`,
      timeTracker: `${prefix}/time-tracker`,
      payroll: role === 'employee' ? '/employee/payslips' : `${prefix}/payroll`,
      profile: `${prefix}/profile`
    };
  };

  const routes = getRoutes();

  const leaveLabel = role === 'admin' ? 'View Team Leave' : 'Apply Leave';

  const actions = [
    {
      icon: <CalendarPlus size={16} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" />,
      label: leaveLabel,
      color: '#3b82f6',
      glowColor: 'rgba(59, 130, 246, 0.45)',
      iconBg: 'bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40',
      to: routes.leave
    },
    {
      icon: <Briefcase size={16} strokeWidth={2.5} className="text-purple-600 dark:text-purple-400" />,
      label: 'My Tasks',
      color: '#8b5cf6',
      glowColor: 'rgba(139, 92, 246, 0.45)',
      iconBg: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40',
      to: routes.tasks
    },
    {
      icon: <Clock size={16} strokeWidth={2.5} className="text-amber-600 dark:text-amber-400" />,
      label: 'Time Tracker',
      color: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.45)',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40',
      to: routes.timeTracker
    },
    {
      icon: <FileText size={16} strokeWidth={2.5} className="text-pink-600 dark:text-pink-400" />,
      label: 'Payslip',
      color: '#ec4899',
      glowColor: 'rgba(236, 72, 153, 0.45)',
      iconBg: 'bg-pink-50 dark:bg-pink-950/50 border border-pink-100 dark:border-pink-900/40',
      to: routes.payroll
    },
    {
      icon: <User size={16} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />,
      label: 'View Profile',
      color: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.45)',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40',
      to: routes.profile
    },
  ];

  return (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Check In / Check Out Card */}
        {isCheckedIn ? (
          <button
            type="button"
            onClick={handleCheckOut}
            onMouseEnter={() => setCheckInHovered(true)}
            onMouseLeave={() => setCheckInHovered(false)}
            disabled={checkInLoading}
            className="flex items-center justify-start gap-2.5 px-4 py-2.5 rounded-2xl w-full h-14 transition-all duration-200 shadow-xs cursor-pointer disabled:opacity-50 border border-gray-200 dark:border-[#28251e] bg-white dark:bg-[#151c28]"
            style={{
              borderColor: checkInHovered ? '#ef4444' : undefined,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          >
            <div className="inline-flex p-1.5 rounded-lg shrink-0 bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40">
              {checkInLoading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-rose-600 dark:text-rose-400" /> : <LogOut size={16} strokeWidth={2.5} className="text-rose-600 dark:text-rose-400" />}
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">
              {checkInLoading ? 'Checking Out...' : 'Check Out'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCheckIn}
            onMouseEnter={() => setCheckInHovered(true)}
            onMouseLeave={() => setCheckInHovered(false)}
            disabled={checkInLoading}
            className="flex items-center justify-start gap-2.5 px-4 py-2.5 rounded-2xl w-full h-14 transition-all duration-200 shadow-xs cursor-pointer disabled:opacity-50 border border-gray-200 dark:border-[#28251e] bg-white dark:bg-[#151c28]"
            style={{
              borderColor: checkInHovered ? '#10b981' : undefined,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          >
            <div className="inline-flex p-1.5 rounded-lg shrink-0 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40">
              {checkInLoading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-emerald-600 dark:text-emerald-400" /> : <LogIn size={16} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />}
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">
              {checkInLoading ? 'Checking In...' : 'Check In'}
            </span>
          </button>
        )}

        {/* Other Quick Action Buttons */}
        {actions.map((act, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => navigate(act.to)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="flex items-center justify-start gap-2.5 px-4 py-2.5 rounded-2xl w-full h-14 transition-all duration-200 shadow-xs cursor-pointer border border-gray-200 dark:border-[#28251e] bg-white dark:bg-[#151c28]"
              style={{
                borderColor: isHovered ? act.color : undefined,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <div className={`inline-flex p-1.5 rounded-lg shrink-0 ${act.iconBg}`}>
                {act.icon}
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">{act.label}</span>
            </button>
          );
        })}
      </div>

      <DesktopAppRequiredModal
        isOpen={showTrackerModal}
        onClose={() => setShowTrackerModal(false)}
        onRetry={handleCheckIn}
        token={token()}
        isRetrying={checkInLoading}
      />
    </div>
  );
};

export default QuickActionsRow;
