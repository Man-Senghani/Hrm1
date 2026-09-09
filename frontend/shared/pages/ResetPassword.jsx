import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, ArrowRight, ArrowLeft, Lock, Zap, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { EntryButton, EntryInput } from '../components/EntryPrimitives';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();

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
        const response = await axios.get(`/api/auth/reset-password/${token}`);
        setUserDetails(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired password reset link.');
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
      const response = await axios.post(`/api/auth/reset-password/${token}`, { password });
      setSuccess(response.data.message || 'Password reset successfully.');
      
      // Changed to 3 minutes (180000ms) to allow manual navigation
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 180000);
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
                 <div className="mt-4 p-3 bg-[#ffffff] border border-[#e2e0d8] rounded-[6px] text-xs text-[#7a7873] animate-pulse">
                   Verifying token validity...
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
                    label="NEW PASSWORD"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter new password"
                    icon={<Lock size={20} />}
                    rightElement={
                      password.length > 0 && (
                        <button
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[#939084] hover:text-[#00a76b] transition-all bg-transparent border-none cursor-pointer flex items-center justify-center p-1"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )
                    }
                  />

                 <EntryInput 
                    label="CONFIRM PASSWORD"
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Confirm new password"
                    icon={<Lock size={20} />}
                    rightElement={
                      confirmPassword.length > 0 && (
                        <button
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-[#939084] hover:text-[#00a76b] transition-all bg-transparent border-none cursor-pointer flex items-center justify-center p-1"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )
                    }
                  />

                 <div className="empty:hidden mt-2 mb-2">
                   {error && (
                     <div className="w-full bg-[#fff8f6] border border-[#00a76b] p-3 rounded-[4px] flex items-start gap-3 animate-fade-in">
                       <AlertCircle size={20} className="text-[#00a76b] shrink-0" />
                       <span className="text-[14px] text-[#00a76b] font-bold">{error}</span>
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
                      <Link to="/login">
                        <EntryButton 
                          type="button" 
                          variant="primary"
                          className="h-[52px] text-[15px] font-bold bg-[#00a76b] text-[#fffefb] hover:bg-[#008f5a] w-full rounded-[6px] flex items-center justify-center"
                        >
                           Back to Login
                           <ArrowRight size={20} className="ml-3" />
                        </EntryButton>
                      </Link>
                    ) : (
                      <EntryButton 
                        type="submit" 
                        disabled={loading}
                        variant="primary"
                        className="h-[52px] text-[15px] font-bold bg-[#00a76b] text-[#fffefb] hover:bg-[#008f5a] w-full rounded-[6px] flex items-center justify-center"
                      >
                         {loading ? 'Updating...' : 'Update Password'}
                         {!loading && <ArrowRight size={20} className="ml-3" />}
                      </EntryButton>
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
                  <Link to="/forgot-password">
                    <EntryButton 
                      type="button" 
                      variant="primary"
                      className="h-[52px] text-[15px] font-bold bg-[#00a76b] text-[#fffefb] hover:bg-[#008f5a] w-full rounded-[6px]"
                    >
                       Request New Link
                       <ArrowRight size={20} className="ml-3" />
                    </EntryButton>
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
