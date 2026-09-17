import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@shared/services/api';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import {
  FileText, Send, Calendar, Clock, Search, Filter, RefreshCw,
  CheckCircle, AlertCircle, Eye, Pencil, X, Briefcase, User, Sparkles, Building, Plus, CheckCircle2, LogIn, PauseCircle, Layers, Check, ChevronDown, Trash2,
  Lock, ShieldAlert
} from 'lucide-react';
import CustomDatePicker from '@shared/components/CustomDatePicker';
import CustomDateRangePicker from '@shared/components/CustomDateRangePicker';
import CustomSelect from '@shared/components/CustomSelect';
import MultiProjectSelect from '@shared/components/MultiProjectSelect';
import StatusSelect from '@shared/components/StatusSelect';

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

const formatShortWork = (text) => {
  if (!text) return 'N/A';
  const words = text.trim().split(/\s+/);
  if (words.length <= 2) return text;
  return words.slice(0, 2).join(' ') + '...';
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
  const [selectedEntries, setSelectedEntries] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});
  const [hoveredReportId, setHoveredReportId] = useState(null);

  // Edit Request State (for past 11:59 PM cutoff)
  const [requestEditModalReport, setRequestEditModalReport] = useState(null);
  const [requestEditReason, setRequestEditReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Toggle selection checkbox for an entry (UI-only for viewing full data, never mutates task status)
  const toggleEntrySelect = (reportId, idx, e) => {
    e.stopPropagation();
    const key = `${reportId}_${idx}`;
    setSelectedEntries(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Toggle inline expand of project task descriptions
  const toggleExpand = (reportId, idx, isGroup, e, entries) => {
    e.stopPropagation();
    if (isGroup && Array.isArray(entries)) {
      const checkedKeys = entries
        .map((_, i) => `${reportId}_${i}`)
        .filter(k => !!selectedEntries[k]);
      
      const anyExpanded = checkedKeys.some(k => !!expandedTasks[k]);
      setExpandedTasks(prev => {
        const next = { ...prev };
        checkedKeys.forEach(k => {
          next[k] = !anyExpanded;
        });
        return next;
      });
    } else {
      const key = `${reportId}_${idx}`;
      setExpandedTasks(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  // Close task dropdowns when clicking outside the table container
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (Object.values(expandedTasks).some(Boolean)) {
        if (!e.target.closest('.daily-report-table-container')) {
          setExpandedTasks({});
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedTasks]);

  // Toggle project entry status via left checkbox
  const handleToggleProjectStatus = async (report, projectIdx, e) => {
    e.stopPropagation();
    try {
      const entries = Array.isArray(report.projectEntries) && report.projectEntries.length > 0
        ? report.projectEntries
        : [{
            projectName: report.projectName || 'General',
            workDescription: report.workDescription || '',
            hoursSpent: report.hoursSpent || 0,
            status: report.status || 'Completed'
          }];

      const updatedEntries = entries.map((pe, idx) => {
        if (idx === projectIdx) {
          const nextStatus = pe.status === 'Completed' ? 'In Progress' : 'Completed';
          return { ...pe, status: nextStatus };
        }
        return pe;
      });

      const allDone = updatedEntries.every(e => e.status === 'Completed');
      const hasProgress = updatedEntries.some(e => e.status === 'In Progress');
      const overallStatus = allDone ? 'Completed' : (hasProgress ? 'In Progress' : 'Pending');

      setReports(prev => prev.map(r => {
        if (r._id === report._id) {
          return {
            ...r,
            status: overallStatus,
            projectEntries: updatedEntries
          };
        }
        return r;
      }));

      await api.put(`/daily-reports/${report._id}`, {
        projectEntries: updatedEntries,
        status: overallStatus
      });
      toast.success('Task status updated');
    } catch (err) {
      console.error('Failed to toggle status:', err);
      toast.error('Failed to update status');
      fetchMyReports();
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    selectedProjects: [],
    projectTasks: {},
    reportDate: getTodayStr()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-project change handler
  const handleProjectsChange = (newSelectedProjects) => {
    setFormData(prev => {
      const updatedTasks = { ...(prev.projectTasks || {}) };
      newSelectedProjects.forEach(p => {
        if (!updatedTasks[p] || updatedTasks[p].length === 0) {
          updatedTasks[p] = [
            {
              id: Math.random().toString(),
              hoursSpent: '',
              status: 'Completed',
              workDescription: ''
            }
          ];
        }
      });
      return {
        ...prev,
        selectedProjects: newSelectedProjects,
        projectTasks: updatedTasks
      };
    });
    if (formErrors.projects) setFormErrors(prev => ({ ...prev, projects: '' }));
  };

  const handleAddTask = (projectName) => {
    setFormData(prev => {
      const currentTasks = prev.projectTasks?.[projectName] || [];
      return {
        ...prev,
        projectTasks: {
          ...(prev.projectTasks || {}),
          [projectName]: [
            ...currentTasks,
            {
              id: Math.random().toString(),
              hoursSpent: '',
              status: 'Completed',
              workDescription: ''
            }
          ]
        }
      };
    });
  };

  const handleRemoveTask = (projectName, taskIndex) => {
    setFormData(prev => {
      const currentTasks = prev.projectTasks?.[projectName] || [];
      if (currentTasks.length <= 1) return prev;
      return {
        ...prev,
        projectTasks: {
          ...(prev.projectTasks || {}),
          [projectName]: currentTasks.filter((_, idx) => idx !== taskIndex)
        }
      };
    });
  };

  const handleTaskFieldChange = (projectName, taskIndex, field, val) => {
    setFormData(prev => {
      const currentTasks = [...(prev.projectTasks?.[projectName] || [])];
      if (!currentTasks[taskIndex]) {
        currentTasks[taskIndex] = { id: Math.random().toString(), hoursSpent: '', status: 'Completed', workDescription: '' };
      }
      currentTasks[taskIndex] = {
        ...currentTasks[taskIndex],
        [field]: val
      };
      return {
        ...prev,
        projectTasks: {
          ...(prev.projectTasks || {}),
          [projectName]: currentTasks
        }
      };
    });
    const errKey = `${projectName}_${taskIndex}_${field}`;
    if (formErrors[errKey]) {
      setFormErrors(prev => ({ ...prev, [errKey]: '' }));
    }
  };

  const handleRemoveSelectedProject = (projectName) => {
    handleProjectsChange((formData.selectedProjects || []).filter(p => p !== projectName));
  };

  const totalAllocatedHours = useMemo(() => {
    if (!formData.selectedProjects || formData.selectedProjects.length === 0) return 0;
    let sum = 0;
    formData.selectedProjects.forEach(p => {
      const tasks = formData.projectTasks?.[p] || [];
      tasks.forEach(t => {
        const val = parseFloat(t.hoursSpent);
        if (!isNaN(val) && val > 0) {
          sum += val;
        }
      });
    });
    return Number.isInteger(sum) ? sum : parseFloat(sum.toFixed(2));
  }, [formData.selectedProjects, formData.projectTasks]);

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
    const forDate = source.filter(r => r.reportDate === dateStr);
    const batchIds = new Set();
    let unbatched = 0;
    forDate.forEach(r => {
      if (r.batchId) batchIds.add(r.batchId);
      else unbatched++;
    });
    return batchIds.size + unbatched;
  }, [allMyRecentReports, myReports]);

  // Filters
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState(getTodayStr);
  const [filterEndDate, setFilterEndDate] = useState(getTodayStr);
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
      const params = { limit: 1000 };
      if (filterProject !== 'all') params.projectName = filterProject;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
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
  }, [filterProject, filterStatus, filterStartDate, filterEndDate, searchQuery]);

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
    const tasksMap = {};
    const selectedProjects = [];

    if (rep.projectEntries && rep.projectEntries.length > 0) {
      rep.projectEntries.forEach(pe => {
        const pName = pe.projectName || 'General';
        if (!tasksMap[pName]) {
          tasksMap[pName] = [];
          if (!selectedProjects.includes(pName)) {
            selectedProjects.push(pName);
          }
        }
        tasksMap[pName].push({
          id: Math.random().toString(),
          hoursSpent: pe.hoursSpent !== undefined ? String(pe.hoursSpent) : '',
          status: pe.status || 'Completed',
          workDescription: pe.workDescription || ''
        });
      });
    } else {
      const projects = rep.projectName
        ? rep.projectName.split(',').map(p => p.trim()).filter(Boolean)
        : [];
      projects.forEach(p => {
        if (!selectedProjects.includes(p)) selectedProjects.push(p);
        tasksMap[p] = [{
          id: Math.random().toString(),
          hoursSpent: rep.hoursSpent !== undefined ? String(rep.hoursSpent) : '',
          status: rep.status || 'Completed',
          workDescription: rep.workDescription || ''
        }];
      });
    }
    setFormData({
      selectedProjects,
      projectTasks: tasksMap,
      reportDate: rep.reportDate ? rep.reportDate.split('T')[0] : getTodayStr()
    });
    setIsFormDrawerOpen(true);
  };

  // Handle Request Edit Access Submission
  const handleRequestEditSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!requestEditModalReport?._id || submittingRequest) return;
    setSubmittingRequest(true);
    try {
      await api.post(`/daily-reports/${requestEditModalReport._id}/request-edit`, {
        reason: requestEditReason
      });
      toast.success('Edit request submitted to higher authority! You will be notified once approved.');
      setRequestEditModalReport(null);
      setRequestEditReason('');
      fetchMyReports();
      fetchMyRecentSummary();
    } catch (err) {
      console.error('Error requesting edit access:', err);
      toast.error(err.response?.data?.message || 'Failed to submit edit request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!formData.selectedProjects || formData.selectedProjects.length === 0) {
      errors.projects = 'Please select at least one Project Name';
    }

    (formData.selectedProjects || []).forEach(p => {
      const tasks = formData.projectTasks?.[p] || [];
      if (tasks.length === 0) {
        errors[`${p}_0_hoursSpent`] = 'Please enter hours spent';
        errors[`${p}_0_workDescription`] = 'Please describe work done';
        return;
      }

      tasks.forEach((t, tIdx) => {
        const hrs = parseFloat(t.hoursSpent);
        const taskLabel = tasks.length > 1 ? ` (Task ${tIdx + 1})` : '';
        if (!t.hoursSpent || String(t.hoursSpent).trim() === '') {
          errors[`${p}_${tIdx}_hoursSpent`] = `Please enter hours spent${taskLabel}`;
        } else if (isNaN(hrs) || hrs <= 0) {
          errors[`${p}_${tIdx}_hoursSpent`] = `Hours${taskLabel} must be greater than 0`;
        } else if (hrs > 24) {
          errors[`${p}_${tIdx}_hoursSpent`] = `Hours${taskLabel} cannot exceed 24 hours`;
        }

        if (!t.workDescription || !t.workDescription.trim()) {
          errors[`${p}_${tIdx}_workDescription`] = `Please describe work done${taskLabel}`;
        }
      });
    });

    if (totalAllocatedHours > 24) {
      errors.totalHours = 'Total hours across all projects cannot exceed 24 hours in a single day';
    }

    const reportDate = formData.reportDate || getTodayStr();
    if (reportDate < getMinAllowedDate()) {
      errors.reportDate = 'You cannot submit reports for dates older than last week';
    }
    if (reportDate > getTodayStr()) {
      errors.reportDate = 'You cannot submit reports for future dates';
    }
    const originalDate = editingReport ? (editingReport.reportDate ? editingReport.reportDate.split('T')[0] : '') : '';
    const isMovingToDifferentFullDate = editingReport && reportDate !== originalDate && getReportsCountForDate(reportDate) >= 1;

    if (!editingReport && getReportsCountForDate(reportDate) >= 1) {
      errors.reportDate = `A daily report for ${reportDate} has already been submitted. Only 1 daily report is allowed per day. Please edit your existing report instead.`;
    } else if (isMovingToDifferentFullDate) {
      errors.reportDate = `Cannot move report to ${reportDate} because that date already has a daily report.`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    try {
      const projectEntries = [];
      formData.selectedProjects.forEach(p => {
        const tasks = formData.projectTasks?.[p] || [];
        tasks.forEach(t => {
          projectEntries.push({
            projectName: p,
            hoursSpent: parseFloat(t.hoursSpent || 0),
            status: t.status || 'Completed',
            workDescription: (t.workDescription || '').trim()
          });
        });
      });

      if (editingReport) {
        const combinedDescriptions = projectEntries.length === 1
          ? projectEntries[0].workDescription
          : projectEntries.map(e => `${e.projectName}: ${e.workDescription}`).join('\n');
        const allCompleted = projectEntries.every(e => e.status === 'Completed');
        const hasInProgress = projectEntries.some(e => e.status === 'In Progress');
        const overallStatus = allCompleted ? 'Completed' : (hasInProgress ? 'In Progress' : 'Pending');

        await api.put(`/daily-reports/${editingReport._id}`, {
          reportDate,
          projectEntries,
          projectName: formData.selectedProjects.join(', '),
          workDescription: combinedDescriptions,
          hoursSpent: parseFloat(projectEntries.reduce((s, e) => s + e.hoursSpent, 0).toFixed(2)),
          status: overallStatus
        });

        toast.success('Daily report updated successfully!');
        setEditingReport(null);
        setIsFormDrawerOpen(false);
        fetchMyRecentSummary();
        fetchMyReports();
      } else {
        await api.post('/daily-reports', {
          reportDate,
          projectEntries
        });

        toast.success('Daily report submitted successfully!');
        
        // Reset form fields & close drawer
        setFormData({
          selectedProjects: [],
          projectTasks: {},
          reportDate: getTodayStr()
        });

        setIsFormDrawerOpen(false);
        setEditingReport(null);
        fetchMyRecentSummary();
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

  const getStatusTextColor = (st) => {
    switch (st) {
      case 'Completed':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'In Progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'Pending':
        return 'text-amber-600 dark:text-amber-400';
      case 'On Hold':
        return 'text-rose-600 dark:text-rose-400';
      default:
        return 'text-emerald-600 dark:text-emerald-400';
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

      // 4. Date Range Filter
      const repDateStr = rep.reportDate ? rep.reportDate.split('T')[0] : '';
      if (filterStartDate) {
        const targetStart = filterStartDate.split('T')[0];
        if (repDateStr && repDateStr < targetStart) return false;
      }
      if (filterEndDate) {
        const targetEnd = filterEndDate.split('T')[0];
        if (repDateStr && repDateStr > targetEnd) return false;
      }

      return true;
    });
  }, [myReports, searchQuery, filterProject, filterStatus, filterStartDate, filterEndDate]);

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
                projectTasks: {},
                reportDate: getTodayStr()
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-3.5 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#111c18] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
              <FileText size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Total Reports</span>
          </div>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white shrink-0 ml-1">{filteredReports.length}</span>
        </div>

        <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-3.5 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Completed</span>
          </div>
          <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">{completedCount}</span>
        </div>

        <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-3.5 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Clock size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">In Progress</span>
          </div>
          <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-1">{inProgressCount}</span>
        </div>

        <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-3.5 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Clock size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Total Hours</span>
          </div>
          <div className="flex items-baseline gap-1 whitespace-nowrap shrink-0 ml-1">
            <span className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">{totalHours.toFixed(1)}</span>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">/ 42 hrs 30 mins</span>
          </div>
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
            {(filterProject !== 'all' || filterStatus !== 'all' || filterStartDate || filterEndDate) && (
              <button
                onClick={() => {
                  setFilterProject('all');
                  setFilterStatus('all');
                  setFilterStartDate('');
                  setFilterEndDate('');
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 my-4">
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

          {/* Consolidated Date Range Filter */}
          <CustomDateRangePicker
            startDate={filterStartDate}
            endDate={filterEndDate}
            onChange={({ startDate, endDate }) => {
              setFilterStartDate(startDate);
              setFilterEndDate(endDate);
            }}
            placeholder="Filter Date Range"
          />
        </div>

        {/* Reports History Table */}
        <div className="daily-report-table-container overflow-x-auto">
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
                {filteredReports.map((rep) => {
                  const entries = Array.isArray(rep.projectEntries) && rep.projectEntries.length > 0
                    ? rep.projectEntries
                    : [{
                        projectName: rep.projectName || 'General',
                        workDescription: rep.workDescription || '',
                        hoursSpent: rep.hoursSpent || 0,
                        status: rep.status || 'Completed'
                      }];

                  return (
                    <React.Fragment key={rep._id}>
                      {entries.map((pe, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === entries.length - 1;
                        const taskKey = `${rep._id}_${idx}`;
                        const isExpanded = !!expandedTasks[taskKey];
                        const escapedName = (pe.projectName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const cleanDesc = (pe.workDescription || '').replace(new RegExp(`^${escapedName}:\\s*`, 'i'), '') || pe.workDescription;
                        const cellAlignClass = 'align-middle';

                        return (
                          <tr
                            key={taskKey}
                            onMouseEnter={() => setHoveredReportId(rep._id)}
                            onMouseLeave={() => setHoveredReportId(null)}
                            onClick={() => {
                              setSelectedReport(rep);
                              setExpandedTasks({});
                            }}
                            className={`transition-colors cursor-pointer group select-none ${
                              selectedReport?._id === rep._id 
                                ? 'bg-emerald-50/90 dark:bg-[#1a382e]' 
                                : hoveredReportId === rep._id 
                                  ? 'bg-slate-50/80 dark:bg-[#142821]/80' 
                                  : ''
                            } ${isLast ? 'border-b-2 border-slate-200 dark:border-[#1a2d29]' : 'border-b border-slate-100 dark:border-[#1a2d29]/40'}`}
                          >
                            {isFirst && (
                              <td
                                rowSpan={entries.length}
                                className={`py-4 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap align-middle border-r border-slate-100 dark:border-[#1a2d29]/40 ${
                                  selectedReport?._id === rep._id ? 'border-l-4 border-l-[#00a76b]' : ''
                                }`}
                              >
                                {rep.reportDate}
                              </td>
                            )}

                            <td className={`py-2.5 px-4 whitespace-nowrap ${cellAlignClass}`}>
                              <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs border ${statusBadgeColor(pe.status || rep.status)}`}>
                                {pe.projectName}
                              </span>
                            </td>

                            <td className="py-2.5 px-4 max-w-xs sm:max-w-md align-middle">
                              {!isExpanded ? (
                                <div className="flex items-center justify-between gap-2 text-xs sm:text-[13px]">
                                  <span
                                    className="truncate font-semibold text-slate-800 dark:text-slate-200"
                                    title={cleanDesc}
                                  >
                                    {cleanDesc}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => toggleExpand(rep._id, idx, false, e, entries)}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#111c18] transition-all cursor-pointer shrink-0"
                                    title="Expand description"
                                  >
                                    <ChevronDown size={14} className="transition-transform duration-200" />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200/70 dark:border-[#1a2d29] leading-relaxed animate-in fade-in duration-200"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="text-xs sm:text-[13.5px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words flex-1">
                                      <span className={`font-bold mr-1.5 ${getStatusTextColor(pe.status || rep.status)}`}>{pe.projectName}:</span>
                                      {cleanDesc}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => toggleExpand(rep._id, idx, false, e, entries)}
                                      className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-[#1a2d29] transition-all cursor-pointer shrink-0 mt-0.5"
                                      title="Collapse description"
                                    >
                                      <ChevronDown size={14} className="rotate-180 transition-transform duration-200" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className={`py-2.5 px-4 text-center whitespace-nowrap ${cellAlignClass}`} title={`Task Hours: ${pe.hoursSpent} hrs`}>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#111c18] font-black text-slate-900 dark:text-white border border-slate-200 dark:border-[#1a2d29]">
                                {pe.hoursSpent} hrs
                              </span>
                            </td>

                            <td className={`py-2.5 px-4 whitespace-nowrap ${cellAlignClass}`}>
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusBadgeColor(pe.status || rep.status)}`}>
                                {pe.status || rep.status || 'Completed'}
                              </span>
                            </td>

                            {isFirst && (
                              <td
                                rowSpan={entries.length}
                                className="py-4 px-4 text-right whitespace-nowrap align-middle border-l border-slate-100 dark:border-[#1a2d29]/40"
                              >
                                <div className="flex items-center justify-end gap-1.5">
                                  {(() => {
                                    const isPastCutoff = rep.reportDate < getTodayStr();
                                    const reqStatus = rep.editRequest?.status || 'none';
                                    const isApproved = reqStatus === 'approved';
                                    const isPending = reqStatus === 'pending';
                                    const isRejected = reqStatus === 'rejected';

                                    if (!isPastCutoff || isApproved) {
                                      return (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEdit(rep);
                                          }}
                                          className={`p-2 rounded-xl ${
                                            isApproved
                                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/40'
                                              : 'bg-slate-100 dark:bg-[#111c18] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                                          } transition-colors cursor-pointer relative`}
                                          title={isApproved ? 'Edit Access Granted - Click to Edit' : 'Edit Daily Report'}
                                        >
                                          <Pencil size={15} />
                                          {isApproved && (
                                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#162722]" />
                                          )}
                                        </button>
                                      );
                                    }

                                    if (isPending) {
                                      return (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toast('Edit request is awaiting higher authority approval.', { icon: '⏳' });
                                          }}
                                          className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                                          title="Edit Request Pending Higher Authority Approval ⏳"
                                        >
                                          <Clock size={15} className="animate-pulse" />
                                        </button>
                                      );
                                    }

                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRequestEditModalReport(rep);
                                          setRequestEditReason('');
                                        }}
                                        className="p-2 rounded-xl bg-slate-100 dark:bg-[#111c18] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 border border-transparent hover:border-amber-300 dark:hover:border-amber-800 transition-colors cursor-pointer"
                                        title={
                                          isRejected
                                            ? 'Edit request declined. Click to request again.'
                                            : 'Locked after 11:59 PM cutoff. Click to request edit access from higher authority.'
                                        }
                                      >
                                        <Lock size={15} />
                                      </button>
                                    );
                                  })()}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedReport(rep);
                                      setExpandedTasks({});
                                    }}
                                    className="p-2 rounded-xl bg-slate-100 dark:bg-[#111c18] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                                    title="View Complete Report Details"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
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
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <form id="dailyReportDrawerForm" onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* 1. Date */}
                <div>
                  <div className="mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Date <span className="text-red-500">*</span>
                    </label>
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
                        return d !== originalDate && getReportsCountForDate(d) >= 1;
                      }
                      return getReportsCountForDate(d) >= 1;
                    }}
                  />
                  {editingReport ? (
                    <div className="mt-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-[11px]">
                      <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                      <span>Editing existing daily report for {formData.reportDate}.</span>
                    </div>
                  ) : getReportsCountForDate(formData.reportDate) >= 1 ? (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
                      <AlertCircle size={15} className="shrink-0 text-rose-500" />
                      <span><strong>Report already submitted:</strong> Only 1 daily report is allowed per day. A report already exists for {formData.reportDate}. Please edit your existing report instead.</span>
                    </div>
                  ) : null}
                  {formErrors.reportDate && (
                    <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{formErrors.reportDate}</span>
                    </p>
                  )}
                </div>

                {/* 2. Project Name Multi-Select */}
                <div>
                  <div className="mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <MultiProjectSelect
                    options={projectOptions
                      .map(p => typeof p === 'string' ? p.trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad') : p)
                      .filter(Boolean)}
                    value={formData.selectedProjects || []}
                    onChange={handleProjectsChange}
                    placeholder="Select project..."
                    canManage={false}
                  />
                  {formErrors.projects && (
                    <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{formErrors.projects}</span>
                    </p>
                  )}
                </div>

                {/* 3. Dynamic Per-Project Work Cards (Time, Status, Description) */}
                {(!formData.selectedProjects || formData.selectedProjects.length === 0) ? (
                  <div className="py-8 px-4 rounded-2xl bg-slate-50 dark:bg-[#111c18] border border-dashed border-slate-200 dark:border-[#1a2d29] text-center space-y-1.5">
                    <Layers size={24} className="mx-auto text-emerald-500 opacity-80" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No project selected</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                      Select one or more projects above to enter work time, status, and description for each project.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* Cards for each selected project */}
                    {formData.selectedProjects.map((proj, idx) => {
                      const tasks = formData.projectTasks?.[proj] || [
                        { id: 'default', hoursSpent: '', status: 'Completed', workDescription: '' }
                      ];

                      return (
                        <div
                          key={proj}
                          className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#111c18]/90 border border-slate-200/80 dark:border-[#1a2d29] space-y-3 relative shadow-2xs animate-in fade-in duration-200"
                        >
                          {/* Project Header Bar */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-[#1a2d29]/80">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                {proj}
                              </span>
                              {tasks.length > 1 && (
                                <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                                  {tasks.length} tasks
                                </span>
                              )}
                            </div>
                            {formData.selectedProjects.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSelectedProject(proj)}
                                className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                                title={`Remove ${proj}`}
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>

                          {/* Tasks under this project */}
                          <div className="space-y-3.5">
                            {tasks.map((task, taskIdx) => {
                              const hrsErr = formErrors[`${proj}_${taskIdx}_hoursSpent`];
                              const descErr = formErrors[`${proj}_${taskIdx}_workDescription`];

                              return (
                                <div
                                  key={task.id || taskIdx}
                                  className={`space-y-2.5 ${
                                    taskIdx > 0
                                      ? 'pt-3 border-t border-slate-200/60 dark:border-[#1a2d29]/60'
                                      : ''
                                  }`}
                                >
                                  {tasks.length > 1 && (
                                    <div className="flex items-center justify-between pb-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                          Task {taskIdx + 1}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTask(proj, taskIdx)}
                                        className="text-slate-400 hover:text-rose-500 text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                        title={`Remove Task ${taskIdx + 1}`}
                                      >
                                        <Trash2 size={11} />
                                        <span>Remove Task</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Row 1: Time (Hours) + Status */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {/* Time / Hours Spent */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                          Time (Hours) <span className="text-red-500">*</span>
                                        </label>
                                        <span className="text-[9px] text-slate-400">e.g. 2 or 3.5</span>
                                      </div>
                                      <div className="relative">
                                        <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="e.g. 2.5"
                                          value={task.hoursSpent || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
                                              handleTaskFieldChange(proj, taskIdx, 'hoursSpent', val);
                                            }
                                          }}
                                          className={`w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-white dark:bg-[#162722] border text-xs font-bold text-slate-900 dark:text-white focus:outline-none transition-colors ${
                                            hrsErr
                                              ? 'border-rose-500 ring-1 ring-rose-500/20'
                                              : 'border-slate-200 dark:border-[#1a2d29] focus:border-emerald-500'
                                          }`}
                                        />
                                      </div>
                                      {hrsErr && (
                                        <p className="text-[10px] font-semibold text-rose-500 mt-1">{hrsErr}</p>
                                      )}
                                      {/* Quick hour preset chips for this task */}
                                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                        {['1', '2', '3', '4', '5'].map(h => (
                                          <button
                                            key={h}
                                            type="button"
                                            onClick={() => handleTaskFieldChange(proj, taskIdx, 'hoursSpent', h)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                              task.hoursSpent === h
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-slate-200/70 dark:bg-[#1a2d29] text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950'
                                            }`}
                                          >
                                            {h}h
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                      <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">
                                        Status <span className="text-red-500">*</span>
                                      </label>
                                      <StatusSelect
                                        value={task.status || 'Completed'}
                                        onChange={(newStatus) => handleTaskFieldChange(proj, taskIdx, 'status', newStatus)}
                                      />
                                    </div>
                                  </div>

                                  {/* Row 2: Description / Work Done (Taller box matching screenshot) */}
                                  <div>
                                    <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">
                                      Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                      rows={4}
                                      placeholder={`Describe what tasks, features or fixes you completed for ${proj}...`}
                                      value={task.workDescription || ''}
                                      onChange={(e) => handleTaskFieldChange(proj, taskIdx, 'workDescription', e.target.value)}
                                      className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-[#162722] border text-xs text-slate-900 dark:text-white focus:outline-none transition-colors min-h-[105px] resize-y leading-relaxed ${
                                        descErr
                                          ? 'border-rose-500 ring-1 ring-rose-500/20'
                                          : 'border-slate-200 dark:border-[#1a2d29] focus:border-emerald-500'
                                      }`}
                                    />
                                    {descErr && (
                                      <p className="text-[10px] font-semibold text-rose-500 mt-1">{descErr}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Task Button for this project (Matching Screenshot 2) */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleAddTask(proj)}
                              className="w-full py-2 px-3 rounded-xl border border-dashed border-emerald-400/80 dark:border-emerald-600/60 bg-emerald-50/40 hover:bg-emerald-50/90 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:shadow-xs active:scale-[0.99]"
                            >
                              <Plus size={13} className="stroke-[2.5]" />
                              <span>Add Task</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Total Hours Spent (Bottom Summary like View Report) */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111c18] border border-slate-200/80 dark:border-[#1a2d29]">
                      <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                        Total Hours Spent
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {totalAllocatedHours} Hours
                      </span>
                    </div>

                    {formErrors.totalHours && (
                      <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 animate-in fade-in">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{formErrors.totalHours}</span>
                      </p>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-[#1a2d29] bg-slate-50/50 dark:bg-[#111c18]/50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsFormDrawerOpen(false);
                  setEditingReport(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1a2d29] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a2d29] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="dailyReportDrawerForm"
                disabled={isSubmitting || (!editingReport && getReportsCountForDate(formData.reportDate) >= 1)}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>
                  {isSubmitting
                    ? (editingReport ? 'Saving...' : 'Submitting...')
                    : (!editingReport && getReportsCountForDate(formData.reportDate) >= 1)
                    ? 'Report Already Exists (1/1)'
                    : editingReport
                    ? 'Update Daily Report'
                    : 'Submit Daily Report'}
                </span>
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
              {/* Horizontal Projects List Card */}
              <div className="bg-slate-50 dark:bg-[#111c18] p-3.5 rounded-2xl border border-slate-100 dark:border-[#1a2d29]">
                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold block mb-2">
                  {Array.isArray(selectedReport.projectEntries) && selectedReport.projectEntries.length > 1
                    ? `Projects (${selectedReport.projectEntries.length})`
                    : 'Project'}
                </span>
                {Array.isArray(selectedReport.projectEntries) && selectedReport.projectEntries.length > 1 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedReport.projectEntries.map((pe, i) => (
                      <span
                        key={i}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${statusBadgeColor(pe.status || selectedReport.status)}`}
                        title={pe.projectName}
                      >
                        {pe.projectName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={`font-extrabold text-xs inline-block px-2.5 py-1 rounded-lg border ${statusBadgeColor(selectedReport.status)}`} title={selectedReport.projectName}>
                    {selectedReport.projectName}
                  </span>
                )}
              </div>

              {/* Project Breakdown Cards or Work Description Box */}
              {selectedReport.projectEntries && selectedReport.projectEntries.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block">
                    Projects Breakdown ({selectedReport.projectEntries.length} {selectedReport.projectEntries.length === 1 ? 'Project' : 'Projects'})
                  </span>
                  {selectedReport.projectEntries.map((pe, pIdx) => (
                    <div key={pIdx} className="bg-slate-50 dark:bg-[#111c18] p-3.5 rounded-2xl border border-slate-100 dark:border-[#1a2d29] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-extrabold text-xs px-2.5 py-0.5 rounded-lg border ${statusBadgeColor(pe.status || selectedReport.status)}`}>
                          {pe.projectName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {pe.hoursSpent} hrs
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusBadgeColor(pe.status)}`}>
                            {pe.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm sm:text-[14px] text-slate-800 dark:text-slate-200 font-medium leading-relaxed bg-white dark:bg-[#162722] p-3 rounded-xl border border-slate-100 dark:border-[#1a2d29] whitespace-pre-wrap">
                        {pe.workDescription}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block mb-2">Work Completed</span>
                  <div className="bg-slate-50 dark:bg-[#111c18] p-4 rounded-2xl border border-slate-100 dark:border-[#1a2d29] text-slate-800 dark:text-slate-200 text-sm sm:text-[14px] leading-relaxed font-medium whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {selectedReport.workDescription}
                  </div>
                </div>
              )}

              {/* Total Hours Spent (Bottom Summary) */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#111c18] border border-slate-100 dark:border-[#1a2d29]">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">Total Hours Spent</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {selectedReport.hoursSpent} Hours
                </span>
              </div>

              {/* Timestamps */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                <span>Submitted: {new Date(selectedReport.createdAt).toLocaleString()}</span>
                <span>Updated: {new Date(selectedReport.updatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-[#1a2d29] bg-slate-50/50 dark:bg-[#111c18]/50 flex items-center justify-between shrink-0">
              {(() => {
                const isPastCutoff = selectedReport.reportDate < getTodayStr();
                const reqStatus = selectedReport.editRequest?.status || 'none';
                const isApproved = reqStatus === 'approved';
                const isPending = reqStatus === 'pending';

                if (!isPastCutoff || isApproved) {
                  return (
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
                      <span>{isApproved ? 'Edit Report (Access Granted)' : 'Edit Report'}</span>
                    </button>
                  );
                }

                if (isPending) {
                  return (
                    <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800/60">
                      <Clock size={14} className="animate-pulse" />
                      <span>Edit Request Pending</span>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => {
                      const repToRequest = selectedReport;
                      setSelectedReport(null);
                      setRequestEditModalReport(repToRequest);
                      setRequestEditReason('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock size={14} />
                    <span>Request Edit Access</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── REQUEST EDIT ACCESS MODAL ── */}
      {requestEditModalReport && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setRequestEditModalReport(null)}
        >
          <div
            className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200 relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1a2d29]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Request Edit Access
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Report Date: {requestEditModalReport.reportDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequestEditModalReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#111c18] transition-colors cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Clock size={13} className="text-amber-600" />
                <span>Cutoff Time Expired (11:59 PM)</span>
              </p>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                Direct editing of daily reports is only permitted until 11:59 PM of the report date. To update this report, please submit a request to the higher authority (Admin / HR / Manager).
              </p>
            </div>

            <form onSubmit={handleRequestEditSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Reason for Edit <span className="text-slate-400 text-[10px] font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={requestEditReason}
                  onChange={(e) => setRequestEditReason(e.target.value)}
                  placeholder="e.g., Need to adjust project hours, add missed tasks, or correct description..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-[#1a2d29] bg-slate-50/50 dark:bg-[#111c18] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1a2d29]">
                <button
                  type="button"
                  onClick={() => setRequestEditModalReport(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#111c18] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingRequest ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  <span>{submittingRequest ? 'Sending Request...' : 'Send Request to Higher Authority'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DailyReport;
