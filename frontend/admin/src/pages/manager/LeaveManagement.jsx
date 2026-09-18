import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ClipboardList, Users, CalendarDays, PieChart, TrendingUp, Plus, ChevronDown, RefreshCw } from 'lucide-react';

import PendingApprovalQueue from '../../components/manager/PendingApprovalQueue';
import EmployeeAvailabilityChart from '../../components/manager/EmployeeAvailabilityChart';
import TeamLeaveCalendar from '../../components/manager/TeamLeaveCalendar';
import TeamLeaveBalance from '../../components/manager/TeamLeaveBalance';
import LeaveAnalyticsCharts from '../../components/manager/LeaveAnalyticsCharts';
import QuickActions from '../../components/manager/QuickActions';
import EmployeeLeaveManagement from '../employee/LeaveManagement';

import EmployeesOnLeaveTodayDrawer from '../../components/modals/EmployeesOnLeaveTodayDrawer';
import UpcomingLeavesDrawer from '../../components/modals/UpcomingLeavesDrawer';

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
      const res = await axios.get('/api/leaves/manager/summary', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setStats(res.data);
    } catch (error) {
      toast.error('Failed to load leave summary stats');
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={32} className="animate-spin text-emerald-500" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading leave data...</p>
        </div>
      </div>
    );
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management Dashboard</h1>
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
            className="bg-[#00a76b] hover:bg-[#008f5b] text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-colors whitespace-nowrap cursor-pointer"
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
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              className="bg-white dark:bg-[#111c18] py-2 px-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-2xs flex items-center justify-between gap-2 transition-all cursor-pointer group hover:shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Pending</h4>
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 group-hover:underline block leading-tight">
                    View all &rarr;
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums leading-none">{activeStats?.pending || 0}</span>
                <span className="text-[9px] font-semibold text-gray-400 ml-1">Req</span>
              </div>
            </div>

            {/* Employees On Leave Today */}
            <div
              onClick={() => { window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'on_leave_today' })); scrollToSection('pending-queue'); }}
              onMouseEnter={() => setHoveredCardIndex(1)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                borderColor: hoveredCardIndex === 1 ? '#10b981' : undefined,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              className="bg-white dark:bg-[#111c18] py-2 px-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-2xs flex items-center justify-between gap-2 transition-all cursor-pointer group hover:shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">On Leave Today</h4>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline block leading-tight">
                    View &rarr;
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums leading-none">{activeStats?.onLeaveToday || 0}</span>
                <span className="text-[9px] font-semibold text-gray-400 ml-1">Emp</span>
              </div>
            </div>

            {/* Upcoming Leaves */}
            <div
              onClick={() => { window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'upcoming' })); scrollToSection('pending-queue'); }}
              onMouseEnter={() => setHoveredCardIndex(2)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                borderColor: hoveredCardIndex === 2 ? '#f59e0b' : undefined,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              className="bg-white dark:bg-[#111c18] py-2 px-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-2xs flex items-center justify-between gap-2 transition-all cursor-pointer group hover:shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <CalendarDays className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Upcoming (7D)</h4>
                  <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 group-hover:underline block leading-tight">
                    View &rarr;
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums leading-none">{activeStats?.upcoming || 0}</span>
                <span className="text-[9px] font-semibold text-gray-400 ml-1">Emp</span>
              </div>
            </div>

            {/* Team Availability */}
            <div
              onMouseEnter={() => setHoveredCardIndex(3)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                borderColor: hoveredCardIndex === 3 ? '#3b82f6' : undefined,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              className="bg-white dark:bg-[#111c18] py-2 px-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-2xs flex items-center justify-between gap-2 transition-all cursor-pointer group hover:shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Availability</h4>
                  <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1 mt-1 overflow-hidden">
                    <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${activeStats?.availabilityPercent || 0}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-baseline justify-end leading-none">
                  <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{activeStats?.availabilityPercent || 0}</span>
                  <span className="text-[10px] font-bold text-gray-500 ml-0.5">%</span>
                </div>
                <span className="text-[9px] font-semibold text-gray-400 block mt-0.5 leading-none">{activeStats?.availableCount || 0} Avail</span>
              </div>
            </div>

            {/* This Month Requests */}
            <div
              onClick={() => { window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'this_month' })); scrollToSection('pending-queue'); }}
              onMouseEnter={() => setHoveredCardIndex(4)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              style={{
                borderColor: hoveredCardIndex === 4 ? '#6366f1' : undefined,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              className="bg-white dark:bg-[#111c18] py-2 px-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-2xs flex items-center justify-between gap-2 transition-all cursor-pointer group hover:shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">This Month</h4>
                  <span className={`text-[9px] font-bold truncate block leading-tight ${activeStats?.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {Math.abs(activeStats?.growth || 0)}% vs last mo
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums leading-none">{activeStats?.thisMonthRequests || 0}</span>
                <span className="text-[9px] font-semibold text-gray-400 ml-1">Req</span>
              </div>
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
      <div id="leave-calendar-section" className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 mb-6">
        <div className="h-[390px]"><TeamLeaveCalendar /></div>
        <div className="h-[390px]"><TeamLeaveBalance /></div>
        <div className="h-[390px]"><EmployeeAvailabilityChart trigger={refreshTrigger} /></div>
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
