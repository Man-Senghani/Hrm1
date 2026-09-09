import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ClipboardList, Users, CalendarDays, PieChart, TrendingUp, Plus, ChevronDown } from 'lucide-react';

import PendingApprovalQueue from '../components/PendingApprovalQueue';
import EmployeeAvailabilityChart from '../components/EmployeeAvailabilityChart';
import TeamLeaveCalendar from '../components/TeamLeaveCalendar';
import TeamLeaveBalance from '../components/TeamLeaveBalance';
import LeaveAnalyticsCharts from '../components/LeaveAnalyticsCharts';
import QuickActions from '../components/QuickActions';

import EmployeesOnLeaveTodayDrawer from '../components/modals/EmployeesOnLeaveTodayDrawer';
import UpcomingLeavesDrawer from '../components/modals/UpcomingLeavesDrawer';
import EmployeeLeaveManagement from '../components/EmployeeLeaveManagement';

const LeaveManagement = () => {
  const [stats, setStats] = useState(null);
  const [dynamicCounts, setDynamicCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState('manager');
  const [isLeaveTodayDrawerOpen, setIsLeaveTodayDrawerOpen] = useState(false);
  const [isUpcomingLeavesDrawerOpen, setIsUpcomingLeavesDrawerOpen] = useState(false);
  const [hoveredCardIndex, setHoveredCardIndex] = useState(null);
  const [applyDropdownOpen, setApplyDropdownOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('/api/leaves/manager/summary', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setStats(res.data);
    } catch (error) {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error('Failed to load leave summary stats');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading dashboard...</div>;
  }

  const activeStats = {
    pending: dynamicCounts?.pending ?? (stats?.pending || 0),
    onLeaveToday: dynamicCounts?.on_leave_today ?? (stats?.onLeaveToday || 0),
    upcoming: dynamicCounts?.upcoming ?? (stats?.upcoming || 0),
    thisMonthRequests: dynamicCounts?.this_month ?? (stats?.thisMonthRequests || 0),
    availabilityPercent: stats?.availabilityPercent || 0,
    availableCount: stats?.availableCount || 0,
    totalEmployees: stats?.totalEmployees || 0,
    growth: stats?.growth || 0
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0b1120] text-[#1e293b] dark:text-[#cbd5e1] font-['Inter',sans-serif] px-4 pb-8 pt-2 transition-colors duration-300">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Leave Management Dashboard</h1>
      </div>

      {/* VIEW MODE TOGGLE & ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full mb-6 mt-2">
        <div className="bg-white dark:bg-[#1e293b] p-1 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm inline-flex">
          <button 
            onClick={() => setViewMode('employee')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'employee' ? 'bg-[#00a76b] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
          >
            My Leaves
          </button>
          <button 
            onClick={() => setViewMode('manager')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'manager' ? 'bg-[#00a76b] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
          >
            Team Leaves (Manager)
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

      {viewMode === 'employee' ? (
        <EmployeeLeaveManagement isChild={true} />
      ) : (
        <>
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        
            {/* Pending Approvals */}
            <div
              onClick={() => { window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'pending' })); scrollToSection('pending-queue'); }}
              onMouseEnter={() => setHoveredCardIndex(0)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                borderColor: hoveredCardIndex === 0 ? '#a855f7' : undefined,
                borderWidth: '2px',
                borderStyle: 'solid',
                boxShadow: hoveredCardIndex === 0 ? '0 0 16px rgba(168, 85, 247, 0.35)' : undefined
              }}
              className="bg-white dark:bg-[#1e293b] py-3.5 px-5 rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[140px] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">Pending Approvals</span>
              </div>
              <div className="flex items-end gap-2 mt-1 mb-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{activeStats?.pending || 0}</span>
                <span className="text-sm font-medium text-gray-500 mb-0.5">Requests</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'pending' })); scrollToSection('pending-queue'); }} className="text-indigo-600 text-sm font-bold hover:underline self-start cursor-pointer border-none bg-transparent">View all &rarr;</button>
            </div>

            {/* Employees On Leave Today */}
            <div
              onClick={() => { window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'on_leave_today' })); scrollToSection('pending-queue'); }}
              onMouseEnter={() => setHoveredCardIndex(1)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                borderColor: hoveredCardIndex === 1 ? '#10b981' : undefined,
                borderWidth: '2px',
                borderStyle: 'solid',
                boxShadow: hoveredCardIndex === 1 ? '0 0 16px rgba(16, 185, 129, 0.35)' : undefined
              }}
              className="bg-white dark:bg-[#1e293b] py-3.5 px-5 rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[140px] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">Employees On Leave Today</span>
              </div>
              <div className="flex items-end gap-2 mt-1 mb-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{activeStats?.onLeaveToday || 0}</span>
                <span className="text-sm font-medium text-gray-500 mb-0.5">Employees</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'on_leave_today' })); scrollToSection('pending-queue'); }} className="text-indigo-600 text-sm font-bold hover:underline self-start cursor-pointer border-none bg-transparent">View details &rarr;</button>
            </div>

            {/* Upcoming Leaves */}
            <div
              onClick={() => { window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'upcoming' })); scrollToSection('pending-queue'); }}
              onMouseEnter={() => setHoveredCardIndex(2)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                borderColor: hoveredCardIndex === 2 ? '#f59e0b' : undefined,
                borderWidth: '2px',
                borderStyle: 'solid',
                boxShadow: hoveredCardIndex === 2 ? '0 0 16px rgba(245, 158, 11, 0.35)' : undefined
              }}
              className="bg-white dark:bg-[#1e293b] py-3.5 px-5 rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[140px] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <CalendarDays className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">Upcoming Leaves</span>
                  <span className="text-xs text-gray-500">(Next 7 Days)</span>
                </div>
              </div>
              <div className="flex items-end gap-2 mt-1 mb-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{activeStats?.upcoming || 0}</span>
                <span className="text-sm font-medium text-gray-500 mb-0.5">Employees</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'upcoming' })); scrollToSection('pending-queue'); }} className="text-indigo-600 text-sm font-bold hover:underline self-start cursor-pointer border-none bg-transparent">View details &rarr;</button>
            </div>

            {/* Team Availability */}
            <div
              onMouseEnter={() => setHoveredCardIndex(3)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                borderColor: hoveredCardIndex === 3 ? '#3b82f6' : undefined,
                borderWidth: '2px',
                borderStyle: 'solid',
                boxShadow: hoveredCardIndex === 3 ? '0 0 16px rgba(59, 130, 246, 0.35)' : undefined
              }}
              className="bg-white dark:bg-[#1e293b] py-3.5 px-5 rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[140px] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">Team Availability</span>
              </div>
              <div className="mt-1 mb-2">
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{activeStats?.availabilityPercent || 0}</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-1">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${activeStats?.availabilityPercent || 0}%` }}></div>
                </div>
                <span className="text-xs text-gray-500 font-medium">{activeStats?.availableCount || 0} Available</span>
              </div>
            </div>

            {/* This Month Requests */}
            <div
              onClick={() => { window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'this_month' })); scrollToSection('pending-queue'); }}
              onMouseEnter={() => setHoveredCardIndex(4)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                borderColor: hoveredCardIndex === 4 ? '#6366f1' : undefined,
                borderWidth: '2px',
                borderStyle: 'solid',
                boxShadow: hoveredCardIndex === 4 ? '0 0 16px rgba(99, 102, 241, 0.35)' : undefined
              }}
              className="bg-white dark:bg-[#1e293b] py-3.5 px-5 rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[140px] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">This Month<br/>Leave Requests</span>
              </div>
              <div className="mt-1 mb-2">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{activeStats?.thisMonthRequests || 0}</span>
                  <span className="text-sm font-medium text-gray-500 mb-0.5">Requests</span>
                </div>
                <div className="flex items-center mt-1">
                  <TrendingUp className={`w-3 h-3 ${activeStats?.growth >= 0 ? 'text-emerald-500' : 'text-red-500'} mr-1`} />
                  <span className={`text-xs font-bold ${activeStats?.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {Math.abs(activeStats?.growth || 0)}% {activeStats?.growth >= 0 ? 'more' : 'less'} than last month
                  </span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'this_month' })); scrollToSection('pending-queue'); }} className="text-indigo-600 text-sm font-bold hover:underline self-start cursor-pointer border-none bg-transparent">View details &rarr;</button>
            </div>

          </div>

      {/* Pending Approval Queue - Full Width */}
      <div id="pending-queue" className="mb-6">
        <PendingApprovalQueue onAction={triggerRefresh} onCountsUpdate={setDynamicCounts} />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <QuickActions />
      </div>

      {/* Calendar, Balances, and Availability Grid */}
      <div id="leave-calendar-section" className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="h-[500px] overflow-hidden"><TeamLeaveCalendar /></div>
        <div className="h-[500px] overflow-hidden"><TeamLeaveBalance /></div>
        <div className="h-[500px] overflow-hidden"><EmployeeAvailabilityChart trigger={refreshTrigger} /></div>
      </div>

      {/* Analytics Charts */}
      <div id="leave-analytics">
        <LeaveAnalyticsCharts />
      </div>
      <EmployeesOnLeaveTodayDrawer isOpen={isLeaveTodayDrawerOpen} onClose={() => setIsLeaveTodayDrawerOpen(false)} />
      <UpcomingLeavesDrawer isOpen={isUpcomingLeavesDrawerOpen} onClose={() => setIsUpcomingLeavesDrawerOpen(false)} />

        </>
      )}
    </div>
  );
};

export default LeaveManagement;
