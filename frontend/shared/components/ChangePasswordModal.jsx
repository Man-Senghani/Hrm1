import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Lock, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setFieldErrors({});

    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      return setStatus({ type: 'error', message: 'All fields are required.' });
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setStatus({ type: 'error', message: 'New passwords do not match.' });
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(passwords.newPassword)) {
      setFieldErrors({ newPassword: 'Password must be minimum 8 characters, 1 special symbol, minimum 1 capital letter, and minimum 1 number.' });
      return;
    }

    setLoading(true);
    const token = sessionStorage.getItem('token');
    
    try {
      const response = await axios.put('/api/auth/update-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setStatus({ type: 'success', message: 'Password updated successfully!' });
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          onClose();
          setStatus({ type: '', message: '' });
        }, 2000);
      }
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to update password.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Dimmed Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* Right Side Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-[#0c1512] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col justify-between border-l border-gray-200 dark:border-[#1a2d29]">
          
          <div>
            {/* Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-gray-100 dark:border-[#1a2d29]">
              <div>
                <h2 className="text-[24px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-none m-0">Change Password</h2>
                <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-1.5">Update your account authentication credentials</p>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 p-2 rounded-full transition-colors cursor-pointer border-none outline-none"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              
              {/* Status Message */}
              {status.message && (
                <div className={`flex items-center gap-2 p-4 mb-6 rounded-xl ${
                  status.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40' 
                    : 'bg-red-50 text-red-700 border border-red-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40'
                }`}>
                  {status.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                  <span className="text-sm font-semibold">{status.message}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5">
                {/* Field 1 */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Current Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input 
                      type={showPasswords.current ? "text" : "password"} 
                      placeholder="Enter current password"
                      required
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      className="w-full pl-11 pr-11 py-3.5 bg-slate-50 dark:bg-[#15221d] border border-slate-200 dark:border-[#223830] rounded-xl text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#1a2d27] focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:border-[#00a76b] transition-all"
                    />
                    {passwords.currentPassword.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer outline-none"
                      >
                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Field 2 */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input 
                      type={showPasswords.new ? "text" : "password"} 
                      placeholder="Enter new password"
                      required
                      value={passwords.newPassword}
                      onChange={(e) => {
                        setPasswords({ ...passwords, newPassword: e.target.value });
                        if (fieldErrors.newPassword) setFieldErrors({ ...fieldErrors, newPassword: '' });
                      }}
                      className="w-full pl-11 pr-11 py-3.5 bg-slate-50 dark:bg-[#15221d] border border-slate-200 dark:border-[#223830] rounded-xl text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#1a2d27] focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:border-[#00a76b] transition-all"
                    />
                    {passwords.newPassword.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer outline-none"
                      >
                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                  {fieldErrors.newPassword && (
                    <p className="text-red-500 text-[11px] font-medium leading-relaxed mt-1">
                      {fieldErrors.newPassword}
                    </p>
                  )}
                </div>

                {/* Field 3 */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input 
                      type={showPasswords.confirm ? "text" : "password"} 
                      placeholder="Confirm new password"
                      required
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      className="w-full pl-11 pr-11 py-3.5 bg-slate-50 dark:bg-[#15221d] border border-slate-200 dark:border-[#223830] rounded-xl text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#1a2d27] focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 focus:border-[#00a76b] transition-all"
                    />
                    {passwords.confirmPassword.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer outline-none"
                      >
                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 bg-[#00a76b] hover:bg-[#00925d] text-white font-bold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-colors border-none cursor-pointer outline-none shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;

