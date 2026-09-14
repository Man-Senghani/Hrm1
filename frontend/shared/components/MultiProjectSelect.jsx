import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, X, Search, Plus, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MultiProjectSelect = ({
  options = [],
  value = [], // Array of selected project strings e.g. ['HRMS', 'Aupanishad']
  onChange,   // (newSelectedArray: string[]) => void
  placeholder = 'Select project(s)...',
  className = '',
  canManage,  // Explicit boolean or auto-detected from user role
  onProjectsUpdated // Callback (updatedProjectList: string[]) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [editingProject, setEditingProject] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [isSubmittingDelete, setIsSubmittingDelete] = useState(null);

  // Drag and Drop reordering state
  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOverProject, setDragOverProject] = useState(null);

  // Edit Mode toggle (drag-and-drop, add, edit, delete only available in Edit Mode)
  const [isEditMode, setIsEditMode] = useState(false);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const addInputRef = useRef(null);

  // Auto-detect role if canManage is not explicitly provided
  const isAllowedToManage = useMemo(() => {
    if (typeof canManage === 'boolean') return canManage;
    try {
      const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      const r = (u.role || localStorage.getItem('role') || '').toLowerCase();
      return ['admin', 'hr', 'manager'].includes(r);
    } catch {
      return false;
    }
  }, [canManage]);

  // Normalize value to array
  const selectedList = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.trim()
    ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
        setIsAdding(false);
        setEditingProject(null);
        setIsEditMode(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && !isAdding) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isAdding]);

  // Focus add input when isAdding toggles
  useEffect(() => {
    if (isAdding) {
      setTimeout(() => {
        addInputRef.current?.focus();
      }, 50);
    }
  }, [isAdding]);

  const toggleProject = (projectName) => {
    const trimmed = (projectName || '').trim();
    if (!trimmed) return;

    if (selectedList.includes(trimmed)) {
      const next = selectedList.filter((p) => p !== trimmed);
      onChange?.(next);
    } else {
      const next = [...selectedList, trimmed];
      onChange?.(next);
    }
  };

  const removeProject = (projectName) => {
    const next = selectedList.filter((p) => p !== projectName);
    onChange?.(next);
  };

  // Sanitize available options
  const sanitizedOptions = useMemo(() => {
    return options
      .map((opt) => (typeof opt === 'object' ? opt.value || opt.label : opt))
      .filter(Boolean)
      .map((opt) => (typeof opt === 'string' ? opt.trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad') : opt))
      .filter((opt) => opt !== 'Other');
  }, [options]);

  // Filter available options by search query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return sanitizedOptions;
    return sanitizedOptions.filter((opt) =>
      opt.toLowerCase().includes(query.trim().toLowerCase())
    );
  }, [sanitizedOptions, query]);

  const isExactMatch = useMemo(() => {
    return sanitizedOptions.some(
      (opt) => opt.toLowerCase() === query.trim().toLowerCase()
    );
  }, [sanitizedOptions, query]);

  // ── Drag & Drop with Mouse Button Handlers ──
  const handleDragStart = (e, proj) => {
    e.stopPropagation();
    setDraggedProject(proj);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', proj);
    } catch {}
  };

  const handleDragOver = (e, proj) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedProject || draggedProject === proj) return;
    if (dragOverProject !== proj) {
      setDragOverProject(proj);
    }
  };

  const handleDrop = async (e, targetProj) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceProj = draggedProject;
    setDraggedProject(null);
    setDragOverProject(null);

    if (!sourceProj || sourceProj === targetProj) return;

    const currentList = [...sanitizedOptions];
    const sourceIndex = currentList.indexOf(sourceProj);
    const targetIndex = currentList.indexOf(targetProj);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const updated = [...currentList];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);

    // Immediately update parent state
    onProjectsUpdated?.(updated);

    // Persist reordered list to backend
    try {
      await api.put('/daily-reports/projects/reorder', { orderedProjects: updated });
    } catch (err) {
      console.warn('Failed to persist project order to server:', err);
    }
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
    setDragOverProject(null);
  };

  // ── HR / Manager / Admin Action: Add New Project ──
  const handleAddProject = async (nameToAdd) => {
    const target = (nameToAdd || newProjectName || '').trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad');
    if (!target) {
      toast.error('Project name cannot be empty');
      return;
    }

    if (sanitizedOptions.some((o) => o.toLowerCase() === target.toLowerCase())) {
      toast.error(`Project "${target}" already exists`);
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const res = await api.post('/daily-reports/projects', {
        projectName: target,
        name: target
      });
      toast.success(res.data?.message || 'Project created successfully');

      const updatedProjects = Array.isArray(res.data)
        ? res.data
        : (res.data?.projects || (sanitizedOptions.includes(target) ? sanitizedOptions : [...sanitizedOptions, target]));
      onProjectsUpdated?.(updatedProjects);

      // Auto-select the newly added project
      if (!selectedList.includes(target)) {
        onChange?.([...selectedList, target]);
      }

      setNewProjectName('');
      setIsAdding(false);
      setQuery('');
    } catch (err) {
      console.error('Error adding project:', err);
      toast.error(err.response?.data?.message || 'Failed to add project');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // ── HR / Manager / Admin Action: Edit Project ──
  const handleSaveEdit = async (oldName, newName) => {
    const trimmed = (newName || '').trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad');
    if (!trimmed) {
      toast.error('Project name cannot be empty');
      return;
    }

    if (trimmed.toLowerCase() === oldName.toLowerCase()) {
      setEditingProject(null);
      return;
    }

    if (sanitizedOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase() && o.toLowerCase() !== oldName.toLowerCase())) {
      toast.error(`A project with name "${trimmed}" already exists`);
      return;
    }

    try {
      setIsSubmittingEdit(true);
      const res = await api.put('/daily-reports/projects', {
        oldName,
        newName: trimmed,
        oldProjectName: oldName,
        newProjectName: trimmed
      });
      toast.success(res.data?.message || 'Project updated successfully');

      const updatedProjects = Array.isArray(res.data)
        ? res.data
        : (res.data?.projects || sanitizedOptions.map((p) => (p === oldName ? trimmed : p)));
      onProjectsUpdated?.(updatedProjects);

      // Update selection if oldName was selected
      if (selectedList.includes(oldName)) {
        onChange?.(selectedList.map((p) => (p === oldName ? trimmed : p)));
      }

      setEditingProject(null);
      setEditingName('');
    } catch (err) {
      console.error('Error editing project:', err);
      toast.error(err.response?.data?.message || 'Failed to update project');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ── HR / Manager / Admin Action: Delete Project ──
  const handleDeleteProject = async (projectName) => {
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"?`)) {
      return;
    }

    try {
      setIsSubmittingDelete(projectName);
      const res = await api.delete('/daily-reports/projects', {
        data: {
          projectName,
          name: projectName
        }
      });
      toast.success(res.data?.message || 'Project deleted successfully');

      const updatedProjects = Array.isArray(res.data)
        ? res.data
        : (res.data?.projects || sanitizedOptions.filter((p) => p !== projectName));
      onProjectsUpdated?.(updatedProjects);

      // Remove from selected list if present
      if (selectedList.includes(projectName)) {
        onChange?.(selectedList.filter((p) => p !== projectName));
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setIsSubmittingDelete(null);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* ── TRIGGER BOX (Selected Chips + Toggle) ── */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className={`min-h-[42px] w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29] text-xs text-slate-900 dark:text-white flex items-center justify-between gap-2 cursor-pointer select-none transition-colors hover:border-emerald-500 focus-within:border-emerald-500 ${className}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 py-0.5">
          {selectedList.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              {placeholder}
            </span>
          ) : (
            selectedList.map((proj) => (
              <span
                key={proj}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-bold shadow-2xs transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <span className="truncate max-w-[140px]">{proj}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProject(proj);
                  }}
                  className="p-0.5 rounded-md hover:bg-emerald-200/70 dark:hover:bg-emerald-800/80 text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-100 transition-colors cursor-pointer"
                  title={`Remove ${proj}`}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400 dark:text-slate-500">
          {selectedList.length > 1 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {selectedList.length}
            </span>
          )}
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-500' : ''
            }`}
          />
        </div>
      </div>

      {/* ── DROPDOWN POPOVER ── */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-[9999] left-0 right-0 mt-1.5 bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 flex flex-col space-y-2 select-none"
        >
          {/* Quick Search Bar */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#111c18] border border-slate-200 dark:border-[#1a2d29]">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isAllowedToManage ? "Search project..." : "Search project(s)..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>



          {/* Project Options List */}
          <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {filteredOptions.map((opt) => {
              const isSelected = selectedList.includes(opt);
              const isEditing = editingProject === opt;
              const isDeleting = isSubmittingDelete === opt;
              const isDragging = draggedProject === opt;
              const isDragOver = dragOverProject === opt;

              if (isEditing) {
                return (
                  <div
                    key={opt}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full p-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 animate-in fade-in duration-150"
                  >
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveEdit(opt, editingName);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingProject(null);
                        }
                      }}
                      autoFocus
                      className="flex-1 bg-white dark:bg-[#111c18] px-2 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                      placeholder="Rename project..."
                    />
                    <button
                      type="button"
                      disabled={isSubmittingEdit}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSaveEdit(opt, editingName);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Save Changes"
                    >
                      {isSubmittingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingEdit}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingProject(null);
                      }}
                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-[#1a2d29] dark:hover:bg-[#223b35] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                      title="Cancel"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={opt}
                  onClick={() => toggleProject(opt)}
                  onDragOver={(e) => handleDragOver(e, opt)}
                  onDrop={(e) => handleDrop(e, opt)}
                  className={`group w-full px-2 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer select-none ${
                    isDragging
                      ? 'opacity-35 bg-emerald-100/50 dark:bg-emerald-900/40 border border-dashed border-emerald-400'
                      : isDragOver
                      ? 'bg-emerald-100/80 dark:bg-emerald-950/80 border-t-2 border-emerald-500 shadow-xs scale-[1.01]'
                      : isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-extrabold border border-emerald-200/60 dark:border-emerald-800/50'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#111c18]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Drag Handle with Mouse Button ONLY in Edit Mode */}
                    {isAllowedToManage && isEditMode && !query.trim() && (
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, opt)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-[#1a2d29] rounded transition-colors shrink-0 flex items-center justify-center touch-none"
                        title="Drag with mouse to reorder"
                      >
                        <GripVertical size={13} />
                      </div>
                    )}

                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 group-hover:border-emerald-400'
                      }`}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="truncate">{opt}</span>
                  </div>

                  {/* Actions for HR / Manager / Admin ONLY in Edit Mode */}
                  {isAllowedToManage && isEditMode && (
                    <div
                      className="flex items-center gap-0.5 ml-2 shrink-0 animate-in fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(opt);
                          setEditingName(opt);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/70 dark:hover:bg-[#1a2d29] transition-colors cursor-pointer"
                        title={`Edit "${opt}"`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(opt);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                        title={`Delete "${opt}"`}
                      >
                        {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="py-5 text-center text-slate-400 dark:text-slate-500 text-xs">
                {query.trim() ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No projects found matching "{query}"</p>
                    {isAllowedToManage && !isAdding && (
                      <button
                        type="button"
                        onClick={() => handleAddProject(query.trim())}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Create "{query.trim()}"</span>
                      </button>
                    )}
                    {!isAllowedToManage && (
                      <p className="text-[11px] text-slate-400 mt-1">Please select from the available company projects.</p>
                    )}
                  </div>
                ) : (
                  'No projects available'
                )}
              </div>
            )}
          </div>

          {/* HR / Manager / Admin ONLY: Inline Add Project (Single Row in Edit Mode) */}
          {isAllowedToManage && isEditMode && isAdding && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-1.5 animate-in fade-in duration-150"
            >
              <input
                ref={addInputRef}
                type="text"
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddProject(newProjectName);
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAdding(false);
                  }
                }}
                className="flex-1 min-w-0 bg-white dark:bg-[#111c18] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1a2d29] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
              />
              <button
                type="button"
                disabled={isSubmittingAdd}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddProject(newProjectName);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0 disabled:opacity-50 shadow-xs"
              >
                {isSubmittingAdd ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} strokeWidth={2.5} />
                )}
                <span>Save</span>
              </button>
              <button
                type="button"
                disabled={isSubmittingAdd}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAdding(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#1a2d29] transition-colors cursor-pointer shrink-0"
                title="Cancel"
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            </div>
          )}

          {/* Popover Action Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#1a2d29] flex items-center justify-between px-1">
            {/* Left Status / Count */}
            {isEditMode ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <Pencil size={11} strokeWidth={2.5} />
                <span>Edit Mode</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {selectedList.length === 0
                  ? 'No project selected'
                  : `${selectedList.length} selected`}
              </span>
            )}

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2">
              {isEditMode ? (
                /* ── EDIT MODE CONTROLS: Show '+ Add Project' and 'Done' ── */
                <>
                  {!isAdding && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(true);
                        setNewProjectName(query.trim());
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 text-[11px] font-bold transition-all cursor-pointer shadow-2xs animate-in fade-in"
                      title="Add a new project"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      <span>Add Project</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                      setIsAdding(false);
                      setEditingProject(null);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] transition-colors cursor-pointer shadow-xs"
                  >
                    Done
                  </button>
                </>
              ) : (
                /* ── NORMAL SELECTION MODE CONTROLS: Show 'Edit', 'Clear all', 'Done' ── */
                <>
                  {isAllowedToManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditMode(true);
                        setIsAdding(false);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1a2d29] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-[#223b35] text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                      title="Edit project list and reorder"
                    >
                      <Pencil size={11} strokeWidth={2.2} />
                      <span>Edit</span>
                    </button>
                  )}

                  {selectedList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange?.([])}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer px-1 py-0.5"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                      setIsAdding(false);
                      setEditingProject(null);
                      setIsEditMode(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] transition-colors cursor-pointer shadow-xs"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiProjectSelect;
