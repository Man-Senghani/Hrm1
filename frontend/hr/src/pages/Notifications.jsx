import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, Send, Loader2, ChevronDown, Trash2, Edit2, RefreshCw,
  X, Plus, ExternalLink, Check, GripVertical, Pencil, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── CONSTANTS ── */
const DEFAULT_TYPES = ['Emergency', 'Leave', 'Task', 'Announcement', 'Attendance', 'General'];
const DEFAULT_TYPE_COLORS = {
  Emergency: '#ef4444', Leave: '#00a76b', Task: '#3b82f6',
  Announcement: '#f59e0b', Attendance: '#10b981', General: '#6b7280',
};

// 20-color premium palette for the custom picker
const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#00a76b', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#64748b', '#6b7280', '#374151', '#92400e', '#1e40af',
];

/* ── STYLISH COLOR PICKER PANEL ── */
const ColorPickerPanel = ({ color, onChange, recentColors, onClose, style }) => {
  const [hex, setHex] = useState(color || '#ef4444');
  const ref = useRef(null);

  useEffect(() => { setHex(color || '#ef4444'); }, [color]);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 100);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const apply = (c) => { onChange(c); setHex(c); };

  const handleHexInput = (val) => {
    setHex(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) onChange(val);
  };

  return (
    <div
      ref={ref}
      style={style}
      className="absolute z-[9999] bg-white dark:bg-[#111c18] border border-[#eceae3] dark:border-[#1a2d29] rounded-2xl shadow-2xl p-3 w-52 animate-in fade-in zoom-in-95 duration-150"
      onClick={e => e.stopPropagation()}
    >
      {/* Color preview bar */}
      <div className="w-full h-7 rounded-xl mb-3 shadow-inner border border-black/5" style={{ backgroundColor: hex }} />

      {/* Palette grid — 5 columns × 4 rows */}
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {COLOR_PALETTE.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => apply(c)}
            title={c}
            className={`w-8 h-8 rounded-full cursor-pointer transition-all duration-150 shrink-0 flex items-center justify-center
              ${hex.toLowerCase() === c.toLowerCase()
                ? 'ring-2 ring-offset-2 ring-slate-700 dark:ring-white scale-110 shadow-lg'
                : 'hover:scale-110 hover:shadow-md opacity-90 hover:opacity-100'
              }`}
            style={{ backgroundColor: c }}
          >
            {hex.toLowerCase() === c.toLowerCase() && (
              <Check size={12} className="text-white" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Recent</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {recentColors.slice(0, 8).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => apply(c)}
                title={c}
                className={`w-6 h-6 rounded-full cursor-pointer transition-all hover:scale-110 border-2
                  ${hex.toLowerCase() === c.toLowerCase() ? 'border-slate-700 dark:border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hex input row */}
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#162722] rounded-xl px-2.5 py-1.5 border border-[#eceae3] dark:border-[#1a2d29]">
        <div className="w-5 h-5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: hex }} />
        <input
          type="text"
          value={hex}
          onChange={e => handleHexInput(e.target.value)}
          maxLength={7}
          className="flex-1 bg-transparent text-[11px] font-mono font-bold text-[#201515] dark:text-white outline-none min-w-0"
          placeholder="#000000"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

/* ── MAIN NOTIFICATION COLOR HELPER ── */
const getNotificationColor = (notif) => {
  if (!notif) return '#ef4444';
  if (notif.color?.startsWith('#')) return notif.color;
  const type = (notif.type || '').toLowerCase();
  if (type.includes('emergency')) return '#ef4444';
  if (type.includes('leave'))     return '#00a76b';
  if (type.includes('task'))      return '#3b82f6';
  if (type.includes('announcement')) return '#f59e0b';
  return '#3b82f6';
};

/* ══════════════════════════════════════════════ */
const Notifications = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [employees, setEmployees]         = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const token         = sessionStorage.getItem('token');
  const role          = sessionStorage.getItem('role') || 'hr';
  const headers       = { Authorization: `Bearer ${token}` };
  const currentUserId = (() => { try { return JSON.parse(atob(token.split('.')[1]))?.id; } catch { return null; } })();

  /* ── TYPE COLORS (per-type) ── */
  const [typeColors, setTypeColors] = useState(() => {
    try {
      const s = localStorage.getItem('type_colors_v1');
      if (s) return { ...DEFAULT_TYPE_COLORS, ...JSON.parse(s) };
    } catch {}
    return { ...DEFAULT_TYPE_COLORS };
  });

  const persistTypeColors = (c) => {
    try { localStorage.setItem('type_colors_v1', JSON.stringify(c)); } catch {}
  };

  const getTypeColor = (name) => typeColors[name] || DEFAULT_TYPE_COLORS[name] || '#3b82f6';

  /* ── RECENT COLORS ── */
  const [recentColors, setRecentColors] = useState(() => {
    try {
      const s = localStorage.getItem('recent_notif_colors');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['#ef4444', '#00a76b', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];
  });

  const addRecentColor = (color) => {
    setRecentColors(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      const updated  = [color, ...filtered].slice(0, 10);
      try { localStorage.setItem('recent_notif_colors', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  /* ── AVAILABLE TYPES ── */
  const [availableTypes, setAvailableTypes] = useState(() => {
    try {
      const s = localStorage.getItem('custom_notification_types_v2');
      if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; }
    } catch {}
    return DEFAULT_TYPES;
  });

  const persistTypes = (t) => {
    try { localStorage.setItem('custom_notification_types_v2', JSON.stringify(t)); } catch {}
  };

  /* ── FORM STATE ── */
  const getResetForm = (type = 'Announcement') => ({
    title: '', message: '', type, color: getTypeColor(type),
    targetRole: 'all', targetUserId: '', specificRoleFilter: 'all',
    _targetRoleOpen: false, _roleFilterOpen: false, _empSelectOpen: false, _typeOpen: false
  });

  const [form, setForm]           = useState(() => getResetForm());
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ── TYPE LIST EDIT MODE ── */
  const [isTypeEditMode, setIsTypeEditMode]       = useState(false);
  const [editTypeNames, setEditTypeNames]         = useState({}); // idx → name (live edits)
  const [activeColorPickerIdx, setActiveColorPickerIdx] = useState(null);
  const [editingTypeColor, setEditingTypeColor]   = useState('#ef4444');

  /* ── ADD CUSTOM TYPE ── */
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  /* ── DRAG ── */
  const [dragIdx, setDragIdx]   = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const targetRoleRef = useRef(null);
  const roleFilterRef = useRef(null);
  const empSelectRef  = useRef(null);
  const typeRef       = useRef(null);

  useEffect(() => {
    if (location.state?.notification) setSelectedNotif(location.state.notification);
  }, [location.state]);

  /* ── CLICK OUTSIDE ── */
  useEffect(() => {
    const h = (e) => {
      if (targetRoleRef.current && !targetRoleRef.current.contains(e.target))
        setForm(f => f._targetRoleOpen ? { ...f, _targetRoleOpen: false } : f);
      if (roleFilterRef.current && !roleFilterRef.current.contains(e.target))
        setForm(f => f._roleFilterOpen ? { ...f, _roleFilterOpen: false } : f);
      if (empSelectRef.current && !empSelectRef.current.contains(e.target))
        setForm(f => f._empSelectOpen ? { ...f, _empSelectOpen: false } : f);
      if (typeRef.current && !typeRef.current.contains(e.target)) {
        setForm(f => f._typeOpen ? { ...f, _typeOpen: false } : f);
        setIsTypeEditMode(false);
        setActiveColorPickerIdx(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── DISMISS COLOR PICKER WHEN CLICKING OUTSIDE IT ── */
  useEffect(() => {
    if (activeColorPickerIdx === null) return;
    const handlePickerDismiss = (e) => {
      if (!e.target.closest('[data-color-picker]') && !e.target.closest('[data-color-dot]')) {
        setActiveColorPickerIdx(null);
      }
    };
    document.addEventListener('mousedown', handlePickerDismiss);
    return () => document.removeEventListener('mousedown', handlePickerDismiss);
  }, [activeColorPickerIdx]);

  /* ── ENTER EDIT MODE ── */
  const enterEditMode = (e) => {
    e.stopPropagation();
    // Seed live name edits from current types
    const names = {};
    availableTypes.forEach((t, i) => { names[i] = t; });
    setEditTypeNames(names);
    setIsTypeEditMode(true);
    setIsAddingCustomType(false);
  };

  /* ── SAVE ALL EDITS (Done) ── */
  const doneEditing = (e) => {
    e.stopPropagation();
    // Apply all name changes
    let updatedTypes  = [...availableTypes];
    let updatedColors = { ...typeColors };
    Object.entries(editTypeNames).forEach(([idxStr, newName]) => {
      const idx     = parseInt(idxStr);
      const oldName = availableTypes[idx];
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;
      const cap = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      updatedTypes[idx]  = cap;
      updatedColors[cap] = updatedColors[oldName] || getTypeColor(oldName);
      delete updatedColors[oldName];
      if (form.type === oldName) setForm(f => ({ ...f, type: cap, color: updatedColors[cap] }));
    });
    setAvailableTypes(updatedTypes);
    persistTypes(updatedTypes);
    setTypeColors(updatedColors);
    persistTypeColors(updatedColors);
    setIsTypeEditMode(false);
    setActiveColorPickerIdx(null);
    setEditTypeNames({});
  };

  /* ── DELETE TYPE ── */
  const deleteType = (idx, e) => {
    e.stopPropagation();
    if (availableTypes.length <= 1) {
      toast.error('You must keep at least one notification type');
      return;
    }
    const t = availableTypes[idx];
    const updated = availableTypes.filter((_, i) => i !== idx);
    setAvailableTypes(updated);
    persistTypes(updated);
    if (form.type === t) {
      const fallback = updated[0] || 'General';
      setForm(f => ({ ...f, type: fallback, color: getTypeColor(fallback) }));
    }
    setEditTypeNames(prev => {
      const next = {};
      updated.forEach((type, i) => { next[i] = prev[i] || type; });
      return next;
    });
    if (activeColorPickerIdx === idx) setActiveColorPickerIdx(null);
    toast.success(`Removed "${t}"`);
  };

  /* ── COLOR PICKER APPLY ── */
  const applyColorToType = (color) => {
    if (activeColorPickerIdx === null) return;
    const typeName = availableTypes[activeColorPickerIdx];
    const updated  = { ...typeColors, [typeName]: color };
    setTypeColors(updated);
    persistTypeColors(updated);
    addRecentColor(color);
    setEditingTypeColor(color);
    // Update form if this is the selected type
    if (form.type === typeName) setForm(f => ({ ...f, color }));
  };

  /* ── ADD CUSTOM TYPE ── */
  const addCustomType = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    const cap = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!availableTypes.includes(cap)) {
      const updated = [...availableTypes, cap];
      setAvailableTypes(updated);
      persistTypes(updated);
      const chosenColor = recentColors[0] || COLOR_PALETTE[0];
      const updatedColors = { ...typeColors, [cap]: chosenColor };
      setTypeColors(updatedColors);
      persistTypeColors(updatedColors);
      setEditTypeNames(prev => ({ ...prev, [updated.length - 1]: cap }));
    }
    setForm(f => ({ ...f, type: cap, color: getTypeColor(cap) }));
    setNewTypeName('');
    setIsAddingCustomType(false);
  };

  /* ── DRAG & DROP ── */
  const handleDragStart = (e, idx) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, idx) => { e.preventDefault(); setDragOver(idx); };
  const handleDrop      = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOver(null); return; }
    const updated = [...availableTypes];
    const [removed] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, removed);
    setAvailableTypes(updated);
    persistTypes(updated);
    // Reseed edit names after reorder
    const names = {};
    updated.forEach((t, i) => { names[i] = t; });
    setEditTypeNames(names);
    setDragIdx(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOver(null); };

  /* ── FETCH ── */
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res  = await axios.get('/api/notifications', { headers });
      const data = res.data?.notifications ?? res.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch { toast.error('Could not load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotifications();
    axios.get('/api/employees', { headers }).then(r => setEmployees(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const backgroundRefresh = async () => {
    try {
      const res  = await axios.get('/api/notifications', { headers });
      const data = res.data?.notifications ?? res.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch {}
  };

  /* ── NOTIFICATION CRUD ── */
  const handleDelete = (notif) => {
    setDeleteTarget(notif);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id || deleteTarget;
    try {
      await axios.delete(`/api/notifications/${id}`, { headers });
      toast.success('Notification deleted');
      setDeleteTarget(null);
      backgroundRefresh();
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const handleEdit = (notif) => {
    setEditingId(notif._id);
    setIsModalOpen(true);
    setForm({ title: notif.title||'', message: notif.message, type: notif.type||'Announcement',
      color: notif.color||getNotificationColor(notif), targetRole:'all', targetUserId:'',
      specificRoleFilter:'all', _targetRoleOpen:false, _roleFilterOpen:false, _empSelectOpen:false, _typeOpen:false });
    toast('Editing notification.', { icon: '✏️' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { toast.error('Please enter a message'); return; }
    if (!editingId && form.targetRole==='specific' && !form.targetUserId) { toast.error('Please select an employee'); return; }
    setSending(true);
    try {
      if (editingId) {
        await axios.put(`/api/notifications/${editingId}`, { title:form.title, message:form.message, type:form.type, color:form.color }, { headers });
        toast.success('Updated!');
        setEditingId(null); setForm(getResetForm()); setIsModalOpen(false); backgroundRefresh();
      } else {
        let targetLabel = 'All Employees';
        if (form.targetRole==='specific') { const emp=employees.find(e=>e.userId?._id===form.targetUserId); targetLabel=emp?emp.userId.name:'Specific Person'; }
        else if (form.targetRole==='employee') targetLabel='Employees Only';
        else if (form.targetRole==='manager')  targetLabel='Managers Only';
        else if (form.targetRole==='hr')       targetLabel='HR Only';
        else if (form.targetRole==='admin')    targetLabel='Admins Only';
        await axios.post('/api/notifications', { title:form.title, message:form.message, type:form.type, color:form.color, targetRole:form.targetRole, targetUserId:form.targetUserId, targetLabel }, { headers });
        toast.success('Sent!');
        setForm(getResetForm()); setIsModalOpen(false); backgroundRefresh();
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSending(false); }
  };

  /* ── NOTIFICATION CLICK ── */
  const handleNotificationClick = (notif) => {
    setSelectedNotif(notif);
  };

  /* ══ RENDER ══════════════════════════════════════════════ */
  return (
    <div className="px-3 md:px-5 pb-20 pt-0 w-full">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4 w-full">
        <h1 className="text-[28px] font-semibold text-[#201515] dark:text-white tracking-tight">Notifications</h1>
        <div className="flex items-center gap-3">
          <button onClick={fetchNotifications} className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-[5px] font-bold text-xs cursor-pointer border-none shadow-sm flex items-center gap-2 transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /><span>Refresh</span>
          </button>
          {role !== 'employee' && (
            <button onClick={() => { setEditingId(null); setForm(getResetForm()); setIsModalOpen(true); }}
              className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-[5px] font-bold text-[13px] cursor-pointer border-none shadow-sm flex items-center gap-2 transition-all">
              <Plus size={14} /><span>Create Notification</span>
            </button>
          )}
        </div>
      </div>

      <div className="w-full">

        {/* ── SLIDE-IN PANEL ── */}
        {role !== 'employee' && isModalOpen && createPortal(
          <div className="fixed inset-0 z-[99999] flex justify-end bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}>
            <div className="bg-white dark:bg-[#111c18] border-l border-[#eceae3] dark:border-[#1a2d29] shadow-2xl w-full max-w-[400px] h-full overflow-y-auto relative animate-in slide-in-from-right duration-300 flex flex-col"
              onClick={e => e.stopPropagation()}>

              <button onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-[#1a2d29] dark:hover:bg-[#223b35] rounded-full transition-colors z-10 cursor-pointer border-none outline-none">
                <X size={16} className="text-gray-600 dark:text-gray-300" />
              </button>

              <div className="p-4 border-b border-[#eceae3] dark:border-[#1a2d29]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ backgroundColor: form.color || '#00a76b' }}>
                    <Send size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-black text-[#201515] dark:text-white">{editingId ? 'Update Notification' : 'Create Notification'}</h2>
                    <p className="text-[11px] font-medium text-[#939084] dark:text-[#a3b3af]">Send to employees by role</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSend} className="p-5 pb-6 space-y-4 flex-1">

                {/* Send To */}
                {!editingId && (
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af] mb-2">Send To</label>
                    <div ref={targetRoleRef} className="relative">
                      <div onClick={() => setForm(f => ({...f, _targetRoleOpen:!f._targetRoleOpen, _roleFilterOpen:false, _empSelectOpen:false, _typeOpen:false}))}
                        className={`w-full bg-white dark:bg-[#162722] border ${form._targetRoleOpen?'border-[#00a76b]':'border-[#eceae3] dark:border-[#1a2d29]'} rounded-[12px] px-4 py-3 text-[13px] font-bold text-[#201515] dark:text-white cursor-pointer flex justify-between items-center`}>
                        <span>{{all:'All Employees',employee:'Employees Only',manager:'Managers Only',hr:'HR Only',admin:'Admins Only',specific:'Specific Person'}[form.targetRole]}</span>
                        <ChevronDown size={14} className={`text-[#939084] transition-transform ${form._targetRoleOpen?'rotate-180':''}`} />
                      </div>
                      {form._targetRoleOpen && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#111c18] border border-[#eceae3] dark:border-[#1a2d29] rounded-[12px] shadow-lg overflow-hidden z-20">
                          {[{v:'all',l:'All Employees'},{v:'employee',l:'Employees Only'},{v:'manager',l:'Managers Only'},
                            ...(role!=='manager'?[{v:'hr',l:'HR Only'}]:[]),
                            ...(role==='admin'?[{v:'admin',l:'Admins Only'}]:[]),
                            {v:'specific',l:'Specific Person'}
                          ].map(opt=>(
                            <div key={opt.v} onClick={()=>setForm(f=>({...f,targetRole:opt.v,targetUserId:'',_targetRoleOpen:false}))}
                              className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer ${form.targetRole===opt.v?'bg-[#00a76b]/10 text-[#00a76b]':'text-[#201515] dark:text-white hover:bg-slate-50 dark:hover:bg-[#162722]'}`}>{opt.l}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Specific person */}
                {!editingId && form.targetRole==='specific' && (
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af] mb-2">Select Employee</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div ref={roleFilterRef} className="relative">
                        <div onClick={()=>setForm(f=>({...f,_roleFilterOpen:!f._roleFilterOpen,_targetRoleOpen:false,_empSelectOpen:false,_typeOpen:false}))}
                          className={`w-full bg-white dark:bg-[#162722] border ${form._roleFilterOpen?'border-[#00a76b]':'border-[#eceae3] dark:border-[#1a2d29]'} rounded-[12px] px-4 py-3 text-[13px] font-bold text-[#201515] dark:text-white cursor-pointer flex justify-between items-center`}>
                          <span>{{all:'Any Role',employee:'Employees',manager:'Managers',hr:'HR',admin:'Admins'}[form.specificRoleFilter]}</span>
                          <ChevronDown size={14} className={`text-[#939084] transition-transform ${form._roleFilterOpen?'rotate-180':''}`} />
                        </div>
                        {form._roleFilterOpen && (
                          <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#111c18] border border-[#eceae3] dark:border-[#1a2d29] rounded-[12px] shadow-lg overflow-hidden z-20">
                            {[{v:'all',l:'Any Role'},{v:'employee',l:'Employees'},{v:'manager',l:'Managers'},
                              ...(role!=='manager'?[{v:'hr',l:'HR'}]:[]),
                              ...(role==='admin'?[{v:'admin',l:'Admins'}]:[])
                            ].map(opt=><div key={opt.v} onClick={()=>setForm(f=>({...f,specificRoleFilter:opt.v,targetUserId:'',_roleFilterOpen:false}))}
                              className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer ${form.specificRoleFilter===opt.v?'bg-[#00a76b]/10 text-[#00a76b]':'text-[#201515] dark:text-white hover:bg-slate-50 dark:hover:bg-[#162722]'}`}>{opt.l}</div>)}
                          </div>
                        )}
                      </div>
                      <div ref={empSelectRef} className="relative">
                        <div onClick={()=>setForm(f=>({...f,_empSelectOpen:!f._empSelectOpen,_targetRoleOpen:false,_roleFilterOpen:false,_typeOpen:false}))}
                          className={`w-full bg-white dark:bg-[#162722] border ${form._empSelectOpen?'border-[#00a76b]':'border-[#eceae3] dark:border-[#1a2d29]'} rounded-[12px] px-4 py-3 text-[13px] font-bold text-[#201515] dark:text-white cursor-pointer flex justify-between items-center`}>
                          <span className="truncate">{form.targetUserId?employees.find(e=>e.userId?._id===form.targetUserId)?.userId?.name||'-- Name --':'-- Name --'}</span>
                          <ChevronDown size={14} className={`text-[#939084] shrink-0 ml-2 transition-transform ${form._empSelectOpen?'rotate-180':''}`} />
                        </div>
                        {form._empSelectOpen && (
                          <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#111c18] border border-[#eceae3] dark:border-[#1a2d29] rounded-[12px] shadow-lg overflow-hidden z-20 max-h-60 overflow-y-auto">
                            <div onClick={()=>setForm(f=>({...f,targetUserId:'',_empSelectOpen:false}))} className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer ${!form.targetUserId?'bg-[#00a76b]/10 text-[#00a76b]':'text-[#201515] dark:text-white hover:bg-slate-50 dark:hover:bg-[#162722]'}`}>-- Name --</div>
                            {employees.filter(emp=>emp.userId&&(form.specificRoleFilter==='all'||emp.userId.role===form.specificRoleFilter)).filter(emp=>role==='admin'||emp.userId.role!=='admin')
                              .map(emp=><div key={emp.userId._id} onClick={()=>setForm(f=>({...f,targetUserId:emp.userId._id,_empSelectOpen:false}))}
                                className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer ${form.targetUserId===emp.userId._id?'bg-[#00a76b]/10 text-[#00a76b]':'text-[#201515] dark:text-white hover:bg-slate-50 dark:hover:bg-[#162722]'}`}>{emp.userId.name}</div>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af] mb-2">Notification Title</label>
                  <input type="text" placeholder="e.g. System Maintenance / Office Notice" value={form.title}
                    onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                    className="w-full bg-white dark:bg-[#162722] border border-[#eceae3] dark:border-[#1a2d29] rounded-[12px] px-4 py-3 text-[13px] font-medium text-[#201515] dark:text-white placeholder-[#c5c0b1] focus:outline-none focus:border-[#00a76b] transition-colors" />
                </div>

                {/* ── NOTIFICATION TYPE DROPDOWN ── */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af] mb-2">Notification Type</label>
                  <div ref={typeRef} className="relative">

                    {/* Trigger */}
                    <div
                      onClick={() => { setActiveColorPickerIdx(null); setIsTypeEditMode(false); setForm(f=>({...f,_typeOpen:!f._typeOpen,_targetRoleOpen:false,_roleFilterOpen:false,_empSelectOpen:false})); }}
                      className={`w-full bg-white dark:bg-[#162722] border ${form._typeOpen?'border-[#00a76b]':'border-[#eceae3] dark:border-[#1a2d29]'} rounded-[12px] px-4 py-3 text-[13px] font-bold text-[#201515] dark:text-white cursor-pointer flex justify-between items-center transition-colors`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getTypeColor(form.type) }} />
                        <span className="capitalize">{form.type}</span>
                      </div>
                      <ChevronDown size={14} className={`text-[#939084] transition-transform ${form._typeOpen?'rotate-180':''}`} />
                    </div>

                    {/* Dropdown */}
                    {form._typeOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#111c18] border border-[#eceae3] dark:border-[#1a2d29] rounded-[12px] shadow-xl z-30 max-h-80 overflow-y-auto overflow-x-hidden">

                        {/* Type rows */}
                        {availableTypes.map((t, idx) => {
                          const isSelected = form.type.toLowerCase() === t.toLowerCase();
                          const tColor = getTypeColor(t);
                          const isColorPickerOpen = activeColorPickerIdx === idx;

                          return (
                            <div key={t + idx} className="relative">
                              <div
                                draggable={!isTypeEditMode}
                                onDragStart={e => !isTypeEditMode && handleDragStart(e, idx)}
                                onDragOver={e => handleDragOver(e, idx)}
                                onDrop={e => handleDrop(e, idx)}
                                onDragEnd={handleDragEnd}
                                onClick={() => {
                                  if (isTypeEditMode) {
                                    if (activeColorPickerIdx !== null) setActiveColorPickerIdx(null);
                                    return;
                                  }
                                  setForm(f => ({...f, type:t, color:getTypeColor(t), _typeOpen:false}));
                                }}
                                className={`flex items-center gap-2 px-3 py-2.5 transition-colors border-b border-[#eceae3]/60 dark:border-[#1a2d29]/60 last:border-b-0 ${
                                  dragOver===idx ? 'bg-[#00a76b]/10' : ''
                                } ${!isTypeEditMode ? 'cursor-pointer' : 'cursor-default'} ${
                                  isSelected && !isTypeEditMode ? 'bg-[#00a76b]/8 text-[#00a76b]' : 'text-[#201515] dark:text-white hover:bg-slate-50 dark:hover:bg-[#162722]'
                                }`}
                              >
                                {/* 1: Drag handle */}
                                <span className={`shrink-0 ${isTypeEditMode?'text-slate-300 dark:text-slate-600':'text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing hover:text-slate-500'}`}
                                  onMouseDown={e => { e.stopPropagation(); if (activeColorPickerIdx !== null) setActiveColorPickerIdx(null); }} title="Drag to reorder">
                                  <GripVertical size={14} />
                                </span>

                                {/* 2: Color dot — clickable in edit mode */}
                                {isTypeEditMode ? (
                                  <button
                                    type="button"
                                    data-color-dot="true"
                                    title="Click to change color"
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (isColorPickerOpen) { setActiveColorPickerIdx(null); return; }
                                      setActiveColorPickerIdx(idx);
                                      setEditingTypeColor(tColor);
                                    }}
                                    className="w-4 h-4 rounded-full shrink-0 cursor-pointer hover:scale-125 transition-transform shadow ring-2 ring-white dark:ring-[#111c18]"
                                    style={{ backgroundColor: tColor }}
                                  />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: tColor }} />
                                )}

                                {/* 3: Title — editable input in edit mode */}
                                {isTypeEditMode ? (
                                  <input
                                    type="text"
                                    value={editTypeNames[idx] ?? t}
                                    onChange={e => setEditTypeNames(prev => ({...prev, [idx]: e.target.value}))}
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (activeColorPickerIdx !== null && activeColorPickerIdx !== idx) {
                                        setActiveColorPickerIdx(null);
                                      }
                                    }}
                                    onKeyDown={e => { e.stopPropagation(); if(e.key==='Enter') e.target.blur(); }}
                                    className="flex-1 bg-white dark:bg-[#162722] border border-[#eceae3] dark:border-[#1a2d29] focus:border-[#00a76b] rounded-lg px-2.5 py-1 text-[12px] font-bold text-[#201515] dark:text-white outline-none min-w-0 transition-colors"
                                  />
                                ) : (
                                  <span className="flex-1 text-[13px] font-bold capitalize truncate">{t}</span>
                                )}

                                {/* Check mark (normal mode) */}
                                {!isTypeEditMode && isSelected && (
                                  <Check size={13} className="text-[#00a76b] shrink-0" strokeWidth={3} />
                                )}

                                {/* Delete (edit mode) */}
                                {isTypeEditMode && (
                                  <button type="button" onClick={e => {
                                    if (activeColorPickerIdx !== null) setActiveColorPickerIdx(null);
                                    deleteType(idx, e);
                                  }}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                                    title={`Delete ${t}`}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>

                              {/* ── STYLISH COLOR PICKER POPUP ── */}
                              {isColorPickerOpen && (
                                <div data-color-picker="true" className="px-3 pb-3" onClick={e => e.stopPropagation()}>
                                  <div className="bg-slate-50 dark:bg-[#162722] border border-[#eceae3] dark:border-[#1a2d29] rounded-xl p-3">
                                    {/* Color preview */}
                                    <div className="w-full h-6 rounded-lg mb-2.5 shadow-inner border border-black/5 transition-colors" style={{ backgroundColor: editingTypeColor }} />

                                    {/* Palette grid */}
                                    <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                                      {COLOR_PALETTE.map(c => (
                                        <button key={c} type="button"
                                          onClick={e => { e.stopPropagation(); applyColorToType(c); setEditingTypeColor(c); }}
                                          className={`w-8 h-8 rounded-full cursor-pointer transition-all flex items-center justify-center
                                            ${editingTypeColor.toLowerCase()===c.toLowerCase()
                                              ? 'ring-2 ring-offset-1 ring-slate-700 dark:ring-white scale-110 shadow-md'
                                              : 'hover:scale-110 hover:shadow-sm opacity-90 hover:opacity-100'}`}
                                          style={{ backgroundColor: c }}>
                                          {editingTypeColor.toLowerCase()===c.toLowerCase() && <Check size={11} className="text-white" strokeWidth={3} />}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Recent colors */}
                                    {recentColors.length > 0 && (
                                      <div className="mb-2.5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Recent</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {recentColors.slice(0, 10).map(c => (
                                            <button key={c} type="button"
                                              onClick={e => { e.stopPropagation(); applyColorToType(c); setEditingTypeColor(c); }}
                                              className={`w-6 h-6 rounded-full cursor-pointer transition-all hover:scale-110 border-2
                                                ${editingTypeColor.toLowerCase()===c.toLowerCase()? 'border-slate-700 dark:border-white scale-110':'border-transparent'}`}
                                              style={{ backgroundColor: c }} />
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Hex input */}
                                    <div className="flex items-center gap-2 bg-white dark:bg-[#111c18] rounded-lg px-2.5 py-1.5 border border-[#eceae3] dark:border-[#1a2d29]">
                                      <div className="w-4 h-4 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: editingTypeColor }} />
                                      <input type="text" value={editingTypeColor}
                                        onChange={e => { const v=e.target.value; if(/^#[0-9a-fA-F]{0,6}$/.test(v)){setEditingTypeColor(v); if(/^#[0-9a-fA-F]{6}$/.test(v)) applyColorToType(v);} }}
                                        onClick={e=>e.stopPropagation()}
                                        maxLength={7}
                                        className="flex-1 bg-transparent text-[11px] font-mono font-bold text-[#201515] dark:text-white outline-none"
                                        placeholder="#000000" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* ── BOTTOM TOOLBAR ── */}
                        <div className="p-2 border-t border-[#eceae3] dark:border-[#1a2d29] bg-slate-50/70 dark:bg-[#162722]/50" onClick={e => {
                          e.stopPropagation();
                          if (activeColorPickerIdx !== null) setActiveColorPickerIdx(null);
                        }}>
                          {isTypeEditMode ? (
                            /* EDIT MODE — Add Type + Done buttons */
                            <div className="space-y-2">
                              {isAddingCustomType ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="New type name..."
                                    value={newTypeName}
                                    onChange={e => setNewTypeName(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') { e.preventDefault(); addCustomType(); }
                                      if (e.key === 'Escape') { setIsAddingCustomType(false); setNewTypeName(''); }
                                    }}
                                    className="flex-1 bg-white dark:bg-[#111c18] border border-[#eceae3] dark:border-[#1a2d29] rounded-[8px] px-2.5 py-1.5 text-xs text-[#201515] dark:text-white placeholder-[#c5c0b1] focus:outline-none focus:border-[#00a76b]"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={addCustomType}
                                    className="px-2.5 py-1.5 bg-[#00a76b] text-white rounded-[8px] text-xs font-bold cursor-pointer hover:bg-[#00915c]"
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setIsAddingCustomType(false); setNewTypeName(''); }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-[8px] cursor-pointer"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); setIsAddingCustomType(true); }}
                                    className="flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs font-bold text-[#00a76b] hover:bg-[#00a76b]/10 rounded-[8px] transition-colors cursor-pointer border border-[#00a76b]/30"
                                  >
                                    <Plus size={13} />
                                    <span>Add Type</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={doneEditing}
                                    className="flex-1 py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#00a76b] hover:bg-[#00915c] rounded-[8px] transition-colors cursor-pointer border-none shadow-sm"
                                  >
                                    <Check size={13} strokeWidth={3} />
                                    <span>Done</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* NORMAL MODE — show Edit button */
                            <button
                              type="button"
                              onClick={enterEditMode}
                              className="w-full py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#00a76b] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2d29] rounded-[8px] transition-colors cursor-pointer border border-[#eceae3] dark:border-[#1a2d29]"
                            >
                              <Pencil size={13} />
                              <span>Edit Types</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af] mb-2">Message</label>
                  <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} rows={4}
                    placeholder="Type your notification here..."
                    className="w-full bg-white dark:bg-[#162722] border border-[#eceae3] dark:border-[#1a2d29] rounded-[12px] px-4 py-3 text-[13px] font-medium text-[#201515] dark:text-white placeholder-[#c5c0b1] focus:outline-none focus:border-[#00a76b] resize-none transition-colors" />
                </div>

                <button type="submit" disabled={sending}
                  className="w-full flex items-center justify-center gap-2 bg-[#00a76b] hover:bg-[#00915c] disabled:opacity-60 text-white px-6 py-3 rounded-[12px] font-black text-[13px] transition-all cursor-pointer shadow-sm">
                  {sending ? <Loader2 size={16} className="animate-spin"/> : editingId ? <Edit2 size={16}/> : <Send size={16}/>}
                  {sending ? 'Processing...' : editingId ? 'Update Notification' : 'Send Notification'}
                </button>

                {editingId && (
                  <button type="button" onClick={()=>{setEditingId(null);setForm(getResetForm());setIsModalOpen(false);}}
                    className="w-full mt-2 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-[#1a2d29] dark:hover:bg-[#223b35] text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-[12px] font-bold text-[13px] transition-all cursor-pointer">
                    Cancel Edit
                  </button>
                )}
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ── NOTIFICATIONS LIST TABLE ── */}
        <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[16px] shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={36} className="animate-spin text-[#00a76b]"/></div>
          ) : (() => {
            const displayNotifications = role==='manager' ? notifications.filter(n=>n.senderId===currentUserId) : notifications;
            if (displayNotifications.length === 0) return (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mb-4"><Bell size={28} className="text-[#00a76b]"/></div>
                <h3 className="text-[16px] font-bold text-slate-800 dark:text-white mb-2">No notifications found</h3>
                <p className="text-[13px] font-medium text-slate-500 dark:text-[#829e92]">Send a notification using the button above</p>
              </div>
            );

            const totalPages   = Math.ceil(displayNotifications.length / itemsPerPage);
            const indexOfLast  = currentPage * itemsPerPage;
            const indexOfFirst = indexOfLast - itemsPerPage;
            const currentItems = displayNotifications.slice(indexOfFirst, indexOfLast);

            return (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-[#e2eae7] dark:border-[#13221e]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-[#162722] border-b border-[#e2eae7] dark:border-[#13221e] text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-3.5 px-5 border-r border-[#e2eae7] dark:border-[#13221e]">Notification</th>
                        <th className="py-3.5 px-4 border-r border-[#e2eae7] dark:border-[#13221e]">Type</th>
                        <th className="py-3.5 px-4 border-r border-[#e2eae7] dark:border-[#13221e]">Sent By</th>
                        <th className="py-3.5 px-4 border-r border-[#e2eae7] dark:border-[#13221e]">Target</th>
                        <th className="py-3.5 px-4 text-left border-r border-[#e2eae7] dark:border-[#13221e]">Date &amp; Time</th>
                        <th className="py-3.5 px-5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2eae7] dark:divide-[#13221e]">
                      {currentItems.map(notif => {
                        const notifColor = getNotificationColor(notif);
                        const sId = notif.senderId?._id ? String(notif.senderId._id) : (notif.senderId ? String(notif.senderId) : '');
                        const isCreator  = sId && sId === currentUserId;
                        const senderName = notif.senderName||notif.senderId?.name||'HR / Management';
                        const senderRole = notif.senderRole||notif.senderId?.role||'';
                        return (
                          <tr key={notif._id} onClick={()=>handleNotificationClick(notif)}
                            className="hover:bg-slate-50/80 dark:hover:bg-[#111c18] transition-colors group cursor-pointer">
                            <td className="py-3.5 px-5 border-r border-[#e2eae7] dark:border-[#13221e]">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{backgroundColor:`${notifColor}18`,color:notifColor,border:`1px solid ${notifColor}35`}}><Bell size={15}/></div>
                                <div>
                                  {notif.title && <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5">{notif.title}</p>}
                                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 leading-snug group-hover:text-[#00a76b] transition-colors">{notif.message}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap border-r border-[#e2eae7] dark:border-[#13221e]">
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest" style={{backgroundColor:`${notifColor}18`,color:notifColor,border:`1px solid ${notifColor}35`}}>{notif.type||'general'}</span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap border-r border-[#e2eae7] dark:border-[#13221e]">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                <span className="text-gray-400 text-[9px] font-black uppercase">BY:</span>
                                <span>{isCreator?`${senderName} (You)`:senderName}</span>
                                {senderRole&&<span className="text-[9px] font-black uppercase opacity-70">[{senderRole}]</span>}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap border-r border-[#e2eae7] dark:border-[#13221e]">
                              {notif.targetLabel ? <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-[#1a2d29] text-slate-500 dark:text-[#829e92]">{notif.targetLabel}</span> : <span className="text-slate-400 text-[11px]">-</span>}
                            </td>
                            <td className="py-3.5 px-4 text-left whitespace-nowrap text-[11px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider border-r border-[#e2eae7] dark:border-[#13221e]">
                              {new Date(notif.createdAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                            </td>
                            <td className="py-3.5 px-5 text-center whitespace-nowrap">
                              {isCreator ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={e => { e.stopPropagation(); handleEdit(notif); }}
                                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#00a76b] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer border border-[#e2eae7] dark:border-[#1a2d29] shadow-xs"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDelete(notif); }}
                                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer border border-[#e2eae7] dark:border-[#1a2d29] shadow-xs"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); setSelectedNotif(notif); }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-[#00a76b] text-[#00a76b] hover:text-white dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-[#00a76b] dark:hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs"
                                  title="View Details"
                                >
                                  <Eye size={13} />
                                  <span>View</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-white dark:bg-[#0c1512] border-t border-[#e2eae7] dark:border-[#13221e] flex items-center justify-between flex-wrap gap-3">
                  <button onClick={()=>{setCurrentPage(p=>Math.max(p-1,1));window.scrollTo({top:0,behavior:'smooth'});}} disabled={currentPage===1}
                    className="px-4 py-2 text-xs font-bold bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-xl text-slate-600 dark:text-[#a3b3af] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#111c18] transition-all cursor-pointer">Previous</button>
                  <div className="flex items-center gap-3">
                    {totalPages>1 && (
                      <div className="flex items-center gap-1.5">
                        {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                          <button key={p} onClick={()=>{setCurrentPage(p);window.scrollTo({top:0,behavior:'smooth'});}}
                            className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center ${currentPage===p?'bg-[#00a76b] text-white border-[#00a76b] shadow-sm':'bg-white dark:bg-[#0c1512] border-[#e2eae7] dark:border-[#13221e] text-slate-600 dark:text-[#a3b3af] hover:bg-slate-100 dark:hover:bg-[#152420]'}`}>{p}</button>
                        ))}
                      </div>
                    )}
                    <button onClick={()=>{setCurrentPage(p=>Math.min(p+1,totalPages));window.scrollTo({top:0,behavior:'smooth'});}} disabled={currentPage===totalPages}
                      className="px-4 py-2 text-xs font-bold bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-xl text-slate-600 dark:text-[#a3b3af] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#111c18] transition-all cursor-pointer">Next</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── DETAIL SLIDE-IN DRAWER (RIGHT PANEL) ── */}
      {selectedNotif && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex justify-end bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="bg-white dark:bg-[#111c18] border-l border-[#eceae3] dark:border-[#1a2d29] shadow-2xl w-full max-w-[420px] h-full overflow-y-auto relative animate-in slide-in-from-right duration-300 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#eceae3] dark:border-[#1a2d29] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${getNotificationColor(selectedNotif)}18`,
                    color: getNotificationColor(selectedNotif),
                    border: `1px solid ${getNotificationColor(selectedNotif)}35`
                  }}
                >
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="text-[14px] font-black text-[#201515] dark:text-white capitalize">
                    {selectedNotif.title || selectedNotif.type || 'Notification Details'}
                  </h3>
                  <p className="text-[11px] font-medium text-[#939084] dark:text-[#a3b3af]">
                    By {selectedNotif.senderName || selectedNotif.senderId?.name || 'HR / Management'} {selectedNotif.senderRole ? `(${selectedNotif.senderRole})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-[#1a2d29] dark:hover:bg-[#223b35] rounded-full transition-colors cursor-pointer border-none outline-none"
              >
                <X size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 flex-1">
              {selectedNotif.title && (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af] mb-1.5">
                    Title
                  </label>
                  <div className="text-[13px] font-bold text-[#201515] dark:text-white bg-slate-50 dark:bg-[#162722] rounded-[10px] p-3 border border-[#eceae3] dark:border-[#1a2d29]">
                    {selectedNotif.title}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af] mb-1.5">
                  Message
                </label>
                <div className="bg-slate-50 dark:bg-[#162722]/60 rounded-xl p-4 border border-[#e2eae7] dark:border-[#1a2d29] text-[13px] leading-relaxed text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap">
                  {selectedNotif.message}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#939084] dark:text-[#a3b3af] mb-1.5">
                  Details
                </label>
                <div className="bg-white dark:bg-[#162722] border border-[#eceae3] dark:border-[#1a2d29] rounded-[12px] p-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span className="font-bold">Type:</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                      style={{
                        backgroundColor: `${getNotificationColor(selectedNotif)}18`,
                        color: getNotificationColor(selectedNotif)
                      }}
                    >
                      {selectedNotif.type || 'General'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span className="font-bold">Target:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {selectedNotif.targetLabel || 'All Employees'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span className="font-bold">Sent Time:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {new Date(selectedNotif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#eceae3] dark:border-[#1a2d29] bg-slate-50/50 dark:bg-[#162722]/30 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="w-full py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white rounded-[10px] font-bold text-xs transition-all cursor-pointer border-none shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── STYLISH CENTERED DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white dark:bg-[#111c18] border border-[#eceae3] dark:border-[#1a2d29] rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-200/50 dark:border-red-900/40 shadow-inner">
              <Trash2 size={24} />
            </div>

            {/* Title & Description */}
            <h3 className="text-base font-black text-[#201515] dark:text-white mb-2">
              Delete Notification?
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-[#829e92] leading-relaxed mb-5">
              Are you sure you want to delete this notification? This action cannot be undone.
            </p>

            {/* Notification Snippet */}
            <div className="bg-slate-50 dark:bg-[#162722] rounded-xl p-3 mb-6 border border-[#eceae3] dark:border-[#1a2d29] text-left">
              {deleteTarget.title && (
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mb-1">
                  {deleteTarget.title}
                </p>
              )}
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 line-clamp-2">
                {deleteTarget.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-[#1a2d29] dark:hover:bg-[#223b35] text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer border-none shadow-md shadow-red-500/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Notifications;
