import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, ArrowRight, Lock, Mail, AlertCircle, Zap } from 'lucide-react';
import { EntryButton, EntryInput, EntrySelect } from '../components/EntryPrimitives';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  const redirectToRole = (userRole, authToken) => {
    const queryParams = new URLSearchParams(window.location.search);
    const isDesktop = queryParams.get('desktop') === 'true';

    if (isDesktop) {
      setShowThankYou(true);
      window.location.href = `fluidhr-tracker://auth?token=${encodeURIComponent(authToken)}`;
      return;
    }

    const roleSubpaths = {
      admin: '/admin',
      hr: '/hr',
      employee: '/employee',
      manager: '/manager'
    };
    const targetPath = roleSubpaths[userRole] || `/${userRole}`;
    window.location.href = targetPath;
  };

  // REDIRECT IF ALREADY LOGGED IN
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const role = sessionStorage.getItem('role');

    if (token && role) {
      redirectToRole(role, token);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        email: email.trim(),
        password
      });

      const { token, role, _id, email: userEmail } = response.data;
      const user = { _id, role, email: userEmail };

      if (!role) {
        throw new Error('Identity verification failed: No role assigned');
      }

      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('role', role);

      redirectToRole(role, token);
    } catch (err) {
      if (!err.response) {
        setError('Network error: Unable to connect to the server. Please check if the backend is running.');
      } else if (err.response.status >= 500) {
        setError(`Server error (${err.response.status}): ${err.response.data?.message || 'The server encountered an error.'}`);
      } else {
        setError(err.response?.data?.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (showThankYou) {
    const token = sessionStorage.getItem('token');
    return (
      <div className="min-h-screen bg-[#eceae3] flex items-center justify-center p-4 selection:bg-[#00a76b] selection:text-white font-sans py-6">
        <div className="w-full max-w-[760px] grid grid-cols-1 lg:grid-cols-12 bg-[#fffefb] rounded-[8px] border border-[#c5c0b1] shadow-sm overflow-hidden">
          {/* BRAND SIDEBAR */}
          <div className="hidden lg:flex lg:col-span-5 bg-[#201515] p-8 flex-col justify-between relative overflow-hidden">
             <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#00a76b] opacity-10 blur-[100px] rounded-full"></div>
             
             <div className="relative z-10 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#00a76b] rounded-[4px] flex items-center justify-center">
                  <ShieldCheck size={20} className="text-[#fffefb]" />
                </div>
                <span className="text-[22px] font-bold text-[#fffefb] tracking-tight">FluidHR</span>
             </div>
  
             <div className="relative z-10 my-8">
                <h2 className="text-[30px] font-medium text-[#fffefb] mb-4 leading-[1.1] tracking-tight">
                   Identity <br/><span className="text-[#00a76b]">Linked</span>.
                </h2>
                <p className="text-[14px] text-[#c5c0b1] max-w-[260px] leading-relaxed font-medium">
                   Your desktop protocol handshake has been completed.
                </p>
             </div>
  
             <div className="relative z-10 pt-6 border-t border-[#36342e]">
                <div className="flex items-center gap-4 text-[#939084]">
                  <Zap size={18} className="text-[#00a76b]" />
                  <span className="text-[12px] font-bold uppercase tracking-[0.2em]">Auth Node v3.0.0</span>
                </div>
             </div>
          </div>
  
          {/* THANK YOU CONTENT */}
          <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-center bg-[#fffefb] text-center">
             <div className="max-w-[380px] w-full mx-auto">
                <div className="w-16 h-16 bg-[#f6fff8] border border-[#24a148] rounded-full flex items-center justify-center mx-auto mb-5 text-[#24a148]">
                   <ShieldCheck size={36} />
                </div>
                
                <h1 className="text-[28px] md:text-[32px] font-medium text-[#201515] tracking-tight mb-3 leading-[1.1]">
                   Login Successful!
                </h1>
                
                <p className="text-[14px] text-[#36342e] font-medium leading-relaxed mb-6">
                   Thank you for logging in. The **FluidHR Tracker** desktop app should launch automatically.
                </p>
  
                <div className="space-y-4">
                   <a 
                     href={`fluidhr-tracker://auth?token=${encodeURIComponent(token)}`}
                     className="h-[48px] w-full text-[15px] font-bold bg-[#00a76b] text-[#fffefb] hover:bg-[#201515] rounded-[4px] flex items-center justify-center gap-2 transition-all shadow-sm"
                   >
                      Open FluidHR Tracker <ArrowRight size={20} />
                   </a>
                   
                   <button 
                     onClick={() => {
                       const role = sessionStorage.getItem('role');
                       navigate(`/${role}/dashboard`);
                     }}
                     className="text-[14px] font-bold text-[#939084] hover:text-[#201515] transition-colors mt-2 block mx-auto"
                   >
                      Go to Web Dashboard instead
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eceae3] flex items-center justify-center p-4 selection:bg-[#00a76b] selection:text-white font-sans py-6">
      <div className="w-full max-w-[760px] grid grid-cols-1 lg:grid-cols-12 bg-[#fffefb] rounded-[8px] border border-[#c5c0b1] shadow-sm overflow-hidden">
        {/* BRAND SIDEBAR - Zapier Dark Warm Style */}
        <div className="hidden lg:flex lg:col-span-5 bg-[#201515] p-8 flex-col justify-between relative overflow-hidden">
           <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#00a76b] opacity-10 blur-[100px] rounded-full"></div>
           
           <div className="relative z-10 flex items-center gap-3">
              <div className="w-9 h-9 bg-[#00a76b] rounded-[4px] flex items-center justify-center">
                <ShieldCheck size={20} className="text-[#fffefb]" />
              </div>
              <span className="text-[22px] font-bold text-[#fffefb] tracking-tight">FluidHR</span>
           </div>

           <div className="relative z-10 my-8">
              <h2 className="text-[30px] font-medium text-[#fffefb] mb-4 leading-[1.1] tracking-tight">
                 Single <br/><span className="text-[#00a76b]">Identity</span> <br/>Protocol.
              </h2>
              <p className="text-[14px] text-[#c5c0b1] max-w-[260px] leading-relaxed font-medium">
                 One unified portal to manage your entire organizational lifecycle with military-grade precision.
              </p>
           </div>

           <div className="relative z-10 pt-6 border-t border-[#36342e]">
              <div className="flex items-center gap-4 text-[#939084]">
                <Zap size={18} className="text-[#00a76b]" />
                <span className="text-[12px] font-bold uppercase tracking-[0.2em]">Auth Node v3.0.0</span>
              </div>
           </div>
        </div>

        {/* AUTH FORM - Unified Login */}
        <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-center bg-[#fffefb]">
           <div className="max-w-[380px] w-full mx-auto">
              <div className="mb-5">
                 <p className="zap-caption-upper mb-2 text-[#00a76b]">Enterprise Access</p>
                 <h1 className="text-[28px] md:text-[32px] font-medium text-[#201515] tracking-tight mb-2 leading-[1.1]">
                    HRMS Login
                 </h1>
                 <p className="text-[13px] text-[#36342e] font-medium leading-relaxed">
                    Enter your corporate credentials to continue to your workspace.
                 </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                 <EntryInput 
                    label="Corporate Email"
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.io"
                    icon={<Mail size={20} />}
                  />

                 <div>
                   <EntryInput 
                      label="Secret Key"
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      icon={<Lock size={20} />}
                    />
                   <div className="flex justify-end mt-1.5">
                     <button type="button" onClick={() => navigate('/forgot-password')} className="text-[13px] font-bold text-[#00a76b] hover:text-[#201515] transition-colors">
                       Forgot Password?
                     </button>
                   </div>
                 </div>

                 {error && (
                   <div className="w-full bg-[#fff8f6] border border-[#d9381e] p-3 rounded-[4px] flex items-start gap-2.5 animate-fade-in">
                     <AlertCircle size={18} className="text-[#d9381e] shrink-0 mt-0.5" />
                     <span className="text-[13px] text-[#d9381e] font-semibold">{error}</span>
                   </div>
                 )}

                 <div className="pt-2">
                    <EntryButton 
                      type="submit" 
                      disabled={loading}
                      variant="primary"
                      className="h-[48px] text-[15px] font-bold bg-[#00a76b] text-[#fffefb] hover:bg-[#201515] flex items-center justify-center w-full"
                    >
                       {loading ? 'Validating credentials...' : 'Login'}
                       {!loading && <ArrowRight size={20} className="ml-2" />}
                    </EntryButton>
                 </div>

                 <div className="mt-6 pt-5 border-t border-[#eceae3] text-center">
                    <p className="text-[13px] text-[#939084] font-medium">
                       Authorized personnel only. All access is logged.
                    </p>
                 </div>
              </form>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
