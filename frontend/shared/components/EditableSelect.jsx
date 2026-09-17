import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, ChevronUp, Check, X, Search, Plus, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react';

/**
 * EditableSelect: A sleek, searchable, and editable single-select dropdown
 * Supports:
 * - Full-width search bar at top
 * - Edit button at bottom right (footer)
 * - "+ Add new [label]" button and add box ONLY shown when Edit mode is activated
 * - Drag & drop reorder handle ONLY in Edit mode (no chevron buttons)
 * - Inline option renaming and deletion in Edit mode
 * - Dark & light mode styling
 * - Clean outside-click and escape dismissal
 */
const EditableSelect = ({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  label = 'Option',
  error,
  required = false,
  disabled = false,
  className = '',
  onOptionsChange,
  onReorder,
  onAddOption,
  onEditOption,
  onDeleteOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Adding state (only available in edit mode)
  const [isAdding, setIsAdding] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Editing state
  const [editingItem, setEditingItem] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Deleting state
  const [deletingItem, setDeletingItem] = useState(null);

  // Pointer-based Drag & Drop state (prevents getting stuck on clicks)
  const [activeDragIndex, setActiveDragIndex] = useState(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragIndexRef = useRef(null);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const addInputRef = useRef(null);

  // Normalize options to array of strings
  const rawStringOptions = useMemo(() => {
    return (options || [])
      .map((opt) => (typeof opt === 'object' && opt !== null ? opt.label ?? opt.value ?? opt.name ?? '' : opt))
      .filter((s) => typeof s === 'string' && s.trim().length > 0);
  }, [options]);

  const [localOptions, setLocalOptions] = useState(rawStringOptions);

  useEffect(() => {
    setLocalOptions(rawStringOptions);
  }, [rawStringOptions]);

  const stringOptions = localOptions;

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return stringOptions;
    return stringOptions.filter((opt) =>
      opt.toLowerCase().includes(query.trim().toLowerCase())
    );
  }, [stringOptions, query]);

  // Pointer drag handler: only activates when mouse moves > 4px; never gets stuck on clicks
  const handlePointerDown = (e, index) => {
    if (!isEditMode || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    dragStartYRef.current = e.clientY;
    dragIndexRef.current = index;
    isDraggingRef.current = false;

    const handlePointerMove = (moveEvent) => {
      const distY = Math.abs(moveEvent.clientY - dragStartYRef.current);
      // Only initiate active drag visual once dragged more than 4px
      if (!isDraggingRef.current && distY > 4) {
        isDraggingRef.current = true;
        setActiveDragIndex(dragIndexRef.current);
      }

      if (isDraggingRef.current) {
        const elem = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const row = elem?.closest('[data-option-index]');
        if (row) {
          const targetIndex = parseInt(row.getAttribute('data-option-index'), 10);
          if (!isNaN(targetIndex) && targetIndex !== dragIndexRef.current) {
            const currentIndex = dragIndexRef.current;
            dragIndexRef.current = targetIndex;
            setActiveDragIndex(targetIndex);

            setLocalOptions((prev) => {
              const updated = [...prev];
              const [moved] = updated.splice(currentIndex, 1);
              updated.splice(targetIndex, 0, moved);
              return updated;
            });
          }
        }
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (isDraggingRef.current) {
        setLocalOptions((current) => {
          onOptionsChange?.(current);
          onReorder?.(current);
          return current;
        });
      }

      isDraggingRef.current = false;
      dragIndexRef.current = null;
      setActiveDragIndex(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Up/down reorder handler
  const handleMoveOption = (index, direction, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= localOptions.length) return;

    setLocalOptions((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      onOptionsChange?.(updated);
      onReorder?.(updated);
      return updated;
    });
  };

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
        setIsAdding(false);
        setEditingItem(null);
        setIsEditMode(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setIsAdding(false);
        setEditingItem(null);
        setIsEditMode(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && !isAdding) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isAdding]);

  // Focus add input when isAdding is opened
  useEffect(() => {
    if (isAdding) {
      setTimeout(() => {
        addInputRef.current?.focus();
      }, 50);
    }
  }, [isAdding]);

  // Handle option selection
  const handleSelect = (opt) => {
    if (isEditMode) return;
    if (name) {
      onChange?.({ target: { name, value: opt } });
    } else {
      onChange?.(opt);
    }
    setIsOpen(false);
    setQuery('');
  };

  // Add new option
  const handleAdd = async (textToAdd) => {
    const trimmed = (textToAdd || newOptionValue || '').trim();
    if (!trimmed) return;

    if (stringOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      handleSelect(trimmed);
      setIsAdding(false);
      setNewOptionValue('');
      setQuery('');
      return;
    }

    try {
      setIsSubmittingAdd(true);
      if (onAddOption) {
        await onAddOption(trimmed);
      }
      const updated = [...stringOptions, trimmed];
      setLocalOptions(updated);
      onOptionsChange?.(updated);

      // Auto-select the newly added option
      handleSelect(trimmed);
      setIsAdding(false);
      setNewOptionValue('');
      setQuery('');
    } catch (err) {
      console.error('Error adding option:', err);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Save edit for existing option
  const handleSaveEdit = async (oldVal, newVal) => {
    const trimmed = (newVal || '').trim();
    if (!trimmed || trimmed.toLowerCase() === oldVal.toLowerCase()) {
      setEditingItem(null);
      return;
    }

    try {
      setIsSubmittingEdit(true);
      if (onEditOption) {
        await onEditOption(oldVal, trimmed);
      }
      const updated = stringOptions.map((o) => (o === oldVal ? trimmed : o));
      setLocalOptions(updated);
      onOptionsChange?.(updated);

      // If current value was the edited option, update selection
      if (value === oldVal) {
        if (name) {
          onChange?.({ target: { name, value: trimmed } });
        } else {
          onChange?.(trimmed);
        }
      }
      setEditingItem(null);
    } catch (err) {
      console.error('Error updating option:', err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete option
  const handleDelete = async (optToDelete) => {
    try {
      setDeletingItem(optToDelete);
      if (onDeleteOption) {
        await onDeleteOption(optToDelete);
      }
      const updated = stringOptions.filter((o) => o !== optToDelete);
      setLocalOptions(updated);
      onOptionsChange?.(updated);

      // If deleted item was selected, clear selection
      if (value === optToDelete) {
        if (name) {
          onChange?.({ target: { name, value: '' } });
        } else {
          onChange?.('');
        }
      }
    } catch (err) {
      console.error('Error deleting option:', err);
    } finally {
      setDeletingItem(null);
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* ── Trigger Button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-11 px-3.5 pr-9 flex items-center justify-between rounded-xl border text-xs font-semibold transition-all
          bg-white dark:bg-[#1a1714]
          ${
            error
              ? 'border-red-400 ring-1 ring-red-300'
              : isOpen
              ? 'border-[#00a76b] ring-1 ring-[#00a76b]/30 shadow-[0_0_0_3px_rgba(0,167,107,0.08)]'
              : 'border-slate-200 dark:border-[#38352e] hover:border-[#00a76b]/50'
          }
          ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-[#14120f]' : 'cursor-pointer'}
        `}
      >
        <span className="truncate">{value || placeholder || `Select ${label}...`}</span>
        <ChevronDown
          size={15}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#00a76b]' : ''
          }`}
        />
      </button>

      {/* ── Dropdown Popover ── */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-[9999] left-0 right-0 mt-1.5 bg-white dark:bg-[#181612] border border-slate-200 dark:border-[#38352e] rounded-2xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 flex flex-col space-y-2 select-none"
        >
          {/* Top: Full-Width Quick Search Bar */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#12100d] border border-slate-200/80 dark:border-[#2a261f]">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
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

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-[#38352e] pr-0.5">
            {filteredOptions.map((opt, idx) => {
              const isSelected = value === opt;
              const isEditing = editingItem === opt;
              const isDeleting = deletingItem === opt;
              const isDragging = activeDragIndex === idx;

              if (isEditing) {
                return (
                  <div
                    key={opt}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full p-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(opt, editingText);
                        }
                        if (e.key === 'Escape') {
                          setEditingItem(null);
                        }
                      }}
                      autoFocus
                      className="flex-1 bg-white dark:bg-[#1a1714] px-2 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                      placeholder="Rename..."
                    />
                    <button
                      type="button"
                      disabled={isSubmittingEdit}
                      onClick={() => handleSaveEdit(opt, editingText)}
                      className="p-1.5 rounded-lg bg-[#00a76b] hover:bg-[#008f5c] text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Save"
                    >
                      {isSubmittingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingEdit}
                      onClick={() => setEditingItem(null)}
                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-[#25201b] dark:hover:bg-[#322b24] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
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
                  data-option-index={idx}
                  onClick={() => handleSelect(opt)}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 select-none ${
                    isDragging
                      ? 'opacity-40 bg-emerald-50 dark:bg-emerald-950/40 border border-dashed border-[#00a76b] scale-[0.98]'
                      : isSelected
                      ? 'bg-[#00a76b]/10 text-[#00a76b] dark:bg-[#00a76b]/15 font-bold cursor-pointer'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#25201b] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Up/Down buttons and Drag Handle ONLY in Edit Mode */}
                    {isEditMode && !query.trim() && (
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col -space-y-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => handleMoveOption(idx, -1, e)}
                            className="p-0.5 text-slate-400 hover:text-[#00a76b] disabled:opacity-20 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp size={11} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === filteredOptions.length - 1}
                            onClick={(e) => handleMoveOption(idx, 1, e)}
                            className="p-0.5 text-slate-400 hover:text-[#00a76b] disabled:opacity-20 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown size={11} strokeWidth={2.5} />
                          </button>
                        </div>
                        <div
                          onPointerDown={(e) => handlePointerDown(e, idx)}
                          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-[#00a76b] hover:bg-slate-200/60 dark:hover:bg-[#28241e] rounded transition-colors flex items-center justify-center shrink-0 touch-none"
                          title="Drag to reorder"
                        >
                          <GripVertical size={13} className="pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Dot indicator */}
                    {isSelected ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00a76b] shrink-0 pointer-events-none" />
                    ) : (
                      <span className="w-1.5 h-1.5 shrink-0 pointer-events-none" />
                    )}
                    <span className="truncate pointer-events-none">{opt}</span>
                  </div>

                  {/* Edit / Delete actions ONLY when in edit mode */}
                  {isEditMode && (
                    <div
                      className="flex items-center gap-1 ml-2 shrink-0 animate-in fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(opt);
                          setEditingText(opt);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-[#00a76b] hover:bg-slate-100 dark:hover:bg-[#2a261f] transition-colors cursor-pointer"
                        title={`Rename "${opt}"`}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(opt);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
                        title={`Delete "${opt}"`}
                      >
                        {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="py-4 text-center text-slate-400 dark:text-slate-500 text-xs">
                {query.trim() ? `No matching ${label.toLowerCase()} found.` : 'No options available.'}
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="border-t border-slate-100 dark:border-[#28241e] pt-1.5">
            {!isEditMode ? (
              /* Normal mode: Just the "Edit" button at bottom right */
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(true);
                    setIsAdding(false);
                    setEditingItem(null);
                  }}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-slate-50 dark:bg-[#1f1b16] border border-slate-200 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:text-[#00a76b] hover:border-[#00a76b]/40"
                  title={`Manage ${label.toLowerCase()}s`}
                >
                  <Pencil size={11} />
                  <span>Edit</span>
                </button>
              </div>
            ) : (
              /* Edit mode: Shows "+ Add new [label]" and "Done" button */
              <div className="space-y-1.5">
                {isAdding ? (
                  /* Inline Add Box */
                  <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-[#12100d] border border-slate-200 dark:border-[#2a261f] flex items-center gap-1.5 animate-in fade-in duration-150">
                    <input
                      ref={addInputRef}
                      type="text"
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAdd();
                        }
                        if (e.key === 'Escape') {
                          setIsAdding(false);
                          setNewOptionValue('');
                        }
                      }}
                      placeholder={`New ${label.toLowerCase()} name...`}
                      className="flex-1 bg-white dark:bg-[#1a1714] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#38352e] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] font-semibold"
                    />
                    <button
                      type="button"
                      disabled={isSubmittingAdd || !newOptionValue.trim()}
                      onClick={() => handleAdd()}
                      className="p-1.5 rounded-lg bg-[#00a76b] hover:bg-[#008f5c] text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Add"
                    >
                      {isSubmittingAdd ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setNewOptionValue('');
                      }}
                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-[#25201b] dark:hover:bg-[#322b24] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                      title="Cancel"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  /* Action bar with Add Button on left and Done Button on right */
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(true)}
                      className="h-7 px-2.5 text-xs font-bold text-[#00a76b] bg-[#00a76b]/10 hover:bg-[#00a76b]/20 dark:bg-[#00a76b]/15 rounded-lg border border-[#00a76b]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      <span>Add new {label.toLowerCase()}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsEditMode(false);
                        setIsAdding(false);
                        setEditingItem(null);
                      }}
                      className="h-7 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-[#00a76b] hover:bg-[#008f5c] text-white shadow-xs"
                      title="Exit edit mode"
                    >
                      <Check size={12} strokeWidth={2.5} />
                      <span>Done</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableSelect;
