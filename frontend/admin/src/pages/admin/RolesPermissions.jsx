import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Shield, ShieldAlert, ShieldCheck, Users, Search, Plus, Download,
  Edit, Trash2, Copy, X, ArrowLeft, Check, CheckSquare, Square,
  Clock, ToggleLeft, ToggleRight, MoreVertical, AlertTriangle, RefreshCw
} from 'lucide-react';

const MODULES = [
  'Dashboard', 'Employees', 'Attendance', 'Leave', 'Payroll', 
  'Recruitment', 'Performance', 'Training', 'Reports', 'Departments', 
  'Designations', 'Roles & Permissions', 'Audit Logs', 'Integrations', 'Company Settings'
];

const PERMISSIONS = [
  'View', 'Create', 'Edit', 'Delete', 'Approve', 
  'Reject', 'Export', 'Import', 'Assign', 'Manage', 'Full Access'
];

const SAMPLE_ROLES = [
  {
    _id: 'sample-r-1',
    name: 'Super Admin',
    description: 'Full system access and configurations control.',
    usersCount: 2,
    status: 'Active',
    isSystem: true,
    tags: ['All access', 'Billing', 'Audit'],
    permissions: MODULES.reduce((acc, mod) => {
      acc[mod] = [...PERMISSIONS];
      return acc;
    }, {})
  },
  {
    _id: 'sample-r-2',
    name: 'HR Manager',
    description: 'Manage employees, recruitment, payroll and leaves.',
    usersCount: 5,
    status: 'Active',
    isSystem: true,
    tags: ['Employees', 'Leave', 'Recruitment', 'Reports'],
    permissions: {
      Dashboard: ['View'],
      Employees: ['View', 'Create', 'Edit', 'Export', 'Import'],
      Attendance: ['View', 'Edit', 'Approve', 'Reject', 'Export'],
      Leave: ['View', 'Approve', 'Reject'],
      Payroll: ['View', 'Create', 'Edit'],
      Recruitment: ['View', 'Create', 'Edit'],
      Performance: ['View', 'Edit'],
      Reports: ['View', 'Export']
    }
  },
  {
    _id: 'sample-r-3',
    name: 'Team Manager',
    description: 'Manage tasks and leaves for team members.',
    usersCount: 18,
    status: 'Active',
    isSystem: true,
    tags: ['Team', 'Approvals'],
    permissions: {
      Dashboard: ['View'],
      Employees: ['View'],
      Attendance: ['View', 'Approve', 'Reject'],
      Leave: ['View', 'Approve', 'Reject']
    }
  },
  {
    _id: 'sample-r-4',
    name: 'Employee',
    description: 'Self-service portal access for payroll and profile.',
    usersCount: 135,
    status: 'Active',
    isSystem: true,
    tags: ['Self-service'],
    permissions: {
      Dashboard: ['View'],
      Attendance: ['View'],
      Leave: ['View', 'Create']
    }
  }
];

const RolesPermissions = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Active view: 'list' or 'manage-permissions'
  const [activeView, setActiveView] = useState('list');
  const [editingRole, setEditingRole] = useState(null);

  // Modals state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isEditDetailsMode, setIsEditDetailsMode] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    tags: ''
  });

  const getHeaders = () => {
    const token = sessionStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/roles', getHeaders());
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (data.length > 0) {
        setRoles(data);
      } else {
        setRoles(SAMPLE_ROLES);
      }
    } catch (err) {
      console.warn('API error, falling back to mock roles:', err.message);
      setRoles(SAMPLE_ROLES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Handle Action: Toggle Status
  const handleToggleStatus = async (role) => {
    if (role.isSystem) {
      toast.error('System roles must always remain Active');
      return;
    }
    const nextStatus = role.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await axios.put(`/api/roles/${role._id}`, { status: nextStatus }, getHeaders());
      toast.success(`Role status changed to ${nextStatus}`);
      fetchRoles();
    } catch (err) {
      setRoles(prev => prev.map(r => r._id === role._id ? { ...r, status: nextStatus } : r));
      toast.success(`Role status changed to ${nextStatus} (Local)`);
    }
  };

  // Handle Action: Delete
  const handleDeleteRole = async (role) => {
    if (role.isSystem) {
      toast.error('System-default roles cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;
    
    try {
      await axios.delete(`/api/roles/${role._id}`, getHeaders());
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (err) {
      setRoles(prev => prev.filter(r => r._id !== role._id));
      toast.success('Role deleted (Local)');
    }
  };

  // Handle Action: Duplicate
  const handleDuplicateRole = async (role) => {
    try {
      await axios.post(`/api/roles/${role._id}/duplicate`, {}, getHeaders());
      toast.success('Role duplicated successfully');
      fetchRoles();
    } catch (err) {
      const copy = {
        ...role,
        _id: `dup-${Date.now()}`,
        name: `${role.name} (Copy)`,
        isSystem: false,
        usersCount: 0,
        createdAt: new Date().toISOString()
      };
      setRoles(prev => [...prev, copy]);
      toast.success('Role duplicated (Local)');
    }
  };

  // Handle Action: Create/Update details
  const handleRoleFormSubmit = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) return;

    const tagsArray = roleForm.tags
      ? roleForm.tags.split(',').map(t => t.trim()).filter(t => t !== '')
      : [];

    const roleData = {
      name: roleForm.name,
      description: roleForm.description,
      tags: tagsArray
    };

    try {
      if (isEditDetailsMode && editingRole) {
        await axios.put(`/api/roles/${editingRole._id}`, roleData, getHeaders());
        toast.success('Role updated successfully');
      } else {
        await axios.post('/api/roles', { ...roleData, permissions: {} }, getHeaders());
        toast.success('New role created successfully');
      }
      setIsRoleModalOpen(false);
      fetchRoles();
    } catch (err) {
      if (isEditDetailsMode && editingRole) {
        setRoles(prev => prev.map(r => r._id === editingRole._id ? { ...r, ...roleData } : r));
        toast.success('Role details updated (Local)');
      } else {
        const newR = {
          _id: `local-${Date.now()}`,
          ...roleData,
          usersCount: 0,
          status: 'Active',
          isSystem: false,
          permissions: {}
        };
        setRoles(prev => [...prev, newR]);
        toast.success('New role created (Local)');
      }
      setIsRoleModalOpen(false);
    }
  };

  // Save permissions modifications
  const handleSavePermissions = async () => {
    if (!editingRole) return;
    
    // Safety check: Don't allow clearing all permissions for Super Admin
    if (editingRole.name === 'Super Admin') {
      const superAdminPermissionsCount = Object.values(editingRole.permissions || {}).flat().length;
      if (superAdminPermissionsCount < 5) {
        toast.error('Safety Lock: You cannot disable critical permissions for Super Admin');
        return;
      }
    }

    try {
      await axios.put(`/api/roles/${editingRole._id}`, { permissions: editingRole.permissions }, getHeaders());
      toast.success('Role permissions synchronized successfully');
      setActiveView('list');
      fetchRoles();
    } catch (err) {
      setRoles(prev => prev.map(r => r._id === editingRole._id ? editingRole : r));
      toast.success('Permissions saved (Local)');
      setActiveView('list');
    }
  };

  // Permission management triggers
  const handlePermissionToggle = (module, permission) => {
    if (!editingRole) return;

    // Safety checks
    if (editingRole.name === 'Super Admin' && permission === 'Full Access') {
      toast.error('System Protection: Super Admin must retain full access privileges');
      return;
    }

    const currentPerms = { ...editingRole.permissions };
    const modulePerms = currentPerms[module] ? [...currentPerms[module]] : [];

    if (modulePerms.includes(permission)) {
      // Remove
      currentPerms[module] = modulePerms.filter(p => p !== permission);
    } else {
      // Add
      currentPerms[module] = [...modulePerms, permission];
    }

    setEditingRole(prev => ({
      ...prev,
      permissions: currentPerms
    }));
  };

  const handleSelectAllModulePermissions = (module, selectAll) => {
    if (!editingRole) return;
    if (editingRole.name === 'Super Admin' && !selectAll) {
      toast.error('System Protection: Super Admin must retain full access privileges');
      return;
    }

    const currentPerms = { ...editingRole.permissions };
    if (selectAll) {
      currentPerms[module] = [...PERMISSIONS];
    } else {
      currentPerms[module] = [];
    }

    setEditingRole(prev => ({
      ...prev,
      permissions: currentPerms
    }));
  };

  const handleExportRoles = () => {
    const headers = ['Role Name', 'Description', 'Users Assigned', 'Status', 'System Default'];
    const rows = processedRoles.map(r => [
      r.name,
      r.description || '',
      r.usersCount,
      r.status,
      r.isSystem ? 'Yes' : 'No'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "roles_permissions_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Roles structure exported successfully');
  };

  // Filter & Sort Logic
  const processedRoles = useMemo(() => {
    let list = [...roles];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        r.name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'All') {
      list = list.filter(r => r.status === statusFilter);
    }

    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'usersCount') {
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
  }, [roles, searchQuery, statusFilter, sortBy, sortOrder]);

  const openCreateModal = () => {
    setIsEditDetailsMode(false);
    setRoleForm({ name: '', description: '', tags: '' });
    setIsRoleModalOpen(true);
  };

  const openEditDetailsModal = (role) => {
    setIsEditDetailsMode(true);
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      tags: Array.isArray(role.tags) ? role.tags.join(', ') : ''
    });
    setIsRoleModalOpen(true);
  };

  return (
    <div className="animate-fade-in max-w-[1440px] mx-auto space-y-6 pb-20">
      
      {activeView === 'list' ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-[#e2eae7] dark:border-[#1a2d29] pb-8 gap-4">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-none">Roles & permissions</h1>
              <p className="text-sm text-slate-500 dark:text-[#a3b3af] mt-2 font-medium">Define what each role can do.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleExportRoles}
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
                <span>New role</span>
              </button>
            </div>
          </div>

          {/* Search bar & filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] rounded-full text-sm font-semibold text-slate-700 dark:text-[#a3b3af] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 dark:text-[#829e92] uppercase">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-full border border-[#e2eae7] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-xs font-bold text-[#5c5f5d] dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

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
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="usersCount-desc">Most Users</option>
                  <option value="usersCount-asc">Least Users</option>
                </select>
              </div>

              <button
                onClick={fetchRoles}
                className="w-9 h-9 border border-[#dcdbd3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] hover:bg-[#eceae3]/50 dark:hover:bg-slate-800/50 rounded-full flex items-center justify-center text-slate-500 dark:text-[#cbd5e1] cursor-pointer transition-all"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Roles Grid */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <RefreshCw size={24} className="text-[#00a76b] animate-spin" />
              <span className="text-xs font-bold text-slate-400">Loading roles registry...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {processedRoles.map((role) => (
                <div
                  key={role._id}
                  className="bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] rounded-[24px] p-6 flex flex-col justify-between hover:shadow-[0_4px_25px_rgba(0,0,0,0.015)] transition-all relative overflow-hidden group min-h-[180px]"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-md font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                          {role.name}
                          {role.isSystem && (
                            <span className="text-[10px] bg-slate-100 dark:bg-[#133029] text-slate-400 dark:text-[#829e92] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              System
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-[#829e92] dark:text-[#a3b3af] font-semibold mt-1">
                          {role.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Actions dropdown */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingRole(role);
                            setActiveView('manage-permissions');
                          }}
                          className="px-3 py-1.5 text-[11px] font-black uppercase bg-[#00a76b]/10 dark:bg-[#00a76b]/5 hover:bg-[#00a76b] text-[#00a76b] hover:text-white rounded-full transition-all cursor-pointer border-none font-bold"
                        >
                          Permissions
                        </button>
                        
                        <div className="relative group/menu">
                          <button className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400">
                            <MoreVertical size={14} />
                          </button>
                          <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] rounded-xl shadow-lg z-20 py-1 hidden group-hover/menu:block hover:block">
                            <button
                              onClick={() => openEditDetailsModal(role)}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 border-none bg-transparent"
                            >
                              <Edit size={12} />
                              <span>Edit Details</span>
                            </button>
                            <button
                              onClick={() => handleDuplicateRole(role)}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 border-none bg-transparent"
                            >
                              <Copy size={12} />
                              <span>Duplicate</span>
                            </button>
                            {!role.isSystem && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(role)}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 border-none bg-transparent"
                                >
                                  {role.status === 'Active' ? <ToggleRight size={12} className="text-emerald-500" /> : <ToggleLeft size={12} />}
                                  <span>{role.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteRole(role)}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1.5 border-none bg-transparent"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-[#829e92] font-semibold">
                      <Shield size={13} className="text-[#00a76b]" />
                      <span>{role.usersCount} users assigned</span>
                    </div>
                  </div>

                  {/* Tags / Pills */}
                  {Array.isArray(role.tags) && role.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#e2eae7]/50 dark:border-[#133029]/50">
                      {role.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 bg-slate-50 dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] rounded-full text-[10px] font-black text-slate-500 dark:text-[#a3b3af] uppercase tracking-wider"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Permission Management View */
        <div className="bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] rounded-[24px] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e2eae7] dark:border-[#1a2d29] pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView('list')}
                className="p-2 border border-[#dcdbd3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-[#5c5f5d] dark:text-[#cbd5e1] rounded-full hover:bg-slate-50 transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Manage Permissions:</span>
                  <span className="text-[#00a76b]">{editingRole?.name}</span>
                </h2>
                <p className="text-xs text-[#829e92] dark:text-[#a3b3af] font-semibold mt-0.5">
                  Configure granular control rules across all platform modules.
                </p>
              </div>
            </div>
            <div className="flex gap-3 ml-auto sm:ml-0">
              <button
                onClick={() => setActiveView('list')}
                className="px-4 py-2 border border-[#dcdbd3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-[#5c5f5d] dark:text-[#cbd5e1] font-bold text-xs rounded-full cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                className="px-4 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-full cursor-pointer transition-all border-none shadow-sm flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {/* Granular Permission Grid Table */}
          <div className="overflow-x-auto rounded-[20px] border border-[#e2eae7] dark:border-[#133029]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#0d2a22] border-b border-[#e2eae7] dark:border-[#133029]">
                  <th className="px-6 py-4 font-black uppercase text-slate-500 dark:text-[#829e92] tracking-wider w-52">
                    Module / Category
                  </th>
                  <th className="px-4 py-4 font-black uppercase text-slate-500 dark:text-[#829e92] tracking-wider text-center w-24 border-r border-[#e2eae7] dark:border-[#133029]">
                    Select All
                  </th>
                  {PERMISSIONS.map((perm) => (
                    <th key={perm} className="px-3 py-4 font-bold text-slate-500 dark:text-[#829e92] text-center min-w-[76px]">
                      {perm}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2eae7] dark:divide-[#133029]">
                {MODULES.map((mod) => {
                  const allowed = editingRole?.permissions?.[mod] || [];
                  const isAllSelected = PERMISSIONS.every(p => allowed.includes(p));

                  return (
                    <tr
                      key={mod}
                      className="hover:bg-slate-50/50 dark:hover:bg-[#0d2a22]/30 transition-colors"
                    >
                      {/* Module Title */}
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                        {mod}
                      </td>

                      {/* Select All Checkbox */}
                      <td className="px-4 py-4 text-center border-r border-[#e2eae7] dark:border-[#133029]">
                        <button
                          type="button"
                          onClick={() => handleSelectAllModulePermissions(mod, !isAllSelected)}
                          className="text-slate-400 hover:text-[#00a76b] transition-colors bg-transparent border-none p-0.5 cursor-pointer"
                        >
                          {isAllSelected ? (
                            <CheckSquare size={16} className="text-[#00a76b] mx-auto" />
                          ) : (
                            <Square size={16} className="mx-auto" />
                          )}
                        </button>
                      </td>

                      {/* Granular Permission Boxes */}
                      {PERMISSIONS.map((perm) => {
                        const isChecked = allowed.includes(perm);
                        return (
                          <td key={perm} className="px-3 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handlePermissionToggle(mod, perm)}
                              className="text-slate-400 hover:text-[#00a76b] transition-colors bg-transparent border-none p-0.5 cursor-pointer"
                            >
                              {isChecked ? (
                                <CheckSquare size={16} className="text-[#00a76b] mx-auto" />
                              ) : (
                                <Square size={16} className="mx-auto" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2eae7] dark:border-[#1a2d29]">
            <button
              onClick={() => setActiveView('list')}
              className="px-5 py-2.5 border border-[#dcdbd3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-[#5c5f5d] dark:text-[#cbd5e1] font-bold text-xs rounded-full cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePermissions}
              className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-full cursor-pointer transition-all border-none shadow-sm flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* Role Creation / Editing Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111c18] border border-[#e2eae7] dark:border-[#1a2d29] w-full max-w-lg rounded-[32px] p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsRoleModalOpen(false)}
              className="absolute right-6 top-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer border-none bg-transparent"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isEditDetailsMode ? 'Edit Role Details' : 'Create Custom Role'}
              </h3>
              <p className="text-xs text-[#829e92] dark:text-[#a3b3af] font-semibold mt-1">
                Configure basic identity metadata for this custom security level.
              </p>
            </div>

            <form onSubmit={handleRoleFormSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Role Name *</label>
                <input
                  type="text"
                  required
                  disabled={isEditDetailsMode && editingRole?.isSystem}
                  value={roleForm.name}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all disabled:opacity-50"
                  placeholder="e.g. Finance Admin"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Description</label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all resize-none"
                  placeholder="Describe the permissions level and role scope..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-[#829e92] uppercase">Tags / Labels (Comma separated)</label>
                <input
                  type="text"
                  value={roleForm.tags}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl border border-[#e2eae7] dark:border-[#1a2d29] bg-slate-50 dark:bg-[#111c18] text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:bg-white transition-all"
                  placeholder="e.g. Billing, Audit, Approvals"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-5 py-2.5 border border-[#dcdbd3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-[#5c5f5d] dark:text-[#cbd5e1] font-bold text-xs rounded-full cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-full cursor-pointer transition-all border-none shadow-sm"
                >
                  {isEditDetailsMode ? 'Save Details' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPermissions;
