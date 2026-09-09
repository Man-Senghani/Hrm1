import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckSquare, Clock, Users, Calendar, BarChart2, 
  CheckCircle2, AlertTriangle, ArrowRight, XCircle, LayoutGrid
} from 'lucide-react';
import LeavePolicyOverview from '../components/LeavePolicyOverview';
import HolidayManagement from '../components/HolidayManagement';

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  // Basic stats for summary cards
  const pendingRequests = leaves.filter(l => l.status?.toLowerCase() === 'pending').length;
  const approvedLeaves = leaves.filter(l => l.status?.toLowerCase() === 'approved').length;
  const totalRequests = leaves.length;

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await axios.get('/api/leaves', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLeaves(res.data || []);
      } catch (err) {
        console.error('Fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaves();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0b1120] text-[#1e293b] dark:text-[#cbd5e1] font-['Inter',sans-serif] px-4 py-8 transition-colors duration-300">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight leading-none mb-2">
            Good Morning, {user.firstName || 'Priya'}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
            Here's the leave management overview for your organization.
          </p>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Leave Requests', val: totalRequests, sub: 'This Month', icon: CheckSquare, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', link: 'View All Requests' },
          { label: 'Pending Approvals', val: pendingRequests, sub: 'Requests', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', link: 'View Pending' },
          { label: 'Employees On Leave', val: 78, sub: 'Today', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', link: 'View Calendar' },
          { label: 'Leave Balance Allocated', val: '18,560', sub: 'Days', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', link: 'View Allocation' },
          { label: 'Upcoming Holidays', val: 5, sub: 'In Next 30 Days', icon: Calendar, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', link: 'View Holidays' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1e293b] p-5 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{stat.val}</h3>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{stat.sub}</p>
            </div>
            <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all">
              {stat.link} <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 3. ROW 1: Policy Overview + Allocation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LeavePolicyOverview />
        
        {/* Placeholder for Leave Allocation Donut Chart */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Allocation Summary</h2>
            <button className="text-xs font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300">
              This Month ▼
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-[#0f172a]">
            <p className="text-gray-400 text-sm font-bold flex items-center gap-2">
              <BarChart2 size={18} /> Donut Chart Placeholder (Increment 2)
            </p>
          </div>
          <button className="mt-6 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all">
            View Allocation Report <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 4. ROW 2: Holiday Management + Shutdown Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <HolidayManagement />
        
        {/* Placeholder for Company Shutdown Days */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Company Shutdown Days</h2>
            <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
              View All
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-[#0f172a]">
            <p className="text-gray-400 text-sm font-bold flex items-center gap-2">
              <Calendar size={18} /> Shutdown Table Placeholder (Increment 2)
            </p>
          </div>
          <button className="mt-6 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all">
            View Shutdown Calendar <ArrowRight size={14} />
          </button>
        </div>
      </div>
      
      {/* (Other rows like quick stats, reconciliation, etc. will be scaffolded in next increments) */}
      
    </div>
  );
};

export default Leaves;
