import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Briefcase,
  Users,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  Edit,
  Copy,
  Eye,
  X,
  XCircle,
  MoreVertical,
  AlertCircle,
  Calendar,
  DollarSign,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import ExportFilterModal from '@shared/components/ExportFilterModal';

const PIPELINE_STAGES = [
  { label: 'Sourced', count: 84, progress: 84 },
  { label: 'Screening', count: 32, progress: 32 },
  { label: 'Interview', count: 18, progress: 18 },
  { label: 'Offer', count: 6, progress: 6 },
  { label: 'Hired', count: 3, progress: 3 }
];

const SAMPLE_JOBS = [
  {
    _id: 'sample-job-1',
    title: 'Senior React Developer',
    department: 'Engineering',
    type: 'Full-time',
    location: 'Remote, US',
    applicants: 42,
    hiringManager: 'Marcus Lee',
    datePosted: '2026-06-01',
    deadline: '2026-08-01',
    salaryRange: '$120,000 - $140,000',
    status: 'Open',
    description: 'We are looking for a Senior React Developer to join our team and help build the next generation of our HR platforms.',
    requirements: ['5+ years of experience with React', 'Experience with TailwindCSS & Node.js', 'Excellent communication skills']
  },
  {
    _id: 'sample-job-2',
    title: 'HR Generalist',
    department: 'HR',
    type: 'Full-time',
    location: 'New York, NY',
    applicants: 18,
    hiringManager: 'Priya Sharma',
    datePosted: '2026-06-15',
    deadline: '2026-07-30',
    salaryRange: '$75,000 - $85,000',
    status: 'Open',
    description: 'Seeking an HR Generalist to manage employee relations, onboarding, and compliance.',
    requirements: ['3+ years in HR role', 'Knowledge of labor laws', 'SHRM certification is a plus']
  },
  {
    _id: 'sample-job-3',
    title: 'UI/UX Designer',
    department: 'Design',
    type: 'Contract',
    location: 'Remote, Europe',
    applicants: 29,
    hiringManager: 'Sara Lopez',
    datePosted: '2026-06-10',
    deadline: '2026-07-25',
    salaryRange: '$60 - $80 / hour',
    status: 'Open',
    description: 'Join us for a 6-month contract to redesign our mobile application interface.',
    requirements: ['Strong Figma portfolio', 'Experience with design systems', 'Prototyping skills']
  },
  {
    _id: 'sample-job-4',
    title: 'DevOps Engineer',
    department: 'Engineering',
    type: 'Full-time',
    location: 'San Francisco, CA',
    applicants: 15,
    hiringManager: 'Emma Wilson',
    datePosted: '2026-06-05',
    deadline: '2026-07-15',
    salaryRange: '$140,000 - $160,000',
    status: 'On Hold',
    description: 'Manage our AWS infrastructure and CI/CD pipelines.',
    requirements: ['AWS Certified', 'Terraform and Kubernetes experience', 'Linux administration']
  },
  {
    _id: 'sample-job-5',
    title: 'Product Marketing Manager',
    department: 'Marketing',
    type: 'Full-time',
    location: 'Remote, US',
    applicants: 54,
    hiringManager: 'Sophie Turner',
    datePosted: '2026-05-20',
    deadline: '2026-06-30',
    salaryRange: '$110,000 - $125,000',
    status: 'Closed',
    description: 'Lead the go-to-market strategy for our new enterprise HR product line.',
    requirements: ['Product marketing experience in SaaS', 'Strong writing and analytics skills']
  }
];

const STATUS_COLORS = {
  Open: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
  Closed: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border-red-100 dark:border-red-800',
  'On Hold': 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-800'
};

const Recruitment = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showExportModal, setShowExportModal] = useState(false);
  const [sortBy, setSortBy] = useState('datePosted');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form input state
  const [formInputs, setFormInputs] = useState({
    title: '',
    department: '',
    type: 'Full-time',
    location: '',
    hiringManager: '',
    deadline: '',
    salaryRange: '',
    status: 'Open',
    description: '',
    requirements: ''
  });

  const getHeaders = () => {
    const token = sessionStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/jobs', getHeaders());
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (data.length > 0) {
        setJobs(data);
      } else {
        setJobs(SAMPLE_JOBS);
      }
    } catch (err) {
      console.warn('API error, falling back to sample jobs:', err.message);
      setJobs(SAMPLE_JOBS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const openCount = jobs.filter(j => j.status === 'Open').length;
    return [
      { label: 'Open jobs', value: openCount, icon: Briefcase, color: '#00a76b', bg: 'rgba(0,167,107,0.08)' },
      { label: 'Active candidates', value: 143, icon: Users, color: '#2563eb', bg: 'rgba(37,99,235,0.08)', trend: '↑ 9%', isPositive: true },
      { label: 'Avg. time to hire', value: '22d', icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', trend: '↘ 3%', isPositive: false },
      { label: 'Hires this month', value: 6, icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.08)', trend: '↑ 20%', isPositive: true }
    ];
  }, [jobs]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(jobs.map(j => j.department));
    return ['All', ...Array.from(depts)];
  }, [jobs]);

  // Handle Action: Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job opening?')) return;
    try {
      await axios.delete(`/api/jobs/${id}`, getHeaders());
      toast.success('Job opening deleted successfully');
      fetchJobs();
    } catch (err) {
      // Fallback local state delete if API is not working or using mock
      setJobs(prev => prev.filter(j => j._id !== id));
      toast.success('Job opening deleted (Local state)');
    }
  };

  // Handle Action: Close position
  const handleClosePosition = async (id) => {
    try {
      await axios.put(`/api/jobs/${id}`, { status: 'Closed' }, getHeaders());
      toast.success('Job position closed');
      fetchJobs();
    } catch (err) {
      setJobs(prev => prev.map(j => j._id === id ? { ...j, status: 'Closed' } : j));
      toast.success('Job position closed (Local state)');
    }
  };

  // Handle Action: Duplicate
  const handleDuplicate = async (id) => {
    try {
      await axios.post(`/api/jobs/${id}/duplicate`, {}, getHeaders());
      toast.success('Job opening duplicated successfully');
      fetchJobs();
    } catch (err) {
      const original = jobs.find(j => j._id === id);
      if (original) {
        const copy = {
          ...original,
          _id: `dup-${Date.now()}`,
          title: `${original.title} (Copy)`,
          applicants: 0,
          status: 'Open',
          datePosted: new Date().toISOString().split('T')[0]
        };
        setJobs(prev => [copy, ...prev]);
        toast.success('Job opening duplicated (Local state)');
      }
    }
  };

  // Form submits (Create / Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const requirementsArray = formInputs.requirements
      ? formInputs.requirements.split('\n').filter(r => r.trim() !== '')
      : [];

    const jobData = {
      ...formInputs,
      requirements: requirementsArray
    };

    try {
      if (isEditing && selectedJob) {
        await axios.put(`/api/jobs/${selectedJob._id}`, jobData, getHeaders());
        toast.success('Job opening updated successfully');
      } else {
        await axios.post('/api/jobs', jobData, getHeaders());
        toast.success('New job opening created successfully');
      }
      setIsFormOpen(false);
      fetchJobs();
    } catch (err) {
      if (isEditing && selectedJob) {
        setJobs(prev => prev.map(j => j._id === selectedJob._id ? { ...j, ...jobData } : j));
        toast.success('Job opening updated (Local state)');
      } else {
        const newJob = {
          ...jobData,
          _id: `local-${Date.now()}`,
          applicants: 0,
          datePosted: new Date().toISOString().split('T')[0]
        };
        setJobs(prev => [newJob, ...prev]);
        toast.success('New job opening created (Local state)');
      }
      setIsFormOpen(false);
    }
  };

  // Open creation form
  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedJob(null);
    setFormInputs({
      title: '',
      department: '',
      type: 'Full-time',
      location: '',
      hiringManager: '',
      deadline: '',
      salaryRange: '',
      status: 'Open',
      description: '',
      requirements: ''
    });
    setIsFormOpen(true);
  };

  // Open edit form
  const openEditModal = (job) => {
    setIsEditing(true);
    setSelectedJob(job);
    setFormInputs({
      title: job.title || '',
      department: job.department || '',
      type: job.type || 'Full-time',
      location: job.location || '',
      hiringManager: job.hiringManager || '',
      deadline: job.deadline || '',
      salaryRange: job.salaryRange || '',
      status: job.status || 'Open',
      description: job.description || '',
      requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : ''
    });
    setIsFormOpen(true);
  };

  // Open view modal
  const openViewModal = (job) => {
    setSelectedJob(job);
    setIsViewOpen(true);
  };

  // Filter & Sort Logic
  const processedJobs = useMemo(() => {
    let list = [...jobs];

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.department.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.hiringManager.toLowerCase().includes(q)
      );
    }

    // Department Filter
    if (deptFilter !== 'All') {
      list = list.filter(j => j.department === deptFilter);
    }

    // Status Filter
    if (statusFilter !== 'All') {
      list = list.filter(j => j.status === statusFilter);
    }

    // Sorting
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'applicants') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [jobs, searchQuery, deptFilter, statusFilter, sortBy, sortOrder]);

  // Pagination Logic
  const totalPages = Math.ceil(processedJobs.length / pageSize);
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedJobs.slice(startIndex, startIndex + pageSize);
  }, [processedJobs, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, deptFilter, statusFilter]);

  // Export configuration
  const recruitmentExportColumns = [
    { key: 'title', label: 'Job Title', defaultSelected: true, getValue: (j) => j.title || 'N/A' },
    { key: 'department', label: 'Department', defaultSelected: true, getValue: (j) => j.department || 'N/A' },
    { key: 'type', label: 'Type', defaultSelected: true, getValue: (j) => j.type || 'N/A' },
    { key: 'location', label: 'Location', defaultSelected: true, getValue: (j) => j.location || 'N/A' },
    { key: 'applicants', label: 'Applicants', defaultSelected: true, getValue: (j) => j.applicants ?? 0 },
    { key: 'hiringManager', label: 'Hiring Manager', defaultSelected: true, getValue: (j) => j.hiringManager || 'N/A' },
    { key: 'salaryRange', label: 'Salary Range', defaultSelected: false, getValue: (j) => j.salaryRange || 'N/A' },
    { key: 'status', label: 'Status', defaultSelected: true, getValue: (j) => j.status || 'Open' },
    { key: 'deadline', label: 'Deadline', defaultSelected: true, getValue: (j) => j.deadline || 'N/A' }
  ];

  const recruitmentExportFilters = [
    {
      key: 'status',
      label: 'Status',
      getItemValue: (j) => (j.status || '').toLowerCase(),
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
        { label: 'On Hold', value: 'on hold' }
      ]
    }
  ];

  return (
    <div className="animate-fade-in max-w-[1440px] mx-auto space-y-8 pb-32">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-[#e2eae7] dark:border-[#1a2d29] pb-8 gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-none">Recruitment</h1>
          <p className="text-sm text-slate-500 dark:text-[#a3b3af] mt-2 font-medium">Pipeline, openings and candidates.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 border border-[#dcdbd3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] hover:bg-[#eceae3]/50 dark:hover:bg-slate-800/50 text-[#5c5f5d] dark:text-[#cbd5e1] font-bold text-xs rounded-full cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-full cursor-pointer transition-all flex items-center gap-1.5 shadow-sm border-none"
          >
            <Plus size={14} />
            <span>New job</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[140px] transition-all"
            >
              <div className="flex justify-between items-start">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: metric.bg, color: metric.color }}
                >
                  <Icon size={18} />
                </div>
                {metric.trend && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      metric.isPositive
                        ? 'bg-[#e6f6f0] text-[#00a76b] dark:bg-[#0e271f] dark:text-[#00c285]'
                        : 'bg-[#feebeb] text-[#dc2626] dark:bg-[#2d1212] dark:text-[#ff6b6b]'
                    }`}
                  >
                    {metric.trend}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-[28px] font-bold text-slate-900 dark:text-white leading-none mb-1.5">{metric.value}</h3>
                <p className="text-[13px] font-semibold text-slate-400 dark:text-[#a3b3af] uppercase tracking-wider">{metric.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Candidate Pipeline Card */}
      <div className="bg-white dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <h2 className="text-[16px] font-bold text-slate-900 dark:text-white mb-6">Candidate pipeline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PIPELINE_STAGES.map((stage, i) => (
            <div
              key={i}
              className="bg-[#fcfcfa] dark:bg-[#111c18]/40 border border-[#e2eae7] dark:border-[#1a2d29] p-5 rounded-[20px] transition-all flex flex-col justify-between h-[110px]"
            >
              <div>
                <p className="text-[12px] font-semibold text-slate-400 dark:text-[#a3b3af] uppercase tracking-wider mb-2">{stage.label}</p>
                <p className="text-[18px] font-bold text-slate-900 dark:text-white leading-none">{stage.count}</p>
              </div>
              <div className="w-full bg-[#eceae3] dark:bg-[#1a2d29] h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-[#00a76b] h-full rounded-full transition-all"
                  style={{ width: `${stage.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Open Positions Section */}
      <div className="bg-white dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#e2eae7] dark:border-[#1a2d29] pb-4">
          <div>
            <h2 className="text-[18px] font-bold text-slate-900 dark:text-white tracking-tight">Open Positions</h2>
            <p className="text-xs text-[#829e92] dark:text-[#a3b3af] font-semibold mt-1">Manage and track company job listings.</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-full cursor-pointer transition-all flex items-center gap-1.5 shadow-sm border-none ml-auto md:ml-0"
          >
            <Plus size={14} />
            <span>Create Position</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by job title, manager, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-[#111c18]/80 border border-[#e2eae7] dark:border-[#1a2d29] rounded-full text-sm font-semibold text-slate-700 dark:text-[#a3b3af] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-[#829e92] uppercase">Dept:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-4 py-2 rounded-full border border-[#e2eae7] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-xs font-bold text-[#5c5f5d] dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                {departments.map((d, idx) => (
                  <option key={idx} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-[#829e92] uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-full border border-[#e2eae7] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-xs font-bold text-[#5c5f5d] dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-[#829e92] uppercase">Sort:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-4 py-2 rounded-full border border-[#e2eae7] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-xs font-bold text-[#5c5f5d] dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="datePosted-desc">Date Posted (Newest)</option>
                <option value="datePosted-asc">Date Posted (Oldest)</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="applicants-desc">Most Applicants</option>
                <option value="applicants-asc">Least Applicants</option>
              </select>
            </div>
          </div>
        </div>

        {/* Jobs list / rows */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="text-[#00a76b] animate-spin" />
            <span className="text-xs font-bold text-slate-400 dark:text-[#829e92]">Loading positions...</span>
          </div>
        ) : processedJobs.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#e2eae7] dark:border-[#1a2d29] rounded-[20px]">
            <Briefcase size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-white">No open positions found</h3>
            <p className="text-xs text-[#829e92] dark:text-[#a3b3af] mt-1">Try modifying your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 text-[11px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">
              <div className="col-span-3">Job Title / Location</div>
              <div className="col-span-2">Department / Type</div>
              <div className="col-span-2">Manager</div>
              <div className="col-span-1 text-left">Applicants</div>
              <div className="col-span-1 text-left">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            <div className="space-y-3">
              {paginatedJobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-[#fcfcfa] dark:bg-[#111c18]/20 border border-[#e2eae7] dark:border-[#1a2d29] hover:bg-[#eceae3]/20 dark:hover:bg-[#162722]/30 p-5 rounded-[20px] transition-all flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start lg:items-center"
                >
                  {/* Title & Location */}
                  <div className="col-span-12 lg:col-span-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00a76b]/10 dark:bg-[#00a76b]/5 text-[#00a76b] flex items-center justify-center shrink-0">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <h4
                        onClick={() => openViewModal(job)}
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#00a76b] cursor-pointer transition-colors leading-tight"
                      >
                        {job.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#829e92] mt-1 font-semibold">
                        <MapPin size={12} />
                        <span>{job.location}</span>
                        {job.salaryRange && (
                          <>
                            <span className="mx-1">&bull;</span>
                            <DollarSign size={12} />
                            <span>{job.salaryRange}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Department & Type */}
                  <div className="col-span-6 lg:col-span-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{job.department}</span>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-[#829e92] mt-0.5 uppercase tracking-wider">{job.type}</div>
                  </div>

                  {/* Hiring Manager */}
                  <div className="col-span-6 lg:col-span-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#1a2d29] text-slate-500 dark:text-slate-400 text-[10px] font-black flex items-center justify-center">
                      {job.hiringManager.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{job.hiringManager}</span>
                      <div className="text-[10px] text-slate-400 dark:text-[#829e92] mt-0.5">Manager</div>
                    </div>
                  </div>

                  {/* Applicants Count */}
                  <div className="col-span-3 lg:col-span-1 text-left">
                    <span className="lg:hidden text-[11px] font-bold text-slate-400 dark:text-[#829e92] uppercase mr-2">Applicants:</span>
                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-[#1a2d29] rounded-lg text-slate-700 dark:text-slate-300">
                      {job.applicants || 0}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-3 lg:col-span-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                        STATUS_COLORS[job.status] || 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            job.status === 'Open' ? '#10b981' : job.status === 'Closed' ? '#ef4444' : '#f59e0b'
                        }}
                      />
                      {job.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-12 lg:col-span-3 flex items-center justify-end gap-2 w-full">
                    <button
                      onClick={() => openViewModal(job)}
                      title="View Details"
                      className="p-2 border border-[#dcdbd3] dark:border-[#1a2d29] hover:bg-[#eceae3]/50 dark:hover:bg-slate-800/50 text-[#5c5f5d] dark:text-[#cbd5e1] rounded-full transition-all cursor-pointer"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => openEditModal(job)}
                      title="Edit"
                      className="p-2 border border-[#dcdbd3] dark:border-[#1a2d29] hover:bg-[#eceae3]/50 dark:hover:bg-slate-800/50 text-[#5c5f5d] dark:text-[#cbd5e1] rounded-full transition-all cursor-pointer"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(job._id)}
                      title="Duplicate"
                      className="p-2 border border-[#dcdbd3] dark:border-[#1a2d29] hover:bg-[#eceae3]/50 dark:hover:bg-slate-800/50 text-[#5c5f5d] dark:text-[#cbd5e1] rounded-full transition-all cursor-pointer"
                    >
                      <Copy size={13} />
                    </button>
                    {job.status !== 'Closed' && (
                      <button
                        onClick={() => handleClosePosition(job._id)}
                        title="Close Position"
                        className="p-2 border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-full transition-all cursor-pointer"
                      >
                        <XCircle size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(job._id)}
                      title="Delete"
                      className="p-2 border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-full transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-[#e2eae7] dark:border-[#1a2d29]">
                <span className="text-xs font-semibold text-slate-400 dark:text-[#829e92]">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedJobs.length)} of {processedJobs.length} open positions
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-2 border border-[#dcdbd3] dark:border-[#1a2d29] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-2 border border-[#dcdbd3] dark:border-[#1a2d29] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Create / Edit Job Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] w-full max-w-2xl rounded-[32px] p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute right-6 top-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Job Opening' : 'Create Job Opening'}
              </h3>
              <p className="text-xs text-[#829e92] dark:text-[#a3b3af] font-semibold mt-1">
                {isEditing ? 'Update the details for this position.' : 'Fill in the information to publish a new position.'}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formInputs.title}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, title: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all"
                    placeholder="e.g. Senior Frontend Developer"
                  />
                </div>

                {/* Department */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Department *</label>
                  <input
                    type="text"
                    required
                    value={formInputs.department}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, department: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all"
                    placeholder="e.g. Engineering"
                  />
                </div>

                {/* Job Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Employment Type</label>
                  <select
                    value={formInputs.type}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, type: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white focus:outline-none cursor-pointer focus:bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                {/* Location */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Location *</label>
                  <input
                    type="text"
                    required
                    value={formInputs.location}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, location: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all"
                    placeholder="e.g. Remote, US or New York, NY"
                  />
                </div>

                {/* Hiring Manager */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Hiring Manager *</label>
                  <input
                    type="text"
                    required
                    value={formInputs.hiringManager}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, hiringManager: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all"
                    placeholder="e.g. Marcus Lee"
                  />
                </div>

                {/* Deadline */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Application Deadline *</label>
                  <input
                    type="date"
                    required
                    value={formInputs.deadline}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, deadline: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white"
                  />
                </div>

                {/* Salary Range */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Salary Range (Optional)</label>
                  <input
                    type="text"
                    value={formInputs.salaryRange}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, salaryRange: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all"
                    placeholder="e.g. $100,000 - $120,000"
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Job Status</label>
                  <select
                    value={formInputs.status}
                    onChange={(e) => setFormInputs(prev => ({ ...prev, status: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white focus:outline-none cursor-pointer focus:bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Description</label>
                <textarea
                  rows={3}
                  value={formInputs.description}
                  onChange={(e) => setFormInputs(prev => ({ ...prev, description: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all resize-none"
                  placeholder="Describe the job role and responsibilities..."
                />
              </div>

              {/* Requirements */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Requirements (One per line)</label>
                <textarea
                  rows={3}
                  value={formInputs.requirements}
                  onChange={(e) => setFormInputs(prev => ({ ...prev, requirements: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all resize-none"
                  placeholder="e.g. 3+ years experience with React&#10;Familiarity with REST APIs&#10;Excellent teamwork skills"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 border border-[#dcdbd3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-[#5c5f5d] dark:text-[#cbd5e1] font-bold text-xs rounded-full cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-full cursor-pointer transition-all border-none shadow-sm"
                >
                  {isEditing ? 'Save Changes' : 'Publish Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. View Details Modal */}
      {isViewOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] w-full max-w-xl rounded-[32px] p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsViewOpen(false)}
              className="absolute right-6 top-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-4">
              <div className="flex items-start gap-3 border-b border-[#e2eae7] dark:border-[#1a2d29] pb-4">
                <div className="w-12 h-12 rounded-full bg-[#00a76b]/10 dark:bg-[#00a76b]/5 text-[#00a76b] flex items-center justify-center shrink-0">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedJob.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      STATUS_COLORS[selectedJob.status] || 'bg-slate-50 text-slate-500'
                    }`}>
                      {selectedJob.status}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-[#829e92] font-semibold">
                      {selectedJob.department} &bull; {selectedJob.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold py-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 dark:text-[#829e92] uppercase tracking-wider block">Location</span>
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <MapPin size={13} className="text-slate-400" />
                    <span>{selectedJob.location}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 dark:text-[#829e92] uppercase tracking-wider block">Hiring Manager</span>
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <User size={13} className="text-slate-400" />
                    <span>{selectedJob.hiringManager}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 dark:text-[#829e92] uppercase tracking-wider block">Salary Range</span>
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <DollarSign size={13} className="text-slate-400" />
                    <span>{selectedJob.salaryRange || 'Not disclosed'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 dark:text-[#829e92] uppercase tracking-wider block">Application Deadline</span>
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{selectedJob.deadline || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 dark:text-[#829e92] uppercase tracking-wider block">Date Posted</span>
                  <div className="text-slate-800 dark:text-slate-200">{selectedJob.datePosted || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 dark:text-[#829e92] uppercase tracking-wider block">Total Applicants</span>
                  <div className="text-slate-800 dark:text-slate-200">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#1a2d29] rounded text-[11px] font-bold">
                      {selectedJob.applicants || 0} candidates
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedJob.description && (
                <div className="space-y-1.5 border-t border-[#e2eae7] dark:border-[#1a2d29] pt-4">
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">Job Description</h4>
                  <p className="text-xs text-slate-600 dark:text-[#cbd5e1] leading-relaxed">
                    {selectedJob.description}
                  </p>
                </div>
              )}

              {/* Requirements */}
              {Array.isArray(selectedJob.requirements) && selectedJob.requirements.length > 0 && (
                <div className="space-y-1.5 border-t border-[#e2eae7] dark:border-[#1a2d29] pt-4">
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-wider">Requirements</h4>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-[#cbd5e1] space-y-1">
                    {selectedJob.requirements.map((req, idx) => (
                      <li key={idx} className="leading-relaxed">{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-[#e2eae7] dark:border-[#1a2d29]">
                <button
                  type="button"
                  onClick={() => setIsViewOpen(false)}
                  className="px-5 py-2.5 border border-[#dcdbd3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-[#5c5f5d] dark:text-[#cbd5e1] font-bold text-xs rounded-full cursor-pointer transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewOpen(false);
                    openEditModal(selectedJob);
                  }}
                  className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-full cursor-pointer transition-all border-none shadow-sm flex items-center gap-1.5"
                >
                  <Edit size={12} />
                  <span>Edit Position</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Export Filter Modal */}
      <ExportFilterModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Recruitment Data"
        subtitle="Filter job openings and choose which fields to include in the export file."
        allData={jobs}
        filteredData={processedJobs}
        columns={recruitmentExportColumns}
        customFilters={recruitmentExportFilters}
        defaultFilename="recruitment_open_positions"
      />
    </div>
  );
};

export default Recruitment;
