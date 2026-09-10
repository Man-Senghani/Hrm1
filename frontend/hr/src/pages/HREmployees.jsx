import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Trash2, Edit3, User, Eye, CheckCircle, CheckCircle2, XCircle, RefreshCw, Download, SlidersHorizontal, MoreHorizontal, Plus, AlertTriangle } from 'lucide-react';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';
import ExportFilterModal from '@shared/components/ExportFilterModal';

const HREmployees = () => {
  const [dbEmployees, setDbEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('hr_searchTerm') || '');
  const [filterRole, setFilterRole] = useState(() => {
    try {
      const stored = sessionStorage.getItem('hr_filterRole_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return ['all'];
    } catch { return ['all']; }
  });
  const [filterStatus, setFilterStatus] = useState(() => {
    try { 
      const stored = sessionStorage.getItem('hr_filterStatus_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return ['all']; 
    } catch { return ['all']; }
  });
  const [tempFilterRole, setTempFilterRole] = useState(['hr', 'manager', 'employee']);
  const [tempFilterStatus, setTempFilterStatus] = useState(['active', 'inactive']);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const filtersRef = useRef(null);
  const navigate = useNavigate();
  const pathRole = window.location.pathname.split('/')[1] || 'hr';
  const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : {};
  const currentRole = (userObj.role || (window.location.pathname.startsWith('/manager') ? 'manager' : window.location.pathname.startsWith('/admin') ? 'admin' : 'hr')).toLowerCase();

  const [currentPage, setCurrentPage] = useState(1);
  const [statusModal, setStatusModal] = useState({ isOpen: false, employee: null, targetStatus: '' });
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, employee: null, isDeleting: false });
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, type: 'error', title: '', message: '' });
  const [showExportModal, setShowExportModal] = useState(false);

  const fetchEmployees = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDbEmployees(res.data || []);
    } catch (err) {
      console.error('Fetch employees failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowFiltersPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    sessionStorage.setItem('hr_searchTerm', searchTerm);
    sessionStorage.setItem('hr_filterRole_v2', JSON.stringify(filterRole));
    sessionStorage.setItem('hr_filterStatus_v2', JSON.stringify(filterStatus));
  }, [searchTerm, filterRole, filterStatus]);

  // Filter unique employees, ensuring admins are strictly excluded from HR scope
  const uniqueEmployees = Array.from(new Map(dbEmployees.map(emp => [emp._id, emp])).values())
    .filter(emp => {
      const empRole = (emp.role || emp.userId?.role || '').toLowerCase().trim();
      if (empRole.includes('admin')) return false;
      return true;
    });

  // Base scope for this page (respecting active status scope)
  const baseEmployees = uniqueEmployees.filter(emp => {
    const empStatus = (emp.status || emp.userId?.status || 'active').toLowerCase().trim();
    if (filterStatus.includes('all') || filterStatus.length === 0) return true;
    return filterStatus.map(s => s.toLowerCase().trim()).includes(empStatus);
  });

  const filteredEmployees = baseEmployees.filter(emp => {
    const fullName = emp.fullName?.toLowerCase() || emp.userId?.name?.toLowerCase() || '';
    const email = emp.email?.toLowerCase() || emp.userId?.email?.toLowerCase() || '';
    const empId = emp.employeeId?.toLowerCase() || '';
    const dept = emp.department?.toLowerCase() || '';
    const desig = emp.designation?.toLowerCase() || '';
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch = fullName.includes(search) ||
      email.includes(search) ||
      dept.includes(search) ||
      desig.includes(search) ||
      empId.includes(search);

    const empRole = (emp.role || emp.userId?.role || '').toLowerCase().trim();
    const matchesRole = filterRole.includes('all') || filterRole.length === 0
      ? true
      : filterRole.map(r => r.toLowerCase().trim()).includes(empRole);

    return matchesSearch && matchesRole;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDeleteClick = (emp) => {
    setDeleteModal({ isOpen: true, employee: emp, isDeleting: false });
  };

  const confirmDelete = async () => {
    if (!deleteModal.employee) return;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    const emp = deleteModal.employee;
    const id = emp._id || emp.id || emp.userId?._id;
    try {
      if (String(id).startsWith('sample-')) {
        setDbEmployees(prev => prev.filter(e => e._id !== id));
        return;
      }
      const token = sessionStorage.getItem('token');
      await axios.delete(`/api/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchEmployees();
    } catch (err) {
      console.error('Delete failed:', err);
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to remove employee.'
      });
    } finally {
      setDeleteModal({ isOpen: false, employee: null, isDeleting: false });
    }
  };

  const handleEdit = (id) => {
    if (id.startsWith('sample-')) {
      setFeedbackModal({ isOpen: true, type: 'error', title: 'Demo Record', message: 'Demo personnel records cannot be modified.' });
      return;
    }
    navigate(`/employees/edit/${id}`);
  };

  const handleView = (id) => {
    if (id.startsWith('sample-')) {
      setFeedbackModal({ isOpen: true, type: 'error', title: 'Demo Record', message: `Viewing demo profile for ${id}` });
      return;
    }
    navigate(`/employees/view/${id}`);
  };

  const employeeExportColumns = [
    { key: 'employeeId', label: 'Employee ID', defaultSelected: true, getValue: (emp) => emp.employeeId || emp.userId?.employeeId || 'EMP-UNDEF' },
    { key: 'fullName', label: 'Employee Name', defaultSelected: true, getValue: (emp) => emp.fullName || emp.userId?.name || 'Anonymous' },
    { key: 'email', label: 'Email Address', defaultSelected: true, getValue: (emp) => emp.email || emp.userId?.email || 'N/A' },
    { key: 'role', label: 'Role', defaultSelected: true, getValue: (emp) => (emp.role || emp.userId?.role || 'employee').toUpperCase() },
    { key: 'department', label: 'Department', defaultSelected: true, getValue: (emp) => typeof emp.department === 'object' ? emp.department?.name : (emp.department || 'N/A') },
    { key: 'designation', label: 'Designation', defaultSelected: true, getValue: (emp) => typeof emp.designation === 'object' ? emp.designation?.name : (emp.designation || 'N/A') },
    { key: 'joinDate', label: 'Joining Date', defaultSelected: true, getValue: (emp) => formatDate(emp.joinDate) },
    { key: 'status', label: 'Status', defaultSelected: true, getValue: (emp) => (emp.status || emp.userId?.status || 'active').toUpperCase() },
    { key: 'phone', label: 'Contact Phone', defaultSelected: false, getValue: (emp) => emp.phone || emp.mobile || emp.contactNumber || emp.personalDetails?.phone || 'N/A' }
  ];

  const employeeExportFilters = [
    {
      key: 'status',
      label: 'Status',
      getItemValue: (emp) => (emp.status || emp.userId?.status || 'active').toLowerCase(),
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' }
      ]
    },
    {
      key: 'role',
      label: 'Role',
      getItemValue: (emp) => (emp.role || emp.userId?.role || 'employee').toLowerCase(),
      options: [
        { label: 'HR', value: 'hr' },
        { label: 'Manager', value: 'manager' },
        { label: 'Employee', value: 'employee' }
      ]
    }
  ];

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayDesignation = (emp) => {
    const d = typeof emp.designation === 'object' ? emp.designation?.name : emp.designation;
    if (!d) return '';
    const trimmed = String(d).trim();
    if (['Employee', 'Associate', 'Staff Member', 'N/A', 'node-undef'].includes(trimmed)) {
      return '';
    }
    return trimmed;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parts = dateStr.split('T')[0].split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleToggleClick = (emp) => {
    const currentStatus = (emp.status || emp.userId?.status || 'active').toLowerCase();
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setStatusModal({ isOpen: true, employee: emp, targetStatus: newStatus });
  };

  const confirmStatusChange = async () => {
    if (!statusModal.employee) return;
    setStatusUpdating(true);
    try {
      const emp = statusModal.employee;
      const empId = emp._id || emp.id || emp.userId?._id;
      const newStatus = statusModal.targetStatus;
      
      if (String(empId).startsWith('sample-')) {
        setDbEmployees(prev => prev.map(e => (e._id === emp._id || e._id === empId || e.userId?._id === empId) ? { ...e, status: newStatus } : e));
        return;
      }

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      try {
        await axios.patch(`/api/employees/${empId}/status`, { status: newStatus }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (patchErr) {
        // Fallback to PUT in case reverse proxy or server environment restricts PATCH
        await axios.put(`/api/employees/${empId}/status`, { status: newStatus }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setDbEmployees(prev => prev.map(e => {
        const isMatch = (e._id === emp._id || e._id === empId || e.userId?._id === empId || e.id === empId);
        if (!isMatch) return e;
        return {
          ...e,
          status: newStatus,
          userId: typeof e.userId === 'object' && e.userId !== null
            ? { ...e.userId, status: newStatus }
            : e.userId
        };
      }));

      // Re-fetch to ensure full database synchronization
      fetchEmployees();

      setFeedbackModal({
        isOpen: true,
        type: 'success',
        title: 'Status Updated',
        message: `Employee status has been updated to ${newStatus.toUpperCase()} successfully.`
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Status Update Failed',
        message: err.response?.data?.message || 'Failed to update employee status.'
      });
    } finally {
      setStatusUpdating(false);
      setStatusModal({ isOpen: false, employee: null, targetStatus: '' });
    }
  };

  const renderStatusSwitch = (emp) => {
    const status = (emp.status || emp.userId?.status || 'active').toLowerCase();
    const isActive = status === 'active';
    return (
      <div 
        className="flex items-center gap-2.5 cursor-pointer select-none"
        onClick={(e) => { e.stopPropagation(); handleToggleClick(emp); }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleClick(emp); }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isActive ? 'bg-[#00a76b]' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          title={`Click to change status to ${isActive ? 'Inactive' : 'Active'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className={`text-xs font-semibold ${isActive ? 'text-[#00a76b]' : 'text-gray-500 dark:text-gray-400'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    );
  };

  const availableRoles = useMemo(() => ['hr', 'manager', 'employee'], []);
  const availableStatuses = useMemo(() => ['active', 'inactive'], []);

  const isAllRolesChecked = useMemo(() => {
    return availableRoles.length > 0 && availableRoles.every(r => tempFilterRole.includes(r));
  }, [tempFilterRole, availableRoles]);

  const isAllStatusesChecked = useMemo(() => {
    return availableStatuses.length > 0 && availableStatuses.every(s => tempFilterStatus.includes(s));
  }, [tempFilterStatus, availableStatuses]);

  const isRoleChecked = (role) => tempFilterRole.includes(role);

  const isStatusChecked = (status) => tempFilterStatus.includes(status);

  const handleRoleToggle = (role) => {
    if (role === 'all') {
      if (isAllRolesChecked) {
        setTempFilterRole([]);
      } else {
        setTempFilterRole([...availableRoles]);
      }
      return;
    }

    setTempFilterRole(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleStatusToggle = (status) => {
    if (status === 'all') {
      if (isAllStatusesChecked) {
        setTempFilterStatus([]);
      } else {
        setTempFilterStatus([...availableStatuses]);
      }
      return;
    }

    setTempFilterStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleApplyFilters = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const finalRole = isAllRolesChecked || tempFilterRole.length === 0 ? ['all'] : [...tempFilterRole];
    const finalStatus = isAllStatusesChecked || tempFilterStatus.length === 0 ? ['all'] : [...tempFilterStatus];
    setFilterRole(finalRole);
    setFilterStatus(finalStatus);
    setShowFiltersPanel(false);
  };

  const handleClearFilters = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTempFilterRole([...availableRoles]);
    setTempFilterStatus([...availableStatuses]);
    setFilterRole(['all']);
    setFilterStatus(['all']);
    setShowFiltersPanel(false);
  };

  const activeFiltersCount = (filterRole.length > 0 && !filterRole.includes('all') ? filterRole.length : 0) +
    (filterStatus.length > 0 && !filterStatus.includes('all') ? filterStatus.length : 0);

  return (
    <div className="animate-fade-in w-full pb-12">
      {/* 1. Page Title & Action Buttons Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-gray-900 dark:text-white leading-none">Employees</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">Directory of everyone in your company.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="verdant-btn-outline h-10 px-5 flex items-center gap-2 text-sm font-semibold rounded-full border border-gray-200 dark:border-[#1a2d29] bg-white dark:bg-[#111c18] hover:bg-gray-50 dark:hover:bg-[#162722] text-[#374151] dark:text-[#cbd5e1] transition-all shadow-sm cursor-pointer"
          >
            <Download size={15} />
            <span>Export</span>
          </button>
          <button
            onClick={() => navigate('/create-user')}
            className="verdant-btn-outline h-10 px-5 flex items-center gap-2 text-sm font-semibold rounded-full border border-gray-200 dark:border-[#1a2d29] bg-white dark:bg-[#111c18] hover:bg-gray-50 dark:hover:bg-[#162722] text-[#374151] dark:text-[#cbd5e1] transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Add employee</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Row */}
      <div className="w-full mb-6">
        <div className="flex gap-3 items-center w-full justify-between">
          <div className="relative w-full max-w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-[#111c18] border border-gray-200 dark:border-[#1a2d29] rounded-full text-sm font-medium focus:outline-none focus:border-[#00a76b] focus:ring-2 focus:ring-[#00a76b]/10 transition-all shadow-sm text-gray-800 dark:text-white"
            />
          </div>
          <div className="relative" ref={filtersRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!showFiltersPanel) {
                  setTempFilterRole(filterRole.includes('all') || filterRole.length === 0 ? [...availableRoles] : [...filterRole]);
                  setTempFilterStatus(filterStatus.includes('all') || filterStatus.length === 0 ? [...availableStatuses] : [...filterStatus]);
                }
                setShowFiltersPanel(!showFiltersPanel);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap ${showFiltersPanel
                ? 'bg-[#e2f7ed] border-[#00a76b] text-[#00a76b] dark:bg-[#162722] dark:border-[#00a76b]'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-[#111c18] dark:border-[#1a2d29] dark:text-[#cbd5e1] dark:hover:bg-[#162722]'
                }`}
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
            </button>
            
            {showFiltersPanel && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 p-4 bg-white dark:bg-[#162722] border border-gray-200 dark:border-[#1a2d29] rounded-[16px] shadow-lg flex flex-col gap-4 min-w-[340px] animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-row gap-6">
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Roles</h4>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={isAllRolesChecked} onChange={() => handleRoleToggle('all')} className="accent-[#00a76b] cursor-pointer" />
                        All Roles
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={isRoleChecked('hr')} onChange={() => handleRoleToggle('hr')} className="accent-[#00a76b] cursor-pointer" />
                        HR Officers
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={isRoleChecked('manager')} onChange={() => handleRoleToggle('manager')} className="accent-[#00a76b] cursor-pointer" />
                        Managers
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={isRoleChecked('employee')} onChange={() => handleRoleToggle('employee')} className="accent-[#00a76b] cursor-pointer" />
                        Employees
                      </label>
                    </div>
                  </div>
                  
                  <div className="w-px bg-gray-200 dark:bg-[#1a2d29] self-stretch"></div>
                  
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</h4>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={isAllStatusesChecked} onChange={() => handleStatusToggle('all')} className="accent-[#00a76b] cursor-pointer" />
                        All Statuses
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={isStatusChecked('active')} onChange={() => handleStatusToggle('active')} className="accent-[#00a76b] cursor-pointer" />
                        Active
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={isStatusChecked('inactive')} onChange={() => handleStatusToggle('inactive')} className="accent-[#00a76b] cursor-pointer" />
                        Inactive
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-2 pt-4 border-t border-gray-200 dark:border-[#1a2d29]">
                  <button type="button" onClick={handleApplyFilters} className="flex-1 bg-[#00a76b] hover:bg-[#008f5a] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer">Apply Filters</button>
                  <button type="button" onClick={handleClearFilters} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-[#111c18] dark:hover:bg-[#1a2d29] text-gray-700 dark:text-gray-300 text-xs font-bold py-2.5 rounded-lg transition-colors border border-gray-200 dark:border-[#1a2d29] cursor-pointer">Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Table Card Container */}
      <div className="bg-white dark:bg-[#111c18] border-2 border-slate-200 dark:border-[#1e3b32] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-20 bg-white dark:bg-[#111c18]">
            <RefreshCw size={24} className="text-[#00a76b] animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Loading Employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#111c18]">
            <div className="w-12 h-12 bg-gray-50 dark:bg-[#162722] rounded-full flex items-center justify-center mx-auto text-gray-400 dark:text-gray-500 mb-3">
              <User size={20} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No employees found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-[#1e3b32] bg-slate-100/90 dark:bg-[#0d2a22]">
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-slate-200 dark:border-[#1e3b32] w-[130px] max-w-[130px]">EMPLOYEE ID</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-slate-200 dark:border-[#1e3b32] w-[240px] max-w-[240px]">EMPLOYEE</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-slate-200 dark:border-[#1e3b32]">DESIGNATION</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-slate-200 dark:border-[#1e3b32]">DEPARTMENT</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-slate-200 dark:border-[#1e3b32]">JOIN DATE</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1e3b32]">
                {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-slate-400 dark:text-[#829e92] font-semibold text-xs">
                    No active personnel nodes matching filter.
                  </td>
                </tr>
                ) : (
                paginatedEmployees.map((emp) => {
                  const empName = emp.fullName || emp.userId?.name || 'Anonymous Node';
                  const initials = empName.split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EP';
                  return (
                    <tr
                      key={emp._id}
                      onClick={() => handleEdit(emp._id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#0d2a22]/70 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 border-r border-slate-200 dark:border-[#1e3b32] w-[130px] max-w-[130px]">
                        <span className="font-bold text-slate-800 dark:text-gray-200 text-xs font-mono">{emp.employeeId || 'NODE-UNDEF'}</span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 dark:border-[#1e3b32] w-[240px] max-w-[240px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 overflow-hidden">
                            {emp.profileImage ? (
                              <img src={getImageUrl(emp.profileImage)} alt="User" className="w-full h-full object-cover" />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00a76b] transition-colors leading-tight truncate">{empName}</p>
                            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-400 leading-tight truncate mt-0.5">{emp.role || emp.designation || emp.email || emp.userId?.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Designation */}
                      <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-gray-300 border-r border-slate-200 dark:border-[#1e3b32]">
                        {getDisplayDesignation(emp)}
                      </td>
                      {/* Department */}
                      <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-gray-300 border-r border-slate-200 dark:border-[#1e3b32]">
                        {typeof emp.department === 'object' ? emp.department?.name : (emp.department || '')}
                      </td>
                      {/* Join Date */}
                      <td className="py-3 px-4 text-xs font-medium text-slate-600 dark:text-gray-400 border-r border-slate-200 dark:border-[#1e3b32]">
                        {formatDate(emp.joinDate)}
                      </td>
                      {/* Status badge */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        {renderStatusSwitch(emp)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-white dark:bg-[#111c18] border-t border-[#e2eae7] dark:border-[#1a2d29] gap-4">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Showing {filteredEmployees.length === 0 ? 0 : (currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, filteredEmployees.length)} of {filteredEmployees.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-[#1a2d29] bg-white dark:bg-[#162722] text-gray-700 dark:text-gray-200 hover:border-[#00a76b] hover:text-[#00a76b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => (
              <button
                key={pageNo}
                onClick={() => setCurrentPage(pageNo)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all border ${
                  currentPage === pageNo
                    ? 'bg-[#00a76b] text-white border-[#00a76b] shadow-sm'
                    : 'bg-white dark:bg-[#162722] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#1a2d29] hover:border-[#00a76b] hover:text-[#00a76b] cursor-pointer'
                }`}
              >
                {pageNo}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-[#1a2d29] bg-white dark:bg-[#162722] text-gray-700 dark:text-gray-200 hover:border-[#00a76b] hover:text-[#00a76b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Status Confirmation Modal rendered via Portal to blur entire viewport including header & sidebar */}
      {statusModal.isOpen && statusModal.employee && createPortal(
        <div 
          className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setStatusModal({ isOpen: false, employee: null, targetStatus: '' })}
        >
          <div 
            className="bg-white dark:bg-[#162722] border border-gray-200 dark:border-[#1a2d29] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 relative z-[10000] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Status Change</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to make <span className="font-bold text-gray-900 dark:text-white">{statusModal.employee.fullName || statusModal.employee.userId?.name || 'this employee'}</span> <span className={`font-bold uppercase ${statusModal.targetStatus === 'active' ? 'text-[#00a76b]' : 'text-red-500'}`}>{statusModal.targetStatus}</span>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => setStatusModal({ isOpen: false, employee: null, targetStatus: '' })}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#111c18] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusUpdating}
                onClick={confirmStatusChange}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer ${
                  statusModal.targetStatus === 'active' 
                    ? 'bg-[#00a76b] hover:bg-[#008f5a]' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {statusUpdating ? 'Updating...' : `Yes, Make ${statusModal.targetStatus === 'active' ? 'Active' : 'Inactive'}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Stylish Delete Confirmation Modal Popup */}
      {deleteModal.isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in cursor-pointer"
          onClick={() => setDeleteModal({ isOpen: false, employee: null, isDeleting: false })}
        >
          <div 
            className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#1a2d29] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in text-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Remove Employee Account?
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#829e92] mt-1.5 leading-relaxed">
                Are you sure you want to remove <span className="font-semibold text-slate-700 dark:text-slate-200">{deleteModal.employee?.fullName || deleteModal.employee?.userId?.name || 'this employee'}</span>? This will mark their status as <span className="font-bold text-red-500">INACTIVE</span> instead of permanently deleting the record.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteModal.isDeleting}
                onClick={() => setDeleteModal({ isOpen: false, employee: null, isDeleting: false })}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#111c18] rounded-xl transition-colors cursor-pointer border-none bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteModal.isDeleting}
                onClick={confirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all cursor-pointer border-none"
              >
                {deleteModal.isDeleting ? 'Removing...' : 'Yes, Remove Employee'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Stylish Feedback Modal Popup */}
      {feedbackModal.isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in cursor-pointer"
          onClick={() => setFeedbackModal({ isOpen: false, type: 'error', title: '', message: '' })}
        >
          <div 
            className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#1a2d29] rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4 animate-scale-in cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${feedbackModal.type === 'error' ? 'bg-red-50 text-red-500 dark:bg-red-950/30' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30'}`}>
              {feedbackModal.type === 'error' ? (
                <AlertTriangle size={24} strokeWidth={2.5} />
              ) : (
                <CheckCircle2 size={24} strokeWidth={2.5} />
              )}
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {feedbackModal.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-[#829e92] mt-1">
                {feedbackModal.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackModal({ isOpen: false, type: 'error', title: '', message: '' })}
              className="w-full py-2.5 px-4 bg-[#00a76b] hover:bg-[#008f5b] text-white font-bold text-xs rounded-xl transition-all shadow-sm border-none cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
      {/* Export Filter Modal */}
      <ExportFilterModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Employee Directory"
        subtitle="Filter employee records and select columns to download."
        allData={baseEmployees}
        filteredData={filteredEmployees}
        columns={employeeExportColumns}
        customFilters={employeeExportFilters}
        defaultFilename="employee_directory"
      />
    </div>
    </div>
  );
};

export default HREmployees;
