import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Search, Filter, CheckCircle2, XCircle, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import CustomDatePicker from '../CustomDatePicker';
import ActionConfirmModal from '../ActionConfirmModal';

const PendingApprovalQueue = ({ onAction }) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [requestFilter, setRequestFilter] = useState('pending');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    cancellation_pending: 0,
    rejected: 0,
    cancelled: 0
  });

  const fetchPending = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        status: requestFilter,
      });
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const res = await axios.get(`/api/leaves/manager/pending?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setLeaves(res.data.data || []);
      if (res.data.counts) {
        setCounts(res.data.counts);
      }
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.pages);
        setTotalItems(res.data.pagination.total);
      }
    } catch (err) {
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [currentPage, requestFilter, filterStartDate, filterEndDate]);

  useEffect(() => {
    const handleBulkApproval = async () => {
      if (!leaves || leaves.length === 0) {
        toast.error('No pending leave requests to approve.');
        return;
      }

      const confirmApprove = window.confirm(`Are you sure you want to approve all ${leaves.length} pending leave requests?`);
      if (!confirmApprove) return;

      try {
        const res = await axios.put('/api/leaves/manager/bulk-approve', { ids: leaves.map(l => l._id) }, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        toast.success(res.data.message || 'Bulk approval successful');
        fetchPending();
        if (onAction) onAction();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to perform bulk approval');
      }
    };

    window.addEventListener('trigger-bulk-approval', handleBulkApproval);
    return () => window.removeEventListener('trigger-bulk-approval', handleBulkApproval);
  }, [leaves]);

  const handleApprove = async (id) => {
    try {
      await axios.put(`/api/leaves/manager-approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Leave approved');
      fetchPending();
      if (onAction) onAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve leave');
    }
  };

  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    leaveId: null,
    loading: false
  });

  const handleReject = (id) => {
    setRejectModal({ isOpen: true, leaveId: id, loading: false });
  };

  const confirmReject = async (reason) => {
    try {
      setRejectModal(prev => ({ ...prev, loading: true }));
      await axios.put(`/api/leaves/reject/${rejectModal.leaveId}`, { reason }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      toast.success('Leave request rejected');
      setRejectModal({ isOpen: false, leaveId: null, loading: false });
      fetchPending();
      if (onAction) onAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject leave');
      setRejectModal(prev => ({ ...prev, loading: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const displayLeaves = leaves || [];
  const displayTotalItems = totalItems || 0;
  const displayTotalPages = totalPages || 1;

  const startEntry = displayTotalItems === 0 ? 0 : (currentPage - 1) * 10 + 1;
  const endEntry = Math.min(currentPage * 10, displayTotalItems);

  const filteredLeaves = displayLeaves.filter(leave => {
    if (!searchTerm) return true;
    const empName = leave.user?.name || 'Unknown';
    return empName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 min-h-[620px] flex flex-col justify-between transition-colors duration-300 hover:!border-violet-500 dark:hover:!border-violet-400">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employee Leave Requests</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Review, approve, or reject employee leave applications</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <CustomDatePicker
              name="filterStartDate"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              placeholder="Start Date"
              className="w-26 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg h-9 flex items-center text-[11px] font-semibold text-gray-700 dark:text-gray-300"
            />
            <span className="text-gray-400 text-xs font-bold">to</span>
            <CustomDatePicker
              name="filterEndDate"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              placeholder="End Date"
              align="right"
              className="w-26 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg h-9 flex items-center text-[11px] font-semibold text-gray-700 dark:text-gray-300"
            />
            {(filterStartDate || filterEndDate) && (
              <button
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase px-2 py-1 bg-red-50 dark:bg-red-950/20 rounded-md transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <div className="relative">
            <button
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="flex items-center gap-1.5 text-xs font-bold bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg h-9 text-gray-600 dark:text-gray-300 outline-none cursor-pointer transition-all"
            >
              {requestFilter === 'all' && `All (${counts.all || 0})`}
              {requestFilter === 'pending' && `Pending (${counts.pending || 0})`}
              {requestFilter === 'approved' && `Approved (${counts.approved || 0})`}
              {requestFilter === 'cancellation_pending' && `Cancellation Requested (${counts.cancellation_pending || 0})`}
              {requestFilter === 'rejected' && `Rejected (${counts.rejected || 0})`}
              {requestFilter === 'cancelled' && `Cancelled (${counts.cancelled || 0})`}
              <ChevronDown size={14} className={`transition-transform duration-200 ${filterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {filterDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFilterDropdownOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  {[
                    { value: 'all', label: 'All', count: counts.all || 0 },
                    { value: 'pending', label: 'Pending', count: counts.pending || 0 },
                    { value: 'approved', label: 'Approved', count: counts.approved || 0 },
                    { value: 'cancellation_pending', label: 'Cancellation Requested', count: counts.cancellation_pending || 0 },
                    { value: 'rejected', label: 'Rejected', count: counts.rejected || 0 },
                    { value: 'cancelled', label: 'Cancelled', count: counts.cancelled || 0 }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setRequestFilter(opt.value); setCurrentPage(1); setFilterDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${requestFilter === opt.value ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                    >
                      {opt.label} ({opt.count})
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 flex flex-col justify-between">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 text-xs text-center">
              <th className="pb-3 font-semibold text-left">Employee</th>
              <th className="pb-3 font-semibold">Leave Type</th>
              <th className="pb-3 font-semibold">From</th>
              <th className="pb-3 font-semibold">To</th>
              <th className="pb-3 font-semibold">Duration</th>
              <th className="pb-3 font-semibold">Reason</th>
              <th className="pb-3 font-semibold">Status</th>
              {(requestFilter === 'pending' || requestFilter === 'cancellation_pending') && (
                <th className="pb-3 font-semibold text-right">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="py-28 text-center text-gray-500 font-semibold">Loading leave requests...</td>
              </tr>
            ) : filteredLeaves.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-36 text-center text-gray-500 font-semibold">No leave requests found.</td>
              </tr>
            ) : (
              filteredLeaves.map((leave) => (
                <tr key={leave._id} className="border-b border-gray-50 dark:border-gray-850 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                  <td className="py-3.5 text-left flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100 shadow-sm shrink-0">
                      {leave.user?.name ? leave.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-900 dark:text-white truncate">{leave.user?.name || 'Unknown'}</span>
                      <span className="text-[10px] text-gray-400 font-medium truncate">{leave.user?.email || 'No email'}</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${leave.leaveType === 'sick' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                        leave.leaveType === 'casual' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' :
                          'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                      }`}>
                      {leave.leaveType || leave.type}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400 font-medium">{formatDate(leave.startDate)}</td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400 font-medium">{formatDate(leave.endDate)}</td>
                  <td className="py-2.5 font-bold text-gray-900 dark:text-white">{leave.totalDays || 0} day(s)</td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400 font-medium max-w-[150px] truncate" title={leave.reason}>{leave.reason || '-'}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${leave.status === 'approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        leave.status === 'rejected' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                          leave.status === 'cancellation_pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' :
                            leave.status === 'cancelled' ? 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400' :
                              'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                      }`}>
                      {leave.status}
                    </span>
                  </td>
                  {(requestFilter === 'pending' || requestFilter === 'cancellation_pending') && (
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleApprove(leave._id)}
                          className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                          title="Approve"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={() => handleReject(leave._id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Page {currentPage} of {displayTotalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Prev
          </button>
          <button
            disabled={currentPage === displayTotalPages || displayTotalPages === 0}
            onClick={() => setCurrentPage(prev => Math.min(displayTotalPages, prev + 1))}
            className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      {/* Reject Leave Confirmation Modal */}
      <ActionConfirmModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, leaveId: null, loading: false })}
        onConfirm={confirmReject}
        title="Reject Leave Request"
        subtitle="Are you sure you want to reject this employee's leave request?"
        requireReason={true}
        reasonPlaceholder="Enter reason for rejecting leave request..."
        confirmText="Confirm Rejection"
        confirmVariant="danger"
        loading={rejectModal.loading}
      />
    </div>
  );
};

export default PendingApprovalQueue;
