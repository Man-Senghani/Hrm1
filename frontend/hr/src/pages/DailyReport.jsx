import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@shared/services/api';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import {
  FileText, CheckCircle2, Clock, AlertCircle, PauseCircle,
  Search, Filter, RefreshCw, Download, Eye, Pencil, X, User, Building, Briefcase, Calendar, ChevronRight, Plus, Sparkles, Send, Layers, Check, ChevronDown, Trash2,
  Lock, ShieldAlert
} from 'lucide-react';
import CustomDatePicker from '@shared/components/CustomDatePicker';
import CustomDateRangePicker from '@shared/components/CustomDateRangePicker';
import CustomSelect from '@shared/components/CustomSelect';
import MultiProjectSelect from '@shared/components/MultiProjectSelect';
import StatusSelect from '@shared/components/StatusSelect';
import ExportFilterModal from '@shared/components/ExportFilterModal';

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
const PAGE_SIZE = 10;

const getPageNumbers = (curr, total) => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (curr <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (curr >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', curr - 1, curr, curr + 1, '...', total];
};

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
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Edit Request State (past 11:59 PM cutoff)
  const [requestEditModalReport, setRequestEditModalReport] = useState(null);
  const [requestEditReason, setRequestEditReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [reviewingEdit, setReviewingEdit] = useState(false);

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
  const [selectedEntries, setSelectedEntries] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});
  const [hoveredReportId, setHoveredReportId] = useState(null);

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

  // Reset expanded dropdowns when switching view tabs
  useEffect(() => {
    setExpandedTasks({});
  }, [viewTab]);

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

      const updateList = (list) => list.map(r => {
        if (r._id === report._id) {
          return {
            ...r,
            status: overallStatus,
            projectEntries: updatedEntries
          };
        }
        return r;
      });

      setReports(prev => updateList(prev));
      setMyReports(prev => updateList(prev));

      await api.put(`/daily-reports/${report._id}`, {
        projectEntries: updatedEntries,
        status: overallStatus
      });
      toast.success('Task status updated');
    } catch (err) {
      console.error('Failed to toggle status:', err);
      toast.error('Failed to update status');
      fetchReports();
      fetchMyReports();
    }
  };

  // Form Drawer State
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
  const [showExportModal, setShowExportModal] = useState(false);

  // Filters for My Reports
  const [mySearch, setMySearch] = useState('');
  const [myProjectFilter, setMyProjectFilter] = useState('all');
  const [myStatusFilter, setMyStatusFilter] = useState('all');
  const [myStartDateFilter, setMyStartDateFilter] = useState(getTodayStr);
  const [myEndDateFilter, setMyEndDateFilter] = useState(getTodayStr);

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
      const params = { page, limit: PAGE_SIZE };

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

  // Reset page to 1 when filters or search term change
  useEffect(() => {
    setPage(1);
  }, [search, department, project, status, employeeId, period, startDate, endDate]);

  // Fetch My Personal Reports (when viewTab === 'my')
  const fetchMyReports = useCallback(async () => {
    setLoadingMyReports(true);
    try {
      const params = { limit: 1000 };
      if (myProjectFilter !== 'all') params.projectName = myProjectFilter;
      if (myStatusFilter !== 'all') params.status = myStatusFilter;
      if (myStartDateFilter) params.startDate = myStartDateFilter;
      if (myEndDateFilter) params.endDate = myEndDateFilter;
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
  }, [myProjectFilter, myStatusFilter, myStartDateFilter, myEndDateFilter, mySearch]);

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

  // Handle Request Edit Access Submission (for own report)
  const handleRequestEditSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!requestEditModalReport?._id || submittingRequest) return;
    setSubmittingRequest(true);
    try {
      await api.post(`/daily-reports/${requestEditModalReport._id}/request-edit`, {
        reason: requestEditReason
      });
      toast.success('Edit request submitted! You will receive a notification once approved.');
      setRequestEditModalReport(null);
      setRequestEditReason('');
      fetchMyReports();
    } catch (err) {
      console.error('Error requesting edit access:', err);
      toast.error(err.response?.data?.message || 'Failed to submit edit request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Handle Review (Approve/Reject) Edit Request (as Higher Authority)
  const handleReviewEdit = async (reportId, action) => {
    if (!reportId || reviewingEdit) return;
    setReviewingEdit(true);
    try {
      const res = await api.put(`/daily-reports/${reportId}/review-edit`, { action });
      const updated = res.data?.report;
      toast.success(
        action === 'approve'
          ? 'Edit access approved! Employee notified.'
          : 'Edit access request declined.'
      );
      if (updated) {
        setSelectedReport(prev => (prev?._id === reportId ? { ...prev, ...updated } : prev));
        setReports(prev => prev.map(r => r._id === reportId ? { ...r, ...updated } : r));
        setMyReports(prev => prev.map(r => r._id === reportId ? { ...r, ...updated } : r));
      } else {
        fetchDailyReports();
        fetchMyReports();
      }
    } catch (err) {
      console.error('Error reviewing edit request:', err);
      toast.error(err.response?.data?.message || 'Failed to review edit request');
    } finally {
      setReviewingEdit(false);
    }
  };

  // Handle Submit inside drawer
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

    if (!editingReport && myReports.some(r => r.reportDate === reportDate)) {
      errors.reportDate = `A daily report for ${reportDate} has already been submitted. Only 1 daily report is allowed per day. Please edit your existing report instead.`;
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

        const res = await api.put(`/daily-reports/${editingReport._id}`, {
          reportDate,
          projectEntries,
          projectName: formData.selectedProjects.join(', '),
          workDescription: combinedDescriptions,
          hoursSpent: parseFloat(projectEntries.reduce((s, e) => s + e.hoursSpent, 0).toFixed(2)),
          status: overallStatus
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
          reportDate,
          projectEntries
        });

        toast.success('Daily report submitted successfully!');
        
        setFormData({
          selectedProjects: [],
          projectTasks: {},
          reportDate: getTodayStr()
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

  // Export Columns Definition
  const dailyReportExportColumns = useMemo(() => [
    {
      key: 'reportDate',
      label: 'Date',
      defaultSelected: true,
      getValue: (r) => {
        const dStr = r.reportDate || (r.createdAt ? String(r.createdAt).split('T')[0] : '');
        if (!dStr) return 'N/A';
        try {
          const parts = String(dStr).split('T')[0].split('-');
          if (parts.length === 3) {
            const year = parts[0];
            const monthIdx = parseInt(parts[1], 10) - 1;
            const day = parts[2];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (monthIdx >= 0 && monthIdx < 12) return `${day} ${monthNames[monthIdx]} ${year}`;
          }
        } catch (e) {}
        return String(dStr);
      }
    },
    {
      key: 'employeeName',
      label: 'Employee Name',
      defaultSelected: true,
      getValue: (r) => r.user?.name || r.employee?.fullName || currentUser?.name || 'N/A'
    },
    {
      key: 'email',
      label: 'Email Address',
      defaultSelected: true,
      getValue: (r) => r.user?.email || r.employee?.email || currentUser?.email || 'N/A'
    },
    {
      key: 'department',
      label: 'Department',
      defaultSelected: true,
      getValue: (r) => r.department || r.employee?.department || r.employee?.position || 'General'
    },
    {
      key: 'projectName',
      label: 'Project',
      defaultSelected: true,
      getValue: (r) => r.projectName || (Array.isArray(r.selectedProjects) ? r.selectedProjects.join(', ') : 'N/A')
    },
    {
      key: 'workDescription',
      label: 'Work Description',
      defaultSelected: true,
      getValue: (r) => r.workDescription || 'N/A'
    },
    {
      key: 'hoursSpent',
      label: 'Hours Spent',
      defaultSelected: true,
      getValue: (r) => r.hoursSpent != null ? `${r.hoursSpent} hrs` : '0 hrs'
    },
    {
      key: 'status',
      label: 'Status',
      defaultSelected: true,
      getValue: (r) => r.status || 'N/A'
    },
    {
      key: 'submittedAt',
      label: 'Submitted At',
      defaultSelected: false,
      getValue: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'
    }
  ], [currentUser]);

  // Export Custom Filters Definition
  const dailyReportExportFilters = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      getItemValue: (r) => r.status || 'N/A',
      options: [
        { label: 'Completed', value: 'Completed' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Pending', value: 'Pending' },
        { label: 'On Hold', value: 'On Hold' }
      ]
    },
    {
      key: 'projectName',
      label: 'Project',
      getItemValue: (r) => r.projectName || 'N/A',
      options: (projectOptions || []).map(p => ({ label: p, value: p }))
    }
  ], [projectOptions]);

  // Export CSV Fallback handler
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
      const repDateStr = rep.reportDate ? rep.reportDate.split('T')[0] : '';
      if (myStartDateFilter) {
        const targetStart = myStartDateFilter.split('T')[0];
        if (repDateStr && repDateStr < targetStart) return false;
      }
      if (myEndDateFilter) {
        const targetEnd = myEndDateFilter.split('T')[0];
        if (repDateStr && repDateStr > targetEnd) return false;
      }
      return true;
    });
  }, [myReports, mySearch, myProjectFilter, myStatusFilter, myStartDateFilter, myEndDateFilter]);

  const [myPage, setMyPage] = useState(1);
  const myTotalPages = Math.ceil(filteredMyReports.length / PAGE_SIZE) || 1;

  useEffect(() => {
    setMyPage(1);
  }, [mySearch, myProjectFilter, myStatusFilter, myStartDateFilter, myEndDateFilter]);

  const paginatedMyReports = useMemo(() => {
    const start = (myPage - 1) * PAGE_SIZE;
    return filteredMyReports.slice(start, start + PAGE_SIZE);
  }, [filteredMyReports, myPage]);

  // My Personal Reports Stats
  const myCompletedCount = filteredMyReports.filter(r => r.status === 'Completed').length;
  const myInProgressCount = filteredMyReports.filter(r => r.status === 'In Progress').length;
  const myTotalHours = filteredMyReports.reduce((acc, curr) => acc + (curr.hoursSpent || 0), 0);

  // Calculate team total target hours (8.5 hrs * 5 days = 42.5 hrs per employee)
  const teamTargetHours = useMemo(() => {
    const empSet = new Set();
    reports.forEach(r => {
      const id = r.user?._id || r.user || r.employee?._id || r.employee || r.user?.name || r.employeeName;
      if (id) empSet.add(String(id));
    });
    const count = empSet.size > 0 ? empSet.size : 1;
    const total = count * 42.5;
    return Number.isInteger(total) ? total : total.toFixed(1);
  }, [reports]);

  return (
    <div className="space-y-4 pb-8">
      {/* ── HEADER WITH ADD REPORT BUTTON & CONTEXT SWITCHER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Daily Report
          </h1>
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

          <button
            onClick={viewTab === 'team' ? fetchDailyReports : fetchMyReports}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={(loading || loadingMyReports) ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setShowExportModal(true)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-3.5 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#111c18] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <FileText size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Total Reports</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white shrink-0 ml-1">{myReports.length}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-3.5 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Completed</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">{myCompletedCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-3.5 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">In Progress</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-1">{myInProgressCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-3.5 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Total Hours</span>
              </div>
              <div className="flex items-baseline gap-1 whitespace-nowrap shrink-0 ml-1">
                <span className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">{myTotalHours.toFixed(1)}</span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">/ 42 hrs 30 mins</span>
              </div>
            </div>
          </div>

          {/* My Reports Table Container */}
          <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#1a2d29]">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">My Submitted Reports</h3>
              </div>

              <div className="flex items-center gap-3">
                {(myProjectFilter !== 'all' || myStatusFilter !== 'all' || myStartDateFilter || myEndDateFilter) && (
                  <button
                    onClick={() => {
                      setMyProjectFilter('all');
                      setMyStatusFilter('all');
                      setMyStartDateFilter('');
                      setMyEndDateFilter('');
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
                  <RefreshCw size={14} className={loadingMyReports ? 'animate-spin' : ''} />
                  Refresh My History
                </button>
              </div>
            </div>

            {/* My Reports Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 my-4">
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

              <CustomDateRangePicker
                startDate={myStartDateFilter}
                endDate={myEndDateFilter}
                onChange={({ startDate, endDate }) => {
                  setMyStartDateFilter(startDate);
                  setMyEndDateFilter(endDate);
                }}
                placeholder="Filter Date Range"
              />
            </div>

            {/* My Reports Table */}
            <div id="myReportTableContainer" className="daily-report-table-container overflow-x-auto">
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
                    {paginatedMyReports.map((rep) => {
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
                                                toast('Edit request is awaiting approval.', { icon: '⏳' });
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
                                                : 'Locked after 11:59 PM cutoff. Click to request edit access.'
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

            {myTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 py-4 mt-4 bg-white dark:bg-[#111c18] border-t border-slate-100 dark:border-[#1a2d29] rounded-b-2xl gap-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Showing {filteredMyReports.length === 0 ? 0 : (myPage - 1) * PAGE_SIZE + 1}–{Math.min(myPage * PAGE_SIZE, filteredMyReports.length)} of {filteredMyReports.length} reports
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={myPage <= 1}
                    onClick={() => {
                      setMyPage(p => Math.max(1, p - 1));
                      const el = document.getElementById('myReportTableContainer');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1a2d29] bg-white dark:bg-[#162722] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#00a76b] hover:text-[#00a76b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                  >
                    Prev
                  </button>

                  {getPageNumbers(myPage, myTotalPages).map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span key={`my-ellipsis-${idx}`} className="px-1.5 text-slate-400 font-bold text-xs">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setMyPage(item);
                          const el = document.getElementById('myReportTableContainer');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all border ${
                          myPage === item
                            ? 'bg-[#00a76b] text-white border-[#00a76b] shadow-xs'
                            : 'bg-white dark:bg-[#162722] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1a2d29] hover:border-[#00a76b] hover:text-[#00a76b] cursor-pointer'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={myPage >= myTotalPages}
                    onClick={() => {
                      setMyPage(p => Math.min(myTotalPages, p + 1));
                      const el = document.getElementById('myReportTableContainer');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1a2d29] bg-white dark:bg-[#162722] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#00a76b] hover:text-[#00a76b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW TAB 2: TEAM & ALL EMPLOYEE DAILY REPORTS ── */}
      {viewTab === 'team' && (
        <div className="space-y-4">
          {/* Top Pending Edit Requests Alert Banner */}
          {reports.some(r => r.editRequest?.status === 'pending') && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldAlert size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs sm:text-sm text-amber-950 dark:text-amber-100">
                      {reports.filter(r => r.editRequest?.status === 'pending').length} Pending Daily Report Edit {reports.filter(r => r.editRequest?.status === 'pending').length === 1 ? 'Request' : 'Requests'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/90 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 uppercase tracking-wider animate-pulse">
                      Action Needed
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    Employees have requested permission to modify their daily report after the 11:59 PM deadline.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const firstPending = reports.find(r => r.editRequest?.status === 'pending');
                    if (firstPending) {
                      setSelectedReport(firstPending);
                      setExpandedTasks({});
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Eye size={14} />
                  <span>Review Request</span>
                </button>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-2.5 sm:px-3 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#111c18] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <FileText size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Total Reports</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white shrink-0 ml-1">{summary.totalReports}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-2.5 sm:px-3 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Completed</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">{summary.completedCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-2.5 sm:px-3 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">In Progress</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-1">{summary.inProgressCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-2.5 sm:px-3 rounded-2xl shadow-xs flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertCircle size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Pending</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-1">{summary.pendingCount}</span>
            </div>

            <div className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] py-3 px-2.5 sm:px-3 rounded-2xl shadow-xs flex items-center justify-between min-w-0 col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Total Hours</span>
              </div>
              <div className="flex items-baseline gap-1 whitespace-nowrap shrink-0 ml-1">
                <span className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">{summary.totalHours || 0}</span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">/ {teamTargetHours} hrs</span>
              </div>
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
          <div id="dailyReportTableContainer" className="bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="daily-report-table-container overflow-x-auto">
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
                      const entries = Array.isArray(rep.projectEntries) && rep.projectEntries.length > 0
                        ? rep.projectEntries
                        : [{
                            projectName: rep.projectName || 'General',
                            workDescription: rep.workDescription || '',
                            hoursSpent: rep.hoursSpent || 0,
                            status: rep.status || 'Completed'
                          }];

                      const checkedIndices = entries.map((_, i) => i).filter(i => !!selectedEntries[`${rep._id}_${i}`]);
                      const hasSelection = checkedIndices.length > 0;
                      const lastCheckedIdx = hasSelection ? checkedIndices[checkedIndices.length - 1] : -1;

                      return (
                        <React.Fragment key={rep._id}>
                          {entries.map((pe, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === entries.length - 1;
                            const isSelected = !!selectedEntries[`${rep._id}_${idx}`];
                            const showDropdown = !hasSelection || !isSelected || idx === lastCheckedIdx;
                            const isGroup = hasSelection && isSelected && idx === lastCheckedIdx;
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
                                  <>
                                    <td
                                      rowSpan={entries.length}
                                      className={`py-4 px-4 whitespace-nowrap align-middle border-r border-slate-100 dark:border-[#1a2d29]/40 ${
                                        selectedReport?._id === rep._id ? 'border-l-4 border-l-[#00a76b]' : ''
                                      }`}
                                    >
                                      <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{empName}</p>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{empEmail}</p>
                                      </div>
                                    </td>
                                    <td
                                      rowSpan={entries.length}
                                      className="py-4 px-4 whitespace-nowrap align-middle border-r border-slate-100 dark:border-[#1a2d29]/40"
                                    >
                                      <span className="font-bold text-slate-600 dark:text-slate-300">
                                        {dept}
                                      </span>
                                    </td>
                                    <td
                                      rowSpan={entries.length}
                                      className="py-4 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white align-middle border-r border-slate-100 dark:border-[#1a2d29]/40"
                                    >
                                      {rep.reportDate}
                                    </td>
                                  </>
                                )}

                                <td className={`py-2.5 px-4 whitespace-nowrap ${cellAlignClass}`}>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => toggleEntrySelect(rep._id, idx, e)}
                                      className={`w-4 h-4 rounded-md flex items-center justify-center transition-all cursor-pointer border ${
                                        isSelected
                                          ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                                          : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 bg-white dark:bg-[#111c18]'
                                      }`}
                                      title={isSelected ? 'Deselect to view individually' : 'Select to view full data'}
                                    >
                                      {isSelected && <Check size={11} strokeWidth={3} />}
                                    </button>
                                    <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs border ${statusBadgeColor(pe.status || rep.status)}`}>
                                      {pe.projectName}
                                    </span>
                                    {rep.editRequest?.status === 'pending' && isFirst && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/60 animate-pulse">
                                        <Clock size={10} /> Edit Requested
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-2.5 px-4 max-w-xs sm:max-w-sm align-middle">
                                  {!isExpanded ? (
                                    <div className="flex items-center justify-between gap-2 text-xs sm:text-[13px]">
                                      <span
                                        className="truncate font-semibold text-slate-800 dark:text-slate-200"
                                        title={cleanDesc}
                                      >
                                        {cleanDesc}
                                      </span>
                                      {showDropdown ? (
                                        <button
                                          type="button"
                                          onClick={(e) => toggleExpand(rep._id, idx, isGroup, e, entries)}
                                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#111c18] transition-all cursor-pointer shrink-0"
                                          title="Expand description"
                                        >
                                          <ChevronDown size={14} className="transition-transform duration-200" />
                                        </button>
                                      ) : (
                                        <div className="w-[22px] shrink-0" />
                                      )}
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
                                        {showDropdown && (
                                          <button
                                            type="button"
                                            onClick={(e) => toggleExpand(rep._id, idx, isGroup, e, entries)}
                                            className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-[#1a2d29] transition-all cursor-pointer shrink-0 mt-0.5"
                                            title="Collapse description"
                                          >
                                            <ChevronDown size={14} className="rotate-180 transition-transform duration-200" />
                                          </button>
                                        )}
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
                                      {rep.editRequest?.status === 'pending' && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping mr-1" title="Edit Access Requested" />
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedReport(rep);
                                          setExpandedTasks({});
                                        }}
                                        className="p-2 rounded-xl bg-slate-100 dark:bg-[#111c18] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                                        title="View Full Report Details"
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

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 py-4 mt-4 bg-white dark:bg-[#111c18] border-t border-slate-100 dark:border-[#1a2d29] rounded-b-2xl gap-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Showing {summary.totalReports === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, summary.totalReports || (page * PAGE_SIZE))} of {summary.totalReports || reports.length} reports
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage(p => Math.max(1, p - 1));
                      const el = document.getElementById('dailyReportTableContainer');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1a2d29] bg-white dark:bg-[#162722] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#00a76b] hover:text-[#00a76b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                  >
                    Prev
                  </button>

                  {getPageNumbers(page, totalPages).map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span key={`team-ellipsis-${idx}`} className="px-1.5 text-slate-400 font-bold text-xs">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setPage(item);
                          const el = document.getElementById('dailyReportTableContainer');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all border ${
                          page === item
                            ? 'bg-[#00a76b] text-white border-[#00a76b] shadow-xs'
                            : 'bg-white dark:bg-[#162722] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1a2d29] hover:border-[#00a76b] hover:text-[#00a76b] cursor-pointer'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => {
                      setPage(p => Math.min(totalPages, p + 1));
                      const el = document.getElementById('dailyReportTableContainer');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1a2d29] bg-white dark:bg-[#162722] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#00a76b] hover:text-[#00a76b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
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
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <form id="dailyReportHRDrawerForm" onSubmit={handleSubmit} noValidate className="space-y-4">
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
                      if (editingReport) return false;
                      return myReports.some(r => r.reportDate === d);
                    }}
                  />
                  {editingReport ? (
                    <div className="mt-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-[11px]">
                      <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                      <span>Editing existing daily report for {formData.reportDate}.</span>
                    </div>
                  ) : myReports.some(r => r.reportDate === formData.reportDate) ? (
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
                    options={projectOptions}
                    value={formData.selectedProjects || []}
                    onChange={handleProjectsChange}
                    placeholder="Select project..."
                    canManage={true}
                    onProjectsUpdated={(newProjects) => setProjectOptions(newProjects)}
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
            <div className="p-4 border-t border-slate-100 dark:border-[#1a2d29] bg-slate-50/50 dark:bg-[#111c18]/50 shrink-0">
              <button
                type="submit"
                form="dailyReportHRDrawerForm"
                disabled={isSubmitting || (!editingReport && myReports.some(r => r.reportDate === formData.reportDate))}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>
                  {isSubmitting
                    ? (editingReport ? 'Saving...' : 'Submitting...')
                    : (!editingReport && myReports.some(r => r.reportDate === formData.reportDate))
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
              {/* Employee Info Card - Only shown when viewing team reports, hidden in my report view */}
              {viewTab === 'team' && (
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
              )}

              {/* Edit Access Request Review Card (Higher Authority view with Right / Wrong icons) */}
              {selectedReport.editRequest?.status === 'pending' && (
                <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/70 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                        <Clock size={16} />
                      </div>
                      <div>
                        <span className="font-extrabold text-xs text-amber-950 dark:text-amber-100 block">
                          Edit Access Requested
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">
                          Cutoff time expired (11:59 PM)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                      Pending Review
                    </span>
                  </div>

                  {selectedReport.editRequest.reason && (
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#111c18]/80 border border-amber-200 dark:border-amber-800/60 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-amber-900 dark:text-amber-300 mr-1">Reason:</span>
                      {selectedReport.editRequest.reason}
                    </div>
                  )}

                  {viewTab === 'team' ? (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                      <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                        Approve or decline request:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={reviewingEdit}
                          onClick={() => handleReviewEdit(selectedReport._id, 'reject')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                          title="Reject Request (Wrong Icon)"
                        >
                          <X size={15} className="stroke-[3]" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          disabled={reviewingEdit}
                          onClick={() => handleReviewEdit(selectedReport._id, 'approve')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          title="Approve Request (Right Icon)"
                        >
                          <Check size={16} className="stroke-[3]" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Your request is currently awaiting review by the higher authority.
                    </p>
                  )}
                </div>
              )}

              {selectedReport.editRequest?.status === 'approved' && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-bold">Edit access has been approved for this report.</span>
                  </div>
                </div>
              )}

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
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block mb-2">Work That Was Done</span>
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

            {/* Drawer Footer (Only render if there are actions in 'my' tab) */}
            {viewTab === 'my' && (
              <div className="p-5 border-t border-slate-100 dark:border-[#1a2d29] bg-slate-50/50 dark:bg-[#111c18]/50 flex items-center justify-start shrink-0">
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
            )}
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
                Direct editing of daily reports is only permitted until 11:59 PM of the report date. To update this report, please submit a request to higher authority.
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

      {/* ── EXPORT FILTER MODAL ── */}
      <ExportFilterModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={`Export Daily Reports (${viewTab === 'team' ? (currentUser?.role === 'manager' ? 'Team Reports' : 'All Employee Reports') : 'My Daily Reports'})`}
        subtitle="Filter daily work reports and choose which columns and format (CSV, Excel, PDF) to export."
        allData={viewTab === 'team' ? reports : myReports}
        filteredData={viewTab === 'team' ? reports : filteredMyReports}
        columns={dailyReportExportColumns}
        customFilters={dailyReportExportFilters}
        defaultFilename={`daily_reports_${viewTab}`}
      />
    </div>
  );
};

export default DailyReportHR;
