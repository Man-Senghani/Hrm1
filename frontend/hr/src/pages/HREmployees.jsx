import React, { useState, useEffect, useRef } from 'react';
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
    navigate(`/${pathRole}/employees/edit/${id}`);
  };

  const handleView = (id) => {
    if (id.startsWith('sample-')) {
      alert(`Viewing demo profile for ${id}`);
      return;
    }
    navigate(`/${pathRole}/employees/view/${id}`);
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

  const renderStatusBadge = (status) => {
    const isActive = status.toLowerCase() === 'active';
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${isActive
        ? 'bg-[#e2f7ed] text-[#00875a] dark:bg-[#112a20] dark:text-[#3cd070]'
        : 'bg-[#f4f5f7] text-[#5e6c84] dark:bg-[#202528] dark:text-[#a0a5aa]'
        }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
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
            onClick={() => navigate(`/${pathRole}/create-user`)}
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
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e2eae7] dark:border-[#1a2d29] bg-[#f9fafb]/50 dark:bg-[#162722]/30">
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">EMPLOYEE ID</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">EMPLOYEE</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">DESIGNATION</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">JOIN DATE</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">STATUS</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-24 border border-[#c5c0b1] bg-[#fffdf9] rounded-[8px]">
                    <p className="text-[16px] font-medium text-[#939084]">No active personnel nodes matching filter.</p>
                  </td>
                </tr>
                ) : (
                paginatedEmployees.map((emp) => (
                <tr key={emp._id} className="border-b border-[#c5c0b1] hover:bg-slate-50/50 dark:hover:bg-[#0d2a22]/50 transition-colors group">
                  <td className="py-3 px-4">
                    <span className="font-bold text-[#201515]">{emp.employeeId || 'NODE-UNDEF'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#eceae3] border border-[#c5c0b1] rounded-[4px] flex items-center justify-center overflow-hidden">
                        {emp.profileImage ? <img src={getImageUrl(emp.profileImage)} alt="User" className="w-full h-full object-cover" /> : <User size={18} className="text-[#939084]" />}
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-[#201515] leading-none mb-2">{emp.fullName || emp.userId?.name || 'Anonymous Node'}</p>
                        <p className="text-[13px] font-medium text-[#939084] leading-none">{emp.email || emp.userId?.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Designation */}
                  <td className="py-3 px-6 text-sm text-gray-900 dark:text-gray-400">
                    {emp.designation}
                  </td>
                  {/* Join Date */}
                  <td className="py-3 px-6 text-sm text-gray-600 dark:text-gray-400 font-normal">
                    {formatDate(emp.joinDate)}
                  </td>
                  {/* Status badge */}
                  <td className="py-3 px-6">
                    {renderStatusBadge(emp.status)}
                  </td>
                  {/* Row-level dropdown options */}
                  <td className="py-3 px-6 text-right relative">
                    <div className="flex items-center justify-end gap-2">
                      <button
                      onClick={() => handleView(emp._id)}
                      className="zap-btn zap-btn-outline w-10 h-10 flex items-center justify-center p-0"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(emp._id)}
                      className="zap-btn zap-btn-outline w-10 h-10 flex items-center justify-center p-0"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(emp._id)}
                      className="zap-btn zap-btn-outline w-10 h-10 flex items-center justify-center p-0 text-[#ff4f00]"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
        )}

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-8 py-5 bg-gray-50 border-t border-[#eceae3]">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#939084]">
            Page {currentPage} of {totalPages} ({filteredEmployees.length} total nodes)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-[#eceae3] ${currentPage === 1 ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-white text-[#201515] hover:border-[#ff4f00] hover:text-[#ff4f00] cursor-pointer'}`}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => (
              <button
                key={pageNo}
                onClick={() => setCurrentPage(pageNo)}
                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all border ${currentPage === pageNo ? 'bg-[#ff4f00] text-white border-[#ff4f00]' : 'bg-white text-[#201515] border-[#eceae3] hover:border-[#ff4f00] hover:text-[#ff4f00] cursor-pointer'}`}
              >
                {pageNo}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-[#eceae3] ${currentPage === totalPages ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-white text-[#201515] hover:border-[#ff4f00] hover:text-[#ff4f00] cursor-pointer'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
    </div >
  );
};

export default HREmployees;
