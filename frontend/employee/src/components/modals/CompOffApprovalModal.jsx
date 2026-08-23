import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, Check, XCircle } from 'lucide-react';

const CompOffApprovalModal = ({ isOpen, onClose, onSuccess }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/comp-off/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch comp-off requests');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleAction = async (id, action) => {
    try {
      let payload = { status: action === 'approve' ? 'approved' : 'rejected' };
      if (action === 'reject') {
        const reason = prompt('Reason for rejection?');
        if (reason === null) return;
        payload.rejectionReason = reason;
      }
      
      await axios.put(`/api/comp-off/${id}/status`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      fetchRequests();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error('Failed to update request status');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pt-3 px-6 pb-6 relative shadow-2xl flex flex-col justify-between border-l-2 border-gray-300 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-155 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Comp-Off Approvals</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col pt-4 h-full overflow-hidden">
          <div className="overflow-y-auto pr-1 flex-1 space-y-4 pb-2">
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="py-8 text-center text-gray-500 font-bold text-xs bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No pending Comp-Off requests
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req._id} className="p-4 rounded-xl border border-gray-150 dark:border-gray-800 space-y-2 bg-gray-50 dark:bg-[#0f172a]/50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{req.employeeId?.name || req.employee || 'Employee'}</span>
                      <span className="text-xs text-gray-500">
                        {req.dateWorked ? new Date(req.dateWorked).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{req.reason}</p>
                    <div className="flex justify-end gap-2 pt-2">
                      {req.status === 'pending' ? (
                        <>
                          <button onClick={() => handleAction(req._id, 'reject')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1">
                            <XCircle size={14} /> Reject
                          </button>
                          <button onClick={() => handleAction(req._id, 'approve')} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-xs font-bold flex items-center gap-1">
                            <Check size={14} /> Approve
                          </button>
                        </>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-bold rounded-lg capitalize ${
                          req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs transition-colors w-full">Close</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CompOffApprovalModal;
