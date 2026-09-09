import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@shared/services/api';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import {
  FileText, Send, Calendar, Clock, Search, Filter, RefreshCw,
  CheckCircle, AlertCircle, Eye, Pencil, X, Briefcase, User, Sparkles, Building, Plus, CheckCircle2, LogIn, PauseCircle
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
  'Aupanishad',
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


const DailyReport = () => {
  // Current user info from sessionStorage or localStorage
  const [currentUser, setCurrentUser] = useState(getUser);

  // Project List Options
  const [projectOptions, setProjectOptions] = useState(INITIAL_PROJECT_OPTIONS);

  // Form Drawer State
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    selectedProjects: [],
    workDescription: '',
    hoursSpent: '',
    reportDate: getTodayStr(),
    status: 'Completed'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History & Filter State
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  // Track recent reports to enforce max 2 reports per date
  const [allMyRecentReports, setAllMyRecentReports] = useState([]);

  const fetchMyRecentSummary = useCallback(async () => {
    try {
      const minStr = getMinAllowedDate();
      const res = await api.get('/daily-reports/me', {
        params: { startDate: minStr, limit: 100 }
      });
      if (res.data?.reports) {
        setAllMyRecentReports(res.data.reports);
      }
    } catch (e) {
      console.warn('Could not load user recent reports summary:', e);
    }
  }, []);

  const getReportsCountForDate = useCallback((dateStr) => {
    if (!dateStr) return 0;
    const source = allMyRecentReports.length > 0 ? allMyRecentReports : myReports;
    return source.filter(r => r.reportDate === dateStr).length;
  }, [allMyRecentReports, myReports]);

  // Filters
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch project list options
  const fetchProjects = async () => {
    try {
      const res = await api.get('/daily-reports/projects');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const cleaned = res.data
          .map(p => typeof p === 'string' ? p.trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad') : p)
          .filter(Boolean);
        setProjectOptions(Array.from(new Set(cleaned)));
      }
    } catch (err) {
      console.warn('Using default projects');
    }
  };

  // Fetch logged in employee's reports
  const fetchMyReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const params = {};
      if (filterProject !== 'all') params.projectName = filterProject;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterDate) {
        params.startDate = filterDate;
        params.endDate = filterDate;
      }
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/daily-reports/me', { params });

      const fetchedMy = res.data?.reports || [];
      setMyReports(fetchedMy);
    } catch (err) {
      console.error('Error fetching my daily reports:', err);
      setMyReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [filterProject, filterStatus, filterDate, searchQuery]);

  useEffect(() => {
    fetchProjects();
    fetchMyRecentSummary();
  }, [fetchMyRecentSummary]);

  useEffect(() => {
    if (isFormDrawerOpen) {
      fetchMyRecentSummary();
    }
  }, [isFormDrawerOpen, fetchMyRecentSummary]);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

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

  // Form Submit Handler
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

    const reportDate = formData.reportDate || getTodayStr();
    if (reportDate < getMinAllowedDate()) {
      errors.reportDate = 'You cannot submit reports for dates older than last week';
    }
    if (reportDate > getTodayStr()) {
      errors.reportDate = 'You cannot submit reports for future dates';
    }
    const originalDate = editingReport ? (editingReport.reportDate ? editingReport.reportDate.split('T')[0] : '') : '';
    const isMovingToDifferentFullDate = editingReport && reportDate !== originalDate && getReportsCountForDate(reportDate) >= 2;

    if (!editingReport && getReportsCountForDate(reportDate) >= 2) {
      errors.reportDate = `Maximum 2 daily reports are allowed per date. You already have 2 reports for ${reportDate}.`;
    } else if (isMovingToDifferentFullDate) {
      errors.reportDate = `Cannot move report to ${reportDate} because that date already has 2 reports.`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setFormErrors({});
    const hours = parseFloat(formData.hoursSpent);

    setIsSubmitting(true);
    try {
      if (editingReport) {
        await api.put(`/daily-reports/${editingReport._id}`, {
          projectName: selectedProj,
          workDescription: formData.workDescription.trim(),
          hoursSpent: hours,
          reportDate: reportDate,
          status: formData.status
        });

        toast.success('Daily report updated successfully!');
        setEditingReport(null);
        setIsFormDrawerOpen(false);
        fetchMyRecentSummary();
        fetchMyReports();
      } else {
        await api.post('/daily-reports', {
          projectName: selectedProj,
          workDescription: formData.workDescription.trim(),
          hoursSpent: hours,
          reportDate: reportDate,
          status: formData.status
        });

        toast.success('Daily Work Report submitted successfully!');
        
        // Reset form fields & close drawer
        setFormData({
          selectedProjects: [],
          workDescription: '',
          hoursSpent: '',
          reportDate: getTodayStr(),
          status: 'Completed'
        });

        setIsFormDrawerOpen(false);
        setEditingReport(null);
        fetchMyRecentSummary();

        // Refresh list
        fetchMyReports();
      }
    } catch (err) {
      console.error('Submit report error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadgeColor = (status) => {
    switch (status) {
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

  // Filtered reports computed dynamically on client
  const filteredReports = useMemo(() => {
    return myReports.filter((rep) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const proj = (rep.projectName || '').toLowerCase();
        const desc = (rep.workDescription || '').toLowerCase();
        if (!proj.includes(q) && !desc.includes(q)) return false;
      }

      // 2. Project Filter
      if (filterProject !== 'all') {
        if (!(rep.projectName || '').toLowerCase().includes(filterProject.toLowerCase())) {
          return false;
        }
      }

      // 3. Status Filter
      if (filterStatus !== 'all') {
        if ((rep.status || '').toLowerCase() !== filterStatus.toLowerCase()) {
          return false;
        }
      }

      // 4. Date Filter
      if (filterDate) {
        const repDateStr = rep.reportDate ? rep.reportDate.split('T')[0] : '';
        const targetDateStr = filterDate.split('T')[0];
        if (repDateStr !== targetDateStr) {
          return false;
        }
      }

      return true;
    });
  }, [myReports, searchQuery, filterProject, filterStatus, filterDate]);

  // Compute summary stats for filtered reports
  const completedCount = filteredReports.filter(r => r.status === 'Completed').length;
  const inProgressCount = filteredReports.filter(r => r.status === 'In Progress').length;
  const pendingCount = filteredReports.filter(r => r.status === 'Pending').length;
  const totalHours = filteredReports.reduce((acc, curr) => acc + (curr.hoursSpent || 0), 0);

  return (
    <div className="space-y-4 pb-8">
      {/* ── HEADER WITH ATTENDANCE-MATCHING ADD REPORT CARD BUTTON ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <FileText className="text-emerald-600 dark:text-emerald-400" size={28} />
            Daily Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your daily work updates, hours spent, and submission history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Card Button Matching Attendance CheckInButton styling */}
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
        </div>
      </div>

      {/* ── SUMMARY METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#111c18] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
              <FileText size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Reports</span>
          </div>
          <span className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{filteredReports.length}</span>
        </div>

        <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed</span>
          </div>
          <span className="text-xl sm:text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{completedCount}</span>
        </div>

        <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Clock size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">In Progress</span>
          </div>
          <span className="text-xl sm:text-2xl font-semibold text-blue-600 dark:text-blue-400">{inProgressCount}</span>
        </div>

        <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Clock size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Hours</span>
          </div>
          <span className="text-xl sm:text-2xl font-semibold text-purple-600 dark:text-purple-400">{totalHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">hrs</span></span>
        </div>
      </div>

      {/* ── MY DAILY REPORTS HISTORY TABLE SECTION ── */}
      <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#1a2d29]">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">My Submitted Reports</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">View and filter your submitted daily work logs.</p>
          </div>

          <div className="flex items-center gap-3">
            {(filterProject !== 'all' || filterStatus !== 'all' || filterDate) && (
              <button
                onClick={() => {
                  setFilterProject('all');
                  setFilterStatus('all');
                  setFilterDate('');
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={fetchMyReports}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-500 transition-colors cursor-pointer self-start md:self-auto"
            >
              <RefreshCw size={14} className={loadingReports ? 'animate-spin' : ''} />
              Refresh History
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-4">
          {/* Project Filter */}
          <CustomSelect
            options={[
              { label: 'All Projects', value: 'all' },
              ...projectOptions.map(p => ({ label: p, value: p }))
            ]}
            value={filterProject}
            onChange={(val) => setFilterProject(val)}
          />

          {/* Status Filter */}
          <CustomSelect
            options={[
              { label: 'All Statuses', value: 'all' },
              ...STATUS_OPTIONS.map(st => ({ label: st, value: st }))
            ]}
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            iconMap={STATUS_ICONS}
          />

          {/* Date Filter */}
          <CustomDatePicker
            name="filterDate"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        {/* Reports History Table */}
        <div className="overflow-x-auto">
          {loadingReports ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="animate-spin mx-auto mb-2 text-emerald-500" size={24} />
              <p className="text-xs font-semibold">Loading your reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#111c18]/50 rounded-2xl border border-dashed border-slate-200 dark:border-[#1a2d29]">
              <FileText className="mx-auto mb-2 opacity-50 text-slate-400" size={32} />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No daily reports matching criteria</p>
              <p className="text-xs mt-1">Try adjusting your project, status, or date filter.</p>
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
                {filteredReports.map((rep) => (
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
                      {(() => {
                        const text = rep.workDescription;
                        if (!text) return 'N/A';
                        const words = text.trim().split(/\s+/);
                        if (words.length <= 2) return text;
                        return words.slice(0, 2).join(' ') + '...';
                      })()}
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
                    {editingReport ? 'Modify your task progress, hours, or status.' : 'Task progress & working hours for today.'}
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

            {/* Drawer Body - Scrollable Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <form id="dailyReportDrawerForm" onSubmit={handleSubmit} noValidate className="space-y-4">
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
                    options={projectOptions
                      .map(p => typeof p === 'string' ? p.trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad') : p)
                      .filter(Boolean)}
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
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Past 7 days only (Max 2/day)</span>
                  </div>
                  <CustomDatePicker
                    name="reportDate"
                    value={formData.reportDate}
                    onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                    minDate={getMinAllowedDate()}
                    maxDate={getTodayStr()}
                    isDateDisabled={(d) => {
                      if (editingReport) {
                        const originalDate = editingReport.reportDate ? editingReport.reportDate.split('T')[0] : '';
                        return d !== originalDate && getReportsCountForDate(d) >= 2;
                      }
                      return getReportsCountForDate(d) >= 2;
                    }}
                  />
                  {editingReport ? (
                    <div className="mt-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-[11px]">
                      <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                      <span>Editing existing report. Updates do not count towards your 2-report daily limit.</span>
                    </div>
                  ) : getReportsCountForDate(formData.reportDate) >= 2 ? (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
                      <AlertCircle size={15} className="shrink-0 text-rose-500" />
                      <span><strong>Limit reached:</strong> Maximum 2 daily reports already submitted for this date ({formData.reportDate}).</span>
                    </div>
                  ) : getReportsCountForDate(formData.reportDate) === 1 ? (
                    <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-[11px]">
                      <Clock size={13} className="shrink-0 text-amber-500" />
                      <span>1 of 2 reports submitted for this date. You can add 1 more.</span>
                    </div>
                  ) : null}
                  {formErrors.reportDate && (
                    <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{formErrors.reportDate}</span>
                    </p>
                  )}
                </div>

                {/* 3. Hours Spent */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Hours Spent <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">e.g. 8 or 8.5</span>
                  </div>

                  {/* Input + stepper row */}
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
                form="dailyReportDrawerForm"
                disabled={isSubmitting || (!editingReport && getReportsCountForDate(formData.reportDate) >= 2)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send size={15} />
                {isSubmitting
                  ? (editingReport ? 'Saving...' : 'Submitting...')
                  : (!editingReport && getReportsCountForDate(formData.reportDate) >= 2)
                  ? 'Limit Reached (2/2)'
                  : (editingReport ? 'Save Changes' : 'Submit Report')}
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
                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block mb-2">Work Completed</span>
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

export default DailyReport;
