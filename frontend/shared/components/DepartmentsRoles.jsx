import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  GripVertical, Plus, Pencil, Trash2, Check, X, Building2,
  Shield, Loader2, Search, AlertTriangle, Info, Sparkles
} from "lucide-react";

const token = () => sessionStorage.getItem("token") || localStorage.getItem("token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

function DraggableList({ items, onReorder, renderItem, enabled = true }) {
  const dragIdx = useRef(null);
  const handleDragStart = (e, idx) => {
    if (!enabled) return;
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.5";
  };
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = "1";
    dragIdx.current = null;
  };
  const handleDragOver = (e) => {
    if (enabled) e.preventDefault();
  };
  const handleDrop = (e, idx) => {
    if (!enabled) return;
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(idx, 0, moved);
    dragIdx.current = null;
    onReorder(next);
  };
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={item._id || item.id || idx}
          draggable={enabled}
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, idx)}
          className="transition-all duration-150"
        >
          {renderItem(item, idx)}
        </div>
      ))}
    </div>
  );
}

function DeleteModal({ name, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#181612] border border-slate-200 dark:border-[#38352e] rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete "{name}"?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This item will be permanently removed.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#28241e] hover:bg-slate-200 dark:hover:bg-[#32302a] rounded-xl transition-all cursor-pointer border-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all cursor-pointer border-none shadow-sm shadow-red-500/20"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function DepartmentsPanel() {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const originalDeptsRef = useRef([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/departments", authHeaders());
      setDepts(res.data || []);
      originalDeptsRef.current = res.data || [];
    } catch {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepts();
  }, [fetchDepts]);

  const handleStartEdit = () => {
    originalDeptsRef.current = [...depts];
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (originalDeptsRef.current.length > 0) {
      setDepts(originalDeptsRef.current);
    }
    setEditId(null);
    setIsEditing(false);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      if (editId && editName.trim()) {
        await axios.put(`/api/departments/${editId}`, { name: editName.trim(), description: editDesc.trim() }, authHeaders());
      }
      const res = await axios.put("/api/departments/reorder", { orderedIds: depts.map((d) => d._id) }, authHeaders());
      if (res.data) {
        setDepts(res.data);
        originalDeptsRef.current = res.data;
      } else {
        originalDeptsRef.current = [...depts];
      }
      setEditId(null);
      setIsEditing(false);
      toast.success("Departments order saved. Updated in Create User dropdown!", { duration: 3000 });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save department order");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error("Department name is required");
    setSaving(true);
    try {
      const res = await axios.post("/api/departments", { name: newName.trim(), description: newDesc.trim() }, authHeaders());
      setDepts((prev) => {
        const next = [...prev, res.data];
        originalDeptsRef.current = next;
        return next;
      });
      setNewName("");
      setNewDesc("");
      setAddOpen(false);
      toast.success("Department added successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add department");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (dept) => {
    if (!editName.trim()) return toast.error("Department name is required");
    setSaving(true);
    try {
      const res = await axios.put(`/api/departments/${dept._id}`, { name: editName.trim(), description: editDesc.trim() }, authHeaders());
      setDepts((prev) => {
        const next = prev.map((d) => (d._id === dept._id ? res.data : d));
        originalDeptsRef.current = next;
        return next;
      });
      setEditId(null);
      toast.success("Department updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update department");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`/api/departments/${deleteTarget._id}`, authHeaders());
      setDepts((prev) => {
        const next = prev.filter((d) => d._id !== deleteTarget._id);
        originalDeptsRef.current = next;
        return next;
      });
      toast.success("Department deleted");
    } catch {
      toast.error("Failed to delete department");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleReorder = (newList) => {
    setDepts(newList);
  };

  const filtered = depts.filter((d) => d.name?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#28241e] bg-slate-50/50 dark:bg-[#1f1b16]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
            <Building2 size={17} className="text-[#00a76b]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Departments</h3>
              {isEditing && (
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded">
                  Editing
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {depts.length} options &middot; {isEditing ? "drag rows to order, then Save below" : "drag rows to order"}
            </p>
          </div>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            placeholder="Filter..."
            className="h-8 pl-7 pr-3 text-xs font-semibold bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-lg text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] w-32 sm:w-44 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="p-4 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-[#00a76b]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={34} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-400">{search ? "No departments match query" : "No departments configured. Add one below."}</p>
          </div>
        ) : (
          <DraggableList
            items={filtered}
            onReorder={handleReorder}
            enabled={isEditing}
            renderItem={(dept, idx) => (
              <div className="flex items-center gap-3 px-3.5 py-3 bg-slate-50 dark:bg-[#1a1714] border border-slate-200/70 dark:border-[#2e2b24] rounded-xl group hover:border-[#00a76b]/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all">
                <div
                  className={
                    isEditing
                      ? "cursor-grab active:cursor-grabbing text-emerald-600 dark:text-emerald-400 hover:scale-110 transition-all flex-shrink-0"
                      : "text-slate-300 dark:text-slate-600 opacity-40 cursor-default flex-shrink-0"
                  }
                  title={isEditing ? "Drag to reorder" : "Click 'Edit' below to reorder"}
                >
                  <GripVertical size={16} />
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 w-5 text-center flex-shrink-0">
                  {idx + 1}
                </span>
                {editId === dept._id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoComplete="off"
                      autoFocus
                      className="flex-1 h-8 px-2.5 text-xs font-semibold bg-white dark:bg-[#221e19] border border-[#00a76b] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      autoComplete="off"
                      placeholder="Description"
                      className="flex-1 h-8 px-2.5 text-xs font-semibold bg-white dark:bg-[#221e19] border border-slate-200 dark:border-[#38352e] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleEditSave(dept)}
                      disabled={saving}
                      className="w-8 h-8 flex items-center justify-center bg-[#00a76b] text-white rounded-lg cursor-pointer border-none hover:bg-[#00915c] transition-all flex-shrink-0"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-[#28241e] text-slate-500 rounded-lg cursor-pointer border-none hover:bg-slate-200 dark:hover:bg-[#32302a] transition-all flex-shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{dept.name}</p>
                      {dept.description && (
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{dept.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditing) setIsEditing(true);
                          setEditId(dept._id);
                          setEditName(dept.name);
                          setEditDesc(dept.description || "");
                        }}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-[#00a76b] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer transition-all border-none bg-transparent"
                        title="Edit Department"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(dept)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-all border-none bg-transparent"
                        title="Delete Department"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* Add Form */}
      {addOpen && (
        <form onSubmit={handleAdd} className="px-5 py-4 bg-emerald-50/30 dark:bg-emerald-950/10 border-t border-emerald-100 dark:border-emerald-950/50 space-y-3 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#00a76b]">Create New Department</p>
            <button type="button" onClick={() => setAddOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-none cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoComplete="off"
              placeholder="Department Name (e.g. Operations) *"
              className="flex-1 h-9 px-3 text-xs font-semibold bg-white dark:bg-[#221e19] border border-slate-200 dark:border-[#38352e] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] transition-all"
              autoFocus
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              autoComplete="off"
              placeholder="Brief Description (optional)"
              className="flex-1 h-9 px-3 text-xs font-semibold bg-white dark:bg-[#221e19] border border-slate-200 dark:border-[#38352e] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] transition-all"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAddOpen(false); setNewName(""); setNewDesc(""); }}
              className="h-8 px-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#221e19] border border-slate-200 dark:border-[#38352e] rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a2720] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-8 px-4 text-xs font-bold text-white bg-[#00a76b] hover:bg-[#00915c] rounded-lg cursor-pointer border-none disabled:opacity-60 transition-all flex items-center gap-1.5 shadow-xs shadow-emerald-600/20"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Department
            </button>
          </div>
        </form>
      )}

      {/* Footer Action Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-[#28241e] bg-slate-50/50 dark:bg-[#1f1b16]/50 mt-auto">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-white bg-[#00a76b] hover:bg-[#00915c] rounded-lg transition-all cursor-pointer border-none shadow-xs shadow-emerald-600/20 active:scale-95"
        >
          <Plus size={13} /> Add
        </button>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="h-8 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#28241e] hover:bg-slate-200 dark:hover:bg-[#32302a] rounded-lg transition-all cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={saving}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-white bg-[#00a76b] hover:bg-[#00915c] rounded-lg transition-all cursor-pointer border-none shadow-xs shadow-emerald-600/20 disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                <span>Save</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1a1714] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-[#00a76b] dark:hover:text-[#00a76b] border border-slate-200 dark:border-[#38352e] hover:border-[#00a76b] rounded-lg transition-all cursor-pointer shadow-xs"
            >
              <Pencil size={12} className="text-[#00a76b]" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function SystemRolesPanel() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const originalRolesRef = useRef([]);
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("🔖");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/system-roles", authHeaders());
      setRoles(res.data || []);
      originalRolesRef.current = res.data || [];
    } catch {
      toast.error("Failed to load system roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleStartEdit = () => {
    originalRolesRef.current = [...roles];
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (originalRolesRef.current.length > 0) {
      setRoles(originalRolesRef.current);
    }
    setEditId(null);
    setIsEditing(false);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      if (editId && editLabel.trim()) {
        await axios.put(`/api/system-roles/${editId}`, { label: editLabel.trim(), description: editDesc.trim() }, authHeaders());
      }
      const res = await axios.put("/api/system-roles/reorder", { orderedIds: roles.map((r) => r._id) }, authHeaders());
      if (res.data) {
        setRoles(res.data);
        originalRolesRef.current = res.data;
      } else {
        originalRolesRef.current = [...roles];
      }
      setEditId(null);
      setIsEditing(false);
      toast.success("System roles order saved. Updated in Create User dropdown!", { duration: 3000 });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save role order");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (role) => {
    if (!editLabel.trim()) return toast.error("Role label is required");
    setSaving(true);
    try {
      const res = await axios.put(`/api/system-roles/${role._id}`, { label: editLabel.trim(), description: editDesc.trim() }, authHeaders());
      setRoles((prev) => {
        const next = prev.map((r) => (r._id === role._id ? res.data : r));
        originalRolesRef.current = next;
        return next;
      });
      setEditId(null);
      toast.success("Role updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return toast.error("Role name is required");
    setSaving(true);
    try {
      const res = await axios.post("/api/system-roles", { label: newLabel.trim(), description: newDesc.trim(), icon: newIcon }, authHeaders());
      setRoles((prev) => {
        const next = [...prev, res.data];
        originalRolesRef.current = next;
        return next;
      });
      setNewLabel("");
      setNewDesc("");
      setNewIcon("🔖");
      setAddOpen(false);
      toast.success("Custom role added successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add role");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`/api/system-roles/${deleteTarget._id}`, authHeaders());
      setRoles((prev) => {
        const next = prev.filter((r) => r._id !== deleteTarget._id);
        originalRolesRef.current = next;
        return next;
      });
      toast.success("Role removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete role");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleReorder = (newList) => {
    setRoles(newList);
  };

  const filtered = roles.filter((r) => r.label?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#28241e] bg-slate-50/50 dark:bg-[#1f1b16]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center border border-violet-100 dark:border-violet-900/50">
            <Shield size={17} className="text-violet-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">System Roles</h3>
              {isEditing && (
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-100/70 dark:bg-violet-950/80 px-1.5 py-0.5 rounded">
                  Editing
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {roles.length} roles &middot; {isEditing ? "drag rows to order, then Save below" : "drag rows to order"}
            </p>
          </div>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            placeholder="Filter..."
            className="h-8 pl-7 pr-3 text-xs font-semibold bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-lg text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 w-32 sm:w-44 transition-all"
          />
        </div>
      </div>

      {/* Helper notice */}
      <div className="mx-4 mt-3 mb-1 flex items-start gap-2 px-3 py-2 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-xl">
        <Info size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-400 leading-relaxed">
          <strong>System Admin, HR Officer, Manager, Employee</strong> are protected system roles. Drag rows to adjust their order in user creation dropdowns.
        </p>
      </div>

      {/* List */}
      <div className="p-4 pt-2 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Shield size={34} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-400">{search ? "No roles match query" : "No roles configured."}</p>
          </div>
        ) : (
          <DraggableList
            items={filtered}
            onReorder={handleReorder}
            enabled={isEditing}
            renderItem={(role, idx) => (
              <div
                className={`flex items-center gap-3 px-3.5 py-3 border rounded-xl group transition-all hover:border-violet-400 dark:hover:border-violet-700 ${
                  role.isSystem
                    ? "bg-slate-50/70 dark:bg-[#1a1714]/70 border-slate-200/60 dark:border-[#2e2b24]"
                    : "bg-slate-50 dark:bg-[#1a1714] border-slate-200/80 dark:border-[#2e2b24]"
                }`}
              >
                <div
                  className={
                    isEditing
                      ? "text-violet-600 dark:text-violet-400 cursor-grab active:cursor-grabbing hover:scale-110 transition-all flex-shrink-0"
                      : "text-slate-300 dark:text-slate-600 opacity-40 cursor-default flex-shrink-0"
                  }
                  title={isEditing ? "Drag to reorder" : "Click 'Edit' below to reorder"}
                >
                  <GripVertical size={16} />
                </div>
                <span className="text-base flex-shrink-0">{role.icon || "🔖"}</span>
                {editId === role._id ? (
                  <>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      autoComplete="off"
                      autoFocus
                      className="flex-1 h-8 px-2.5 text-xs font-semibold bg-white dark:bg-[#221e19] border border-violet-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      autoComplete="off"
                      placeholder="Description"
                      className="flex-1 h-8 px-2.5 text-xs font-semibold bg-white dark:bg-[#221e19] border border-slate-200 dark:border-[#38352e] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleEditSave(role)}
                      disabled={saving}
                      className="w-8 h-8 flex items-center justify-center bg-violet-600 text-white rounded-lg cursor-pointer border-none hover:bg-violet-700 transition-all flex-shrink-0"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-[#28241e] text-slate-500 rounded-lg cursor-pointer border-none hover:bg-slate-200 dark:hover:bg-[#32302a] transition-all flex-shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{role.label}</p>
                        {role.isSystem ? (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded flex-shrink-0">
                            System
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/60 px-1.5 py-0.5 rounded flex-shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{role.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditing) setIsEditing(true);
                          setEditId(role._id);
                          setEditLabel(role.label);
                          setEditDesc(role.description || "");
                        }}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg cursor-pointer transition-all border-none bg-transparent"
                        title="Edit Role"
                      >
                        <Pencil size={12} />
                      </button>
                      {!role.isSystem && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(role)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-all border-none bg-transparent"
                          title="Delete Role"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* Add Form */}
      {addOpen && (
        <form onSubmit={handleAdd} className="px-5 py-4 bg-violet-50/30 dark:bg-violet-950/10 border-t border-violet-100 dark:border-violet-950/50 space-y-3 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">New Custom Role</p>
            <button type="button" onClick={() => setAddOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-none cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                autoComplete="off"
                placeholder="Icon"
                title="Role Icon / Emoji"
                className="w-12 h-9 px-2 text-center text-sm font-semibold bg-white dark:bg-[#221e19] border border-slate-200 dark:border-[#38352e] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
              />
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                autoComplete="off"
                placeholder="Role Name (e.g. Team Lead) *"
                className="flex-1 h-9 px-3 text-xs font-semibold bg-white dark:bg-[#221e19] border border-slate-200 dark:border-[#38352e] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-all"
                autoFocus
              />
            </div>
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              autoComplete="off"
              placeholder="Description (optional)"
              className="flex-1 h-9 px-3 text-xs font-semibold bg-white dark:bg-[#221e19] border border-slate-200 dark:border-[#38352e] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-all"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAddOpen(false); setNewLabel(""); setNewDesc(""); }}
              className="h-8 px-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#221e19] border border-slate-200 dark:border-[#38352e] rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a2720] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-8 px-4 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg cursor-pointer border-none transition-all flex items-center gap-1.5 shadow-xs shadow-violet-600/20"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Add Role
            </button>
          </div>
        </form>
      )}

      {/* Footer Action Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-[#28241e] bg-slate-50/50 dark:bg-[#1f1b16]/50 mt-auto">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="flex items-center gap-1.5 h-8 px-3.5 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950/70 rounded-lg transition-all cursor-pointer border border-violet-200 dark:border-violet-800 active:scale-95"
        >
          <Plus size={13} /> Custom Role
        </button>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="h-8 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#28241e] hover:bg-slate-200 dark:hover:bg-[#32302a] rounded-lg transition-all cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={saving}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-all cursor-pointer border-none shadow-xs shadow-violet-600/20 disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                <span>Save</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1a1714] hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200 dark:border-[#38352e] hover:border-violet-500 rounded-lg transition-all cursor-pointer shadow-xs"
            >
              <Pencil size={12} className="text-violet-500" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.label}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default function DepartmentsRoles() {
  return (
    <div className="space-y-6 pb-8">
      {/* Page Title & Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-[#28241e] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#00a76b] uppercase tracking-wider mb-1.5">
            <Sparkles size={14} /> Organization Settings
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-none">
            Dropdown Options: Departments &amp; Roles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#a3b3af] mt-2 font-medium max-w-2xl">
            Configure, edit, and reorder departments and system roles. Click Edit to adjust order, then Save to update selection dropdowns throughout the portal.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-[#1a1714] border border-slate-200 dark:border-[#28241e] px-3.5 py-2 rounded-xl flex-shrink-0">
          <Pencil size={14} className="text-[#00a76b]" />
          <span>Click <strong className="text-slate-700 dark:text-slate-200">Edit</strong> &rarr; Reorder &rarr; <strong className="text-slate-700 dark:text-slate-200">Save</strong></span>
        </div>
      </div>

      {/* Grid of panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <DepartmentsPanel />
        <SystemRolesPanel />
      </div>
    </div>
  );
}
