import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  MapPin,
  Building,
  Activity,
  ShieldCheck,
  Fingerprint,
  CreditCard,
  IdCard,
  Eye,
  FileText,
  Download,
  Edit3,
  X
} from 'lucide-react';
import { getImageUrl } from '@shared/services/api';

// Helper to format date strings as DD-MM-YYYY
const formatDDMMYYYY = (dateStr) => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
};

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null); // { title: string, url: string }

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
        } else if (err.response && err.response.status === 404) {
          setErrorMsg('Employee Profile Not Found');
        } else {
          setErrorMsg(err.response?.data?.message || 'Error loading profile');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  // Keydown listener for Escape key to close document popup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPreviewDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-emerald-500/20 border-t-[#00a76b] animate-spin" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Scanning Registry...</span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 font-bold text-sm text-red-500 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-800 m-6">
        {errorMsg}
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 font-bold text-sm text-red-500 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-800 m-6">
        Employee Node Not Found
      </div>
    );
  }

  const hasAdhar = !!employee.adharCard;
  const hasBank = !!employee.bankDetails;
  const hasPan = !!employee.panCard;
  const pathRole = window.location.pathname.split('/')[1] || 'admin';

  return (
    <div className="animate-fade-in w-full pb-20 space-y-6">
      
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200/80 dark:border-[#38352e]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#00a76b]/10 hover:bg-[#00a76b]/20 text-[#00a76b] dark:text-[#00a76b] text-xs font-extrabold rounded-full transition-all border border-[#00a76b]/25 shadow-xs cursor-pointer group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {employee.employeeId && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#00a76b] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Fingerprint size={12} className="text-[#00a76b]" /> Node ID: {employee.employeeId}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">PROFILE TRACE</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border ${
            employee.status === 'active' 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-[#00a76b] dark:text-emerald-400' 
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
          }`}>
            Status: {employee.status || 'ACTIVE'}
          </span>
          <button
            type="button"
            onClick={() => navigate(`/employees/edit/${employee._id}`)}
            className="px-5 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Edit3 size={15} /> Edit Profile
          </button>
        </div>
      </div>

      {/* MASTER GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Profile & Real-time Live Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 shadow-xs flex flex-col items-center text-center">
            
            {/* Profile Picture */}
            <div className="w-32 h-32 rounded-2xl bg-slate-100 dark:bg-[#221e19] border-2 border-slate-200 dark:border-[#38352e] flex items-center justify-center overflow-hidden mb-4 shadow-sm">
              {employee.profileImage ? (
                <img src={getImageUrl(employee.profileImage)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-slate-400 dark:text-slate-600 opacity-60" />
              )}
            </div>

            {/* Employee Name & Role */}
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight break-words max-w-full">
              {employee.fullName || employee.name || 'Employee Profile'}
            </h3>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 capitalize mt-0.5">
              {employee.designation || employee.position || 'Staff Member'}
            </p>

            {/* Live Card Details Summary */}
            <div className="w-full mt-5 pt-5 border-t border-slate-100 dark:border-[#28241e] space-y-3 text-left">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">Live Employee Card</p>

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">System Role</span>
                <span className="font-bold text-[#00a76b] uppercase bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md text-[10px] border border-emerald-200 dark:border-emerald-800">
                  {employee.userId?.role || employee.role || 'employee'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Office Email</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={employee.email}>
                  {employee.email || 'Not specified'}
                </span>
              </div>

              {employee.personalEmail && (
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Personal Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={employee.personalEmail}>
                    {employee.personalEmail}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Comms Link (Phone)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {employee.phone || 'Not specified'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Gender</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{employee.gender || 'Unknown'}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Induction Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatDDMMYYYY(employee.joinDate)}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Birthdate</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatDDMMYYYY(employee.dob)}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Hierarchy Manager</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                  {employee.managerId?.name || employee.managerId?.fullName || 'Core Root'}
                </span>
              </div>

              <div className="flex flex-col text-xs pt-1 space-y-2">
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 mb-0.5 block">1. Local Address</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed break-words bg-slate-50 dark:bg-[#1f1b16] p-2 rounded-lg border border-slate-100 dark:border-[#2d2822] block">
                    {employee.address || 'No local address entered.'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 mb-0.5 block">2. Permanent Address</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed break-words bg-slate-50 dark:bg-[#1f1b16] p-2 rounded-lg border border-slate-100 dark:border-[#2d2822] block">
                    {employee.permanentAddress || 'No permanent address entered.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Vault Readiness Badges */}
            <div className="w-full mt-5 pt-5 border-t border-slate-100 dark:border-[#28241e]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3 text-left">Document Vault Status</p>
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2 rounded-xl border text-center text-[10px] font-bold ${hasAdhar ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-[#221e19] border-slate-200 dark:border-[#38352e] text-slate-400'}`}>
                  Adhar {hasAdhar ? '✓' : ''}
                </div>
                <div className={`p-2 rounded-xl border text-center text-[10px] font-bold ${hasBank ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-[#221e19] border-slate-200 dark:border-[#38352e] text-slate-400'}`}>
                  Bank {hasBank ? '✓' : ''}
                </div>
                <div className={`p-2 rounded-xl border text-center text-[10px] font-bold ${hasPan ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-[#221e19] border-slate-200 dark:border-[#38352e] text-slate-400'}`}>
                  PAN {hasPan ? '✓' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Organizational & Document Details */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SECTION 1: Corporate Designation */}
          <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#28241e] pb-4">
              <Briefcase size={18} className="text-[#00a76b]" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Corporate Designation</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Authorization Role</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white uppercase">{employee.userId?.role || employee.role || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Designation</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{employee.designation || employee.position || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Hierarchy Manager</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{employee.managerId?.name || employee.managerId?.fullName || 'Core Root'}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Employment Type</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{employee.employmentType || 'Full-time'}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Induction Date</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{formatDDMMYYYY(employee.joinDate)}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Gender Identity</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white uppercase">{employee.gender || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Birthdate</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{formatDDMMYYYY(employee.dob)}</p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Verified Documents Vault */}
          <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#28241e] pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#00a76b]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Verified Documents Vault</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Verified identity records</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Adharcard */}
              <div className="flex flex-col items-center gap-4 p-5 bg-slate-50/50 dark:bg-[#1a1714] rounded-2xl border border-slate-200/80 dark:border-[#38352e] group hover:border-[#00a76b] transition-all">
                <div 
                  onClick={() => employee.adharCard && setPreviewDoc({ title: 'Adharcard', url: getImageUrl(employee.adharCard) })}
                  className={`w-full aspect-square max-w-[120px] rounded-xl bg-white dark:bg-[#25201b] flex items-center justify-center text-[#00a76b] shadow-xs border border-slate-200 dark:border-[#38352e] group-hover:scale-[1.03] transition-all overflow-hidden ${employee.adharCard ? 'cursor-pointer' : ''}`}
                >
                  {employee.adharCard ? (
                    (employee.adharCard.toLowerCase().endsWith('.pdf') || employee.adharCard.startsWith('data:application/pdf')) ? (
                      <div className="flex flex-col items-center gap-2 text-center p-4">
                        <FileText size={36} className="text-[#00a76b]" />
                        <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200">View PDF</span>
                      </div>
                    ) : (
                      <img src={getImageUrl(employee.adharCard)} alt="Adhar" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Fingerprint size={32} className="opacity-20" />
                      <p className="text-[8px] font-extrabold uppercase tracking-widest opacity-40">Missing</p>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">National ID</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Adharcard</p>
                </div>
                {employee.adharCard ? (
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: 'Adharcard', url: getImageUrl(employee.adharCard) })}
                      className="flex-1 py-2 bg-slate-900 dark:bg-[#25201b] hover:bg-[#00a76b] dark:hover:bg-[#00a76b] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = getImageUrl(employee.adharCard);
                        link.download = `AdharCard_${employee.employeeId || 'doc'}`;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex-1 py-2 bg-white dark:bg-[#181612] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#38352e] hover:bg-slate-50 dark:hover:bg-[#201d18] text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Download size={13} /> Save
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 italic">Not Linked</span>
                )}
              </div>

              {/* Bank Details */}
              <div className="flex flex-col items-center gap-4 p-5 bg-slate-50/50 dark:bg-[#1a1714] rounded-2xl border border-slate-200/80 dark:border-[#38352e] group hover:border-[#00a76b] transition-all">
                <div 
                  onClick={() => employee.bankDetails && setPreviewDoc({ title: 'Bank Details', url: getImageUrl(employee.bankDetails) })}
                  className={`w-full aspect-square max-w-[120px] rounded-xl bg-white dark:bg-[#25201b] flex items-center justify-center text-[#00a76b] shadow-xs border border-slate-200 dark:border-[#38352e] group-hover:scale-[1.03] transition-all overflow-hidden ${employee.bankDetails ? 'cursor-pointer' : ''}`}
                >
                  {employee.bankDetails ? (
                    (employee.bankDetails.toLowerCase().endsWith('.pdf') || employee.bankDetails.startsWith('data:application/pdf')) ? (
                      <div className="flex flex-col items-center gap-2 text-center p-4">
                        <FileText size={36} className="text-[#00a76b]" />
                        <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200">View PDF</span>
                      </div>
                    ) : (
                      <img src={getImageUrl(employee.bankDetails)} alt="Bank" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard size={32} className="opacity-20" />
                      <p className="text-[8px] font-extrabold uppercase tracking-widest opacity-40">Missing</p>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Financial ID</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Bank Details</p>
                </div>
                {employee.bankDetails ? (
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: 'Bank Details', url: getImageUrl(employee.bankDetails) })}
                      className="flex-1 py-2 bg-slate-900 dark:bg-[#25201b] hover:bg-[#00a76b] dark:hover:bg-[#00a76b] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = getImageUrl(employee.bankDetails);
                        link.download = `BankDetails_${employee.employeeId || 'doc'}`;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex-1 py-2 bg-white dark:bg-[#181612] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#38352e] hover:bg-slate-50 dark:hover:bg-[#201d18] text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Download size={13} /> Save
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 italic">Not Linked</span>
                )}
              </div>

              {/* PAN Card */}
              <div className="flex flex-col items-center gap-4 p-5 bg-slate-50/50 dark:bg-[#1a1714] rounded-2xl border border-slate-200/80 dark:border-[#38352e] group hover:border-[#00a76b] transition-all">
                <div 
                  onClick={() => employee.panCard && setPreviewDoc({ title: 'PAN Card', url: getImageUrl(employee.panCard) })}
                  className={`w-full aspect-square max-w-[120px] rounded-xl bg-white dark:bg-[#25201b] flex items-center justify-center text-[#00a76b] shadow-xs border border-slate-200 dark:border-[#38352e] group-hover:scale-[1.03] transition-all overflow-hidden ${employee.panCard ? 'cursor-pointer' : ''}`}
                >
                  {employee.panCard ? (
                    (employee.panCard.toLowerCase().endsWith('.pdf') || employee.panCard.startsWith('data:application/pdf')) ? (
                      <div className="flex flex-col items-center gap-2 text-center p-4">
                        <FileText size={36} className="text-[#00a76b]" />
                        <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200">View PDF</span>
                      </div>
                    ) : (
                      <img src={getImageUrl(employee.panCard)} alt="PAN" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <IdCard size={32} className="opacity-20" />
                      <p className="text-[8px] font-extrabold uppercase tracking-widest opacity-40">Missing</p>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Identity Node</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">PAN Card</p>
                </div>
                {employee.panCard ? (
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: 'PAN Card', url: getImageUrl(employee.panCard) })}
                      className="flex-1 py-2 bg-slate-900 dark:bg-[#25201b] hover:bg-[#00a76b] dark:hover:bg-[#00a76b] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = getImageUrl(employee.panCard);
                        link.download = `PAN_${employee.employeeId || 'doc'}`;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex-1 py-2 bg-white dark:bg-[#181612] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#38352e] hover:bg-slate-50 dark:hover:bg-[#201d18] text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Download size={13} /> Save
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 italic">Not Linked</span>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* DOCUMENT PREVIEW LIGHTBOX MODAL */}
      {previewDoc && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewDoc(null)}
        >
          {/* Outer Close Button */}
          <button
            type="button"
            onClick={() => setPreviewDoc(null)}
            className="fixed top-4 right-4 sm:top-6 sm:right-8 w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-[1000000] cursor-pointer backdrop-blur-md border border-white/20 shadow-lg"
            title="Close Preview (Esc)"
          >
            <X size={24} />
          </button>

          {/* Modal Content Box */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center justify-center bg-slate-900/95 dark:bg-[#181612]/95 border border-slate-700/80 dark:border-[#38352e] rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-700/60 dark:border-[#38352e]">
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-[#00a76b]" /> {previewDoc.title}
              </h4>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-2.5 py-1 bg-white/10 rounded-full">
                Document Trace
              </span>
            </div>

            <div className="flex-1 w-full flex items-center justify-center overflow-auto max-h-[75vh]">
              {(previewDoc.url.toLowerCase().endsWith('.pdf') || previewDoc.url.startsWith('data:application/pdf')) ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-[85vw] h-[75vh] max-w-4xl rounded-xl border border-slate-700"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[75vh] max-w-[85vw] object-contain rounded-xl shadow-lg"
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default EmployeeDetail;
