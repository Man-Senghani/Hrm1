import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Calendar, ArrowLeft, X, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPE_COLORS = {
  announcement: 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
  task: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  leave: 'bg-emerald-100 text-[#00a76b] dark:bg-emerald-950/40 dark:text-emerald-400',
  attendance: 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400',
  emergency: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const AllNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const navigate = useNavigate();

  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      let items = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.notifications)
          ? res.data.notifications
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];

      // Sort newest first
      items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(items);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const handleNotificationClick = (notif) => {
    const type = (notif?.type || '').toLowerCase();
    const text = (notif?.message || '').toLowerCase();

    if (type.includes('leave') || text.includes('leave') || text.includes('vacation') || text.includes('time off')) {
      navigate('/leave');
      return;
    }

    if (
      type.includes('attendance') ||
      type.includes('timer') ||
      text.includes('attendance') ||
      text.includes('timer') ||
      text.includes('time track') ||
      text.includes('tracker') ||
      text.includes('check-in') ||
      text.includes('checked in') ||
      text.includes('check in') ||
      text.includes('check-out') ||
      text.includes('checked out') ||
      text.includes('check out') ||
      text.includes('clock in') ||
      text.includes('clock out') ||
      text.includes('overtime') ||
      text.includes('late mark') ||
      text.includes('half day')
    ) {
      navigate('/attendance');
      return;
    }

    if (type.includes('report') || text.includes('daily report') || text.includes('report')) {
      navigate('/daily-report');
      return;
    }

    if (type.includes('profile') || text.includes('profile')) {
      navigate('/profile');
      return;
    }

    if (type.includes('task') || text.includes('task') || text.includes('assigned to you')) {
      navigate('/tasks');
      return;
    }

    setSelectedNotif(notif);
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notif) => {
    const date = new Date(notif.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateLabel = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (date.toDateString() === today.toDateString()) {
      dateLabel = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateLabel = 'Yesterday';
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(notif);
    return groups;
  }, {});

  return (
    <div className="p-4 sm:p-6 md:p-10 pb-20 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate('/attendance');
              }
            }}
            className="w-10 h-10 bg-white dark:bg-[#111c18] rounded-full flex items-center justify-center text-[#848E9C] hover:text-[#00a76b] dark:hover:text-[#00a76b] shadow-sm border border-[#eceae3] dark:border-[#1a2d29] transition-all cursor-pointer"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#201515] dark:text-white tracking-tight">
              Notifications & <span className="text-[#00a76b]">Announcements</span>
            </h1>
            <p className="text-[13px] font-medium text-[#939084] dark:text-[#829e92] mt-0.5">
              All your received alerts, status updates, and announcements
            </p>
          </div>
        </div>
        <button
          onClick={fetchNotifications}
          disabled={loading}
          className="p-2.5 rounded-xl border border-[#eceae3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] text-[#848E9C] hover:text-[#00a76b] transition-all shadow-sm cursor-pointer disabled:opacity-50"
          title="Refresh notifications"
          aria-label="Refresh notifications"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-[#00a76b]' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#00a76b] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-[#111c18] rounded-2xl border border-[#eceae3] dark:border-[#1a2d29] shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#fffdf9] dark:bg-[#162722] border border-[#eceae3] dark:border-[#1a2d29] flex items-center justify-center mb-4">
            <Bell size={28} className="text-[#c5c0b1] dark:text-[#527068]" />
          </div>
          <h3 className="text-[16px] font-bold text-[#201515] dark:text-white mb-1.5">No notifications found</h3>
          <p className="text-[13px] font-medium text-[#939084] dark:text-[#829e92]">You are all caught up!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([dateLabel, notifs]) => (
            <div key={dateLabel} className="bg-white dark:bg-[#111c18] rounded-2xl border border-[#eceae3] dark:border-[#1a2d29] shadow-sm overflow-hidden">
              <div className="px-6 py-3.5 border-b border-[#eceae3] dark:border-[#1a2d29] bg-[#fffdf9] dark:bg-[#162722]/50 flex items-center gap-2">
                <Calendar size={16} className="text-[#939084] dark:text-[#829e92]" />
                <h2 className="text-[12px] font-black text-[#201515] dark:text-white uppercase tracking-widest">{dateLabel}</h2>
                <span className="ml-auto px-2.5 py-0.5 bg-[#eceae3] dark:bg-[#1a2d29] text-[#939084] dark:text-[#829e92] text-[10px] font-black rounded-full">
                  {notifs.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#162722]/30 border-b border-[#eceae3] dark:border-[#1a2d29] text-[10px] font-black uppercase tracking-wider text-[#939084] dark:text-[#829e92]">
                      <th className="py-3 px-6 border-r border-[#eceae3] dark:border-[#1a2d29]">Notification / Message</th>
                      <th className="py-3 px-4 border-r border-[#eceae3] dark:border-[#1a2d29]">Type</th>
                      <th className="py-3 px-4 border-r border-[#eceae3] dark:border-[#1a2d29]">Sent By</th>
                      <th className="py-3 px-6 text-right border-r border-[#eceae3] dark:border-[#1a2d29]">Time</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eceae3] dark:divide-[#1a2d29]">
                    {notifs.map((notif) => {
                      const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.default;
                      return (
                        <tr
                          key={notif._id || notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className="hover:bg-[#fffdf9] dark:hover:bg-[#162722]/40 transition-colors cursor-pointer group"
                          title="Click to open related section or view details"
                        >
                          <td className="py-3.5 px-6 border-r border-[#eceae3] dark:border-[#1a2d29]">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                                <Bell size={15} />
                              </div>
                              <span className="text-[13px] font-bold text-[#201515] dark:text-slate-200 leading-snug group-hover:text-[#00a76b] transition-colors">
                                {notif.message || notif.text || 'Notification'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap border-r border-[#eceae3] dark:border-[#1a2d29]">
                            <span className={`px-2.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest ${colorClass}`}>
                              {notif.type || 'general'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap border-r border-[#eceae3] dark:border-[#1a2d29]">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                              <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase text-[9px]">By:</span>
                              <span>{notif.senderName || notif.senderId?.name || 'HR / Management'}</span>
                              {(notif.senderRole || notif.senderId?.role) && (
                                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">
                                  [{notif.senderRole || notif.senderId?.role}]
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap text-[11px] font-bold text-[#939084] dark:text-[#829e92] border-r border-[#eceae3] dark:border-[#1a2d29]">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit'
                            }) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 text-slate-400 group-hover:text-[#00a76b] transition-colors">
                              <span className="text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Open</span>
                              <ExternalLink size={13} className="opacity-40 group-hover:opacity-100" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── NOTIFICATION PREVIEW MODAL ── */}
      {selectedNotif && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="bg-white dark:bg-[#111c18] rounded-[20px] border border-[#eceae3] dark:border-[#1a2d29] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#eceae3] dark:border-[#1a2d29] flex items-center justify-between bg-[#fffdf9] dark:bg-[#162722]/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TYPE_COLORS[selectedNotif.type] || TYPE_COLORS.default}`}>
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#201515] dark:text-white capitalize">
                    {selectedNotif.type || 'Notification'}
                  </h3>
                  <p className="text-xs font-semibold text-[#939084] dark:text-[#829e92]">
                    From {selectedNotif.senderName || selectedNotif.senderId?.name || 'HR / Management'} {selectedNotif.senderRole ? `(${selectedNotif.senderRole})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#162722] hover:bg-slate-200 dark:hover:bg-[#1a2d29] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border-none"
                aria-label="Close notification preview"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-[#162722]/30 rounded-xl p-4 border border-[#eceae3] dark:border-[#1a2d29] text-[14px] leading-relaxed text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
                {selectedNotif.message || selectedNotif.text}
              </div>
              <div className="flex items-center justify-between text-xs text-[#939084] dark:text-[#829e92]">
                <span>Type: <strong className="text-[#201515] dark:text-white uppercase">{selectedNotif.type || 'General'}</strong></span>
                <span>{selectedNotif.createdAt ? new Date(selectedNotif.createdAt).toLocaleString() : ''}</span>
              </div>
            </div>
            <div className="p-4 border-t border-[#eceae3] dark:border-[#1a2d29] flex justify-end">
              <button
                onClick={() => setSelectedNotif(null)}
                className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#008f5b] text-white rounded-[10px] font-bold text-xs transition-all cursor-pointer border-none shadow-sm active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllNotifications;
