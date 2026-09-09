import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, ArrowRight, ArrowLeft, Mail, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { EntryButton, EntryInput } from '../components/EntryPrimitives';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      setSuccess(response.data.message || 'A password reset link has been sent.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('Email not registered.');
      } else {
        setError(err.response?.data?.message || 'An error occurred while validating the email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eceae3] flex items-center justify-center p-4 selection:bg-[#00a76b] selection:text-white font-sans py-6">
      <div className="w-full max-w-[760px] grid grid-cols-1 lg:grid-cols-12 bg-[#fffefb] rounded-[8px] border border-[#c5c0b1] shadow-sm overflow-hidden">
        {/* BRAND SIDEBAR */}
        <div className="hidden lg:flex lg:col-span-5 bg-[#201515] p-8 flex-col justify-between relative overflow-hidden">
           <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#00a76b] opacity-10 blur-[100px] rounded-full"></div>
           
           <div className="relative z-10 flex items-center gap-3">
              <div className="w-9 h-9 bg-[#00a76b] rounded-[4px] flex items-center justify-center cursor-pointer" onClick={() => navigate('/login')}>
                <ShieldCheck size={20} className="text-[#fffefb]" />
              </div>
              <span className="text-[22px] font-bold text-[#fffefb] tracking-tight">FluidHR</span>
           </div>

           <div className="relative z-10 my-8">
              <h2 className="text-[30px] font-medium text-[#fffefb] mb-4 leading-[1.1] tracking-tight">
                 Access <br/><span className="text-[#00a76b]">Recovery</span> <br/>Protocol.
              </h2>
              <p className="text-[14px] text-[#c5c0b1] max-w-[260px] leading-relaxed font-medium">
                 Regain entry to your organizational lifecycle portal securely.
              </p>
           </div>

           <div className="relative z-10 pt-6 border-t border-[#36342e]">
              <div className="flex items-center gap-4 text-[#939084]">
                <Zap size={18} className="text-[#00a76b]" />
                <span className="text-[12px] font-bold uppercase tracking-[0.2em]">Auth Node v3.0.0</span>
              </div>
           </div>
        </div>

        {/* RECOVERY FORM */}
        <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-center bg-[#fffefb] relative">
           <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-[13px] font-bold text-[#939084] hover:text-[#201515] transition-colors">
             <ArrowLeft size={16} /> Back to Login
           </Link>
           <div className="max-w-[380px] w-full mx-auto">
              <div className="mb-5">
                 <p className="zap-caption-upper mb-2 text-[#00a76b]">Account Recovery</p>
                 <h1 className="text-[28px] md:text-[32px] font-medium text-[#201515] tracking-tight mb-2 leading-[1.1]">
                    Forgot Password
                 </h1>
                 <p className="text-[13px] text-[#36342e] font-medium leading-relaxed">
                    Enter your registered email to receive a password reset link.
                 </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                 <EntryInput 
                    label="Email"
                    type="email" 
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="name@company.io"
                    icon={<Mail size={20} />}
                    error={error}
                  />

                 {success && (
                   <div className="w-full bg-[#f6fff8] border border-[#24a148] p-3 rounded-[4px] flex items-start gap-2.5 animate-fade-in">
                     <CheckCircle size={18} className="text-[#24a148] shrink-0 mt-0.5" />
                     <span className="text-[13px] text-[#24a148] font-semibold">{success}</span>
                   </div>
                 )}

                 <div className="pt-2">
                    <EntryButton 
                      type="submit" 
                      disabled={loading}
                      variant="primary"
                      className="h-[48px] text-[15px] font-bold bg-[#00a76b] text-[#fffefb] hover:bg-[#201515] flex items-center justify-center w-full"
                    >
                       {loading ? 'Processing...' : 'Send Reset Link'}
                       {!loading && <ArrowRight size={20} className="ml-2" />}
                    </EntryButton>
                 </div>
              </form>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
