import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, ArrowRight, ArrowLeft, Lock, Zap, AlertCircle, CheckCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { EntryButton, EntryInput } from '../components/EntryPrimitives';
import api from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // Robust token extraction: route param, query param, or URL path
  const token = params.token ||
    new URLSearchParams(location.search).get('token') ||
    (location.pathname.includes('/reset-password/') ? location.pathname.split('/reset-password/')[1]?.split(/[?#]/)[0] : '');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userDetails, setUserDetails] = useState(null);

  // Redirect if no token is present
  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  // Verify the token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;
      try {
        const response = await api.get(`/auth/reset-password/${token}`);
        setUserDetails(response.data);
      } catch (err) {
        try {
          const fallback = await axios.get(`/api/auth/reset-password/${token}`);
          setUserDetails(fallback.data);
        } catch (innerErr) {
          setError(innerErr.response?.data?.message || err.response?.data?.message || 'Invalid or expired password reset link.');
        }
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!password) {
      setError('Please enter a new password.');
      setLoading(false);
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your new password.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be minimum 8 characters, 1 special symbol, minimum 1 capital letter, and minimum 1 number.');
      setLoading(false);
      return;
    }

    try {
      let response;
      try {
        response = await api.post(`/auth/reset-password/${token}`, { password });
      } catch (_) {
        response = await axios.post(`/api/auth/reset-password/${token}`, { password });
      }
      setSuccess(response.data?.message || 'Password reset successfully. Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while resetting the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#eceae3] flex items-center justify-center p-4 selection:bg-[#00a76b] selection:text-white font-sans">
      <div className="w-full max-w-[460px] bg-[#fffefb] rounded-[8px] border border-[#c5c0b1] shadow-sm p-6 md:p-10 flex flex-col relative overflow-y-auto">
         
         <div className="w-full mx-auto">
            <div className="mb-6">
               <p className="zap-caption-upper mb-3 text-[#00a76b]">Account Recovery</p>
               <h1 className="text-[34px] font-medium text-[#201515] tracking-tight mb-3 leading-[1.0]">
                  Reset Password
               </h1>
               <p className="text-[13px] text-[#36342e] font-medium leading-relaxed">
                  Setting new credentials for your account.
               </p>

               {/* Verification & User Info Container */}
               {verifying && (
                 <div className="mt-4 p-3.5 bg-white border border-[#e2e0d8] rounded-xl text-xs text-[#7a7873] flex items-center gap-2.5 shadow-xs">
                   <RefreshCw size={16} className="animate-spin text-emerald-500 shrink-0" />
                   <span>Verifying password reset token...</span>
                 </div>
               )}
               {!verifying && userDetails && (
                 <div className="mt-4 p-4 bg-[#ffffff] border border-[#00a76b] rounded-[6px] shadow-sm flex flex-col gap-1">
                   <p className="text-[10px] font-bold text-[#00a76b] tracking-[0.5px] uppercase">Resetting Password For</p>
                   <p className="text-[15px] font-bold text-[#201515]">{userDetails.name}</p>
                   <p className="text-[13px] text-[#5c5a55] font-medium">{userDetails.email}</p>
                 </div>
               )}
            </div>

             {verifying ? null : userDetails ? (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                 <EntryInput 
                    label="New Password"
                    type="password"
                    required={true}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter new password"
                    icon={<Lock size={20} />}
                  />

                 <EntryInput 
                    label="Confirm Password"
                    type="password" 
                    required={true}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Confirm new password"
                    icon={<Lock size={20} />}
                  />

                  <div className="empty:hidden mt-2 mb-2">
                    {error && (
                      <div className="w-full bg-[#fff8f6] border border-[#d93838] p-3 rounded-[4px] flex items-start gap-3 animate-fade-in">
                        <AlertCircle size={20} className="text-[#d93838] shrink-0" />
                        <span className="text-[14px] text-[#d93838] font-bold">{error}</span>
                      </div>
                    )}
                    {success && (
                      <div className="w-full bg-[#f6fff8] border border-[#24a148] p-3 rounded-[4px] flex items-start gap-3 animate-fade-in">
                        <CheckCircle size={20} className="text-[#24a148] shrink-0" />
                        <span className="text-[14px] text-[#24a148] font-bold">{success}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                     {success ? (
                       <Link to="/login" className="block w-full">
                         <button 
                           type="button" 
                           className="h-[52px] text-[15px] font-bold bg-[#00a76b] text-[#fffefb] hover:bg-[#008f5a] w-full rounded-[6px] flex items-center justify-center gap-2 cursor-pointer border-none transition-all shadow-sm active:scale-[0.98]"
                         >
                            <span>Back to Login</span>
                            <ArrowRight size={18} />
                         </button>
                       </Link>
                     ) : (
                       <button 
                         type="submit" 
                         disabled={loading}
                         className="h-[52px] text-[15px] font-bold bg-[#00a76b] text-[#fffefb] hover:bg-[#008f5a] w-full rounded-[6px] flex items-center justify-center gap-2 cursor-pointer border-none transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                       >
                          <span>{loading ? 'Updating...' : 'Update Password'}</span>
                          {!loading && <ArrowRight size={18} />}
                       </button>
                     )}
                  </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="w-full bg-[#fff8f6] border border-[#d93838] p-4 rounded-[4px] flex items-start gap-3">
                  <AlertCircle size={20} className="text-[#d93838] shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[14px] text-[#d93838] font-bold">Invalid Reset Request</span>
                    <span className="text-[13px] text-[#7d2222] mt-1">{error}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Link to="/forgot-password" className="block w-full">
                    <button 
                      type="button" 
                      className="h-[52px] text-[15px] font-bold bg-[#00a76b] text-[#fffefb] hover:bg-[#008f5a] w-full rounded-[6px] flex items-center justify-center gap-2 cursor-pointer border-none transition-all shadow-sm active:scale-[0.98]"
                    >
                       <span>Request New Link</span>
                       <ArrowRight size={18} />
                    </button>
                  </Link>
                </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default ResetPassword;
