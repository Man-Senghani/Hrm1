import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Trash2, Edit3, User, Eye, CheckCircle, XCircle, RefreshCw, Download, SlidersHorizontal, MoreHorizontal, Plus } from 'lucide-react';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';

const HREmployees = () => {
  const [dbEmployees, setDbEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('hr_searchTerm') || '');
  const [filterRole, setFilterRole] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('hr_filterRole')) || []; } catch { return []; }
  });
  const [filterStatus, setFilterStatus] = useState(() => {
    try { 
      const stored = sessionStorage.getItem('hr_filterStatus');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return []; 
    } catch { return []; }
  });
  const [tempFilterRole, setTempFilterRole] = useState([]);
  const [tempFilterStatus, setTempFilterStatus] = useState([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const filtersRef = useRef(null);
  const navigate = useNavigate();
  const pathRole = window.location.pathname.split('/')[1] || 'hr';

  const [currentPage, setCurrentPage] = useState(1);
  const [statusModal, setStatusModal] = useState({ isOpen: false, employee: null, targetStatus: '' });
  const [statusUpdating, setStatusUpdating] = useState(false);

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
    sessionStorage.setItem('hr_filterRole', JSON.stringify(filterRole));
    sessionStorage.setItem('hr_filterStatus', JSON.stringify(filterStatus));
  }, [searchTerm, filterRole, filterStatus]);

  const uniqueEmployees = Array.from(new Map(dbEmployees.map(emp => [emp._id, emp])).values());
  const filteredEmployees = uniqueEmployees.filter(emp => {
    const empRole = (emp.role || emp.userId?.role || '').toLowerCase();
    if (empRole === 'admin') return false;

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

    const matchesRole = filterRole.length > 0 && !filterRole.includes('all') ? (filterRole.includes(emp.role) || filterRole.includes(emp.userId?.role)) : true;
    const empStatus = emp.status?.toLowerCase() || emp.userId?.status?.toLowerCase() || 'active';
    const matchesStatus = filterStatus.length === 0 ? empStatus === 'active' : (filterStatus.includes('all') ? true : filterStatus.includes(empStatus));

    return matchesSearch && matchesRole && matchesStatus;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this employee? This will change their status to INACTIVE instead of permanently deleting the record.')) {
      try {
        const token = sessionStorage.getItem('token');
        await axios.delete(`/api/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        fetchEmployees();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleEdit = (id) => {
    if (id.startsWith('sample-')) {
      alert('Demo personnel records cannot be modified.');
      return;
    }
    navigate(`/employees/edit/${id}`);
  };

  const handleView = (id) => {
    if (id.startsWith('sample-')) {
      alert(`Viewing demo profile for ${id}`);
      return;
    }
    navigate(`/employees/view/${id}`);
  };

  const handleExportCSV = () => {
    const headers = ['Employee Name', 'Email', 'Department', 'Designation', 'Join Date', 'Status'];
    const rows = filteredEmployees.map(emp => [
      emp.fullName || emp.userId?.name || 'Anonymous',
      emp.email || emp.userId?.email || 'N/A',
      typeof emp.department === 'object' ? emp.department?.name : (emp.department || 'N/A'),
      typeof emp.designation === 'object' ? emp.designation?.name : (emp.designation || 'N/A'),
      formatDate(emp.joinDate),
      emp.status || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `employees_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
      const token = sessionStorage.getItem('token');
      const empId = statusModal.employee._id;
      const newStatus = statusModal.targetStatus;
      await axios.patch(`/api/employees/${empId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDbEmployees(prev => prev.map(e => e._id === empId ? { ...e, status: newStatus } : e));
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Failed to update employee status.');
    } finally {
      setStatusUpdating(false);
      setStatusModal({ isOpen: false, employee: null, targetStatus: '' });
    }
  };

  const renderStatusSwitch = (emp) => {
    const status = (emp.status || emp.userId?.status || 'active').toLowerCase();
    const isActive = status === 'active';
    return (
      <div className="flex items-center gap-2.5">
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

  const handleRoleToggle = (role) => {
    setTempFilterRole(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleStatusToggle = (status) => {
    setTempFilterStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleApplyFilters = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFilterRole(tempFilterRole);
    setFilterStatus(tempFilterStatus);
    setShowFiltersPanel(false);
  };

  const handleClearFilters = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTempFilterRole([]);
    setTempFilterStatus([]);
    setFilterRole([]);
    setFilterStatus([]);
    setShowFiltersPanel(false);
  };

  const activeFiltersCount = filterRole.length + filterStatus.length;

  return (
    <div className="animate-fade-in w-full pb-12">
      {/* 1. Page Title & Action Buttons Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-gray-900 dark:text-white leading-none">Employees</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">Directory of everyone in your company.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
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
                  setTempFilterRole(filterRole);
                  setTempFilterStatus(filterStatus);
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
                        <input type="checkbox" checked={tempFilterRole.includes('all')} onChange={() => handleRoleToggle('all')} className="accent-[#00a76b] cursor-pointer" />
                        All Roles
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={tempFilterRole.includes('hr')} onChange={() => handleRoleToggle('hr')} className="accent-[#00a76b] cursor-pointer" />
                        HR Officers
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={tempFilterRole.includes('manager')} onChange={() => handleRoleToggle('manager')} className="accent-[#00a76b] cursor-pointer" />
                        Managers
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={tempFilterRole.includes('employee')} onChange={() => handleRoleToggle('employee')} className="accent-[#00a76b] cursor-pointer" />
                        Employees
                      </label>
                    </div>
                  </div>
                  
                  <div className="w-px bg-gray-200 dark:bg-[#1a2d29] self-stretch"></div>
                  
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</h4>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={tempFilterStatus.includes('all')} onChange={() => handleStatusToggle('all')} className="accent-[#00a76b] cursor-pointer" />
                        All Statuses
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={tempFilterStatus.includes('active')} onChange={() => handleStatusToggle('active')} className="accent-[#00a76b] cursor-pointer" />
                        Active
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={tempFilterStatus.includes('inactive')} onChange={() => handleStatusToggle('inactive')} className="accent-[#00a76b] cursor-pointer" />
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
      <div className="bg-white dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="text-center py-20 bg-white dark:bg-[#111c18]">
            <RefreshCw size={24} className="text-[#00a76b] animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Syncing Employee Registry...</p>
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
                <tr className="border-b border-[#e2eae7] dark:border-[#1a2d29] bg-slate-100 dark:bg-[#0d2a22]">
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-[#e2eae7] dark:border-[#1a2d29] w-[130px] max-w-[130px]">EMPLOYEE ID</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-[#e2eae7] dark:border-[#1a2d29] w-[240px] max-w-[240px]">EMPLOYEE</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-[#e2eae7] dark:border-[#1a2d29]">DESIGNATION</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-[#e2eae7] dark:border-[#1a2d29]">JOIN DATE</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-[#e2eae7] dark:border-[#1a2d29]">STATUS</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2eae7] dark:divide-[#1a2d29]">
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
                      className="hover:bg-slate-50/60 dark:hover:bg-[#0d2a22]/50 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 border-r border-[#e2eae7] dark:border-[#1a2d29] w-[130px] max-w-[130px]">
                        <span className="font-bold text-slate-800 dark:text-gray-200 text-xs font-mono">{emp.employeeId || 'NODE-UNDEF'}</span>
                      </td>
                      <td className="py-3 px-4 border-r border-[#e2eae7] dark:border-[#1a2d29] w-[240px] max-w-[240px]">
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
                      <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-gray-300 border-r border-[#e2eae7] dark:border-[#1a2d29]">
                        {emp.designation || 'N/A'}
                      </td>
                      {/* Join Date */}
                      <td className="py-3 px-4 text-xs font-medium text-slate-600 dark:text-gray-400 border-r border-[#e2eae7] dark:border-[#1a2d29]">
                        {formatDate(emp.joinDate)}
                      </td>
                      {/* Status badge */}
                      <td className="py-3 px-4 border-r border-[#e2eae7] dark:border-[#1a2d29]" onClick={(e) => e.stopPropagation()}>
                        {renderStatusSwitch(emp)}
                      </td>
                      {/* Row-level action options */}
                      <td className="py-3 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(emp._id); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-800/50 transition-all cursor-pointer"
                            title="Delete Employee"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                <SlidersHorizontal size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Status Change</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Employee Account Control</p>
              </div>
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
    </div>
    </div>
  );
};

export default HREmployees;
