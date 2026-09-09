import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@shared/services/api';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import {
  FileText, CheckCircle2, Clock, AlertCircle, PauseCircle,
  Search, Filter, RefreshCw, Download, Eye, Pencil, X, User, Building, Briefcase, Calendar, ChevronRight, Plus, Sparkles, Send
} from 'lucide-react';
import CustomDatePicker from '@shared/components/CustomDatePicker';
import CustomSelect from '@shared/components/CustomSelect';
import MultiProjectSelect from '@shared/components/MultiProjectSelect';

const STATUS_ICONS = {
  'Completed': <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />,
  'In Progress': <Clock size={15} className="text-blue-500 shrink-0" />,
  'Pending': <AlertCircle size={15} className="text-amber-500 shrink-0" />,
  'On Hold': <PauseCircle size={15} className="text-rose-500 shrink-0" />
};

const INITIAL_PROJECT_OPTIONS = [
  'HRMS',
  'Aupan ishad',
  'MTK',
  'Client side work',
  'Management kinda thing'
];

const STATUS_OPTIONS = ['Completed', 'In Progress', 'Pending', 'On Hold'];

const getTodayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getMinAllowedDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getUser = () => {
  try {
    const s = sessionStorage.getItem('user') || localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
};

const formatShortWork = (text) => {
  if (!text) return 'N/A';
  const words = text.trim().split(/\s+/);
  if (words.length <= 2) return text;
  return words.slice(0, 2).join(' ') + '...';
};

const DailyReportHR = () => {
  const [currentUser, setCurrentUser] = useState(getUser);

  // Editing State (for personal reports in My Daily Reports)
  const [editingReport, setEditingReport] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Tab View Mode: 'my' | 'team'
  const [viewTab, setViewTab] = useState('team');

  // Team / All Employee Reports
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({
    totalReports: 0,
    completedCount: 0,
    inProgressCount: 0,
    pendingCount: 0,
    onHoldCount: 0,
    totalHours: 0
  });

  // My Personal Reports (when viewTab === 'my')
  const [myReports, setMyReports] = useState([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);

  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  // Form Drawer State
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    selectedProjects: [],
    workDescription: '',
    hoursSpent: '',
    reportDate: getTodayStr(),
    status: 'Completed'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown lists
  const [projectOptions, setProjectOptions] = useState(INITIAL_PROJECT_OPTIONS);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // Filters for Team Reports
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [project, setProject] = useState('all');
  const [status, setStatus] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filters for My Reports
  const [mySearch, setMySearch] = useState('');
  const [myProjectFilter, setMyProjectFilter] = useState('all');
  const [myStatusFilter, setMyStatusFilter] = useState('all');
  const [myDateFilter, setMyDateFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch projects list
  const fetchProjects = async () => {
    try {
      const res = await api.get('/daily-reports/projects');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setProjectOptions(res.data);
      }
    } catch (e) {
      console.warn('Using default projects');
    }
  };

  // Fetch departments & employees for filter dropdowns
  const fetchFilterData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/departments').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] }))
      ]);

      if (Array.isArray(deptRes.data)) {
        setDepartmentOptions(deptRes.data.map(d => d.name || d.departmentName).filter(Boolean));
      }
      if (Array.isArray(empRes.data?.employees || empRes.data)) {
        const emps = empRes.data.employees || empRes.data;
        setEmployeeOptions(emps);
      }
    } catch (e) {
      console.warn('Filter meta load error', e);
    }
  };

  // Main Team / All Employee Reports fetch
  const fetchDailyReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };

      if (search.trim()) params.search = search.trim();
      if (department !== 'all') params.department = department;
      if (project !== 'all') params.project = project;
      if (status !== 'all') params.status = status;
      if (employeeId !== 'all') params.employeeId = employeeId;
      if (period !== 'all') params.period = period;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/daily-reports', { params });
      const fetchedReports = res.data?.reports || [];

      setReports(fetchedReports);
      if (res.data?.summary) {
        setSummary(res.data.summary);
      } else {
        setSummary({
          totalReports: fetchedReports.length,
          completedCount: fetchedReports.filter(r => r.status === 'Completed').length,
          inProgressCount: fetchedReports.filter(r => r.status === 'In Progress').length,
          pendingCount: fetchedReports.filter(r => r.status === 'Pending').length,
          onHoldCount: fetchedReports.filter(r => r.status === 'On Hold').length,
          totalHours: fetchedReports.reduce((acc, c) => acc + (c.hoursSpent || 0), 0)
        });
      }
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching higher authority daily reports:', err);
      setReports([]);
      setSummary({
        totalReports: 0,
        completedCount: 0,
        inProgressCount: 0,
        pendingCount: 0,
        onHoldCount: 0,
        totalHours: 0
      });
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, department, project, status, employeeId, period, startDate, endDate, page]);

  // Fetch My Personal Reports (when viewTab === 'my')
  const fetchMyReports = useCallback(async () => {
    setLoadingMyReports(true);
    try {
      const params = {};
      if (myProjectFilter !== 'all') params.projectName = myProjectFilter;
      if (myStatusFilter !== 'all') params.status = myStatusFilter;
      if (myDateFilter) {
        params.startDate = myDateFilter;
        params.endDate = myDateFilter;
      }
      if (mySearch.trim()) params.search = mySearch.trim();

      const res = await api.get('/daily-reports/me', { params });
      const fetchedMy = res.data?.reports || [];
      setMyReports(fetchedMy);
    } catch (err) {
      console.error('Error fetching my daily reports:', err);
      setMyReports([]);
    } finally {
      setLoadingMyReports(false);
    }
  }, [myProjectFilter, myStatusFilter, myDateFilter, mySearch]);

  useEffect(() => {
    fetchProjects();
    fetchFilterData();
  }, []);

  useEffect(() => {
    if (viewTab === 'team') {
      fetchDailyReports();
    } else {
      fetchMyReports();
    }
  }, [viewTab, fetchDailyReports, fetchMyReports]);

  // Handle Open Edit Drawer
  const handleOpenEdit = (rep) => {
    setEditingReport(rep);
    setFormErrors({});
    const projects = rep.projectName
      ? rep.projectName.split(',').map(p => p.trim()).filter(Boolean)
      : [];
    setFormData({
      selectedProjects: projects,
      workDescription: rep.workDescription || '',
      hoursSpent: rep.hoursSpent !== undefined ? String(rep.hoursSpent) : '',
      reportDate: rep.reportDate || getTodayStr(),
      status: rep.status || 'Completed'
    });
    setIsFormDrawerOpen(true);
  };

  // Handle Submit inside drawer
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    let selectedProj = '';
    if (Array.isArray(formData.selectedProjects) && formData.selectedProjects.length > 0) {
      selectedProj = formData.selectedProjects.join(', ');
    } else if (formData.projectName && formData.projectName !== 'Other') {
      selectedProj = formData.projectName;
    } else if (formData.customProject?.trim()) {
      selectedProj = formData.customProject.trim();
    }

    if (!selectedProj) {
      errors.projects = 'Please select or specify at least one Project Name';
    }

    if (!formData.hoursSpent || String(formData.hoursSpent).trim() === '') {
      errors.hoursSpent = 'Please enter hours spent';
    } else {
      const hours = parseFloat(formData.hoursSpent);
      if (isNaN(hours) || hours <= 0) {
        errors.hoursSpent = 'Please enter a valid positive number for hours spent';
      } else if (hours > 24) {
        errors.hoursSpent = 'Hours spent cannot exceed 24 hours in a single day';
      }
    }

    if (!formData.workDescription || !formData.workDescription.trim()) {
      errors.workDescription = "Please describe 'Work That You've Done'";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setFormErrors({});
    const hours = parseFloat(formData.hoursSpent);
    const reportDate = formData.reportDate || getTodayStr();

    setIsSubmitting(true);
    try {
      if (editingReport) {
        const res = await api.put(`/daily-reports/${editingReport._id}`, {
          projectName: selectedProj,
          workDescription: formData.workDescription.trim(),
          hoursSpent: hours,
          reportDate: reportDate,
          status: formData.status
        });
        const updatedRep = res.data;

        toast.success('Daily report updated successfully!');

        setReports(prev => prev.map(r => r._id === editingReport._id ? { ...r, ...updatedRep } : r));
        setMyReports(prev => prev.map(r => r._id === editingReport._id ? { ...r, ...updatedRep } : r));
        setSelectedReport(prev => (prev?._id === editingReport._id ? { ...prev, ...updatedRep } : prev));

        fetchDailyReports();
        fetchMyReports();

        setIsFormDrawerOpen(false);
        setEditingReport(null);
      } else {
        await api.post('/daily-reports', {
          projectName: selectedProj,
          workDescription: formData.workDescription.trim(),
          hoursSpent: hours,
          reportDate: reportDate,
          status: formData.status
        });

        toast.success('Daily Work Report submitted successfully!');
        
        setFormData({
          selectedProjects: [],
          workDescription: '',
          hoursSpent: '',
          reportDate: getTodayStr(),
          status: 'Completed'
        });
        setIsFormDrawerOpen(false);
        setEditingReport(null);
        
        if (viewTab === 'team') {
          fetchDailyReports();
        } else {
          fetchMyReports();
        }
      }
    } catch (err) {
      console.error('Submit report error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setDepartment('all');
    setProject('all');
    setStatus('all');
    setEmployeeId('all');
    setPeriod('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Export CSV
  const handleExportCSV = () => {
    const dataToExport = viewTab === 'team' ? reports : myReports;
    if (dataToExport.length === 0) {
      toast.error('No reports available to export');
      return;
    }
    const headers = ['Date', 'Employee Name', 'Email', 'Department', 'Project', 'Work Description', 'Hours Spent', 'Status', 'Submitted At'];
    const rows = dataToExport.map(r => [
      r.reportDate,
      `"${r.user?.name || r.employee?.fullName || currentUser?.name || 'N/A'}"`,
      `"${r.user?.email || r.employee?.email || currentUser?.email || 'N/A'}"`,
      `"${r.department || r.employee?.position || 'General'}"`,
      `"${r.projectName}"`,
      `"${(r.workDescription || '').replace(/"/g, '""')}"`,
      r.hoursSpent,
      r.status,
      `"${new Date(r.createdAt).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Reports_${viewTab}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Daily reports exported to CSV');
  };

  const statusBadgeColor = (st) => {
    switch (st) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
      case 'On Hold':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/50';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Compute My Reports filtered items dynamically
  const filteredMyReports = useMemo(() => {
    return myReports.filter((rep) => {
      if (mySearch.trim()) {
        const q = mySearch.trim().toLowerCase();
        const proj = (rep.projectName || '').toLowerCase();
        const desc = (rep.workDescription || '').toLowerCase();
        if (!proj.includes(q) && !desc.includes(q)) return false;
      }
      if (myProjectFilter !== 'all' && !(rep.projectName || '').toLowerCase().includes(myProjectFilter.toLowerCase())) {
        return false;
      }
      if (myStatusFilter !== 'all' && (rep.status || '').toLowerCase() !== myStatusFilter.toLowerCase()) {
        return false;
      }
      if (myDateFilter) {
        const repDateStr = rep.reportDate ? rep.reportDate.split('T')[0] : '';
        const targetDateStr = myDateFilter.split('T')[0];
        if (repDateStr !== targetDateStr) return false;
      }
      return true;
    });
  }, [myReports, mySearch, myProjectFilter, myStatusFilter, myDateFilter]);

  // My Personal Reports Stats
  const myCompletedCount = filteredMyReports.filter(r => r.status === 'Completed').length;
  const myInProgressCount = filteredMyReports.filter(r => r.status === 'In Progress').length;
  const myTotalHours = filteredMyReports.reduce((acc, curr) => acc + (curr.hoursSpent || 0), 0);

  return (
    <div className="space-y-4 pb-8">
      {/* ── HEADER WITH ADD REPORT BUTTON & CONTEXT SWITCHER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <FileText className="text-emerald-600 dark:text-emerald-400" size={28} />
            Daily Report Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor employee daily work updates, hours spent, project tracking, and work status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Clean Solid Green Pill Button matching Attendance page tabs */}
          <button
            type="button"
            onClick={() => {
              setEditingReport(null);
              setFormErrors({});
              setFormData({
                selectedProjects: [],
                workDescription: '',
                hoursSpent: '',
                reportDate: getTodayStr(),
                status: 'Completed'
              });
              setIsFormDrawerOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00a76b] hover:bg-[#00925e] active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer border-none"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Daily Report</span>
          </button>

          <button
            onClick={viewTab === 'team' ? fetchDailyReports : fetchMyReports}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={(loading || loadingMyReports) ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md cursor-pointer border-none opacity-100 shrink-0"
          >
            <Download size={15} strokeWidth={2.5} className="text-white" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── CONTEXT TOGGLE PILL BAR (MY DAILY REPORTS / TEAM & ALL EMPLOYEE REPORTS) ── */}
      <div className="bg-white dark:bg-[#162722] p-1 rounded-2xl border border-slate-200 dark:border-[#1a2d29] shadow-xs inline-flex items-center gap-1 w-fit">
        <button
          type="button"
          onClick={() => setViewTab('my')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewTab === 'my'
              ? 'bg-[#00a76b] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          My Daily Reports
        </button>

        <button
          type="button"
          onClick={() => setViewTab('team')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewTab === 'team'
              ? 'bg-[#00a76b] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {currentUser?.role === 'manager' ? 'My Team Reports' : 'All Employee Reports'}
        </button>
      </div>

      {/* ── VIEW TAB 1: MY PERSONAL DAILY REPORTS ── */}
      {viewTab === 'my' && (
        <div className="space-y-4">
          {/* Summary Cards for My Reports */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#111c18] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <FileText size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Reports</span>
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{myReports.length}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed</span>
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{myCompletedCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Clock size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">In Progress</span>
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-blue-600 dark:text-blue-400">{myInProgressCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Clock size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Hours</span>
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-purple-600 dark:text-purple-400">{myTotalHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">hrs</span></span>
            </div>
          </div>

          {/* My Reports Table Container */}
          <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#1a2d29]">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">My Submitted Reports</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">View and filter your personal daily work updates.</p>
              </div>

              <button
                onClick={fetchMyReports}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-500 transition-colors cursor-pointer self-start md:self-auto"
              >
                <RefreshCw size={14} className={loadingMyReports ? 'animate-spin' : ''} />
                Refresh My History
              </button>
            </div>

            {/* My Reports Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-4">
              <CustomSelect
                options={[
                  { label: 'All Projects', value: 'all' },
                  ...projectOptions.map(p => ({ label: p, value: p }))
                ]}
                value={myProjectFilter}
                onChange={(val) => setMyProjectFilter(val)}
              />

              <CustomSelect
                options={[
                  { label: 'All Statuses', value: 'all' },
                  ...STATUS_OPTIONS.map(st => ({ label: st, value: st }))
                ]}
                value={myStatusFilter}
                onChange={(val) => setMyStatusFilter(val)}
                iconMap={STATUS_ICONS}
              />

              <CustomDatePicker
                name="myDateFilter"
                value={myDateFilter}
                onChange={(e) => setMyDateFilter(e.target.value)}
              />
            </div>

            {/* My Reports Table */}
            <div className="overflow-x-auto">
              {loadingMyReports ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="animate-spin mx-auto mb-2 text-emerald-500" size={24} />
                  <p className="text-xs font-semibold">Loading your personal reports...</p>
                </div>
              ) : myReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#111c18]/50 rounded-2xl border border-dashed border-slate-200 dark:border-[#1a2d29]">
                  <FileText className="mx-auto mb-2 opacity-50 text-slate-400" size={32} />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No daily reports found</p>
                  <p className="text-xs mt-1">Click "+ Add Daily Report" to submit your first report.</p>
                </div>
              ) : filteredMyReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#111c18]/50 rounded-2xl border border-dashed border-slate-200 dark:border-[#1a2d29]">
                  <FileText className="mx-auto mb-2 opacity-50 text-slate-400" size={32} />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No daily reports matching criteria</p>
                  <p className="text-xs mt-1">Try adjusting your filters.</p>
                </div>
              ) : (
                <table className="w-full min-w-[750px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#1a2d29] text-[11px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 w-28">Date</th>
                      <th className="py-3 px-4 w-36">Project</th>
                      <th className="py-3 px-4">Work Done</th>
                      <th className="py-3 px-4 text-center w-20">Hours</th>
                      <th className="py-3 px-4 w-28">Status</th>
                      <th className="py-3 px-4 text-right w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d29] text-xs font-medium text-slate-700 dark:text-slate-200">
                    {filteredMyReports.map((rep) => (
                      <tr
                        key={rep._id}
                        onClick={() => setSelectedReport(rep)}
                        className={`transition-colors cursor-pointer group select-none ${
                          selectedReport?._id === rep._id 
                            ? 'bg-emerald-50/90 dark:bg-[#1a382e] border-l-4 border-l-[#00a76b]' 
                            : 'hover:bg-slate-50 dark:hover:bg-[#142821]'
                        }`}
                      >
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {rep.reportDate}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1 items-center">
                            {(rep.projectName || '').split(',').map((p, pIdx) => (
                              <span
                                key={pIdx}
                                className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-200 dark:border-emerald-900/50"
                              >
                                {p.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4 max-w-xs sm:max-w-md truncate" title="Click to view full description">
                          {formatShortWork(rep.workDescription)}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#111c18] font-black text-slate-900 dark:text-white border border-slate-200 dark:border-[#1a2d29]">
                            {rep.hoursSpent} hrs
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusBadgeColor(rep.status)}`}>
                            {rep.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(rep);
                              }}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-[#111c18] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="Edit Daily Report"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReport(rep);
                              }}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-[#111c18] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="View Complete Report Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW TAB 2: TEAM & ALL EMPLOYEE DAILY REPORTS ── */}
      {viewTab === 'team' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#111c18] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <FileText size={18} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Reports</span>
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{summary.totalReports}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed</span>
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{summary.completedCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Clock size={18} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">In Progress</span>
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-blue-600 dark:text-blue-400">{summary.inProgressCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertCircle size={18} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending</span>
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-amber-600 dark:text-amber-400">{summary.pendingCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Clock size={18} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Hours</span>
              </div>
              <span className="text-xl sm:text-2xl font-semibold text-purple-600 dark:text-purple-400">{summary.totalHours} <span className="text-xs font-normal text-slate-400">hrs</span></span>
            </div>
          </div>

          {/* Filter Button */}
          <div className="flex items-center justify-between">
            <div />
            <button
              onClick={() => setShowFilterModal(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                (search || department !== 'all' || project !== 'all' || status !== 'all' || period !== 'all' || startDate || endDate)
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30'
                  : 'bg-white dark:bg-[#162722] border-slate-200 dark:border-[#1a2d29] text-slate-700 dark:text-slate-200 hover:border-emerald-400'
              }`}
            >
              <Filter size={14} />
              Filter
              {(search || department !== 'all' || project !== 'all' || status !== 'all' || period !== 'all' || startDate || endDate) && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 ml-0.5" />
              )}
            </button>
          </div>

          {/* ── FILTER SIDE DRAWER ── */}
          {showFilterModal && createPortal(
            <div
              className="fixed inset-0 z-[99999] flex justify-end"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}
              onClick={() => setShowFilterModal(false)}
            >
              <div
                className="relative flex flex-col bg-white dark:bg-[#162722] border-l border-slate-200 dark:border-[#1a2d29] shadow-2xl w-full max-w-sm h-full"
                style={{ animation: 'slideInFromRight 0.22s cubic-bezier(0.16,1,0.3,1)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <style>{`@keyframes slideInFromRight { from { transform: translateX(100%); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }`}</style>

                {/* Drawer Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1a2d29] shrink-0">
                  <div className="flex items-center gap-2">
                    <Filter size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">Filter Reports</span>
                  </div>
                  <button
                    onClick={() => setShowFilterModal(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#111c18] text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  {/* Search */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      <input
                        type="text"
                        placeholder="Search employee, work description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                    <CustomSelect
                      options={[
                        { label: 'All Departments', value: 'all' },
                        ...departmentOptions.map(d => ({ label: d, value: d }))
                      ]}
                      value={department}
                      onChange={(val) => setDepartment(val)}
                    />
                  </div>

                  {/* Project */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Project</label>
                    <CustomSelect
                      options={[
                        { label: 'All Projects', value: 'all' },
                        ...projectOptions.map(p => ({ label: p, value: p }))
                      ]}
                      value={project}
                      onChange={(val) => setProject(val)}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                    <CustomSelect
                      options={[
                        { label: 'All Statuses', value: 'all' },
                        ...STATUS_OPTIONS.map(st => ({ label: st, value: st }))
                      ]}
                      value={status}
                      onChange={(val) => setStatus(val)}
                      iconMap={STATUS_ICONS}
                    />
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Date Range</label>
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1">Start Date</label>
                        <CustomDatePicker
                          name="filterStartDate"
                          value={startDate}
                          onChange={(e) => { setStartDate(e.target.value); setPeriod('all'); }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1">End Date</label>
                        <CustomDatePicker
                          name="filterEndDate"
                          value={endDate}
                          onChange={(e) => { setEndDate(e.target.value); setPeriod('all'); }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Period */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Quick Period</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'All Dates', value: 'all' },
                        { label: 'Today', value: 'today' },
                        { label: 'Yesterday', value: 'yesterday' },
                        { label: 'This Week', value: 'this_week' },
                        { label: 'This Month', value: 'this_month' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setPeriod(opt.value); setStartDate(''); setEndDate(''); }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            period === opt.value
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-slate-50 dark:bg-[#111c18] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#1a2d29] hover:border-emerald-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Drawer Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-[#1a2d29] bg-slate-50/60 dark:bg-[#111c18]/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => { handleResetFilters(); }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(false)}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Higher Authority Reports Table */}
          <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="animate-spin mx-auto mb-3 text-emerald-500" size={28} />
                  <p className="text-xs font-semibold">Loading daily reports registry...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#111c18]/50 rounded-2xl border border-dashed border-slate-200 dark:border-[#1a2d29]">
                  <FileText className="mx-auto mb-2 opacity-50 text-slate-400" size={36} />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No daily reports matching criteria</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search term.</p>
                </div>
              ) : (
                <table className="w-full min-w-[850px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#1a2d29] text-[11px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 w-52">Employee</th>
                      <th className="py-3 px-4 w-36">Department</th>
                      <th className="py-3 px-4 w-28">Date</th>
                      <th className="py-3 px-4 w-36">Project</th>
                      <th className="py-3 px-4">Work Done</th>
                      <th className="py-3 px-4 text-center w-20">Hours</th>
                      <th className="py-3 px-4 w-28">Status</th>
                      <th className="py-3 px-4 text-right w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d29] text-xs font-medium text-slate-700 dark:text-slate-200">
                    {reports.map((rep) => {
                      const empName = rep.user?.name || rep.employee?.fullName || 'Employee';
                      const empEmail = rep.user?.email || rep.employee?.email || '';
                      const dept = rep.department || rep.employee?.position || 'General';

                      return (
                        <tr
                          key={rep._id}
                          onClick={() => setSelectedReport(rep)}
                          className={`transition-colors cursor-pointer group select-none ${
                            selectedReport?._id === rep._id 
                              ? 'bg-emerald-50/90 dark:bg-[#1a382e] border-l-4 border-l-[#00a76b]' 
                              : 'hover:bg-slate-50 dark:hover:bg-[#142821]'
                          }`}
                        >
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{empName}</p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">{empEmail}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                              {dept}
                            </span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                            {rep.reportDate}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1 items-center">
                              {(rep.projectName || '').split(',').map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-200 dark:border-emerald-900/50"
                                >
                                  {p.trim()}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4 max-w-xs sm:max-w-sm truncate" title="Click to view full report popup">
                            {formatShortWork(rep.workDescription)}
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#111c18] font-black text-slate-900 dark:text-white border border-slate-200 dark:border-[#1a2d29]">
                              {rep.hoursSpent} hrs
                            </span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusBadgeColor(rep.status)}`}>
                              {rep.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReport(rep);
                              }}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-[#111c18] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="View Full Report Details"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-100 dark:border-[#1a2d29]">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1a2d29] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1a2d29] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RIGHT-SIDE SLIDE-OVER DRAWER FORM FOR ADDING DAILY REPORT ── */}
      {isFormDrawerOpen && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setIsFormDrawerOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#162722] border-l border-slate-200 dark:border-[#1a2d29] w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#1a2d29] shrink-0 bg-slate-50/50 dark:bg-[#111c18]/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  {editingReport ? <Pencil size={18} /> : <Sparkles size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {editingReport ? 'Edit Daily Work Update' : 'Daily Work Update'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editingReport ? 'Modify task progress, hours, or status.' : 'Task progress & working hours for today.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormDrawerOpen(false);
                  setEditingReport(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-[#1a2d29] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <form id="dailyReportHRDrawerForm" onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* 1. Project Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Multi-select enabled
                    </span>
                  </div>
                  <MultiProjectSelect
                    options={projectOptions}
                    value={formData.selectedProjects || []}
                    onChange={(newVal) => {
                      setFormData({ ...formData, selectedProjects: newVal });
                      if (formErrors.projects) setFormErrors(prev => ({ ...prev, projects: '' }));
                    }}
                    placeholder="Select or type project(s)..."
                  />
                  {formErrors.projects && (
                    <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{formErrors.projects}</span>
                    </p>
                  )}
                </div>

                {/* 2. Date */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Past 7 days only</span>
                  </div>
                  <CustomDatePicker
                    name="reportDate"
                    value={formData.reportDate}
                    onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                    minDate={getMinAllowedDate()}
                    maxDate={getTodayStr()}
                  />
                </div>

                {/* 3. Hours Spent */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Hours Spent <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">e.g. 8 or 8.5</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" style={{ left: '16px' }}>
                        <Clock size={14} />
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 8 or 8.5"
                        value={formData.hoursSpent}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
                            setFormData({ ...formData, hoursSpent: val });
                            if (formErrors.hoursSpent) setFormErrors(prev => ({ ...prev, hoursSpent: '' }));
                          }
                        }}
                        className={`w-full pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111c18] border text-xs font-bold text-slate-900 dark:text-white focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          formErrors.hoursSpent
                            ? 'border-rose-500 ring-2 ring-rose-500/20'
                            : 'border-slate-200 dark:border-[#1a2d29] focus:border-emerald-500'
                        }`}
                        style={{ paddingLeft: '48px' }}
                      />
                    </div>

                    {/* − / + stepper buttons */}
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(formData.hoursSpent) || 0;
                        const next = Math.max(0.5, Math.round((cur - 0.5) * 2) / 2);
                        setFormData({ ...formData, hoursSpent: String(next) });
                        if (formErrors.hoursSpent) setFormErrors(prev => ({ ...prev, hoursSpent: '' }));
                      }}
                      className="w-9 h-9 shrink-0 rounded-xl bg-slate-100 dark:bg-[#1a2d29] hover:bg-slate-200 dark:hover:bg-[#253f3a] text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-base transition-colors cursor-pointer border border-slate-200 dark:border-[#253f3a]"
                      title="Decrease 0.5 hours"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(formData.hoursSpent) || 0;
                        const next = Math.min(24, Math.round((cur + 0.5) * 2) / 2 || 0.5);
                        setFormData({ ...formData, hoursSpent: String(next) });
                        if (formErrors.hoursSpent) setFormErrors(prev => ({ ...prev, hoursSpent: '' }));
                      }}
                      className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center font-bold text-base transition-colors cursor-pointer shadow-sm shadow-emerald-500/30"
                      title="Increase 0.5 hours"
                    >
                      +
                    </button>
                  </div>

                  {/* Inline Error Message */}
                  {formErrors.hoursSpent && (
                    <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{formErrors.hoursSpent}</span>
                    </p>
                  )}

                  {/* Quick Preset Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap" style={{ paddingTop: '10px' }}>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quick:</span>
                    {['4', '6', '7.5', '8', '8.5', '9'].map(hrs => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, hoursSpent: hrs });
                          if (formErrors.hoursSpent) setFormErrors(prev => ({ ...prev, hoursSpent: '' }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          formData.hoursSpent === hrs
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-[#13231f] hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-[#1a2d29]'
                        }`}
                      >
                        {hrs}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Status */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    options={STATUS_OPTIONS.map(st => ({ label: st, value: st }))}
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    iconMap={STATUS_ICONS}
                  />
                </div>

                {/* 5. Work Done */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Work That You've Done <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe the tasks, bug fixes, or progress completed during this session..."
                    value={formData.workDescription}
                    onChange={(e) => {
                      setFormData({ ...formData, workDescription: e.target.value });
                      if (formErrors.workDescription) setFormErrors(prev => ({ ...prev, workDescription: '' }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111c18] border text-xs text-slate-900 dark:text-white focus:outline-none transition-colors ${
                      formErrors.workDescription
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-[#1a2d29] focus:border-emerald-500'
                    }`}
                  />
                  {formErrors.workDescription && (
                    <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{formErrors.workDescription}</span>
                    </p>
                  )}
                </div>
              </form>
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-[#1a2d29] bg-slate-50/50 dark:bg-[#111c18]/50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsFormDrawerOpen(false);
                  setEditingReport(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#1a2d29] text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-[#1a2d29] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="dailyReportHRDrawerForm"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
              >
                <Send size={15} />
                {isSubmitting ? (editingReport ? 'Saving...' : 'Submitting...') : (editingReport ? 'Save Changes' : 'Submit Report')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── REPORT DETAILS RIGHT-SIDE SLIDE-OVER DRAWER ── */}
      {selectedReport && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-white dark:bg-[#162722] border-l border-slate-200 dark:border-[#1a2d29] w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#1a2d29] shrink-0 bg-slate-50/50 dark:bg-[#111c18]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Daily Report Details</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Submission Date: {selectedReport.reportDate}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-[#1a2d29] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Employee Info Card */}
              <div className="bg-gradient-to-r from-slate-50 to-emerald-50/30 dark:from-[#111c18] dark:to-[#132822] p-4 rounded-2xl border border-slate-200 dark:border-[#1a2d29] flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
                  {(selectedReport.user?.name || selectedReport.employee?.fullName || currentUser?.name || 'E').charAt(0).toUpperCase()}
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                    {selectedReport.user?.name || selectedReport.employee?.fullName || currentUser?.name || 'Employee'}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-xs truncate">
                    {selectedReport.user?.email || selectedReport.employee?.email || currentUser?.email}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[10px]">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      ID: {selectedReport.user?.employeeId || selectedReport.employee?.employeeId || 'EMP-AUTO'}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="font-bold text-slate-600 dark:text-slate-300 truncate">
                      Dept: {selectedReport.department || selectedReport.employee?.position || 'General'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Info Boxes in ONE Single Line Row */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 dark:bg-[#111c18] p-3 rounded-2xl border border-slate-100 dark:border-[#1a2d29]">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold block truncate">Project</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs mt-1 block truncate" title={selectedReport.projectName}>
                    {selectedReport.projectName}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-[#111c18] p-3 rounded-2xl border border-slate-100 dark:border-[#1a2d29]">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold block truncate">Hours Spent</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs mt-1 block truncate">
                    {selectedReport.hoursSpent} Hours
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-[#111c18] p-3 rounded-2xl border border-slate-100 dark:border-[#1a2d29]">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold block truncate">Status</span>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusBadgeColor(selectedReport.status)}`}>
                    {selectedReport.status}
                  </span>
                </div>
              </div>

              {/* Work Description Box */}
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block mb-2">Work That Was Done</span>
                <div className="bg-slate-50 dark:bg-[#111c18] p-4 rounded-2xl border border-slate-100 dark:border-[#1a2d29] text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-medium whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedReport.workDescription}
                </div>
              </div>

              {/* Timestamps */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-[#1a2d29]">
                <span>Submitted: {new Date(selectedReport.createdAt).toLocaleString()}</span>
                <span>Updated: {new Date(selectedReport.updatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-[#1a2d29] bg-slate-50/50 dark:bg-[#111c18]/50 flex items-center justify-between shrink-0">
              {viewTab === 'my' ? (
                <button
                  type="button"
                  onClick={() => {
                    const repToEdit = selectedReport;
                    setSelectedReport(null);
                    handleOpenEdit(repToEdit);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Pencil size={14} />
                  <span>Edit Report</span>
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111c18] hover:bg-slate-200 dark:hover:bg-[#1a2d29] text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DailyReportHR;
