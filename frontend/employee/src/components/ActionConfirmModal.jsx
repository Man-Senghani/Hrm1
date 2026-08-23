import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, RefreshCw, X, ArrowRight } from 'lucide-react';

const ActionConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Override Leave Decision",
  subtitle = "Are you sure you want to override this decision?",
  currentStatus,
  targetStatus,
  requireReason = true,
  reasonPlaceholder = "Enter reason for decision override...",
  confirmText = "Confirm Override",
  confirmVariant = "danger", // 'danger' | 'success' | 'primary'
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (requireReason && !reason.trim()) {
      setError('Please provide a reason before confirming.');
      return;
    }
    onConfirm(reason.trim());
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    const st = status.toLowerCase();
    let bg = 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    if (st === 'approved') bg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
    if (st === 'rejected') bg = 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800';
    if (st === 'pending') bg = 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800';

    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${bg}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              confirmVariant === 'danger' ? 'bg-red-50 dark:bg-red-950/40 text-red-500' :
              confirmVariant === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500' :
              'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500'
            }`}>
              {confirmVariant === 'danger' ? <AlertTriangle size={20} /> :
               confirmVariant === 'success' ? <CheckCircle2 size={20} /> :
               <RefreshCw size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Please review and confirm your decision</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Status Change Preview */}
          {(currentStatus || targetStatus) && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5 border border-gray-150 dark:border-gray-800 flex items-center justify-around">
              <div className="text-center">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Current Status</span>
                {getStatusBadge(currentStatus)}
              </div>
              <ArrowRight size={16} className="text-gray-400 shrink-0" />
              <div className="text-center">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">New Status</span>
                {getStatusBadge(targetStatus)}
              </div>
            </div>
          )}

          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed">
            {subtitle}
          </p>

          {/* Reason input field */}
          {requireReason && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Reason for Decision Override <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(''); }}
                placeholder={reasonPlaceholder}
                rows={3}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all resize-none`}
                autoFocus
              />
              {error && <p className="text-[11px] font-semibold text-red-500 mt-1">{error}</p>}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                confirmVariant === 'danger'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/20'
                  : confirmVariant === 'success'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/20'
              }`}
            >
              {loading && <RefreshCw size={14} className="animate-spin" />}
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionConfirmModal;
