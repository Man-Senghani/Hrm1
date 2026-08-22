import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, FileText, CheckCircle, Clock, Calendar, Bell, ChevronRight, ChevronDown,
  PieChart as PieChartIcon, TrendingUp, TrendingDown, Briefcase, Plus, Search,
  Download, Activity, ShieldAlert, Gift, Cake, ShieldCheck, Layers, Check, X,
  PartyPopper, Heart, Sparkles, Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, BarChart, Bar
} from 'recharts';



import QuickActionsRow from '../../components/QuickActionsRow';
import ActionConfirmModal from '../../components/ActionConfirmModal';

const COLORS = ['#00a76b', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#64748b'];

// Small generic card wrapper
const Card = ({ children, className = '', style = {}, ...props }) => (
  <div
    style={style}
    className={`bg-white dark:bg-[#161311] rounded-2xl border border-[#eceae3] dark:border-[#28251e] transition-colors duration-300 ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Custom styled modern dropdown menu
const CustomDropdown = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = typeof value === 'object' ? value.label : value;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#F8F9FB] dark:bg-[#1f1b17] hover:bg-[#eceae3] dark:hover:bg-[#2a2520] text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-[#eceae3] dark:border-[#38332c] transition-all cursor-pointer shadow-xs"
      >
        <span className="whitespace-nowrap">{selectedLabel}</span>
        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-[#1e1a17] rounded-xl shadow-xl border border-[#eceae3] dark:border-[#38332c] py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt, idx) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const isSelected = (typeof value === 'object' ? value.value : value) === optVal;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${isSelected ? 'bg-[#00a76b]/10 text-[#00a76b] font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#28231e]'
                  }`}
              >
                <span>{optLabel}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00a76b]"></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const HRDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Dropdown states
  const [attPeriod, setAttPeriod] = useState('This Week');
  const [leavePeriod, setLeavePeriod] = useState('This Month');
  const [recruitmentPeriod, setRecruitmentPeriod] = useState('This Month');
  const [payrollPeriod, setPayrollPeriod] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  const [selectedLeaveApproval, setSelectedLeaveApproval] = useState(null);
  const [hoveredStatCard, setHoveredStatCard] = useState(null);
  const [hoveredRoleIndex, setHoveredRoleIndex] = useState(null);
  const [hoveredGenderIndex, setHoveredGenderIndex] = useState(null);

  // Wishes states
  const [wishedEvents, setWishedEvents] = useState([]);
  const [selectedWishCeleb, setSelectedWishCeleb] = useState(null);
  const [customWishMessage, setCustomWishMessage] = useState('');
  const [isSendingWish, setIsSendingWish] = useState(false);

  // Clean any old leftover localStorage key
  useEffect(() => {
    try {
      localStorage.removeItem('hrm_wished_events');
    } catch { }
  }, []);

  const checkIsToday = (celebDate, diffDays) => {
    if (diffDays === 0) return true;
    if (!celebDate) return false;
    const d = new Date(celebDate);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  };

  const handleOpenWishModal = (celeb) => {
    setSelectedWishCeleb(celeb);
    const isBday = celeb.type === 'Birthday';
    const defaultMsg = isBday
      ? `🎂 Wishing you a very Happy Birthday, ${celeb.name}! May your year ahead be filled with happiness, health, and great success! 🎉`
      : `🌟 Happy Work Anniversary, ${celeb.name}! Thank you for your hard work, dedication, and valuable contributions! 🚀`;
    setCustomWishMessage(defaultMsg);
  };

  const handleSendWish = async () => {
    if (!selectedWishCeleb) return;
    setIsSendingWish(true);
    try {
      const token = sessionStorage.getItem('token');
      if (selectedWishCeleb.userId) {
        await axios.post('/api/notifications', {
          targetUserId: selectedWishCeleb.userId,
          message: customWishMessage,
          type: selectedWishCeleb.type === 'Birthday' ? 'birthday' : 'anniversary',
          targetLabel: selectedWishCeleb.name
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setWishedEvents(prev => [...prev, selectedWishCeleb._id]);
      toast.success(`Wishes sent to ${selectedWishCeleb.name}! 🎉`);
      setSelectedWishCeleb(null);
    } catch (err) {
      console.error('Error sending wish notification:', err);
      toast.error(err.response?.data?.message || 'Failed to send wish notification');
    } finally {
      setIsSendingWish(false);
    }
  };

  useEffect(() => {
    fetchData(!dashboardData);
  }, [attPeriod, leavePeriod]);

  const fetchData = async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Profile and dashboard summary are independent, so fetch them together
      const [profRes, dashRes] = await Promise.all([
        profile ? Promise.resolve({ data: profile }) : axios.get('/api/auth/me', { headers }),
        axios.get('/api/hr-dashboard/summary', { headers, params: { attPeriod, leavePeriod } })
      ]);
      setProfile(profRes.data?.data || profRes.data);

      const dData = dashRes.data.data;
      setDashboardData(dData);

      const serverWished = (dData?.upcomingCelebrations || [])
        .filter(c => c.isWished)
        .map(c => c._id);
      setWishedEvents(serverWished);

    } catch (err) {
      console.error('Failed to fetch HR dashboard data:', err);
      const errMsg = err.response?.data?.message || err.message || 'Unknown error';
      if (showSkeleton) {
        setError(`Unable to load dashboard data. Details: ${errMsg}`);
      } else {
        toast.error(`Failed to update chart: ${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`/api/leaves/hr-approve/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Leave approved successfully');
      fetchData(); // refresh data
    } catch (err) {
      console.error('Error approving leave:', err);
      toast.error(err.response?.data?.message || 'Failed to approve leave');
      fetchData();
    }
  };

  const handleRejectLeave = async (id) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`/api/leaves/reject/${id}`, { reason }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Leave request rejected');
      fetchData(); // refresh data
    } catch (err) {
      console.error('Error rejecting leave:', err);
      toast.error(err.response?.data?.message || 'Failed to reject leave');
      fetchData();
    }
  };

  const [overrideModal, setOverrideModal] = useState({
    isOpen: false,
    leaveId: null,
    currentStatus: '',
    targetStatus: '',
    loading: false
  });

  const handleOverrideLeave = (id, currentStatus) => {
    const targetStatus = currentStatus === 'approved' ? 'rejected' : 'approved';
    setOverrideModal({
      isOpen: true,
      leaveId: id,
      currentStatus,
      targetStatus,
      loading: false
    });
  };

  const confirmOverrideLeave = async (reason) => {
    try {
      setOverrideModal(prev => ({ ...prev, loading: true }));
      const token = sessionStorage.getItem('token');
      await axios.put(`/api/leaves/override/${overrideModal.leaveId}`, {
        targetStatus: overrideModal.targetStatus,
        reason
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Leave status overridden successfully');
      setOverrideModal({ isOpen: false, leaveId: null, currentStatus: '', targetStatus: '', loading: false });
      fetchData();
    } catch (err) {
      console.error('Error overriding leave:', err);
      toast.error(err.response?.data?.message || 'Failed to override leave');
      setOverrideModal(prev => ({ ...prev, loading: false }));
      fetchData();
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-red-500 bg-[#F8F9FB] dark:bg-transparent">
        <ShieldAlert size={48} className="mb-4" />
        <p className="font-semibold text-lg">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  const { stats, charts, leaveOverview, payrollSummary, recruitmentOverview, recentJoiners, pendingApprovals, announcements, upcomingCelebrations = [] } = dashboardData;
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  const displayName = profile?.fullName || profile?.name || (profile?.profile ? `${profile.profile.firstName || ''} ${profile.profile.lastName || ''}`.trim() : '') || sessionStorage.getItem('userName') || localStorage.getItem('userName') || 'HR Admin';
  const firstName = displayName.split(' ')[0] || 'HR Admin';

  // Filter out Admin role from Role-wise distribution for HR Dashboard
  const hrRoleDistribution = (charts?.departmentDistribution || []).filter(
    (item) => item.name?.toLowerCase() !== 'admin'
  );
  const hrRoleTotal = hrRoleDistribution.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  const currentLeaveOverview = leaveOverview?.byPeriod?.[leavePeriod] || leaveOverview || {
    total: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    pending: 0
  };

  const currentRecOverview = recruitmentOverview?.byPeriod?.[recruitmentPeriod] || recruitmentOverview || {
    newApplications: 0,
    shortlisted: 0,
    interviewsScheduled: 0,
    offersIssued: 0,
    hires: 0
  };

  return (
    <div className="space-y-6 pb-2 font-['Inter',sans-serif] text-gray-800">

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            <span>{getGreeting()}, {firstName}!</span>
            <span className="inline-flex items-center">👋</span>
          </h1>
          <p className="text-[#939084] dark:text-[#a3a094] mt-1 text-sm font-medium">Have a productive day at work.</p>
        </div>
        <div className="flex items-center gap-2.5 mt-4 md:mt-0">
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

      {/* 2. Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Employees',
            val: stats.totalEmployees,
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40',
            hoverBorder: 'hover:!border-[#3b82f6] dark:hover:!border-[#60a5fa]'
          },
          {
            label: 'Active Employees',
            val: stats.activeEmployees,
            icon: CheckCircle,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40',
            hoverBorder: 'hover:!border-[#10b981] dark:hover:!border-[#34d399]'
          },
          {
            label: 'New Joiners',
            val: stats.newJoiners,
            icon: UserPlus,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40',
            hoverBorder: 'hover:!border-[#6366f1] dark:hover:!border-[#818cf8]'
          },
          {
            label: 'Employees on Leave',
            val: stats.employeesOnLeave,
            icon: Calendar,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40',
            hoverBorder: 'hover:!border-[#f59e0b] dark:hover:!border-[#fbbf24]',
            onClick: () => navigate('/hr/leave', { state: { viewMode: 'hr' } })
          },
          {
            label: 'Pending Leave',
            val: stats.pendingLeaveApprovals,
            icon: Clock,
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40',
            hoverBorder: 'hover:!border-[#ef4444] dark:hover:!border-[#f87171]',
            onClick: () => navigate('/hr/leave', { state: { viewMode: 'hr', filter: 'pending' } })
          },
        ].map((stat, i) => {
          return (
            <Card
              key={i}
              onClick={stat.onClick}
              className={`py-2 px-3.5 flex items-center justify-between transition-colors duration-300 cursor-pointer shadow-xs min-h-[52px] ${stat.hoverBorder}`}
            >
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <div className={`inline-flex p-1.5 rounded-lg shrink-0 ${stat.bg}`}>
                  <stat.icon size={16} strokeWidth={2.5} className={stat.color} />
                </div>
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-tight">{stat.label}</p>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white leading-none shrink-0">{stat.val}</h3>
            </Card>
          );
        })}
      </div>

      {/* 3. Quick Actions Row */}
      <QuickActionsRow role="hr" />

      {/* 3. Second Row (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance */}
        <Card className="lg:col-span-1 p-4 sm:p-5 hover:!border-[#00a76b] dark:hover:!border-[#34d399] transition-colors duration-300">
          <div className="flex flex-wrap justify-between items-center mb-8 gap-6">
            <h3 className="font-bold text-gray-900 dark:text-white whitespace-nowrap tracking-wide">Attendance Overview</h3>
            <CustomDropdown
              value={attPeriod}
              onChange={setAttPeriod}
              options={['This Week', 'Last Week']}
            />
          </div>
          <div className="h-48 w-full">
            {charts.attendanceOverview.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.attendanceOverview} margin={{ top: 25, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#28251e" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600, letterSpacing: '1px' }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} tickMargin={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #38332c', backgroundColor: '#1e1a17', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }} />
                  {charts.attendanceOverview.some(d => d.present > 0) && <Line type="monotone" dataKey="present" stroke="#00a76b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />}
                  {charts.attendanceOverview.some(d => d.absent > 0) && <Line type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />}
                  {charts.attendanceOverview.some(d => d.late > 0) && <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium">No attendance data</div>
            )}
          </div>
        </Card>

        {/* Role Distribution */}
        <Card className="p-4 sm:p-5 hover:!border-rose-500 dark:hover:!border-rose-400 transition-colors duration-300">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Role-wise Employees</h3>
          <div className="flex flex-col items-center justify-center">
            {hrRoleDistribution.length > 0 ? (
              <>
                <div className="h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={hrRoleDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={2}
                        dataKey="value"
                        onMouseEnter={(_, index) => setHoveredRoleIndex(index)}
                        onMouseLeave={() => setHoveredRoleIndex(null)}
                      >
                        {hrRoleDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            opacity={hoveredRoleIndex === null || hoveredRoleIndex === index ? 1 : 0.35}
                            style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                    <span className="text-2xl font-black text-gray-900 dark:text-white transition-all duration-150">
                      {hoveredRoleIndex !== null && hrRoleDistribution[hoveredRoleIndex]
                        ? hrRoleDistribution[hoveredRoleIndex].value
                        : hrRoleTotal}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center max-w-[100px] truncate transition-all duration-150">
                      {hoveredRoleIndex !== null && hrRoleDistribution[hoveredRoleIndex]
                        ? hrRoleDistribution[hoveredRoleIndex].name
                        : 'Total'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 w-full">
                  {hrRoleDistribution.map((entry, index) => {
                    const isHovered = hoveredRoleIndex === index;
                    return (
                      <div
                        key={index}
                        onMouseEnter={() => setHoveredRoleIndex(index)}
                        onMouseLeave={() => setHoveredRoleIndex(null)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-lg cursor-pointer transition-all duration-200 ${isHovered
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white scale-105 shadow-xs'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className={isHovered ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}>{entry.name}:</span>
                        <span className="text-gray-900 dark:text-white font-bold">{entry.value}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-sm font-medium h-40 flex items-center">No role data</div>
            )}
          </div>
        </Card>

        {/* Gender Distribution */}
        <Card className="p-4 sm:p-5 hover:!border-blue-500 dark:hover:!border-blue-400 transition-colors duration-300">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Gender Distribution</h3>
          <div className="flex flex-col items-center justify-center">
            {charts.genderDistribution.length > 0 ? (
              <>
                <div className="h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.genderDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={2}
                        dataKey="value"
                        onMouseEnter={(_, index) => setHoveredGenderIndex(index)}
                        onMouseLeave={() => setHoveredGenderIndex(null)}
                      >
                        {charts.genderDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={['#3b82f6', '#f43f5e', '#f59e0b'][index % 3]}
                            opacity={hoveredGenderIndex === null || hoveredGenderIndex === index ? 1 : 0.35}
                            style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                    <span className="text-2xl font-black text-gray-900 dark:text-white transition-all duration-150">
                      {hoveredGenderIndex !== null && charts.genderDistribution[hoveredGenderIndex]
                        ? charts.genderDistribution[hoveredGenderIndex].value
                        : ((charts.genderDistribution || []).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || stats.totalEmployees || 0)}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center max-w-[100px] truncate transition-all duration-150">
                      {hoveredGenderIndex !== null && charts.genderDistribution[hoveredGenderIndex]
                        ? charts.genderDistribution[hoveredGenderIndex].name
                        : 'Total'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 w-full">
                  {charts.genderDistribution.map((entry, index) => {
                    const isHovered = hoveredGenderIndex === index;
                    return (
                      <div
                        key={index}
                        onMouseEnter={() => setHoveredGenderIndex(index)}
                        onMouseLeave={() => setHoveredGenderIndex(null)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-lg cursor-pointer transition-all duration-200 ${isHovered
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white scale-105 shadow-xs'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ['#3b82f6', '#f43f5e', '#f59e0b'][index % 3] }}></span>
                        <span className={isHovered ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}>{entry.name}:</span>
                        <span className="text-gray-900 dark:text-white font-bold">{entry.value}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-sm font-medium h-40 flex items-center">No gender data</div>
            )}
          </div>
        </Card>
      </div>

      {/* 4. Third Row (Leave, Payroll, Recruitment) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col justify-between hover:!border-[#00a76b] dark:hover:!border-[#34d399] transition-colors duration-300">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white">Team Leave Overview</h3>
              <CustomDropdown
                value={leavePeriod}
                onChange={setLeavePeriod}
                options={['This Month', 'This Week', 'This Year', 'All Time', 'Today']}
              />
            </div>
            {(() => {
              const app = currentLeaveOverview.approved || 0;
              const pend = currentLeaveOverview.pending || 0;
              const rej = currentLeaveOverview.rejected || 0;
              const canc = currentLeaveOverview.cancelled || 0;
              const totalLeaves = app + pend + rej + canc;
              const displaySum = totalLeaves || 1;

              return (
                <>
                  <div className="space-y-2 mb-3">
                    {/* Total Leaves Top Banner */}
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Total Leaves</p>
                        <p className="text-[18px] font-black text-gray-900 dark:text-white leading-tight">{totalLeaves}</p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-200/60 dark:bg-gray-700/60 px-2 py-0.5 rounded-md">
                        {totalLeaves} Total Requests
                      </span>
                    </div>

                    {/* 4 Status Boxes: Approved, Pending, Rejected, Cancelled */}
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                      <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-green-700 dark:text-green-500 truncate">Approved</p>
                        <p className="text-[16px] font-black text-green-800 dark:text-green-400 leading-tight mt-0.5">{app}</p>
                      </div>
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 truncate">Pending</p>
                        <p className="text-[16px] font-black text-amber-800 dark:text-amber-400 leading-tight mt-0.5">{pend}</p>
                      </div>
                      <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-red-700 dark:text-red-500 truncate">Rejected</p>
                        <p className="text-[16px] font-black text-red-800 dark:text-red-400 leading-tight mt-0.5">{rej}</p>
                      </div>
                      <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-orange-700 dark:text-orange-500 truncate">Cancelled</p>
                        <p className="text-[16px] font-black text-orange-800 dark:text-orange-400 leading-tight mt-0.5">{canc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Segmented Approval Progress Bar */}
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden flex" title={`Total Leaves: ${totalLeaves}`}>
                    <div className="bg-[#00a76b] h-full transition-all duration-500" style={{ width: `${(app / displaySum) * 100}%` }} title={`Approved: ${app} (${Math.round((app / displaySum) * 100)}%)`}></div>
                    <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${(pend / displaySum) * 100}%` }} title={`Pending: ${pend} (${Math.round((pend / displaySum) * 100)}%)`}></div>
                    <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(rej / displaySum) * 100}%` }} title={`Rejected: ${rej} (${Math.round((rej / displaySum) * 100)}%)`}></div>
                    <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${(canc / displaySum) * 100}%` }} title={`Cancelled: ${canc} (${Math.round((canc / displaySum) * 100)}%)`}></div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between hover:!border-amber-500 dark:hover:!border-amber-400 transition-colors duration-300">
          <div>
            <div className="flex justify-between items-center mb-6 gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base truncate min-w-0">Payroll Summary</h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/hr/payroll')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2 py-1 rounded-lg flex items-center gap-0.5 transition-all cursor-pointer whitespace-nowrap"
                  title="View Payroll Details"
                >
                  <span>View</span>
                  <ChevronRight size={13} strokeWidth={2.5} />
                </button>
                <CustomDropdown
                  value={payrollPeriod}
                  onChange={setPayrollPeriod}
                  options={[payrollPeriod]}
                />
              </div>
            </div>
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white mb-0.5">{formatCurrency(payrollSummary.total)}</h2>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Total Payroll Cost</p>

            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-[#00a76b] rounded-full transition-all duration-500" style={{ width: `${payrollSummary.total ? (payrollSummary.processed / payrollSummary.total) * 100 : 0}%` }}></div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Processed</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(payrollSummary.processed)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(payrollSummary.pending)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between hover:!border-purple-500 dark:hover:!border-purple-400 transition-colors duration-300">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white">Recruitment Overview</h3>
              <CustomDropdown
                value={recruitmentPeriod}
                onChange={setRecruitmentPeriod}
                options={['This Month', 'Last Month', 'This Year', 'All Time']}
              />
            </div>
            <div className="space-y-2">
              {[
                { label: 'New Applications', val: currentRecOverview.newApplications ?? 0, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
                { label: 'Shortlisted', val: currentRecOverview.shortlisted ?? 0, icon: CheckCircle, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
                { label: 'Interviews Scheduled', val: currentRecOverview.interviewsScheduled ?? 0, icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/40' },
                { label: 'Offers Issued', val: currentRecOverview.offersIssued ?? 0, icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40' },
                {
                  label: recruitmentPeriod === 'This Month' ? 'Hires This Month' : recruitmentPeriod === 'Last Month' ? 'Hires Last Month' : recruitmentPeriod === 'This Year' ? 'Hires This Year' : 'Total Hires',
                  val: currentRecOverview.hires ?? currentRecOverview.hiresThisMonth ?? 0,
                  icon: UserPlus,
                  color: 'text-[#00a76b]',
                  bg: 'bg-green-50 dark:bg-green-950/40'
                }
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center py-2 px-2.5 rounded-lg border border-gray-50 dark:border-[#2b2722] hover:bg-gray-50 dark:hover:bg-[#1a1714] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${r.bg} ${r.color}`}>
                      <r.icon size={14} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{r.label}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Fourth Row (Quick Actions, Pending Approvals) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="p-6 flex flex-col h-[420px] lg:col-span-4 xl:col-span-4 hover:!border-[#00a76b] dark:hover:!border-[#34d399] transition-colors duration-300">
          <h3 className="font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Add Employee',
                icon: UserPlus,
                color: 'text-blue-500',
                bg: 'bg-blue-50 dark:bg-blue-950/40',
                hoverBorder: 'hover:!border-blue-400 dark:hover:!border-blue-500',
                hoverBg: 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20',
                hoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
                onClick: () => navigate('/hr/create-user')
              },
              {
                label: 'Add Department',
                icon: Layers,
                color: 'text-indigo-500',
                bg: 'bg-indigo-50 dark:bg-indigo-950/40',
                hoverBorder: 'hover:!border-indigo-400 dark:hover:!border-indigo-500',
                hoverBg: 'hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20',
                hoverText: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
                onClick: () => navigate('/hr/departments')
              },
              {
                label: 'Create Job',
                icon: Briefcase,
                color: 'text-purple-500',
                bg: 'bg-purple-50 dark:bg-purple-950/40',
                hoverBorder: 'hover:!border-purple-400 dark:hover:!border-purple-500',
                hoverBg: 'hover:bg-purple-50/40 dark:hover:bg-purple-950/20',
                hoverText: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
                onClick: () => navigate('/hr/recruitment')
              },
              {
                label: 'Approve Leave',
                icon: CheckCircle,
                color: 'text-[#00a76b]',
                bg: 'bg-green-50 dark:bg-green-950/40',
                hoverBorder: 'hover:!border-[#00a76b] dark:hover:!border-[#00a76b]',
                hoverBg: 'hover:bg-green-50/40 dark:hover:bg-green-950/20',
                hoverText: 'group-hover:text-[#00a76b] dark:group-hover:text-[#00a76b]',
                onClick: () => navigate('/hr/leave', { state: { viewMode: 'hr', filter: 'pending' } })
              },
              {
                label: 'Run Payroll',
                icon: Activity,
                color: 'text-orange-500',
                bg: 'bg-orange-50 dark:bg-orange-950/40',
                hoverBorder: 'hover:!border-orange-400 dark:hover:!border-orange-500',
                hoverBg: 'hover:bg-orange-50/40 dark:hover:bg-orange-950/20',
                hoverText: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
                onClick: () => navigate('/hr/payroll')
              },
              {
                label: 'Announcement',
                icon: Bell,
                color: 'text-red-500',
                bg: 'bg-red-50 dark:bg-red-950/40',
                hoverBorder: 'hover:!border-red-400 dark:hover:!border-red-500',
                hoverBg: 'hover:bg-red-50/40 dark:hover:bg-red-950/20',
                hoverText: 'group-hover:text-red-600 dark:group-hover:text-red-400',
                onClick: () => navigate('/hr/notifications')
              },
            ].map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`flex flex-col items-center justify-center py-4 px-3 border border-gray-100 dark:border-[#2b2722] bg-white dark:bg-[#1a1714] rounded-2xl ${action.hoverBorder} ${action.hoverBg} transition-all group cursor-pointer shadow-2xs hover:shadow-md`}
              >
                <div className={`p-2.5 rounded-2xl mb-2 ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon size={20} />
                </div>
                <span className={`text-[11px] font-bold text-gray-600 dark:text-gray-300 ${action.hoverText} text-center uppercase tracking-wider transition-colors`}>{action.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6 flex flex-col h-[420px] lg:col-span-8 xl:col-span-8 hover:!border-blue-500 dark:hover:!border-blue-400 transition-colors duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white">Pending Approvals</h3>
            <button onClick={() => navigate('/hr/leave', { state: { viewMode: 'hr', filter: 'pending' } })} className="text-xs font-bold text-[#00a76b] hover:underline cursor-pointer">View All</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pendingApprovals.filter(a => a.role?.toLowerCase() !== 'hr' && a.role?.toLowerCase() !== 'admin').length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.filter(a => a.role?.toLowerCase() !== 'hr' && a.role?.toLowerCase() !== 'admin').map((approval) => (
                  <div
                    key={approval._id}
                    onClick={() => setSelectedLeaveApproval(approval)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 dark:bg-[#1a1714] hover:bg-white dark:hover:bg-[#221e19] rounded-xl border border-gray-100 dark:border-[#2b2722] hover:border-gray-200 dark:hover:border-[#38332c] hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="p-3 bg-white dark:bg-[#25201b] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 shadow-sm rounded-xl text-blue-500 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-[#00a76b] transition-colors">{approval.name}</h4>
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full capitalize">
                            {approval.subType || approval.type}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400 dark:text-gray-400" />
                          {approval.details}
                        </p>
                        {approval.reason && (
                          <p className="text-xs text-gray-400 dark:text-gray-400 italic mt-1 line-clamp-1 max-w-md">
                            "{approval.reason}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-md uppercase">
                        {Math.floor((new Date() - new Date(approval.date)) / (1000 * 60 * 60 * 24)) || 1} days ago
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveLeave(approval._id);
                        }}
                        title="Approve Leave"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#00a76b] text-white hover:bg-[#00915c] transition-colors shadow-sm cursor-pointer"
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectLeave(approval._id);
                        }}
                        title="Reject Leave"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
                      >
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShieldCheck size={48} className="mb-3 text-gray-200 dark:text-neutral-700" />
                <p className="font-medium text-sm">No pending approvals required.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 6. Fifth Row (Recent Joiners, Birthdays, Announcements) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 h-[320px] flex flex-col hover:!border-sky-500 dark:hover:!border-sky-400 transition-colors duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white">Recent Joiners</h3>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            {recentJoiners.length > 0 ? recentJoiners.map((rj) => (
              <div key={rj._id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={rj.profileImage ? `http://localhost:5000${rj.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(rj.name)}&background=random`} alt={rj.name} className="w-10 h-10 rounded-full border-2 border-white dark:border-[#2b2722] shadow-sm object-cover" />
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{rj.name}</p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{rj.role}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400">{new Date(rj.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )) : <p className="text-sm text-gray-400 text-center py-4">No recent joiners</p>}
          </div>
        </Card>

        <Card className="p-6 h-[320px] flex flex-col hover:!border-pink-500 dark:hover:!border-pink-400 transition-colors duration-300">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white truncate pr-2">Birthdays & Anniversaries</h3>
              {upcomingCelebrations.some(c => checkIsToday(c.date, c.diffDays)) && (
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 animate-pulse">
                  🎉 Today
                </span>
              )}
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {upcomingCelebrations.length > 0 ? upcomingCelebrations.map(celeb => {
              const isToday = checkIsToday(celeb.date, celeb.diffDays);
              const isWished = Boolean(celeb.isWished || wishedEvents.includes(celeb._id));

              return (
                <div
                  key={celeb._id}
                  className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl transition-all ${isToday ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 shadow-2xs' : 'hover:bg-gray-50 dark:hover:bg-[#1a1714]'
                    }`}
                >
                  {/* Left: Avatar + Info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={celeb.profileImage ? `http://localhost:5000${celeb.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(celeb.name)}&background=random`}
                        alt={celeb.name}
                        className="w-9 h-9 rounded-full border-2 border-white dark:border-[#2b2722] shadow-xs object-cover"
                      />
                      {isToday && (
                        <span className="absolute -bottom-1 -right-1 text-xs select-none">
                          {celeb.type === 'Birthday' ? '🎂' : '🌟'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-gray-900 dark:text-white truncate leading-tight">{celeb.name}</p>
                      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        {celeb.type === 'Birthday' ? <Cake size={11} className="text-pink-500 shrink-0" /> : <Gift size={11} className="text-purple-500 shrink-0" />}
                        <span className="truncate">{celeb.type}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Action or Date */}
                  <div className="shrink-0 flex items-center">
                    {isToday ? (
                      isWished ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#00a76b] bg-emerald-100/90 dark:bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                          <Heart size={11} className="fill-[#00a76b] text-[#00a76b]" />
                          <span>Wished!</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenWishModal(celeb)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00a76b] hover:bg-[#00915c] text-[#fffefb] font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <PartyPopper size={12} className="text-amber-200" />
                          <span>Wish</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#25201b] px-2 py-1 rounded-lg">
                        {new Date(celeb.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 group">
                <div className="w-16 h-16 bg-pink-50/50 dark:bg-pink-900/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Gift size={32} className="text-pink-300 dark:text-pink-800 group-hover:-rotate-12 transition-transform duration-300" />
                </div>
                <p className="text-gray-900 dark:text-white font-bold text-sm mb-1">No Upcoming Events</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">There are no birthdays or work anniversaries in the next 30 days.</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 h-[320px] flex flex-col hover:!border-[#00a76b] dark:hover:!border-[#34d399] transition-colors duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">HR Announcements</h3>
            <button
              onClick={() => navigate('/hr/notifications')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              View All
            </button>
          </div>
          <div className="space-y-2.5 flex-1 flex flex-col justify-start">
            {announcements && announcements.length > 0 ? announcements.slice(0, 3).map((ann) => (
              <div
                key={ann._id}
                onClick={() => navigate('/hr/notifications')}
                className="p-3 bg-[#f0f6ff] dark:bg-blue-950/25 hover:bg-[#e6f0fd] dark:hover:bg-blue-950/40 rounded-2xl border border-[#dbeafe] dark:border-blue-900/40 flex flex-col gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-[#2563eb] text-white px-2 py-0.5 rounded shadow-xs shrink-0">
                    NEW
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1 flex-1 leading-tight">
                    {ann.title || ann.message}
                  </h4>
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium pt-0.5">
                  <span className="font-bold text-[#2563eb] dark:text-blue-400">
                    By: {ann.senderName || (ann.senderRole === 'admin' ? 'Admin' : 'HR Manager')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                      {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {!ann.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-xs"></span>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 my-auto">
                <Bell size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No active announcements</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 7. Bottom Row (Analytics) */}
      <Card className="p-6 hover:!border-purple-500 dark:hover:!border-purple-400 transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white">HR Analytics</h3>
          <CustomDropdown
            value="This Quarter"
            options={['This Quarter', 'Last Quarter', 'This Year']}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { id: 'turnover', label: 'Employee Turnover Rate', val: '8.4%', trend: 'down', trendVal: '1.2%', color: '#10b981', hoverBorder: 'hover:!border-[#10b981] dark:hover:!border-[#34d399]', trendColor: 'text-[#10b981]', data: [{ v: 12 }, { v: 14 }, { v: 10 }, { v: 15 }, { v: 14 }, { v: 16 }, { v: 12 }, { v: 17 }] },
            { id: 'hire', label: 'Average Time to Hire', val: '18 Days', trend: 'down', trendVal: '2 days', color: '#3b82f6', hoverBorder: 'hover:!border-[#3b82f6] dark:hover:!border-[#60a5fa]', trendColor: 'text-[#3b82f6]', data: [{ v: 20 }, { v: 22 }, { v: 20 }, { v: 18 }, { v: 21 }, { v: 19 }, { v: 18 }, { v: 25 }] },
            { id: 'satisfaction', label: 'Employee Satisfaction', val: '4.2 / 5', trend: 'up', trendVal: '0.3', color: '#8b5cf6', hoverBorder: 'hover:!border-[#8b5cf6] dark:hover:!border-[#a78bfa]', trendColor: 'text-[#8b5cf6]', data: [{ v: 3.8 }, { v: 3.7 }, { v: 3.9 }, { v: 3.8 }, { v: 4.1 }, { v: 3.9 }, { v: 4.0 }, { v: 4.2 }] },
            { id: 'absenteeism', label: 'Absenteeism Rate', val: '2.6%', trend: 'down', trendVal: '0.8%', color: '#f59e0b', hoverBorder: 'hover:!border-[#f59e0b] dark:hover:!border-[#fbbf24]', trendColor: 'text-[#f59e0b]', data: [{ v: 3.2 }, { v: 3.0 }, { v: 3.1 }, { v: 2.8 }, { v: 2.9 }, { v: 2.5 }, { v: 2.7 }, { v: 2.9 }] },
            { id: 'training', label: 'Training Completion Rate', val: '76%', trend: 'up', trendVal: '6%', color: '#14b8a6', hoverBorder: 'hover:!border-[#14b8a6] dark:hover:!border-[#2dd4bf]', trendColor: 'text-[#14b8a6]', data: [{ v: 65 }, { v: 68 }, { v: 66 }, { v: 70 }, { v: 70 }, { v: 74 }, { v: 73 }, { v: 76 }] },
          ].map((metric, i) => (
            <div key={i} className={`group p-4 border border-gray-100 dark:border-[#2b2722] rounded-xl bg-white dark:bg-[#1a1714] shadow-sm relative overflow-hidden flex flex-col h-36 ${metric.hoverBorder} transition-colors duration-300 cursor-pointer`}>
              <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 tracking-tight mb-2 truncate">{metric.label}</p>
              <h4 className="text-2xl font-black text-gray-900 dark:text-white">{metric.val}</h4>
              <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${metric.trendColor}`}>
                {metric.trend === 'up' ? '↑' : '↓'} {metric.trendVal} vs last quarter
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metric.data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`color-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metric.color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={metric.color} strokeWidth={2} fillOpacity={1} fill={`url(#color-${metric.id})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Leave Details Modal */}
      {selectedLeaveApproval && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedLeaveApproval(null)}
        >
          <div
            className="bg-white dark:bg-[#161311] rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-[#28251e] relative my-auto flex flex-col max-h-[90vh] overflow-hidden transform animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header (Fixed at top) */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-[#28251e] shrink-0 bg-white dark:bg-[#161311]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">Leave Application Details</h3>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    Pending Approval
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeaveApproval(null)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#28251e] rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Employee Profile Card */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-[#1f1b17] dark:to-[#1a1714] rounded-2xl border border-gray-100 dark:border-[#28251e] flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00a76b] text-white font-bold text-lg flex items-center justify-center uppercase shadow-sm">
                  {selectedLeaveApproval.name ? selectedLeaveApproval.name.charAt(0) : 'E'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 dark:text-white text-base truncate">{selectedLeaveApproval.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                    <span className="capitalize">{selectedLeaveApproval.role || 'Employee'}</span>
                    {selectedLeaveApproval.employeeId && (
                      <>
                        <span>•</span>
                        <span>ID: {selectedLeaveApproval.employeeId}</span>
                      </>
                    )}
                  </div>
                  {selectedLeaveApproval.email && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{selectedLeaveApproval.email}</p>
                  )}
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-50/80 dark:bg-[#1f1b17] rounded-2xl border border-gray-100 dark:border-[#28251e]">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Leave Type</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white capitalize mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {selectedLeaveApproval.subType || selectedLeaveApproval.type}
                  </p>
                </div>
                <div className="p-3.5 bg-gray-50/80 dark:bg-[#1f1b17] rounded-2xl border border-gray-100 dark:border-[#28251e]">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Duration</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white mt-1">
                    {selectedLeaveApproval.totalDays || 1} {selectedLeaveApproval.totalDays === 1 ? 'Day' : 'Days'}
                  </p>
                </div>
                <div className="p-3.5 bg-gray-50/80 dark:bg-[#1f1b17] rounded-2xl border border-gray-100 dark:border-[#28251e] col-span-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Leave Duration</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                    <Calendar size={15} className="text-[#00a76b]" />
                    {selectedLeaveApproval.startDate ? new Date(selectedLeaveApproval.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : selectedLeaveApproval.details}
                    <span className="text-gray-400 font-normal">to</span>
                    {selectedLeaveApproval.endDate ? new Date(selectedLeaveApproval.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </p>
                </div>
              </div>

              {/* Reason For Leave Box (Main Requirement) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Reason for Leave (રજા શેના માટે મૂકી છે):
                </label>
                <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 text-gray-800 dark:text-amber-200 text-sm leading-relaxed font-medium">
                  {selectedLeaveApproval.reason || 'No detailed explanation provided.'}
                </div>
              </div>

              {/* Applied Date Info */}
              <div className="text-right">
                <span className="text-[11px] font-semibold text-gray-400">
                  Applied on: {selectedLeaveApproval.date ? new Date(selectedLeaveApproval.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Action Buttons (Fixed at bottom) */}
            <div className="p-6 pt-4 border-t border-gray-100 dark:border-[#28251e] shrink-0 bg-gray-50/50 dark:bg-[#161311] rounded-b-3xl grid grid-cols-2 gap-3">
              {(!selectedLeaveApproval.status || selectedLeaveApproval.status === 'pending') ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleRejectLeave(selectedLeaveApproval._id);
                      setSelectedLeaveApproval(null);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X size={16} strokeWidth={2.5} />
                    Reject Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleApproveLeave(selectedLeaveApproval._id);
                      setSelectedLeaveApproval(null);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#00a76b]/20 cursor-pointer"
                  >
                    <Check size={16} strokeWidth={2.5} />
                    Approve Leave
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleOverrideLeave(selectedLeaveApproval._id, selectedLeaveApproval.status);
                    setSelectedLeaveApproval(null);
                  }}
                  className="col-span-2 w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Sparkles size={16} />
                  Override Decision ({selectedLeaveApproval.status === 'approved' ? 'Reject' : 'Approve'})
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Send Wish Greeting Modal */}
      {selectedWishCeleb && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedWishCeleb(null)}
        >
          <div
            className="bg-white dark:bg-[#161311] rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-[#28251e] relative my-auto flex flex-col max-h-[90vh] overflow-hidden transform animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-[#28251e] shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50/30 dark:from-emerald-950/40 dark:to-teal-950/20">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-[#00a76b] flex items-center justify-center font-bold text-xl shadow-xs">
                  {selectedWishCeleb.type === 'Birthday' ? '🎂' : '🌟'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                    {selectedWishCeleb.type === 'Birthday' ? 'Send Birthday Wishes 🎉' : 'Send Anniversary Wishes 🌟'}
                  </h3>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                    Express your greetings to <span className="text-gray-900 dark:text-white font-bold">{selectedWishCeleb.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWishCeleb(null)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#28251e] rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Employee Preview Badge */}
              <div className="p-3.5 bg-gray-50 dark:bg-[#1f1b17] rounded-2xl border border-gray-100 dark:border-[#28251e] flex items-center gap-3">
                <img
                  src={selectedWishCeleb.profileImage ? `http://localhost:5000${selectedWishCeleb.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedWishCeleb.name)}&background=random`}
                  alt={selectedWishCeleb.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-[#28251e] shadow-xs"
                />
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">{selectedWishCeleb.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {selectedWishCeleb.type === 'Birthday' ? '🎂 Celebrating Birthday Today' : `🌟 Celebrating ${selectedWishCeleb.type} Today`}
                  </p>
                </div>
              </div>

              {/* Quick Template Chips */}
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Quick Message Templates:
                </label>
                <div className="flex flex-col gap-2">
                  {(selectedWishCeleb.type === 'Birthday' ? [
                    `🎂 Wishing you a very Happy Birthday, ${selectedWishCeleb.name}! May your year ahead be filled with happiness and great success! 🎉`,
                    `🎉 Happy Birthday ${selectedWishCeleb.name}! Hope you have a wonderful celebration today! 🌟`,
                    `🎈 Warmest wishes on your special day! Thank you for being an amazing part of our team!`
                  ] : [
                    `🌟 Happy Work Anniversary, ${selectedWishCeleb.name}! Thank you for your dedication and contributions! 🚀`,
                    `🎉 Congratulations on your Work Anniversary! Wishing you continued growth and success with us! 💼`,
                    `✨ Cheers to another great milestone! Thank you for all your hard work!`
                  ]).map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomWishMessage(template)}
                      className={`text-left p-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${customWishMessage === template
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#00a76b] text-[#00a76b] font-bold shadow-xs'
                        : 'bg-white dark:bg-[#1f1b17] border-gray-200 dark:border-[#28251e] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#28251e] hover:border-gray-300'
                        }`}
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Message Area */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Your Personalized Message:
                </label>
                <textarea
                  rows={4}
                  value={customWishMessage}
                  onChange={(e) => setCustomWishMessage(e.target.value)}
                  placeholder="Write your wishes here..."
                  className="w-full p-3.5 text-sm bg-gray-50/70 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:border-[#00a76b] resize-none text-gray-800 dark:text-white font-medium"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 border-t border-gray-100 dark:border-[#28251e] shrink-0 bg-gray-50/50 dark:bg-[#161311] rounded-b-3xl flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedWishCeleb(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-[#28251e] hover:bg-gray-200 dark:hover:bg-[#342f27] text-gray-700 dark:text-gray-200 font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingWish || !customWishMessage.trim()}
                onClick={handleSendWish}
                className="flex-1 py-3 px-4 rounded-xl bg-[#00a76b] hover:bg-[#00915c] disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-[#00a76b]/20 cursor-pointer active:scale-95"
              >
                {isSendingWish ? (
                  <>
                    <Activity size={16} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Wish 🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Override Decision Confirmation Modal */}
      <ActionConfirmModal
        isOpen={overrideModal.isOpen}
        onClose={() => setOverrideModal({ isOpen: false, leaveId: null, currentStatus: '', targetStatus: '', loading: false })}
        onConfirm={confirmOverrideLeave}
        title="Override Leave Decision"
        subtitle={`Are you sure you want to override the decision to ${overrideModal.targetStatus?.toUpperCase()}?`}
        currentStatus={overrideModal.currentStatus}
        targetStatus={overrideModal.targetStatus}
        confirmText={`Override to ${overrideModal.targetStatus?.toUpperCase()}`}
        confirmVariant={overrideModal.targetStatus === 'rejected' ? 'danger' : 'success'}
        loading={overrideModal.loading}
      />

    </div>
  );
};

export default HRDashboard;
