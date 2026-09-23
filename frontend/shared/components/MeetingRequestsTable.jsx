import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Clock, Calendar, Users, CheckCircle, XCircle, AlertTriangle,
  Search, Filter, RefreshCw, ChevronLeft, ChevronRight, Check, X,
  FileText, Plus, MessageSquare, ShieldCheck, UserCheck, Timer
} from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';
import AttendanceDatePicker from './AttendanceDatePicker';

const STATUS_BADGES = {
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
    dot: 'bg-amber-500',
    label: 'Pending Review'
  },
  approved: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
    label: 'Approved'
  },
  rejected: {
    bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60',
    dot: 'bg-rose-500',
    label: 'Rejected'
  }
};

// ── ReasonCell: fixed-position tooltip (no clipping) that opens UP or DOWN ──
const ReasonCell = ({ reason }) => {
  const textRef = useRef(null);
  const [isClamped, setIsClamped] = useState(false);
  const [tooltip, setTooltip] = useState(null); // { top, left, dir }

  useEffect(() => {
    const el = textRef.current;
    if (el) setIsClamped(el.scrollHeight > el.clientHeight + 1);
  }, [reason]);

  const showTooltip = () => {
    const el = textRef.current;
    if (!el || !isClamped) return;
    const rect = el.getBoundingClientRect();
    const tipW = 288; // w-72
    const spaceAbove = rect.top;
    const dir = spaceAbove < 140 ? 'bottom' : 'top';
    let left = Math.max(8, Math.min(rect.left, window.innerWidth - tipW - 8));
    setTooltip({ dir, left, rectTop: rect.top, rectBottom: rect.bottom });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <div className="relative" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
      <p ref={textRef} className="font-semibold line-clamp-2 cursor-default">
        {reason}
      </p>
      {tooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            zIndex: 999999,
            left: tooltip.left,
            ...(tooltip.dir === 'top'
              ? { bottom: window.innerHeight - tooltip.rectTop + 8 }
              : { top: tooltip.rectBottom + 8 }
            ),
            width: 288,
            pointerEvents: 'none'
          }}
          className="bg-slate-800 dark:bg-[#071e17] text-white text-xs rounded-xl px-3 py-2.5 shadow-2xl border border-slate-600 dark:border-[#1a4a35] leading-relaxed"
        >
          {reason}
          {tooltip.dir === 'top' ? (
            <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-800 dark:border-t-[#071e17]" />
          ) : (
            <div className="absolute bottom-full left-4 border-4 border-transparent border-b-slate-800 dark:border-b-[#071e17]" />
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

const MeetingRequestsTable = ({
  userRole = 'employee',
  currentUserId = null,
  onStatusChanged = null
}) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Drawer / Review state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewMode, setReviewMode] = useState('approve'); // 'approve' | 'reject' | 'view'
  const [finalMinutesInput, setFinalMinutesInput] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [rejectRemarks, setRejectRemarks] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // New Request Modal (for logged-in user)
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [newMinutes, setNewMinutes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableInactiveMins, setAvailableInactiveMins] = useState(null);
  const [newSubmitting, setNewSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const reviewSubmittingRef = useRef(false);
  const rejectSubmittingRef = useRef(false);

  const isInactiveZero = availableInactiveMins !== null && availableInactiveMins <= 0;
  const isOverInactive = availableInactiveMins !== null && availableInactiveMins > 0 && Number(newMinutes) > availableInactiveMins;
  const isSubmitDisabled = newSubmitting || availableInactiveMins === null || isInactiveZero || isOverInactive || !newMinutes || !newReason.trim() || Number(newMinutes) <= 0;

  const sessionUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const effectiveUserId = currentUserId || sessionUser._id || sessionUser.id || sessionStorage.getItem('userId') || '';
  const effectiveUserRole = (userRole || sessionUser.role || 'employee').toLowerCase();
  const isReviewer = ['admin', 'hr', 'manager'].includes(effectiveUserRole);

  // 📡 Fetch Requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const params = {
        page,
        limit: pageSize
      };
      if (statusFilter !== 'All') params.status = statusFilter.toLowerCase();
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedDate) {
        params.date = selectedDate;
        if (selectedDate.includes(':')) {
          const [s, e] = selectedDate.split(':');
          params.startDate = s;
          params.endDate = e;
        } else {
          params.startDate = selectedDate;
          params.endDate = selectedDate;
        }
      }

      const res = await axios.get('/api/time/offline-requests', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      setRequests(res.data.requests || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);

    } catch (err) {
      console.error('Failed to load meeting requests:', err);
      toast.error('Failed to load meeting requests');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, searchQuery, selectedDate]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // 🔗 Auto-open New Request drawer if ?action=new-offline-request is in the URL
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new-offline-request') {
        handleOpenNewRequest();
        const url = new URL(window.location);
        url.searchParams.delete('action');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (_) {}
  }, []);

  // Check available inactive time for new request modal
  const fetchTodayInactiveCap = async (dateStr) => {
    try {
      const token = sessionStorage.getItem('token');
      const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      const activeUserId = currentUserId || currentUser._id || currentUser.id;

      let idleSec = 0;
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. If date is today, check live /api/time/status first for authoritative live idle time
      if (dateStr === todayStr) {
        try {
          const statusRes = await axios.get('/api/time/status', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (statusRes.data && statusRes.data.idleTime !== undefined) {
            idleSec = Number(statusRes.data.idleTime) || 0;
          }
        } catch (_) {}
      }

      // 2. Query /api/time/date/:date (handles both array and single-object returns)
      if (idleSec === 0 || dateStr !== todayStr) {
        const res = await axios.get(`/api/time/date/${dateStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(res.data)) {
          const myRec = res.data.find(r => {
            const empId = r.employeeId?._id || r.employeeId?.id || r.employeeId;
            return String(empId) === String(activeUserId);
          });
          if (myRec) {
            idleSec = Math.max(idleSec, Number(myRec.idleTime) || 0);
          }
        } else if (res.data && typeof res.data === 'object') {
          idleSec = Math.max(idleSec, Number(res.data.idleTime) || 0);
        }
      }

      const available = Math.floor(idleSec / 60);
      setAvailableInactiveMins(available);
      if (available <= 0) {
        setNewMinutes('');
      }
    } catch (err) {
      setAvailableInactiveMins(null);
    }
  };

  const handleOpenNewRequest = () => {
    const today = new Date().toISOString().split('T')[0];
    setNewDate(today);
    setNewReason('');
    setNewMinutes('');
    fetchTodayInactiveCap(today);
    setIsNewRequestOpen(true);
  };

  const handleSubmitNewRequest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (submittingRef.current || newSubmitting) return;

    if (isInactiveZero || (availableInactiveMins !== null && availableInactiveMins <= 0)) {
      return toast.error('Inactive time is 0 mins. You cannot submit a meeting request without recorded inactive time.');
    }

    if (!newReason.trim()) {
      return toast.error('Meeting reason is required.');
    }
    const mins = parseInt(newMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      return toast.error('Duration in minutes is required and must be greater than 0.');
    }

    if (availableInactiveMins !== null && mins > availableInactiveMins) {
      return toast.error(`Inactive time is not sufficient for this request. Maximum allowed duration is ${availableInactiveMins} mins.`);
    }

    submittingRef.current = true;
    setNewSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.post('/api/time/offline-request', {
        reason: newReason.trim(),
        durationMinutes: mins,
        date: newDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Meeting request submitted successfully!');
      setIsNewRequestOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
      return;
    } finally {
      submittingRef.current = false;
      setNewSubmitting(false);
    }

    // Refresh data after successful submission
    try {
      fetchRequests();
      if (onStatusChanged) onStatusChanged();
    } catch (refreshErr) {
      console.error('Error refreshing requests after submission:', refreshErr);
    }
  };

  const checkCanReview = useCallback((item) => {
    if (!item || item.status !== 'pending') return false;
    const isOwn = Boolean(effectiveUserId && String(item.employeeId || '') === String(effectiveUserId));
    const tRole = (item.employeeRole || 'employee').toLowerCase();
    if (effectiveUserRole === 'admin') return true;
    if (effectiveUserRole === 'hr') return !isOwn && tRole !== 'hr';
    if (effectiveUserRole === 'manager') return !isOwn && tRole === 'employee';
    return false;
  }, [effectiveUserId, effectiveUserRole]);

  // Open drawer on row click
  const handleRowClick = (item) => {
    setSelectedRequest(item);
    if (checkCanReview(item)) {
      setReviewMode('approve');
      setFinalMinutesInput(String(item.requestedDurationMinutes || ''));
      setReviewRemarks('');
      setRejectRemarks('');
    } else {
      setReviewMode('view');
    }
  };

  // Open Approval Review Drawer
  const handleOpenReviewModal = (reqItem) => {
    setSelectedRequest(reqItem);
    setReviewMode('approve');
    setFinalMinutesInput(String(reqItem.requestedDurationMinutes || ''));
    setReviewRemarks('');
  };

  // Open Rejection Drawer
  const handleOpenRejectModal = (reqItem) => {
    setSelectedRequest(reqItem);
    setReviewMode('reject');
    setRejectRemarks('');
  };

  // Submit Approval
  const handleConfirmApproval = async () => {
    if (!selectedRequest || reviewSubmittingRef.current || reviewSubmitting) return;
    const finalMins = parseInt(finalMinutesInput, 10);
    if (isNaN(finalMins) || finalMins <= 0) {
      return toast.error('Approved duration must be at least 1 minute');
    }

    // Inactive Time Ceiling check
    const maxAllowed = selectedRequest.recordedInactiveMinutes || 0;
    if (maxAllowed > 0 && finalMins > maxAllowed) {
      return toast.error(`Final approved time (${finalMins} mins) cannot exceed recorded inactive time (${maxAllowed} mins). You can approve a lower number.`);
    }
    reviewSubmittingRef.current = true;
    setReviewSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`/api/time/offline-request/${selectedRequest._id}/status`, {
        status: 'approved',
        finalMinutes: finalMins,
        reviewRemarks: reviewRemarks.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Meeting request approved for ${finalMins} minutes!`);
      setSelectedRequest(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
      return;
    } finally {
      reviewSubmittingRef.current = false;
      setReviewSubmitting(false);
    }

    // Refresh data after successful API update
    try {
      fetchRequests();
      if (onStatusChanged) onStatusChanged();
    } catch (refreshErr) {
      console.error('Error refreshing requests after approval:', refreshErr);
    }
  };

  // Submit Rejection
  const handleConfirmRejection = async () => {
    if (!selectedRequest || rejectSubmittingRef.current || rejectSubmitting) return;

    rejectSubmittingRef.current = true;
    setRejectSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`/api/time/offline-request/${selectedRequest._id}/status`, {
        status: 'rejected',
        reviewRemarks: rejectRemarks.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Meeting request rejected.');
      setSelectedRequest(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
      return;
    } finally {
      rejectSubmittingRef.current = false;
      setRejectSubmitting(false);
    }

    // Refresh data after successful API update
    try {
      fetchRequests();
      if (onStatusChanged) onStatusChanged();
    } catch (refreshErr) {
      console.error('Error refreshing requests after rejection:', refreshErr);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#071e17] rounded-2xl border border-[#e2eae7] dark:border-[#133029] p-4 sm:p-5 shadow-sm">
      {/* ── Table Header & Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Timer size={18} className="text-emerald-500 shrink-0" />
            <span>Meeting & Offline Time Requests</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              {total}
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-[#829e92] mt-0.5">
            Review and credit offline meeting hours converted from recorded inactive time.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Picker */}
          <div className="w-auto min-w-[145px]">
            <AttendanceDatePicker
              value={selectedDate}
              onChange={(val) => { setSelectedDate(val); setPage(1); }}
              placeholder="dd-mm-yyyy"
              allowRange={true}
              align="right"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] p-1 rounded-xl">
            {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-white dark:bg-[#133029] text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-[#829e92] hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* New Request Button */}
          <button
            onClick={handleOpenNewRequest}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>New Request</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchRequests}
            title="Refresh Requests"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {(searchQuery || selectedDate || statusFilter !== 'All') && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedDate(''); setStatusFilter('All'); setPage(1); }}
              className="px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Search Filter (Reviewers Only) ── */}
      {isReviewer && (
        <div className="w-full relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#829e92]" />
          <input
            type="text"
            placeholder="Search employee, ID, reason..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0d2a22] border border-[#e2eae7] dark:border-[#133029] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-[#829e92] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </div>
      )}

      {/* ── Table Container (Auto Height) ── */}
      <div className="h-auto overflow-x-auto rounded-xl border border-[#e2eae7] dark:border-[#133029]">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-100 dark:bg-[#0d2a22] border-b border-[#e2eae7] dark:border-[#133029]">
              {isReviewer && (
                <th className="px-3.5 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider">
                  Employee
                </th>
              )}
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider">
                Date
              </th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider">
                Reason / Details
              </th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider text-center">
                Inactive Time Cap
              </th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider text-center">
                Requested
              </th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider text-center">
                Final Approved
              </th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider text-center">
                Status
              </th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-slate-500 dark:text-[#829e92] uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2eae7] dark:divide-[#133029]">
            {loading ? (
              <tr>
                <td colSpan={isReviewer ? 8 : 7} className="py-10 text-center text-slate-400 dark:text-[#829e92]">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-emerald-500" />
                    <span className="font-semibold">Loading requests...</span>
                  </div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={isReviewer ? 8 : 7} className="py-10 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Timer size={28} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No meeting requests found</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {isReviewer
                        ? 'Requests submitted by team members will appear here for approval.'
                        : 'Submit a meeting request to convert offline meeting time into work hours.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((item) => {
                const badge = STATUS_BADGES[item.status] || STATUS_BADGES.pending;
                const isOwnRequest = Boolean(effectiveUserId && String(item.employeeId || '') === String(effectiveUserId));
                const targetRole = (item.employeeRole || 'employee').toLowerCase();

                const canReview = checkCanReview(item);

                let pendingLabel = 'Awaiting Review';
                if (targetRole === 'hr') {
                  pendingLabel = 'Awaiting Admin Review';
                } else if (targetRole === 'manager') {
                  pendingLabel = 'Awaiting HR Review';
                } else {
                  pendingLabel = isOwnRequest ? 'Awaiting Review' : 'Pending Review';
                }

                return (
                  <tr
                    key={item._id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-50 dark:hover:bg-[#0d2a22]/50 cursor-pointer transition-colors"
                  >
                    {/* Employee Info */}
                    {isReviewer && (
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 dark:text-white">
                        <div className="flex flex-col">
                          <span className="font-extrabold">{item.employeeName}</span>
                          <span className="text-[10px] text-slate-400 dark:text-[#829e92] font-semibold">
                            {item.empId || item.employeeRole}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Date */}
                    <td className="px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap">
                      {item.date}
                    </td>

                    {/* Reason */}
                    <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 max-w-[220px]">
                      <ReasonCell reason={item.reason} />
                      {item.reviewRemarks && (
                        <p className="text-[10px] text-slate-400 dark:text-[#829e92] mt-0.5 italic">
                          Remark: {item.reviewRemarks}
                        </p>
                      )}
                    </td>

                    {/* Recorded Inactive Time (Ceiling) */}
                    <td className="px-3.5 py-2.5 text-center font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0d2a22] font-mono text-[11px]">
                        {item.recordedInactiveMinutes || 0}m
                      </span>
                    </td>

                    {/* Requested Duration */}
                    <td className="px-3.5 py-2.5 text-center font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {item.requestedDurationMinutes}m
                    </td>

                    {/* Final Approved Duration */}
                    <td className="px-3.5 py-2.5 text-center font-black whitespace-nowrap">
                      {item.status === 'approved' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                          {item.approvedDurationMinutes}m
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">--</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      {canReview ? (
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReviewModal(item);
                            }}
                            title="Approve / Adjust Final Timer"
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                          >
                            <Check size={12} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRejectModal(item);
                            }}
                            title="Reject Request"
                            className="p-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg font-bold transition-all cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : item.status === 'pending' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                          {pendingLabel}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-[#829e92]">
                          {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : 'Logged'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-[#829e92]">
          <span>Page {page} of {totalPages} ({total} total requests)</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#e2eae7] dark:border-[#133029] disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-[#0d2a22] transition-all cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  page === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'hover:bg-slate-50 dark:hover:bg-[#0d2a22] text-slate-600 dark:text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#e2eae7] dark:border-[#133029] disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-[#0d2a22] transition-all cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── UNIFIED REQUEST DETAILS & REVIEW SIDEBAR (Right-side slide-over) ── */}
      {selectedRequest && (
        <div
          onClick={() => setSelectedRequest(null)}
          className="fixed inset-0 z-[99999] bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex justify-end animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-white dark:bg-[#0a1f1a] border-l border-[#e2eae7] dark:border-[#133029] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#e2eae7] dark:border-[#133029]">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    reviewMode === 'reject' || selectedRequest.status === 'rejected'
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                      : reviewMode === 'approve' && selectedRequest.status === 'pending'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {reviewMode === 'reject' || selectedRequest.status === 'rejected' ? (
                      <XCircle size={20} />
                    ) : reviewMode === 'approve' && selectedRequest.status === 'pending' ? (
                      <CheckCircle size={20} />
                    ) : (
                      <Timer size={20} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {selectedRequest.status === 'pending' && checkCanReview(selectedRequest)
                        ? reviewMode === 'approve'
                          ? 'Approve Request'
                          : 'Reject Request'
                        : 'Meeting Request Details'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-[#829e92]">
                      {selectedRequest.status === 'pending' && checkCanReview(selectedRequest)
                        ? reviewMode === 'approve'
                          ? 'Adjust final approved minutes if needed'
                          : 'Provide rejection reason to employee'
                        : `Submitted for ${selectedRequest.date}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#071e17] transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mode Switcher (only for pending reviewable requests) */}
              {selectedRequest.status === 'pending' && checkCanReview(selectedRequest) && (
                <div className="mt-4 bg-slate-100 dark:bg-[#133029] p-1 rounded-xl border border-slate-200/80 dark:border-[#38352e] inline-flex items-center w-full">
                  <button
                    type="button"
                    onClick={() => setReviewMode('approve')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      reviewMode === 'approve'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-[#829e92] dark:hover:text-white'
                    }`}
                  >
                    <Check size={13} />
                    <span>Approve Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewMode('reject')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      reviewMode === 'reject'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-[#829e92] dark:hover:text-white'
                    }`}
                  >
                    <X size={13} />
                    <span>Reject Mode</span>
                  </button>
                </div>
              )}

              {/* Request Info Details Table */}
              <div className={`mt-4 rounded-xl border overflow-hidden text-xs ${
                reviewMode === 'reject' || selectedRequest.status === 'rejected'
                  ? 'border-rose-200 dark:border-rose-900/50'
                  : 'border-[#e2eae7] dark:border-[#133029]'
              }`}>
                <table className="w-full">
                  <tbody>
                    <tr className={`border-b ${
                      reviewMode === 'reject' || selectedRequest.status === 'rejected'
                        ? 'border-rose-200 dark:border-rose-900/50'
                        : 'border-[#e2eae7] dark:border-[#133029]'
                    }`}>
                      <td className={`px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold w-[38%] ${
                        reviewMode === 'reject' || selectedRequest.status === 'rejected'
                          ? 'bg-rose-50/60 dark:bg-rose-950/20'
                          : 'bg-slate-50 dark:bg-[#071e17]'
                      }`}>Employee:</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 dark:text-white text-right">
                        {selectedRequest.employeeName} {selectedRequest.empId ? `(${selectedRequest.empId})` : ''}
                      </td>
                    </tr>
                    <tr className={`border-b ${
                      reviewMode === 'reject' || selectedRequest.status === 'rejected'
                        ? 'border-rose-200 dark:border-rose-900/50'
                        : 'border-[#e2eae7] dark:border-[#133029]'
                    }`}>
                      <td className={`px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold ${
                        reviewMode === 'reject' || selectedRequest.status === 'rejected'
                          ? 'bg-rose-50/60 dark:bg-rose-950/20'
                          : 'bg-slate-50 dark:bg-[#071e17]'
                      }`}>Date:</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 dark:text-white text-right">{selectedRequest.date}</td>
                    </tr>
                    <tr className={`border-b ${
                      reviewMode === 'reject' || selectedRequest.status === 'rejected'
                        ? 'border-rose-200 dark:border-rose-900/50'
                        : 'border-[#e2eae7] dark:border-[#133029]'
                    }`}>
                      <td className={`px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold align-top ${
                        reviewMode === 'reject' || selectedRequest.status === 'rejected'
                          ? 'bg-rose-50/60 dark:bg-rose-950/20'
                          : 'bg-slate-50 dark:bg-[#071e17]'
                      }`}>Reason:</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 dark:text-white text-right leading-relaxed whitespace-pre-wrap">
                        {selectedRequest.reason}
                      </td>
                    </tr>
                    <tr className={`border-b ${
                      reviewMode === 'reject' || selectedRequest.status === 'rejected'
                        ? 'border-rose-200 dark:border-rose-900/50'
                        : 'border-[#e2eae7] dark:border-[#133029]'
                    }`}>
                      <td className={`px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold ${
                        reviewMode === 'reject' || selectedRequest.status === 'rejected'
                          ? 'bg-rose-50/60 dark:bg-rose-950/20'
                          : 'bg-slate-50 dark:bg-[#071e17]'
                      }`}>Recorded Inactive:</td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-600 dark:text-slate-300 text-right">
                        {selectedRequest.recordedInactiveMinutes || 0} mins
                      </td>
                    </tr>
                    <tr className={selectedRequest.status !== 'pending' ? `border-b ${
                      selectedRequest.status === 'rejected' ? 'border-rose-200 dark:border-rose-900/50' : 'border-[#e2eae7] dark:border-[#133029]'
                    }` : ''}>
                      <td className={`px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold ${
                        reviewMode === 'reject' || selectedRequest.status === 'rejected'
                          ? 'bg-rose-50/60 dark:bg-rose-950/20'
                          : 'bg-slate-50 dark:bg-[#071e17]'
                      }`}>Employee Requested:</td>
                      <td className="px-3.5 py-2.5 font-black text-amber-600 dark:text-amber-400 text-right">
                        {selectedRequest.requestedDurationMinutes} mins
                      </td>
                    </tr>
                    {selectedRequest.status === 'approved' && (
                      <>
                        <tr className="border-b border-[#e2eae7] dark:border-[#133029]">
                          <td className="px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold bg-emerald-50/40 dark:bg-emerald-950/20">Final Approved:</td>
                          <td className="px-3.5 py-2.5 font-black text-emerald-600 dark:text-emerald-400 text-right">{selectedRequest.approvedDurationMinutes} mins</td>
                        </tr>
                        {selectedRequest.reviewRemarks && (
                          <tr className="border-b border-[#e2eae7] dark:border-[#133029]">
                            <td className="px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold bg-slate-50 dark:bg-[#071e17]">Remarks:</td>
                            <td className="px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-300 text-right">{selectedRequest.reviewRemarks}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold bg-slate-50 dark:bg-[#071e17]">Reviewed At:</td>
                          <td className="px-3.5 py-2.5 font-semibold text-slate-500 dark:text-slate-400 text-right">
                            {selectedRequest.reviewedAt ? new Date(selectedRequest.reviewedAt).toLocaleString() : '--'}
                          </td>
                        </tr>
                      </>
                    )}
                    {selectedRequest.status === 'rejected' && (
                      <>
                        <tr className="border-b border-rose-200 dark:border-rose-900/50">
                          <td className="px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold bg-rose-50/60 dark:bg-rose-950/20">Rejection Reason:</td>
                          <td className="px-3.5 py-2.5 font-bold text-rose-600 dark:text-rose-400 text-right leading-relaxed">{selectedRequest.reviewRemarks || 'No remark provided'}</td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2.5 text-slate-400 dark:text-[#829e92] font-semibold bg-rose-50/60 dark:bg-rose-950/20">Reviewed At:</td>
                          <td className="px-3.5 py-2.5 font-semibold text-slate-500 dark:text-slate-400 text-right">
                            {selectedRequest.reviewedAt ? new Date(selectedRequest.reviewedAt).toLocaleString() : '--'}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Form Controls for Reviewers when pending */}
              {selectedRequest.status === 'pending' && checkCanReview(selectedRequest) && (
                <>
                  {reviewMode === 'approve' ? (
                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5">
                          Final Approved Time (Minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedRequest.recordedInactiveMinutes || 480}
                          value={finalMinutesInput}
                          onChange={(e) => setFinalMinutesInput(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm font-bold rounded-xl border border-[#cbd5e1] dark:border-[#133029] bg-white dark:bg-[#071e17] text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/30 outline-none"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-[#829e92] mt-1">
                          Max {selectedRequest.recordedInactiveMinutes || 0} mins (cannot exceed recorded inactive time).
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5">
                          Reviewer Remarks (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Approved for 15m meeting"
                          value={reviewRemarks}
                          onChange={(e) => setReviewRemarks(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#133029] bg-white dark:bg-[#071e17] text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/30 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5">
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5">
                        Reason for Rejection
                      </label>
                      <textarea
                        rows={4}
                        placeholder="e.g. Overlapping with scheduled sprint standup"
                        value={rejectRemarks}
                        onChange={(e) => setRejectRemarks(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#133029] bg-white dark:bg-[#071e17] text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500/30 outline-none resize-none"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar Footer */}
            {selectedRequest.status === 'pending' && checkCanReview(selectedRequest) && (
              <div className="pt-4 border-t border-[#e2eae7] dark:border-[#133029] mt-6">
                {reviewMode === 'approve' ? (
                  <button
                    type="button"
                    onClick={handleConfirmApproval}
                    disabled={reviewSubmitting}
                    className="w-full px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Check size={14} />
                    <span>{reviewSubmitting ? 'Approving...' : 'Confirm & Approve'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmRejection}
                    disabled={rejectSubmitting}
                    className="w-full px-4 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <X size={14} />
                    <span>{rejectSubmitting ? 'Rejecting...' : 'Confirm Rejection'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NEW REQUEST RIGHT-SIDE SLIDE-OVER DRAWER (Matches UI Mockup) ── */}
      {isNewRequestOpen && (
        <div
          onClick={() => setIsNewRequestOpen(false)}
          className="fixed inset-0 z-[99999] bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex justify-end animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-white dark:bg-[#0a1f1a] border-l border-[#e2eae7] dark:border-[#133029] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#e2eae7] dark:border-[#133029]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Timer size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">New Offline / Meeting Request</h3>
                    <p className="text-[11px] text-slate-500 dark:text-[#829e92]">Convert recorded inactive time to work time</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewRequestOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#071e17] transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitNewRequest} id="offline-request-form" className="space-y-4 my-5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5">
                    Meeting Date <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <CustomDatePicker
                      name="meetingDate"
                      value={newDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewDate(val);
                        fetchTodayInactiveCap(val);
                      }}
                      placeholder="Select Meeting Date"
                      className="w-full"
                      maxDate={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {/* Inactive Time Banner (Mockup Style) */}
                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-bold text-amber-800 dark:text-amber-300">Recorded Inactive Time:</span>
                  </div>
                  <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                    {availableInactiveMins !== null ? `${availableInactiveMins} Mins` : 'Calculating...'}
                  </span>
                </div>

                {isInactiveZero ? (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[13px]">Your inactive time is 0 mins</p>
                      <p className="text-xs text-rose-600/90 dark:text-rose-400/90 mt-1 leading-relaxed">
                        Your inactive time is 0 so you can't able to make request.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5">
                        Meeting Reason <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Client Call on Zoom, Product Architecture Discussion"
                        value={newReason}
                        onChange={(e) => setNewReason(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#133029] bg-white dark:bg-[#071e17] text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/30 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200">
                          Duration in Minutes <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        {availableInactiveMins !== null && availableInactiveMins > 0 && (
                          <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400">
                            Max: {availableInactiveMins} mins
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={480}
                        placeholder="e.g. 30"
                        value={newMinutes}
                        onChange={(e) => setNewMinutes(e.target.value)}
                        className={`w-full px-3.5 py-2.5 text-xs rounded-xl border transition-all outline-none font-semibold ${
                          isOverInactive
                            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                            : 'border-[#cbd5e1] dark:border-[#133029] bg-white dark:bg-[#071e17] text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/30'
                        }`}
                      />

                      {/* 🚀 Quick Fill Preset Buttons */}
                      {availableInactiveMins !== null && availableInactiveMins > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[10.5px] font-semibold text-slate-400 dark:text-[#829e92]">Quick Fill:</span>
                          {[15, 30, 45, 60].filter(m => m <= availableInactiveMins).map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setNewMinutes(String(m))}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                Number(newMinutes) === m
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-slate-100 dark:bg-[#133029] text-slate-700 dark:text-slate-300 border-[#cbd5e1] dark:border-[#1a3d34] hover:border-emerald-500'
                              }`}
                            >
                              {m}m
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setNewMinutes(String(availableInactiveMins))}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                              Number(newMinutes) === availableInactiveMins
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                            }`}
                          >
                            Full ({availableInactiveMins}m)
                          </button>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 dark:text-[#829e92] mt-1.5">
                        {availableInactiveMins !== null && availableInactiveMins > 0
                          ? `Cannot exceed your recorded inactive time (${availableInactiveMins} mins).`
                          : 'Capped at your recorded inactive time.'}
                      </p>

                      {/* 🛑 Inactive Time Insufficient Error Messages */}
                      {isOverInactive && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 mt-2.5 animate-in fade-in slide-in-from-top-1">
                          <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Inactive time is not sufficient for this request.</p>
                            <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-0.5">
                              Requested duration ({newMinutes} mins) exceeds your recorded inactive time ({availableInactiveMins} mins).
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="pt-4 border-t border-[#e2eae7] dark:border-[#133029]">
              <button
                type="submit"
                form="offline-request-form"
                disabled={isSubmitDisabled}
                className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 select-none ${
                  isSubmitDisabled
                    ? 'bg-slate-200 dark:bg-[#133029] text-slate-400 dark:text-[#829e92] cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer active:scale-[0.99]'
                }`}
              >
                <Check size={15} />
                <span>{newSubmitting ? 'Submitting...' : 'Submit Request'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRequestsTable;
