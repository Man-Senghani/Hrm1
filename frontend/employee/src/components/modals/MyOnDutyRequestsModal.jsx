import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, Calendar } from 'lucide-react';

const MyOnDutyRequestsModal = ({ isOpen, onClose }) => {
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
      const res = await axios.get('/api/on-duty/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) {
      toast.error('Failed to fetch your on-duty requests');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Calendar size={24} className="text-indigo-600" />
          My On Duty Requests
        </h2>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {loading && requests.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Loading your requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-4 text-gray-500">You haven't submitted any On Duty requests yet.</div>
          ) : (
            requests.map(req => (
              <div key={req._id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize
                      ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        'bg-red-100 text-red-700'}`}
                    >
                      {req.status}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(req.startDate).toLocaleDateString()} 
                      {req.startDate !== req.endDate ? ` - ${new Date(req.endDate).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <strong>Time:</strong> {req.isFullDay ? 'Full Day' : `${req.fromTime} - ${req.toTime}`}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <strong>Reason:</strong> {req.reason}
                  </p>
                  {req.location && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Location:</strong> {req.location}
                    </p>
                  )}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <strong>Rejection Reason:</strong> {req.rejectionReason}
                    </p>
                  )}
                  {req.status !== 'pending' && req.approverId && (
                    <p className="text-xs text-gray-500 mt-2">
                      Reviewed by: {req.approverId.name}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MyOnDutyRequestsModal;
