import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Send, Loader2, Users, Briefcase, UserCheck, ChevronDown, Trash2, Edit2, RefreshCw, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  announcement: 'bg-orange-100 text-orange-600',
  task:         'bg-blue-100 text-blue-600',
  leave:        'bg-purple-100 text-purple-600',
  attendance:   'bg-green-100 text-green-600',
  emergency:    'bg-red-100 text-red-600',
  default:      'bg-gray-100 text-gray-600',
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);

  const [employees, setEmployees]         = useState([]);

  // form state
  const [form, setForm] = useState({ 
    message: '', 
    type: 'announcement', 
    targetRole: 'all', 
    targetUserId: '',
    specificRoleFilter: 'all',
    _targetRoleOpen: false,
    _roleFilterOpen: false,
    _empSelectOpen: false
  });
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const targetRoleRef = useRef(null);
  const roleFilterRef = useRef(null);
  const empSelectRef  = useRef(null);

  const token   = sessionStorage.getItem('token');
  const role    = sessionStorage.getItem('role') || 'admin';
  const headers = { Authorization: `Bearer ${token}` };
  const currentUserId = (() => { try { return JSON.parse(atob(token.split('.')[1]))?.id; } catch { return null; } })();

  // Click outside handler for custom dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (targetRoleRef.current && !targetRoleRef.current.contains(event.target)) {
        setForm(f => f._targetRoleOpen ? { ...f, _targetRoleOpen: false } : f);
      }
      if (roleFilterRef.current && !roleFilterRef.current.contains(event.target)) {
        setForm(f => f._roleFilterOpen ? { ...f, _roleFilterOpen: false } : f);
      }
      if (empSelectRef.current && !empSelectRef.current.contains(event.target)) {
        setForm(f => f._empSelectOpen ? { ...f, _empSelectOpen: false } : f);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── FETCH ── */
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res  = await axios.get('/api/notifications', { headers });
      const data = res.data?.notifications ?? res.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch notifications error:', err);
      toast.error('Could not load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchNotifications(); 
    const fetchEmployees = async () => {
      try {
        const res = await axios.get('/api/employees', { headers });
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Fetch employees error:', err);
      }
    };
    fetchEmployees();
  }, []);

  /* ── BACKGROUND REFRESH ── */
  const backgroundRefresh = async () => {
    try {
      const res  = await axios.get('/api/notifications', { headers });
      const data = res.data?.notifications ?? res.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Background refresh failed', err);
    }
  };

  /* ── DELETE NOTIFICATION ── */
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await axios.delete(`/api/notifications/${id}`, { headers });
      toast.success('Announcement deleted');
      backgroundRefresh();
    } catch (err) {
      toast.error('Failed to delete announcement');
    }
  };

  /* ── PREPARE EDIT ── */
  const handleEdit = (notif) => {
    setEditingId(notif._id);
    setIsModalOpen(true);
    setForm({ 
      ...form, 
      message: notif.message, 
      type: notif.type,
      targetRole: 'all' // Reset targeting info since it can't be easily reversed
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Editing mode active. Update the message below.', { icon: '✏️' });
  };

  /* ── SEND OR UPDATE ANNOUNCEMENT ── */
  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { toast.error('Please enter a message'); return; }
    if (!editingId && form.targetRole === 'specific' && !form.targetUserId) { toast.error('Please select an employee'); return; }
    
    setSending(true);
    try {
      if (editingId) {
        const res = await axios.put(`/api/notifications/${editingId}`, { message: form.message }, { headers });
        toast.success(res.data?.message || 'Announcement updated!');
        setEditingId(null);
        setForm({ message: '', type: 'announcement', targetRole: 'all', targetUserId: '', specificRoleFilter: 'all' });
        backgroundRefresh();
      } else {
        let targetLabel = 'All Employees';
        if (form.targetRole === 'specific') {
          const emp = employees.find(e => e.userId && e.userId._id === form.targetUserId);
          targetLabel = emp ? emp.userId.name : 'Specific Person';
        } else if (form.targetRole === 'employee') targetLabel = 'Employees Only';
        else if (form.targetRole === 'manager') targetLabel = 'Managers Only';
        else if (form.targetRole === 'hr') targetLabel = 'HR Only';
        else if (form.targetRole === 'admin') targetLabel = 'Admins Only';

        const payload = { ...form, targetLabel };

        const res = await axios.post('/api/notifications', payload, { headers });
        toast.success(res.data?.message || 'Announcement sent!');
        setForm({ message: '', type: 'announcement', targetRole: 'all', targetUserId: '', specificRoleFilter: 'all' });
        setIsModalOpen(false);
        backgroundRefresh(); // Use backgroundRefresh for new sends as well to be consistent
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process request');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-3 md:px-5 pb-20 pt-0 w-full">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4 w-full">
        <h1 className="text-[28px] font-black text-[#201515] dark:text-white tracking-tight">
          Notification
        </h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchNotifications} 
            className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-[5px] font-bold text-xs transition-all cursor-pointer border-none shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {role !== 'employee' && (
            <button 
              onClick={() => { setEditingId(null); setForm({ message: '', type: 'announcement', targetRole: 'all', targetUserId: '', specificRoleFilter: 'all' }); setIsModalOpen(true); }}
              className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-[5px] font-bold text-[13px] transition-all cursor-pointer border-none shadow-sm flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Create Announcement</span>
            </button>
          )}
        </div>
      </div>

      <div className="w-full">

        {/* ── SEND ANNOUNCEMENT MODAL ── */}
        {role !== 'employee' && isModalOpen && (
          <div className="fixed top-[70px] right-0 bottom-0 left-0 z-[140] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white border-l border-[#eceae3] shadow-2xl w-full max-w-[380px] h-full overflow-y-auto relative animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10 cursor-pointer border-none outline-none"
              >
                <X size={16} className="text-gray-600" />
              </button>
              <div className="p-4 border-b border-[#eceae3] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[12px] bg-[#00a76b] flex items-center justify-center">
                  <Send size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[14px] font-black text-[#201515]">Create Announcement</h2>
                  <p className="text-[11px] font-medium text-[#939084]">Send to employees by role</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSend} className="p-5 pb-6 space-y-4">
              {/* Target Role - Hide in edit mode */}
              {!editingId && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] mb-2">
                  Send To
                </label>
                <div ref={targetRoleRef} className="relative">
                  <div 
                    onClick={() => setForm(f => ({ ...f, _targetRoleOpen: !f._targetRoleOpen, _roleFilterOpen: false, _empSelectOpen: false }))}
                    className={`w-full bg-white border ${form._targetRoleOpen ? 'border-[#00a76b]' : 'border-[#eceae3]'} rounded-[12px] px-4 py-3 text-[13px] font-bold text-[#201515] cursor-pointer flex justify-between items-center transition-colors`}
                  >
                    <span>
                      {{
                        'all': 'All Employees',
                        'employee': 'Employees Only',
                        'manager': 'Managers Only',
                        'hr': 'HR Only',
                        'admin': 'Admins Only',
                        'specific': 'Specific Person'
                      }[form.targetRole]}
                    </span>
                    <ChevronDown size={14} className={`text-[#939084] transition-transform ${form._targetRoleOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {form._targetRoleOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#eceae3] rounded-[12px] shadow-lg overflow-hidden z-20">
                      {[
                        {v: 'all', l: 'All Employees'},
                        {v: 'employee', l: 'Employees Only'},
                        {v: 'manager', l: 'Managers Only'},
                        ...(role !== 'manager' ? [{v: 'hr', l: 'HR Only'}] : []),
                        ...(role === 'admin' ? [{v: 'admin', l: 'Admins Only'}] : []),
                        {v: 'specific', l: 'Specific Person'}
                      ].map(opt => (
                        <div 
                          key={opt.v}
                          onClick={() => setForm(f => ({ ...f, targetRole: opt.v, targetUserId: '', _targetRoleOpen: false }))}
                          className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${form.targetRole === opt.v ? 'bg-[#00a76b]/10 text-[#00a76b]' : 'text-[#201515] hover:bg-slate-50'}`}
                        >
                          {opt.l}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Specific Person Selection */}
              {!editingId && form.targetRole === 'specific' && (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] mb-2">
                    Select Employee
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Role Filter */}
                    <div ref={roleFilterRef} className="relative">
                      <div 
                        onClick={() => setForm(f => ({ ...f, _roleFilterOpen: !f._roleFilterOpen, _targetRoleOpen: false, _empSelectOpen: false }))}
                        className={`w-full bg-white border ${form._roleFilterOpen ? 'border-[#00a76b]' : 'border-[#eceae3]'} rounded-[12px] px-4 py-3 text-[13px] font-bold text-[#201515] cursor-pointer flex justify-between items-center transition-colors`}
                      >
                        <span>
                          {{
                            'all': 'Any Role',
                            'employee': 'Employees',
                            'manager': 'Managers',
                            'hr': 'HR',
                            'admin': 'Admins'
                          }[form.specificRoleFilter]}
                        </span>
                        <ChevronDown size={14} className={`text-[#939084] transition-transform ${form._roleFilterOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {form._roleFilterOpen && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#eceae3] rounded-[12px] shadow-lg overflow-hidden z-20">
                          {[
                            {v: 'all', l: 'Any Role'},
                            {v: 'employee', l: 'Employees'},
                            {v: 'manager', l: 'Managers'},
                            ...(role !== 'manager' ? [{v: 'hr', l: 'HR'}] : []),
                            ...(role === 'admin' ? [{v: 'admin', l: 'Admins'}] : [])
                          ].map(opt => (
                            <div 
                              key={opt.v}
                              onClick={() => setForm(f => ({ ...f, specificRoleFilter: opt.v, targetUserId: '', _roleFilterOpen: false }))}
                              className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${form.specificRoleFilter === opt.v ? 'bg-[#00a76b]/10 text-[#00a76b]' : 'text-[#201515] hover:bg-slate-50'}`}
                            >
                              {opt.l}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Employee Name Select */}
                    <div ref={empSelectRef} className="relative">
                      <div 
                        onClick={() => setForm(f => ({ ...f, _empSelectOpen: !f._empSelectOpen, _targetRoleOpen: false, _roleFilterOpen: false }))}
                        className={`w-full bg-white border ${form._empSelectOpen ? 'border-[#00a76b]' : 'border-[#eceae3]'} rounded-[12px] px-4 py-3 text-[13px] font-bold text-[#201515] cursor-pointer flex justify-between items-center transition-colors`}
                      >
                        <span className="truncate">
                          {form.targetUserId ? employees.find(e => e.userId && e.userId._id === form.targetUserId)?.userId?.name || '-- Name --' : '-- Name --'}
                        </span>
                        <ChevronDown size={14} className={`text-[#939084] shrink-0 ml-2 transition-transform ${form._empSelectOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {form._empSelectOpen && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#eceae3] rounded-[12px] shadow-lg overflow-hidden z-20 max-h-60 overflow-y-auto">
                          <div 
                            onClick={() => setForm(f => ({ ...f, targetUserId: '', _empSelectOpen: false }))}
                            className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${!form.targetUserId ? 'bg-[#00a76b]/10 text-[#00a76b]' : 'text-[#201515] hover:bg-slate-50'}`}
                          >
                            -- Name --
                          </div>
                          {employees
                            .filter(emp => emp.userId && (form.specificRoleFilter === 'all' || emp.userId.role === form.specificRoleFilter))
                            .filter(emp => role === 'admin' || emp.userId.role !== 'admin')
                            .map(emp => (
                              <div 
                                key={emp.userId._id}
                                onClick={() => setForm(f => ({ ...f, targetUserId: emp.userId._id, _empSelectOpen: false }))}
                                className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${form.targetUserId === emp.userId._id ? 'bg-[#00a76b]/10 text-[#00a76b]' : 'text-[#201515] hover:bg-slate-50'}`}
                              >
                                {emp.userId.name}
                              </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] mb-2">
                  Notification Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['announcement', 'task', 'leave', 'emergency'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`px-3 py-2 rounded-[12px] text-[11px] font-black uppercase tracking-wider border transition-all capitalize ${
                        form.type === t
                          ? 'bg-[#00a76b] text-white border-[#00a76b]'
                          : 'bg-white text-[#36342e] border-[#eceae3] hover:border-[#00a76b]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] mb-2">
                  Message
                </label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                  placeholder="Type your announcement here..."
                  className="w-full bg-white border border-[#eceae3] rounded-[12px] px-4 py-3 text-[13px] font-medium text-[#201515] placeholder-[#c5c0b1] focus:outline-none focus:border-[#00a76b] resize-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-[#00a76b] hover:bg-[#00915c] disabled:opacity-60 text-white px-6 py-3 rounded-[12px] font-black text-[13px] transition-all"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : editingId ? (
                  <Edit2 size={16} />
                ) : (
                  <Send size={16} />
                )}
                {sending ? 'Processing...' : editingId ? 'Update Announcement' : 'Send Announcement'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm({ message: '', type: 'announcement', targetRole: 'all', targetUserId: '', specificRoleFilter: 'all' }); setIsModalOpen(false); }}
                  className="w-full mt-2 flex items-center justify-center bg-[#00a76b] hover:bg-[#00915c] text-white px-6 py-3 rounded-[12px] font-black text-[13px] transition-all"
                >
                  Cancel Edit
                </button>
              )}
            </form>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS LIST ── */}
        <div className="w-full">
          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.01)] overflow-hidden">

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={36} className="animate-spin text-[#00a76b]" />
              </div>
            ) : (() => {
              // Apply manager specific filter
              const displayNotifications = role === 'manager' 
                ? notifications.filter(n => n.senderId === currentUserId)
                : notifications;

              if (displayNotifications.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mb-4">
                      <Bell size={28} className="text-[#00a76b]" />
                    </div>
                    <h3 className="text-[16px] font-bold text-slate-800 dark:text-white mb-2">No announcements found</h3>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-[#829e92]">Send an announcement using the form on the left</p>
                  </div>
                );
              }

              return (
                <div>
                  <div className="divide-y divide-[#e2eae7] dark:divide-[#13221e]">
                    {(() => {
                      const totalPages = Math.ceil(displayNotifications.length / itemsPerPage);
                      const indexOfLastItem = currentPage * itemsPerPage;
                      const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                      const currentItems = displayNotifications.slice(indexOfFirstItem, indexOfLastItem);
                      
                      return currentItems.map((notif) => {
                        const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.default;
                        const sId = notif.senderId?._id ? String(notif.senderId._id) : (notif.senderId ? String(notif.senderId) : '');
                        const isCreator = sId && sId === currentUserId;
                        const senderDisplayName = notif.senderName || notif.senderId?.name || (typeof notif.sender === 'string' ? notif.sender : (notif.sender?.name || 'HR / Management'));
                        const senderRole = notif.senderRole || notif.senderId?.role || notif.sender?.role || '';

                        return (
                          <div
                            key={notif._id}
                            className="py-3 px-5 flex items-center gap-4 transition-colors bg-white dark:bg-[#0c1512] hover:bg-slate-50 dark:hover:bg-[#111c18] group relative"
                          >
                            {/* Icon */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                              <Bell size={16} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-16 flex md:flex-row flex-col md:items-center justify-between gap-3">
                              <p className="text-[13px] leading-snug font-medium text-slate-800 dark:text-white">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap shrink-0">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${colorClass}`}>
                                  {notif.type || 'general'}
                                </span>

                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shadow-xs">
                                  <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase text-[9px]">By:</span>
                                  <span>{isCreator ? `${senderDisplayName} (You)` : senderDisplayName}</span>
                                  {senderRole && (
                                    <span className="text-[9px] font-black uppercase tracking-wider opacity-70">
                                      [{senderRole}]
                                    </span>
                                  )}
                                </span>

                                {isCreator && notif.targetLabel && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-[#1a2d29] text-slate-500 dark:text-[#829e92]">
                                    Sent to: {notif.targetLabel}
                                  </span>
                                )}
                                
                                <span className="text-[10px] font-bold text-slate-400 dark:text-[#829e92] uppercase tracking-widest whitespace-nowrap">
                                  {new Date(notif.createdAt).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Edit / Delete Actions */}
                            {isCreator && (
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                <button 
                                  onClick={() => handleEdit(notif)}
                                  className="p-1.5 text-slate-450 hover:text-[#00a76b] hover:bg-emerald-50 rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(notif._id)}
                                  className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Pagination Controls */}
                  {(() => {
                    const totalPages = Math.max(Math.ceil(displayNotifications.length / itemsPerPage), 1);
                    return (
                      <div className="px-6 py-4 bg-white dark:bg-[#0c1512] border-t border-[#e2eae7] dark:border-[#13221e] flex items-center justify-between flex-wrap gap-3">
                        <button
                          onClick={() => {
                            setCurrentPage(prev => Math.max(prev - 1, 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-xs font-bold bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-xl text-slate-600 dark:text-[#a3b3af] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#111c18] transition-all cursor-pointer"
                        >
                          Previous
                        </button>

                        <div className="flex items-center gap-3">
                          {totalPages > 1 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px] sm:max-w-none py-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                <button
                                  key={pageNum}
                                  onClick={() => {
                                    setCurrentPage(pageNum);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center ${
                                    currentPage === pageNum
                                      ? 'bg-[#00a76b] text-white border-[#00a76b] shadow-sm shadow-[#00a76b]/20'
                                      : 'bg-white dark:bg-[#0c1512] border-[#e2eae7] dark:border-[#13221e] text-slate-600 dark:text-[#a3b3af] hover:bg-slate-100 dark:hover:bg-[#152420]'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setCurrentPage(prev => Math.min(prev + 1, totalPages));
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-xs font-bold bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-xl text-slate-600 dark:text-[#a3b3af] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#111c18] transition-all cursor-pointer"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Notifications;
