import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, CheckCircle, XCircle } from 'lucide-react';

const OnDutyApprovalModal = ({ isOpen, onClose, onSuccess }) => {
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
      const res = await axios.get('/api/on-duty/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) {
      toast.error('Failed to fetch on-duty requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status, reason = '') => {
    try {
      setLoading(true);
      await axios.put(`/api/on-duty/${id}/status`, { status, rejectionReason: reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Request ${status} successfully`);
      fetchRequests();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error('Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pt-3 px-6 pb-6 relative shadow-2xl flex flex-col justify-between border-l-2 border-gray-300 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-155 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">On Duty Requests</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col justify-between h-full pt-4 overflow-hidden">
          <div className="overflow-y-auto pr-1 flex-1 space-y-4 pb-2">
            {loading && requests.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-xs">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="py-8 text-center text-gray-500 font-bold text-xs bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No pending On-Duty requests
              </div>
            ) : (
              requests.map(req => (
                <div key={req._id} className="border border-gray-150 dark:border-gray-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 bg-gray-50 dark:bg-[#0f172a]/50">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-bold text-xs text-gray-900 dark:text-white">
                        {req.employeeId?.name || req.employee || 'Employee'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black capitalize
                        ${req.status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                          req.status === 'approved' ? 'bg-green-50 text-green-600' : 
                          'bg-red-50 text-red-600'}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-1 font-semibold">
                      <strong>Date:</strong> {new Date(req.startDate).toLocaleDateString()} 
                      {req.startDate !== req.endDate ? ` to ${new Date(req.endDate).toLocaleDateString()}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 break-words">{req.reason}</p>
                  </div>
                  
                  {req.status === 'pending' && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button 
                        onClick={() => {
                          const reason = prompt('Reason for rejection?');
                          if (reason !== null) {
                            handleUpdateStatus(req._id, 'rejected', reason);
                          }
                        }}
                        disabled={loading}
                        className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(req._id, 'approved')}
                        disabled={loading}
                        className="flex items-center gap-1 bg-[#00a76b] hover:bg-[#00915c] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                    </div>
                  )}
                </div>
              ))
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

export default OnDutyApprovalModal;
