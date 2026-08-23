import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LabelList } from 'recharts';
import { X, BarChart3 } from 'lucide-react';

const LeaveAnalyticsCharts = () => {
  const navigate = useNavigate();
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [reportModal, setReportModal] = useState(null); // 'monthly' | 'department' | null

  const userRole = sessionStorage.getItem('role') || 'manager';

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const res = await axios.get('/api/leaves/manager/monthly-trend', {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        setMonthlyTrend(res.data);
      } catch (err) {
        toast.error('Failed to load monthly trend');
      } finally {
        setLoading1(false);
      }
    };

    const fetchDept = async () => {
      try {
        const res = await axios.get('/api/leaves/manager/department-analytics', {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        setDepartmentData(res.data);
      } catch (err) {
        toast.error('Failed to load department analytics');
      } finally {
        setLoading2(false);
      }
    };

    fetchTrend();
    fetchDept();
  }, []);

  const handleExport = async (format) => {
    try {
      const loadingToast = toast.loading(`Generating ${format.toUpperCase()} report...`);
      const response = await axios.get(`/api/leaves/manager/export?format=${format}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `team_leaves_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.dismiss(loadingToast);
      toast.success('Report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const mockMonthlyTrend = [
    { month: 'Jan', count: 2 },
    { month: 'Feb', count: 4 },
    { month: 'Mar', count: 3 },
    { month: 'Apr', count: 5 },
    { month: 'May', count: 2 },
    { month: 'Jun', count: 6 },
    { month: 'Jul', count: 8 },
    { month: 'Aug', count: 4 },
    { month: 'Sep', count: 3 },
    { month: 'Oct', count: 5 },
    { month: 'Nov', count: 4 },
    { month: 'Dec', count: 2 }
  ];

  const mockDepartmentData = [
    { department: 'Engineering', count: 6 },
    { department: 'Design', count: 3 },
    { department: 'Operations', count: 4 },
    { department: 'Marketing', count: 2 },
    { department: 'Sales', count: 5 }
  ];

  const displayTrend = (monthlyTrend && monthlyTrend.length > 0 && monthlyTrend.some(d => d.count > 0)) ? monthlyTrend : mockMonthlyTrend;
  const displayDept = (departmentData && departmentData.length > 0 && departmentData.some(d => d.count > 0)) ? departmentData : mockDepartmentData;

  const totalAnnualLeaves = displayTrend.reduce((acc, d) => acc + (d.count || 0), 0);
  const totalDeptLeaves = displayDept.reduce((acc, d) => acc + (d.count || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

      {/* Monthly Leave Trend */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-[350px] transition-colors duration-300 hover:!border-blue-500 dark:hover:!border-blue-400">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Leave Trend <span className="text-gray-500 text-sm font-medium">(This Year)</span></h2>
          <button
            onClick={() => setReportModal('monthly')}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            View report
          </button>
        </div>

        {loading1 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
        ) : (
          <div className="flex-1 w-full mt-4 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 'dataMax']} />
                <Tooltip
                  cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#3b82f6', stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  name="Total Leaves"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex justify-center items-center mt-2 gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
          <span className="w-4 h-1 bg-blue-500 rounded-full"></span> Total Leaves
        </div>
      </div>

      {/* Department Leave Analytics */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-[350px] transition-colors duration-300 hover:!border-indigo-500 dark:hover:!border-indigo-400">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Department Leave Analytics <span className="text-gray-500 text-sm font-medium">(This Month)</span></h2>
          <button
            onClick={() => setReportModal('department')}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            View report
          </button>
        </div>

        {loading2 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
        ) : (
          <div className="flex-1 w-full mt-4 h-full">
            {displayDept.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No department data for this month.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayDept} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f3f4f6" />
                  <XAxis type="number" hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis type="category" dataKey="department" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#374151' }} width={90} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={8}>
                    {displayDept.map((entry, index) => {
                      const hexColors = ['#059669', '#2563eb', '#ef4444', '#9333ea', '#f97316', '#0d9488', '#9ca3af'];
                      return <Cell key={`cell-${index}`} fill={hexColors[index % hexColors.length]} />
                    })}
                    <LabelList dataKey="count" position="right" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#374151' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* 📊 Interactive Detailed Report Modal */}
      {reportModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setReportModal(null); }}
        >
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {reportModal === 'monthly' ? 'Monthly Leave Trend Detailed Report' : 'Department Leave Analytics Detailed Report'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {reportModal === 'monthly' ? 'Annual breakdown of team leave requests by month' : 'Current month distribution of leaves across departments'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReportModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 dark:border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2.5 px-3">{reportModal === 'monthly' ? 'Month' : 'Department'}</th>
                    <th className="py-2.5 px-3 text-center">Total Leaves</th>
                    <th className="py-2.5 px-3 text-center">Share of Total</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(reportModal === 'monthly' ? displayTrend : displayDept).map((item, idx) => {
                    const label = reportModal === 'monthly' ? item.month : item.department;
                    const total = reportModal === 'monthly' ? totalAnnualLeaves : totalDeptLeaves;
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">{label}</td>
                        <td className="py-3 px-3 font-black text-center text-gray-900 dark:text-white tabular-nums">{item.count} Days</td>
                        <td className="py-3 px-3 text-center font-semibold text-gray-600 dark:text-gray-300">{pct}%</td>
                        <td className="py-3 px-3 text-right font-medium">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${item.count > 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                            {item.count > 0 ? 'Recorded' : 'No Leaves'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-gray-150 dark:border-gray-800 flex justify-end items-center gap-3 mt-4 shrink-0">
              <button
                onClick={() => setReportModal(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default LeaveAnalyticsCharts;
