import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, Briefcase, MapPin, Building, Activity, ShieldCheck, Fingerprint, CreditCard, IdCard, Eye, FileText, Download } from 'lucide-react';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const { data } = await axios.get(`/api/employees/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmployee(data);
      } catch (err) {
        console.error(err);
        if (err.response && err.response.status === 403) {
          setErrorMsg('Access Denied: You do not have permission to view this profile.');
        } else {
          setErrorMsg('Node Not Found');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  if (loading) return <div className="p-10 animate-pulse font-black text-xs uppercase tracking-widest">Scanning Registry...</div>;
  if (errorMsg) return <div className="p-10 font-black text-xs uppercase tracking-widest text-[#F6465D]">{errorMsg}</div>;
  if (!employee) return <div className="p-10 font-black text-xs uppercase tracking-widest text-[#F6465D]">Node Not Found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              const pathRole = window.location.pathname.split('/')[1];
              navigate(`/${pathRole}/employees`);
            }}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#848E9C] hover:text-[#1E2026] shadow-sm border border-[#E6E8EA] transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-[#1E2026] uppercase tracking-tighter">
              Profile <span className="text-[#F0B90B]">Trace</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
             employee.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
          }`}>
             Status: {employee.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: ID Card */}
        <div className="bg-white rounded-3xl p-8 border border-[#E6E8EA] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F0B90B]/10 rounded-bl-full"></div>
          
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="w-24 h-24 bg-[#F5F5F5] rounded-3xl flex items-center justify-center border-2 border-white shadow-xl relative z-10">
               {employee.profileImage ? <img src={employee.profileImage} className="rounded-3xl" alt="Profile" /> : <User size={40} className="text-[#F0B90B]" />}
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-[#1E2026] tracking-tight">{employee.fullName}</h2>
              <p className="text-[11px] font-bold text-[#848E9C] uppercase tracking-widest mt-1">{employee.role}</p>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-[#F5F5F5] px-4 py-1.5 rounded-full border border-[#E6E8EA]">
              <ShieldCheck size={14} className="text-[#F0B90B]" />
              <span className="text-[10px] font-black text-[#1E2026] uppercase tracking-[0.2em]">{employee.employeeId}</span>
            </div>
          </div>
          
          <div className="space-y-5 pt-8 border-t border-[#E6E8EA]">
            <div className="flex items-center gap-4 group">
               <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center group-hover:bg-[#F0B90B]/10 transition-colors">
                 <Mail size={14} className="text-[#848E9C] group-hover:text-[#F0B90B]" />
               </div>
               <div>
                  <p className="text-[9px] font-bold text-[#848E9C] uppercase tracking-widest">Office Email</p>
                  <p className="text-[12px] font-bold text-[#1E2026]">{employee.email}</p>
               </div>
            </div>
            
            {employee.personalEmail && (
              <div className="flex items-center gap-4 group">
                 <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center group-hover:bg-[#F0B90B]/10 transition-colors">
                   <Mail size={14} className="text-[#848E9C] group-hover:text-[#F0B90B]" />
                 </div>
                 <div>
                    <p className="text-[9px] font-bold text-[#848E9C] uppercase tracking-widest">Personal Email</p>
                    <p className="text-[12px] font-bold text-[#1E2026]">{employee.personalEmail}</p>
                 </div>
              </div>
            )}
            <div className="flex items-center gap-4 group">
               <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center group-hover:bg-[#F0B90B]/10 transition-colors">
                 <Phone size={14} className="text-[#848E9C] group-hover:text-[#F0B90B]" />
               </div>
               <div>
                  <p className="text-[9px] font-bold text-[#848E9C] uppercase tracking-widest">Comms Link</p>
                  <p className="text-[12px] font-bold text-[#1E2026]">{employee.phone || 'Unknown'}</p>
               </div>
            </div>
            <div className="flex items-center gap-4 group">
               <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center group-hover:bg-[#F0B90B]/10 transition-colors">
                 <MapPin size={14} className="text-[#848E9C] group-hover:text-[#F0B90B]" />
               </div>
               <div>
                  <p className="text-[9px] font-bold text-[#848E9C] uppercase tracking-widest">Location Node</p>
                  <p className="text-[12px] font-bold text-[#1E2026]">{employee.address || 'Unknown'}</p>
               </div>
            </div>
          </div>
        </div>
        
        {/* Right Column: details */}
        <div className="md:col-span-2 space-y-8">
           
            <div className="bg-white rounded-3xl p-8 border border-[#E6E8EA] shadow-sm">
              <h3 className="text-[14px] font-black text-[#1E2026] uppercase tracking-widest mb-6 flex items-center gap-3">
                <Briefcase size={18} className="text-[#F0B90B]" /> Corporate Designation
              </h3>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                   <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest mb-1">Authorization Role</p>
                   <p className="text-[14px] font-black text-[#1E2026] uppercase">{employee.role}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest mb-1">Designation</p>
                   <p className="text-[14px] font-black text-[#1E2026]">{employee.designation || employee.position || 'N/A'}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest mb-1">Hierarchy Manager</p>
                   <p className="text-[14px] font-black text-[#1E2026]">{employee.managerId?.name || 'Core Root'}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest mb-1">Employment Type</p>
                   <p className="text-[14px] font-black text-[#1E2026]">{employee.employmentType}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest mb-1">Induction Date</p>
                   <p className="text-[14px] font-black text-[#1E2026]">{employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest mb-1">Gender Identity</p>
                   <p className="text-[14px] font-black text-[#1E2026] uppercase">{employee.gender || 'Unknown'}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest mb-1">Birthdate</p>
                   <p className="text-[14px] font-black text-[#1E2026]">{employee.dob ? new Date(employee.dob).toLocaleDateString() : 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* VERIFIED DOCUMENTS VAULT */}
            <div className="bg-white rounded-3xl p-8 border border-[#E6E8EA] shadow-sm">
              <h3 className="text-[14px] font-black text-[#1E2026] uppercase tracking-widest mb-6 flex items-center gap-3">
                 <ShieldCheck size={18} className="text-[#F0B90B]" /> Verified Documents Vault
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Adharcard */}
                 <div className="flex flex-col items-center gap-5 p-6 bg-[#F5F5F5] rounded-2xl border border-[#E6E8EA] group hover:border-[#F0B90B] transition-all">
                    <div className="w-full aspect-square max-w-[120px] rounded-xl bg-white flex items-center justify-center text-[#F0B90B] shadow-md border border-[#E6E8EA] group-hover:scale-[1.03] transition-all overflow-hidden">
                       {employee.adharCard ? (
                         (employee.adharCard.toLowerCase().endsWith('.pdf') || employee.adharCard.startsWith('data:application/pdf')) ? (
                           <div className="flex flex-col items-center gap-2 text-center p-4">
                             <FileText size={40} className="text-[#F0B90B]" />
                             <span className="text-[9px] font-bold text-[#1E2026]">View PDF</span>
                           </div>
                         ) : (
                           <img src={employee.adharCard} alt="" className="w-full h-full object-cover" />
                         )
                       ) : (
                         <div className="flex flex-col items-center gap-2">
                            <Fingerprint size={32} className="opacity-10" />
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-20">Missing</p>
                         </div>
                       )}
                    </div>
                    <div className="text-center">
                       <p className="text-[9px] font-black uppercase tracking-widest text-[#848E9C]">National ID</p>
                       <p className="text-[12px] font-black text-[#1E2026]">Adharcard</p>
                    </div>
                    {employee.adharCard ? (
                      <div className="flex gap-2 w-full mt-1">
                        <a href={employee.adharCard} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-[#1E2026] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all flex items-center justify-center gap-1 shadow-md active:scale-95">
                          <Eye size={12} /> View
                        </a>
                        <button 
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = employee.adharCard;
                            link.download = `AdharCard_${employee.employeeId || 'doc'}`;
                            link.target = "_blank";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="flex-1 py-2 bg-white text-[#1E2026] border border-[#E6E8EA] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                        >
                          <Download size={12} /> Save
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold text-[#848E9C] uppercase italic">Not Linked</span>
                    )}
                 </div>

                 {/* Bank Details */}
                 <div className="flex flex-col items-center gap-5 p-6 bg-[#F5F5F5] rounded-2xl border border-[#E6E8EA] group hover:border-[#F0B90B] transition-all">
                    <div className="w-full aspect-square max-w-[120px] rounded-xl bg-white flex items-center justify-center text-[#F0B90B] shadow-md border border-[#E6E8EA] group-hover:scale-[1.03] transition-all overflow-hidden">
                       {employee.bankDetails ? (
                         (employee.bankDetails.toLowerCase().endsWith('.pdf') || employee.bankDetails.startsWith('data:application/pdf')) ? (
                           <div className="flex flex-col items-center gap-2 text-center p-4">
                             <FileText size={40} className="text-[#F0B90B]" />
                             <span className="text-[9px] font-bold text-[#1E2026]">View PDF</span>
                           </div>
                         ) : (
                           <img src={employee.bankDetails} alt="" className="w-full h-full object-cover" />
                         )
                       ) : (
                         <div className="flex flex-col items-center gap-2">
                            <CreditCard size={32} className="opacity-10" />
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-20">Missing</p>
                         </div>
                       )}
                    </div>
                    <div className="text-center">
                       <p className="text-[9px] font-black uppercase tracking-widest text-[#848E9C]">Financial ID</p>
                       <p className="text-[12px] font-black text-[#1E2026]">Bank Details</p>
                    </div>
                    {employee.bankDetails ? (
                      <div className="flex gap-2 w-full mt-1">
                        <a href={employee.bankDetails} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-[#1E2026] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all flex items-center justify-center gap-1 shadow-md active:scale-95">
                          <Eye size={12} /> View
                        </a>
                        <button 
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = employee.bankDetails;
                            link.download = `BankDetails_${employee.employeeId || 'doc'}`;
                            link.target = "_blank";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="flex-1 py-2 bg-white text-[#1E2026] border border-[#E6E8EA] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                        >
                          <Download size={12} /> Save
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold text-[#848E9C] uppercase italic">Not Linked</span>
                    )}
                 </div>

                 {/* PAN Card */}
                 <div className="flex flex-col items-center gap-5 p-6 bg-[#F5F5F5] rounded-2xl border border-[#E6E8EA] group hover:border-[#F0B90B] transition-all">
                    <div className="w-full aspect-square max-w-[120px] rounded-xl bg-white flex items-center justify-center text-[#F0B90B] shadow-md border border-[#E6E8EA] group-hover:scale-[1.03] transition-all overflow-hidden">
                       {employee.panCard ? (
                         (employee.panCard.toLowerCase().endsWith('.pdf') || employee.panCard.startsWith('data:application/pdf')) ? (
                           <div className="flex flex-col items-center gap-2 text-center p-4">
                             <FileText size={40} className="text-[#F0B90B]" />
                             <span className="text-[9px] font-bold text-[#1E2026]">View PDF</span>
                           </div>
                         ) : (
                           <img src={employee.panCard} alt="" className="w-full h-full object-cover" />
                         )
                       ) : (
                         <div className="flex flex-col items-center gap-2">
                            <IdCard size={32} className="opacity-10" />
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-20">Missing</p>
                         </div>
                       )}
                    </div>
                    <div className="text-center">
                       <p className="text-[9px] font-black uppercase tracking-widest text-[#848E9C]">Identity Node</p>
                       <p className="text-[12px] font-black text-[#1E2026]">PAN Card</p>
                    </div>
                    {employee.panCard ? (
                      <div className="flex gap-2 w-full mt-1">
                        <a href={employee.panCard} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-[#1E2026] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all flex items-center justify-center gap-1 shadow-md active:scale-95">
                          <Eye size={12} /> View
                        </a>
                        <button 
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = employee.panCard;
                            link.download = `PAN_${employee.employeeId || 'doc'}`;
                            link.target = "_blank";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="flex-1 py-2 bg-white text-[#1E2026] border border-[#E6E8EA] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                        >
                          <Download size={12} /> Save
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold text-[#848E9C] uppercase italic">Not Linked</span>
                    )}
                 </div>
              </div>
            </div>

           <div className="bg-[#1E2026] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
             
             <h3 className="text-[14px] font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3 relative z-10">
               <Activity size={18} className="text-[#F0B90B]" /> Matrix Activity Placeholder
             </h3>
             
             <div className="grid grid-cols-3 gap-4 relative z-10">
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black uppercase text-[#848E9C] tracking-widest mb-2">Network Uptime</p>
                    <p className="text-xl font-black text-white">99.8%</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black uppercase text-[#848E9C] tracking-widest mb-2">Tasks Executed</p>
                    <p className="text-xl font-black text-white">124 Focus</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black uppercase text-[#848E9C] tracking-widest mb-2">Leave Trace</p>
                    <p className="text-xl font-black text-[#F0B90B]">12 Hours</p>
                 </div>
             </div>
           </div>

        </div>

      </div>
    </div>
  );
};

export default EmployeeDetail;
