import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { X, Check, XCircle } from 'lucide-react';

const LeaveEncashmentModal = ({ isOpen, onClose }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Mocking fetch for leave encashment requests
      setTimeout(() => {
        setRequests([
          { _id: '1', employee: 'Alice Brown', leaveType: 'Earned Leave', days: 5, amount: '$750', status: 'pending' },
          { _id: '2', employee: 'Charlie Davis', leaveType: 'Casual Leave', days: 2, amount: '$300', status: 'pending' }
        ]);
        setLoading(false);
      }, 800);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = async (id, action) => {
    try {
      // Simulate API call
      setRequests(requests.filter(r => r._id !== id));
      toast.success(`Encashment request ${action}ed`);
    } catch (err) {
      toast.error(`Failed to ${action} request`);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e293b] h-full w-full max-w-sm pt-3 px-6 pb-6 relative shadow-2xl flex flex-col justify-between border-l-2 border-gray-300 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-155 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Leave Encashment</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col justify-between h-full pt-4 overflow-hidden">
          <div className="overflow-y-auto pr-1 flex-1 space-y-4 pb-2">
            
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="py-8 text-center text-gray-500 font-bold text-xs bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No pending Encashment requests
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req._id} className="p-4 rounded-xl border border-gray-150 dark:border-gray-800 space-y-2 bg-gray-50 dark:bg-[#0f172a]/50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{req.employee}</span>
                      <span className="text-green-600 font-bold text-sm">{req.amount}</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                      <span>Type: {req.leaveType}</span>
                      <span className="font-semibold">{req.days} Days</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => handleAction(req._id, 'reject')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1">
                        <XCircle size={14} /> Reject
                      </button>
                      <button onClick={() => handleAction(req._id, 'approve')} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-xs font-bold flex items-center gap-1">
                        <Check size={14} /> Approve
                      </button>
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

export default LeaveEncashmentModal;
