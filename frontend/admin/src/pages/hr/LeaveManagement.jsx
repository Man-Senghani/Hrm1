import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  CheckSquare, Clock, Users, Calendar, BarChart2,
  CheckCircle2, AlertTriangle, ArrowRight, XCircle, LayoutGrid,
  FileText, Upload, RefreshCcw, HandCoins, DollarSign, Check, ChevronDown, Plus, Briefcase
} from 'lucide-react';
import LeavePolicyOverview from '../../components/LeavePolicyOverview';
import HolidayManagement from '../../components/HolidayManagement';
import LeaveAllocationSummary from '../../components/LeaveAllocationSummary';
import CompanyShutdowns from '../../components/CompanyShutdowns';
import EmployeeLeaveAudit from '../../components/EmployeeLeaveAudit';
import LeaveDashboardHeader from '../../components/LeaveDashboardHeader';
import EmployeeAvailabilityChart from '../../components/manager/EmployeeAvailabilityChart';
import EmployeeLeaveManagement from '../employee/LeaveManagement';
import CustomDatePicker from '../../components/CustomDatePicker';

// Modals
import CreatePolicyModal from '../../components/modals/CreatePolicyModal';
import AllocateLeaveModal from '../../components/modals/AllocateLeaveModal';
import OnDutyApprovalModal from '../../components/modals/OnDutyApprovalModal';
import AddHolidayModal from '../../components/modals/AddHolidayModal';
import CompOffApprovalModal from '../../components/modals/CompOffApprovalModal';
import LeaveEncashmentModal from '../../components/modals/LeaveEncashmentModal';
import ActionConfirmModal from '../../components/ActionConfirmModal';

const Leaves = () => {
  const location = useLocation();
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const role = sessionStorage.getItem('role');

  const [viewMode, setViewMode] = useState(
    role === 'admin' ? 'hr' : (location.state?.viewMode || (location.state?.tab === 'team' ? 'hr' : 'employee'))
  ); // 'hr' or 'employee'

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [requestFilter, setRequestFilter] = useState(location.state?.filter || 'pending');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [applyDropdownOpen, setApplyDropdownOpen] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [hoveredTeamCardIndex, setHoveredTeamCardIndex] = useState(null);
  const [hoveredQuickActionIndex, setHoveredQuickActionIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState(null);

  useEffect(() => {
    if (role === 'admin') {
      setViewMode('hr');
      return;
    }
    if (location.state?.viewMode) {
      setViewMode(location.state.viewMode);
    } else if (location.state?.tab === 'team') {
      setViewMode('hr');
    }
    if (location.state?.filter) {
      setRequestFilter(location.state.filter);
    }
  }, [location.state, role]);

  useEffect(() => {
    setCurrentPage(1);
  }, [requestFilter, filterStartDate, filterEndDate]);

  const leaveRequestsRef = useRef(null);

  // Data refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const scrollToRequests = (filterType) => {
    setRequestFilter(filterType);
    if (leaveRequestsRef.current) {
      leaveRequestsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      await axios.put(`/api/leaves/hr-approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Leave request approved successfully');
      triggerRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve leave');
    }
  };

  const handleRejectLeave = async (id) => {
    try {
      await axios.put(`/api/leaves/reject/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Leave request rejected successfully');
      triggerRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject leave');
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
      await axios.put(`/api/leaves/override/${overrideModal.leaveId}`, {
        targetStatus: overrideModal.targetStatus,
        reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Leave decision overridden to ${overrideModal.targetStatus.toUpperCase()}`);
      setOverrideModal({ isOpen: false, leaveId: null, currentStatus: '', targetStatus: '', loading: false });
      triggerRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to override leave');
      setOverrideModal(prev => ({ ...prev, loading: false }));
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'pending': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      case 'cancellation_pending': return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      case 'rejected': return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      case 'cancelled': return 'bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400';
      default: return 'bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400';
    }
  };

  const token = sessionStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  // Basic stats for summary cards (Scoped to current month for 'This Month' label)
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
  const thisMonthLeaves = leaves.filter(l => {
    const sDate = l.startDate ? l.startDate.split('T')[0] : '';
    const cDate = l.createdAt ? l.createdAt.split('T')[0] : '';
    return sDate.startsWith(currentMonthPrefix) || cDate.startsWith(currentMonthPrefix);
  });
  const pendingRequests = leaves.filter(l => l.status?.toLowerCase() === 'pending' || l.status?.toLowerCase() === 'cancellation_pending').length;
  const approvedLeaves = leaves.filter(l => l.status?.toLowerCase() === 'approved').length;
  const totalRequests = thisMonthLeaves.length;

  const dateFilteredLeaves = leaves.filter(l => {
    if (l.startDate) {
      const leaveStart = l.startDate.split('T')[0];
      if (filterStartDate && leaveStart < filterStartDate) return false;
      if (filterEndDate && leaveStart > filterEndDate) return false;
    } else if (filterStartDate || filterEndDate) {
      return false;
    }
    return true;
  });

  // Counts and filters for the request filter tabs
  const countAll = dateFilteredLeaves.length;
  const countPending = dateFilteredLeaves.filter(l => l.status?.toLowerCase() === 'pending' || l.status?.toLowerCase() === 'cancellation_pending').length;
  const countApproved = dateFilteredLeaves.filter(l => l.status?.toLowerCase() === 'approved').length;
  const countCancellation = dateFilteredLeaves.filter(l => l.status?.toLowerCase() === 'cancellation_pending').length;
  const countRejected = dateFilteredLeaves.filter(l => l.status?.toLowerCase() === 'rejected').length;
  const countCancelled = dateFilteredLeaves.filter(l => l.status?.toLowerCase() === 'cancelled').length;

  const filteredLeaves = dateFilteredLeaves.filter(l => {
    if (requestFilter === 'all') return true;
    if (requestFilter === 'pending') {
      return l.status?.toLowerCase() === 'pending' || l.status?.toLowerCase() === 'cancellation_pending';
    }
    return l.status?.toLowerCase() === requestFilter;
  });

  useEffect(() => {
    if (viewMode !== 'hr') return;
    const fetchData = async () => {
      try {
        const endpoint = role === 'admin' ? '/api/leaves' : '/api/leaves/hr';
        const [leavesRes, statsRes] = await Promise.all([
          axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/hr-dashboard/summary', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        let leavesData = leavesRes.data || [];
        if (role === 'hr' && user) {
          const currentUserId = String(user._id || user.id || '');
          leavesData = leavesData.filter(l => {
            const leaveUserId = String(l.user?._id || l.user?.id || l.user || l.employeeId || '');
            return leaveUserId !== currentUserId;
          });
        }
        setLeaves(leavesData);
        if (statsRes.data && statsRes.data.data) {
          setStats(statsRes.data.data.stats);
        }
      } catch (err) {
        console.error('Fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, refreshTrigger, viewMode, role]);

  const handleDownloadReport = () => {
    if (!leaves || leaves.length === 0) {
      alert('No data available to download');
      return;
    }

    const headers = ['Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason'];
    const csvRows = [headers.join(',')];

    leaves.forEach(leave => {
      const empName = leave.user?.name || 'Unknown';
      const type = leave.leaveType || '';
      const start = leave.startDate ? new Date(leave.startDate).toISOString().split('T')[0] : '';
      const end = leave.endDate ? new Date(leave.endDate).toISOString().split('T')[0] : '';
      const days = leave.totalDays || 0;
      const status = leave.status || '';
      const reason = `"${(leave.reason || '').replace(/"/g, '""')}"`;

      csvRows.push([empName, type, start, end, days, status, reason].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0b1120] text-[#1e293b] dark:text-[#cbd5e1] font-['Inter',sans-serif] px-4 pb-8 pt-2 transition-colors duration-300">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-black text-[#1e293b] dark:text-white tracking-tight leading-none">
            Leave Management
          </h1>
        </div>
      </div>

      {/* VIEW MODE TOGGLE & ACTIONS (ONLY SHOWN FOR HR, NOT ADMIN) */}
      {role !== 'admin' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full mb-4 mt-2">
          <div className="bg-white dark:bg-[#1e293b] p-1 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm inline-flex">
            <button
              onClick={() => setViewMode('employee')}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'employee' ? 'bg-[#00a76b] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
            >
              My Leaves
            </button>
            <button
              onClick={() => setViewMode('hr')}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'hr' ? 'bg-[#00a76b] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
            >
              Team Leaves (HR)
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setViewMode('employee');
                setTimeout(() => window.dispatchEvent(new CustomEvent('open-leave-modal', { detail: 'apply-leave' })), 100);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus size={16} /> Apply for Leave
            </button>
          </div>
        </div>
      )}

      {viewMode === 'employee' ? (
        <EmployeeLeaveManagement isChild={true} />
      ) : (
        <>
          {/* 2. SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
            {[
              { label: 'Total Leave Requests', val: totalRequests, sub: 'This Month', icon: CheckSquare, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40', borderColor: '#6366f1', glowColor: 'rgba(99, 102, 241, 0.35)', filter: 'all' },
              { label: 'Pending Approvals', val: pendingRequests, sub: 'Requests', icon: Clock, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/40', borderColor: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.35)', filter: 'pending' },
              { label: 'Employees On Leave', val: stats?.employeesOnLeave || 0, sub: 'Today', icon: Users, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40', borderColor: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.35)' },
              { label: 'Employees Present Today', val: stats?.employeesPresent !== undefined ? stats.employeesPresent : 0, sub: 'Present', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40', borderColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.35)' },
              { label: 'Upcoming Holidays', val: stats?.upcomingHolidays || 0, sub: 'In 30 Days', icon: Calendar, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/60 border border-pink-100 dark:border-pink-900/40', borderColor: '#ec4899', glowColor: 'rgba(236, 72, 153, 0.35)' }
            ].map((stat, i) => {
              const isClickable = !!stat.filter;
              const isHovered = hoveredTeamCardIndex === i;
              return (
                <div
                  key={i}
                  onClick={() => isClickable && scrollToRequests(stat.filter)}
                  onMouseEnter={() => setHoveredTeamCardIndex(i)}
                  onMouseLeave={() => setHoveredTeamCardIndex(null)}
                  style={{
                    borderColor: isHovered ? stat.borderColor : undefined,
                    borderWidth: '2px',
                    borderStyle: 'solid'
                  }}
                  className="bg-white dark:bg-[#111c18] py-2 px-3 rounded-xl shadow-xs flex items-center justify-between gap-2.5 cursor-pointer transition-colors duration-200 group select-none border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stat.bg} group-hover:scale-110 transition-transform duration-200`}>
                      <stat.icon size={16} className={stat.color} />
                    </div>
                    <div className="min-w-0 relative group">
                      <h3 className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate cursor-help">{stat.label}</h3>
                      <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-50 bg-gray-900 dark:bg-gray-750 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap pointer-events-none uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline shrink-0 ml-2">
                    <span className="text-xl font-black text-gray-900 dark:text-white mr-1 leading-none">{stat.val}</span>
                    {stat.sub && <span className="text-[9px] font-bold text-gray-400 leading-none">{stat.sub}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Employee Leave Requests (Full Width 100% - Row 2) */}
          <div ref={leaveRequestsRef} className="w-full bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6 flex flex-col justify-between mb-8 overflow-hidden transition-all duration-200 hover:border-emerald-500 h-[680px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Employee Leave Requests</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Review, approve, or reject employee leave applications</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Date Range Filter */}
                <div className="flex items-center gap-2">
                  <CustomDatePicker
                    name="filterStartDate"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    placeholder="Start Date"
                    className="w-26 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg h-9 flex items-center text-[11px] font-semibold text-gray-700 dark:text-gray-300"
                  />
                  <span className="text-gray-400 text-xs font-bold">to</span>
                  <CustomDatePicker
                    name="filterEndDate"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    placeholder="End Date"
                    align="right"
                    className="w-26 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg h-9 flex items-center text-[11px] font-semibold text-gray-700 dark:text-gray-300"
                  />
                  {(filterStartDate || filterEndDate) && (
                    <button
                      onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                      className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase px-2 py-1 bg-red-50 dark:bg-red-950/20 rounded-md transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Dropdown status filter */}
                <div className="relative">
                  <button
                    onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    className="flex items-center gap-1.5 text-xs font-bold bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg h-9 text-gray-600 dark:text-gray-300 outline-none cursor-pointer transition-all"
                  >
                    {requestFilter === 'all' && `All (${countAll})`}
                    {requestFilter === 'pending' && `Pending (${countPending})`}
                    {requestFilter === 'approved' && `Approved (${countApproved})`}
                    {requestFilter === 'cancellation_pending' && `Cancellation Requested (${countCancellation})`}
                    {requestFilter === 'rejected' && `Rejected (${countRejected})`}
                    {requestFilter === 'cancelled' && `Cancelled (${countCancelled})`}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${filterDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {filterDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setFilterDropdownOpen(false)} />
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                        {[
                          { value: 'all', label: 'All', count: countAll },
                          { value: 'pending', label: 'Pending', count: countPending },
                          { value: 'approved', label: 'Approved', count: countApproved },
                          { value: 'cancellation_pending', label: 'Cancellation Requested', count: countCancellation },
                          { value: 'rejected', label: 'Rejected', count: countRejected },
                          { value: 'cancelled', label: 'Cancelled', count: countCancelled }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => { setRequestFilter(opt.value); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${requestFilter === opt.value ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                          >
                            {opt.label} ({opt.count})
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {filteredLeaves.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 font-medium py-12">No leave requests found.</div>
            ) : (
              <>
                <div className="overflow-x-auto overflow-y-hidden flex-1">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 text-xs text-center">
                        <th className="pb-3 font-semibold text-left">Employee</th>
                        <th className="pb-3 font-semibold">Leave Type</th>
                        <th className="pb-3 font-semibold">From</th>
                        <th className="pb-3 font-semibold">To</th>
                        <th className="pb-3 font-semibold">Duration</th>
                        <th className="pb-3 font-semibold">Reason</th>
                        <th className="pb-3 font-semibold">Status</th>
                        {(requestFilter === 'pending' || requestFilter === 'cancellation_pending') && <th className="pb-3 font-semibold text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaves
                        .slice((currentPage - 1) * 10, currentPage * 10)
                        .map(leave => (
                          <tr key={leave._id} onClick={() => setSelectedLeaveDetails(leave)} className="border-b border-gray-50 dark:border-gray-850 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all text-xs font-semibold text-gray-700 dark:text-gray-300 text-center cursor-pointer">
                            <td className="py-2 text-left flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100 shadow-sm shrink-0">
                                {leave.user?.name ? leave.user.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-gray-900 dark:text-white truncate">{leave.user?.name || 'Unknown'}</span>
                                <span className="text-[10px] text-gray-400 font-medium truncate">{leave.user?.email || 'No email'}</span>
                              </div>
                            </td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${leave.leaveType === 'sick' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                                leave.leaveType === 'casual' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' :
                                  'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                                }`}>
                                {leave.leaveType || leave.type}
                              </span>
                            </td>
                            <td className="py-2 text-gray-500 dark:text-gray-400 font-medium">
                              {leave.startDate ? new Date(leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </td>
                            <td className="py-2 text-gray-500 dark:text-gray-400 font-medium">
                              {leave.endDate ? new Date(leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </td>
                            <td className="py-2 font-bold text-gray-900 dark:text-white">
                              {leave.totalDays || 0} day(s)
                            </td>
                            <td className="py-2 text-gray-500 dark:text-gray-400 font-medium max-w-[150px] truncate" title={leave.reason}>
                              {leave.reason || '-'}
                            </td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(leave.status)}`}>
                                {leave.status === 'cancellation_pending' ? 'Cancellation Requested' : leave.status}
                              </span>
                            </td>
                            {(requestFilter === 'pending' || requestFilter === 'cancellation_pending') && (
                              <td className="py-2 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRejectLeave(leave._id); }}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                                    title="Reject"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleApproveLeave(leave._id); }}
                                    className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                                    title="Approve"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                {Math.ceil(filteredLeaves.length / 10) > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Page {currentPage} of {Math.ceil(filteredLeaves.length / 10)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLeaves.length / 10), p + 1))}
                        disabled={currentPage === Math.ceil(filteredLeaves.length / 10)}
                        className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-255 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 4. Quick Actions Row - Row 3 */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 ml-1">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
              {[
                { label: 'Create Policy', icon: FileText, color: 'text-purple-600 dark:text-purple-400', borderColor: '#8b5cf6', glowColor: 'rgba(139, 92, 246, 0.45)', bgIcon: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40', onClick: () => setActiveModal('createPolicy') },
                { label: 'Allocate Leave', icon: ArrowRight, color: 'text-emerald-600 dark:text-emerald-400', borderColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.45)', bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', onClick: () => setActiveModal('allocateLeave') },
                { label: 'On Duty Requests', icon: Briefcase, color: 'text-blue-600 dark:text-blue-400', borderColor: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.45)', bgIcon: 'bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40', onClick: () => setActiveModal('onDutyApproval') },
                { label: 'Add Holiday', icon: Calendar, color: 'text-pink-600 dark:text-pink-400', borderColor: '#ec4899', glowColor: 'rgba(236, 72, 153, 0.45)', bgIcon: 'bg-pink-50 dark:bg-pink-950/50 border border-pink-100 dark:border-pink-900/40', onClick: () => setActiveModal('addHoliday') },
                { label: 'Compensatory Off approval', icon: HandCoins, color: 'text-teal-600 dark:text-teal-400', borderColor: '#14b8a6', glowColor: 'rgba(20, 184, 166, 0.45)', bgIcon: 'bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-900/40', onClick: () => setActiveModal('compOff') },
                { label: 'Leave Encashment', icon: DollarSign, color: 'text-rose-600 dark:text-rose-400', borderColor: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.45)', bgIcon: 'bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40', onClick: () => setActiveModal('leaveEncashment') },
                { label: 'Download Report', icon: Upload, color: 'text-indigo-600 dark:text-indigo-400', borderColor: '#6366f1', glowColor: 'rgba(99, 102, 241, 0.45)', bgIcon: 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40', isRotate: true, onClick: handleDownloadReport }
              ].map((action, i) => {
                const isHovered = hoveredQuickActionIndex === i;
                return (
                  <button
                    key={i}
                    onClick={action.onClick}
                    onMouseEnter={() => setHoveredQuickActionIndex(i)}
                    onMouseLeave={() => setHoveredQuickActionIndex(null)}
                    style={{
                      borderColor: isHovered ? action.borderColor : undefined,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    className="bg-white dark:bg-[#1e293b] border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-200 py-2.5 px-3 rounded-2xl h-14 transition-all duration-200 flex items-center justify-start gap-2.5 shadow-xs group cursor-pointer"
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${action.bgIcon}`}>
                      <action.icon size={16} strokeWidth={2.5} className={`${action.color} ${action.isRotate ? "rotate-180" : ""}`} />
                    </div>
                    <span className="text-left font-black text-xs tracking-tight leading-none truncate w-full">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. 3-Column Grid: Holiday Management, Company Shutdowns, Leave Allocation Summary - Row 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            <div className="h-[400px] overflow-hidden"><HolidayManagement refreshTrigger={refreshTrigger} /></div>
            <div className="h-[400px] overflow-hidden"><CompanyShutdowns /></div>
            <div className="h-[400px] overflow-hidden"><LeaveAllocationSummary refreshTrigger={refreshTrigger} /></div>
          </div>

          {/* 7. Leave Policy Overview (Full Width - Row 6) */}
          <div className="w-full mb-8">
            <LeavePolicyOverview refreshTrigger={refreshTrigger} />
          </div>
        </>
      )}

      {/* Modals */}
      <CreatePolicyModal isOpen={activeModal === 'createPolicy'} onClose={() => setActiveModal(null)} onSuccess={triggerRefresh} />
      <AllocateLeaveModal isOpen={activeModal === 'allocateLeave'} onClose={() => setActiveModal(null)} onSuccess={triggerRefresh} />
      <OnDutyApprovalModal isOpen={activeModal === 'onDutyApproval'} onClose={() => setActiveModal(null)} onSuccess={triggerRefresh} />
      <AddHolidayModal isOpen={activeModal === 'addHoliday'} onClose={() => setActiveModal(null)} onSuccess={triggerRefresh} />
      <CompOffApprovalModal isOpen={activeModal === 'compOff'} onClose={() => setActiveModal(null)} onSuccess={triggerRefresh} />
      <LeaveEncashmentModal isOpen={activeModal === 'leaveEncashment'} onClose={() => setActiveModal(null)} onSuccess={triggerRefresh} />

      {/* Leave Details & Override Modal */}
      {selectedLeaveDetails && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLeaveDetails(null)}>
          <div className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm bg-white dark:bg-[#1e293b] shadow-2xl flex flex-col justify-between border-l-2 border-gray-300 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-150 dark:border-gray-800 relative">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Leave Request Details</h3>
              <button onClick={() => setSelectedLeaveDetails(null)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-155 dark:border-gray-800">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Employee</p>
                  <p className="text-xs font-black text-gray-900 dark:text-white mt-0.5">{selectedLeaveDetails.user?.name || 'Unknown'}</p>
                  <p className="text-[9px] text-gray-400 truncate">{selectedLeaveDetails.user?.email}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-155 dark:border-gray-800">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Leave Type</p>
                  <p className="text-xs font-black text-gray-900 dark:text-white mt-0.5 capitalize">{selectedLeaveDetails.leaveType} Leave</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-155 dark:border-gray-800">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Duration</p>
                  <p className="text-xs font-black text-gray-900 dark:text-white mt-0.5">
                    {selectedLeaveDetails.totalDays} {selectedLeaveDetails.totalDays === 1 ? 'Day' : 'Days'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-155 dark:border-gray-800">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                  <div className="mt-0.5">
                    <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full capitalize ${getStatusColor(selectedLeaveDetails.status)}`}>
                      {selectedLeaveDetails.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-155 dark:border-gray-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Leave Dates</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {selectedLeaveDetails.startDate && new Date(selectedLeaveDetails.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} to{' '}
                  {selectedLeaveDetails.endDate && new Date(selectedLeaveDetails.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-155 dark:border-gray-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Reason</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 break-words">{selectedLeaveDetails.reason || '-'}</p>
              </div>

              {selectedLeaveDetails.status === 'cancellation_pending' && selectedLeaveDetails.cancellationReason && (
                <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/20">
                  <p className="text-[10px] font-bold text-red-500 uppercase mb-0.5">Cancellation Reason</p>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-450 break-words">{selectedLeaveDetails.cancellationReason}</p>
                </div>
              )}
            </div>

            <div className="p-6 pt-4 border-t border-gray-150 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 shrink-0">
              {selectedLeaveDetails.status === 'pending' || selectedLeaveDetails.status === 'cancellation_pending' ? (
                <>
                  <button
                    onClick={() => { handleRejectLeave(selectedLeaveDetails._id); setSelectedLeaveDetails(null); }}
                    className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-xs font-bold cursor-pointer"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => { handleApproveLeave(selectedLeaveDetails._id); setSelectedLeaveDetails(null); }}
                    className="flex-1 py-2.5 bg-[#00a76b] text-white rounded-xl hover:bg-[#00915c] transition-colors text-xs font-bold cursor-pointer"
                  >
                    Approve Request
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { handleOverrideLeave(selectedLeaveDetails._id, selectedLeaveDetails.status); setSelectedLeaveDetails(null); }}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors text-xs font-bold cursor-pointer"
                >
                  Override Decision ({selectedLeaveDetails.status === 'approved' ? 'Reject' : 'Approve'})
                </button>
              )}
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

export default Leaves;
