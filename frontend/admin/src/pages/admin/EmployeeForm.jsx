import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, ChevronDown, FileText, UploadCloud, CheckCircle, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '@shared/services/api';

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    password: '',
    phone: '',
    gender: 'Male',
    dob: '',
    address: '',
    role: 'employee',
    designation: '',
    managerId: '',
    joinDate: '',
    employmentType: 'Full-time'
  });

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const mgrRes = await axios.get('/api/managers', { headers: { Authorization: `Bearer ${token}` } });
        setManagers(mgrRes.data);

        if (isEdit) {
          const empRes = await axios.get(`/api/employees/${id}`, {
             headers: { Authorization: `Bearer ${token}` }
          });
          const emp = empRes.data;
          const nameParts = (emp.fullName || emp.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
          const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

          setFormData({
            employeeId: emp.employeeId || '',
            firstName,
            middleName,
            lastName,
            email: emp.email || '',
            personalEmail: emp.personalEmail || '',
            phone: emp.phone || '',
            gender: emp.gender || 'Male',
            dob: emp.dob ? emp.dob.split('T')[0] : '',
            address: emp.address || '',
            role: emp.userId?.role || emp.role || 'employee',
            designation: emp.designation || emp.position || '',
            managerId: emp.managerId?._id || '',
            joinDate: emp.joinDate ? emp.joinDate.split('T')[0] : '',
            employmentType: emp.employmentType || 'Full-time',
            profileImage: emp.profileImage || '',
            adharCard: emp.adharCard || '',
            bankDetails: emp.bankDetails || '',
            panCard: emp.panCard || ''
          });
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load form data');
      }
    };
    fetchData();
  }, [id, isEdit]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    let newErrors = { ...errors, [name]: '' };

    if (name === 'firstName' || name === 'lastName' || name === 'middleName') {
      if (value && !/^[A-Za-z\s]*$/.test(value)) {
        const fieldDisplayName = name === 'firstName' ? 'First Name' : name === 'lastName' ? 'Last Name' : 'Middle Name';
        newErrors[name] = `${fieldDisplayName} allows only alphabetic characters.`;
        value = value.replace(/[^A-Za-z\s]/g, '');
      }
    }

    if (name === 'phone') {
      if (value && !/^[0-9]*$/.test(value)) {
        newErrors.phone = 'Only numbers (0-9) are allowed.';
        value = value.replace(/[^0-9]/g, '');
      }
      if (value.length > 10) {
        value = value.slice(0, 10);
      }
    }

    if (name === 'email' || name === 'personalEmail') {
      if (/\s/.test(value)) {
        newErrors[name] = 'Spaces are not allowed in email address.';
        value = value.replace(/\s/g, '');
      }
    }

    if (name === 'password' && value) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,20}$/;
      if (!passwordRegex.test(value)) {
        newErrors.password = 'Password must be 8-20 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char.';
      }
    }
    
    setErrors(newErrors);
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Custom Validation
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'First Name is required.';
    if (!formData.lastName) newErrors.lastName = 'Last Name is required.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email) {
      newErrors.email = 'Office Email Address is required.';
    } else if (!emailRegex.test(formData.email) || /@(gmal|gaml|gmil|gmial|gmaill)\.com$/i.test(formData.email)) {
      newErrors.email = 'Please enter a valid office email format with correct spelling.';
    }
    if (!formData.personalEmail) {
      newErrors.personalEmail = 'Personal Email Address is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(formData.personalEmail.trim())) {
      newErrors.personalEmail = 'Personal Email must be a valid @gmail.com address (e.g. name@gmail.com).';
    }
    if (!formData.phone) {
      newErrors.phone = 'Phone Number is required.';
    } else if (formData.phone.length !== 10) {
      newErrors.phone = 'Phone Number must be exactly 10 digits.';
    }
    if (!isEdit && !formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,20}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password = 'Password must be 8-20 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char.';
      }
    }
    if (!formData.role) newErrors.role = 'Role is required.';
    if (!formData.gender) newErrors.gender = 'Gender is required.';
    if (!formData.joinDate) newErrors.joinDate = 'Join Date is required.';
    if (!formData.dob) newErrors.dob = 'Date of Birth is required.';
    if (!['hr', 'manager', 'admin'].includes(formData.role?.toLowerCase()) && !formData.managerId) {
      newErrors.managerId = 'Direct Manager is required.';
    }
    if (!formData.address) newErrors.address = 'Location Node is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      setLoading(false);
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      const submitData = { ...formData };
      submitData.fullName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim();
      delete submitData.firstName;
      delete submitData.middleName;
      delete submitData.lastName;
      
      // Data cleanup
      if (!submitData.managerId) delete submitData.managerId;
      if (isEdit) delete submitData.password; // Optional: separate change password flow

      if (isEdit) {
        await axios.put(`/api/employees/${id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        window.dispatchEvent(new Event('profileUpdated'));
      } else {
        await axios.post('/api/employees', submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      toast.success('Employee Data Update Successfully', {
        style: {
          background: '#1E2026',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '12px',
          border: '1px solid #F0B90B'
        },
        iconTheme: {
          primary: '#F0B90B',
          secondary: '#1E2026',
        }
      });
      const pathRole = window.location.pathname.split('/')[1];
      navigate(`/${pathRole}/employees`);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save employee';
      if (errMsg.toLowerCase().includes('personal email')) {
        setErrors(prev => ({ ...prev, personalEmail: errMsg }));
      } else if (errMsg.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: errMsg }));
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => {
            const pathRole = window.location.pathname.split('/')[1];
            navigate(`/${pathRole}/employees`);
          }}
          className="w-10 h-10 bg-white dark:bg-[#0d1f1a] rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:shadow-sm border border-slate-200 dark:border-[#133029] transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isEdit ? 'Update' : 'Register'} <span className="text-[#00a76b]">Employee Profile</span>
          </h1>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0d1f1a] border border-slate-200/80 dark:border-[#133029] rounded-2xl p-8 shadow-sm transition-colors">
        {/* TAB SWITCHER */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-[#0a1815] rounded-xl mb-10 w-fit">
           <button 
             onClick={() => setActiveTab('profile')}
             className={`px-8 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white dark:bg-[#132d26] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
           >
              Profile
           </button>
           <button 
             onClick={() => setActiveTab('documents')}
             className={`px-8 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'documents' ? 'bg-white dark:bg-[#132d26] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
           >
              Identity Vault
           </button>
        </div>

        {/* AVATAR SECTION */}
        {isEdit && activeTab === 'profile' && (
          <div className="flex justify-center mb-10 border-b border-slate-100 dark:border-[#133029] pb-10">
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl bg-slate-100 dark:bg-[#132d26] flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-[#19352e] overflow-hidden group-hover:border-[#00a76b] transition-all">
                {formData.profileImage ? (
                  <img src={getImageUrl(formData.profileImage)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-slate-400 dark:text-slate-500 opacity-30 uppercase">
                    {formData.firstName?.substring(0, 1) || 'S'}{formData.lastName?.substring(0, 1) || 'A'}
                  </span>
                )}
              </div>
              <label htmlFor="emp-photo" className="absolute -bottom-3 -right-3 w-10 h-10 bg-[#00a76b] text-white rounded-xl flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all">
                 <span className="material-symbols-outlined text-xl">photo_camera</span>
                 <input 
                  id="emp-photo" 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                    if (!validImageTypes.includes(file.type)) {
                      toast.error('Unsupported file format. Only images are allowed.');
                      return;
                    }

                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const token = sessionStorage.getItem('token');
                      try {
                        setLoading(true);
                        const res = await axios.post(`/api/employees/${id}/profile-image`, { image: reader.result }, {
                          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
                        });
                        setFormData({ ...formData, profileImage: res.data.profileImage });
                        window.dispatchEvent(new Event('profileUpdated'));
                      } catch (err) {
                        setError('Failed to update node visual identity');
                      } finally {
                        setLoading(false);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                 />
              </label>
            </div>
          </div>
        )}

        {/* VERIFIED DOCUMENTS VAULT */}
        {isEdit && activeTab === 'documents' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 pb-10">
            {/* Adharcard Upload */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Adharcard Registry</label>
              <div className="flex flex-col items-center gap-4 p-5 bg-[#F5F5F5] rounded-2xl border-2 border-dashed border-[#E6E8EA] hover:border-[#F0B90B] transition-all group">
                <div 
                  className={`w-full aspect-square max-w-[160px] rounded-xl bg-white flex items-center justify-center text-[#F0B90B] shadow-md overflow-hidden border border-[#E6E8EA] transition-all ${formData.adharCard ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''}`}
                  onClick={() => formData.adharCard && window.open(getImageUrl(formData.adharCard), '_blank')}
                >
                  {formData.adharCard ? (
                    (formData.adharCard.toLowerCase().endsWith('.pdf') || formData.adharCard.startsWith('data:application/pdf')) ? (
                      <div className="flex flex-col items-center gap-2 text-center p-4">
                        <FileText size={48} className="text-[#F0B90B]" />
                        <span className="text-[10px] font-bold text-[#1E2026]">View PDF</span>
                      </div>
                    ) : (
                      <img src={getImageUrl(formData.adharCard)} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <FileText size={32} className="opacity-20" />
                       <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Missing</p>
                    </div>
                  )}
                </div>
                
                <div className="flex w-full gap-2">
                  <label className="flex-1 cursor-pointer bg-[#1E2026] text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1 shadow-lg active:scale-95">
                    <UploadCloud size={14} />
                    {formData.adharCard ? 'Replace' : 'Upload'}
                    <input 
                      type="file" className="hidden" 
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                        if (!validTypes.includes(file.type)) {
                          toast.error('Unsupported file format. Only images and PDFs are allowed.');
                          return;
                        }

                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const token = sessionStorage.getItem('token');
                          try {
                            setLoading(true);
                            const res = await axios.post(`/api/employees/${id}/adhar-card`, { document: reader.result }, {
                              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
                            });
                            setFormData({ ...formData, adharCard: res.data.adharCard });
                            toast.success('Adharcard Protocol Verified');
                          } catch (err) {
                            toast.error('Identity Verification Failed');
                          } finally {
                            setLoading(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {formData.adharCard && (
                    <button 
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = getImageUrl(formData.adharCard);
                        link.download = `AdharCard_${formData.employeeId || 'doc'}`;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex-1 cursor-pointer bg-white text-[#1E2026] border border-[#E6E8EA] py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                    >
                      <Download size={14} /> Download
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Details Upload */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Bank Details Registry</label>
              <div className="flex flex-col items-center gap-4 p-5 bg-[#F5F5F5] rounded-2xl border-2 border-dashed border-[#E6E8EA] hover:border-[#F0B90B] transition-all group">
                <div 
                  className={`w-full aspect-square max-w-[160px] rounded-xl bg-white flex items-center justify-center text-[#F0B90B] shadow-md overflow-hidden border border-[#E6E8EA] transition-all ${formData.bankDetails ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''}`}
                  onClick={() => formData.bankDetails && window.open(getImageUrl(formData.bankDetails), '_blank')}
                >
                  {formData.bankDetails ? (
                    (formData.bankDetails.toLowerCase().endsWith('.pdf') || formData.bankDetails.startsWith('data:application/pdf')) ? (
                      <div className="flex flex-col items-center gap-2 text-center p-4">
                        <FileText size={48} className="text-[#F0B90B]" />
                        <span className="text-[10px] font-bold text-[#1E2026]">View PDF</span>
                      </div>
                    ) : (
                      <img src={getImageUrl(formData.bankDetails)} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <span className="material-symbols-outlined text-3xl opacity-20">credit_card</span>
                       <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Missing</p>
                    </div>
                  )}
                </div>

                <div className="flex w-full gap-2">
                  <label className="flex-1 cursor-pointer bg-[#1E2026] text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1 shadow-lg active:scale-95">
                    <UploadCloud size={14} />
                    {formData.bankDetails ? 'Replace' : 'Upload'}
                    <input 
                      type="file" className="hidden" 
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                        if (!validTypes.includes(file.type)) {
                          toast.error('Unsupported file format. Only images and PDFs are allowed.');
                          return;
                        }

                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const token = sessionStorage.getItem('token');
                          try {
                            setLoading(true);
                            const res = await axios.post(`/api/employees/${id}/bank-details`, { document: reader.result }, {
                              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
                            });
                            setFormData({ ...formData, bankDetails: res.data.bankDetails });
                            toast.success('Financial Asset Synchronized');
                          } catch (err) {
                            toast.error('Banking Verification Failed');
                          } finally {
                            setLoading(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {formData.bankDetails && (
                    <button 
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = getImageUrl(formData.bankDetails);
                        link.download = `BankDetails_${formData.employeeId || 'doc'}`;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex-1 cursor-pointer bg-white text-[#1E2026] border border-[#E6E8EA] py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                    >
                      <Download size={14} /> Download
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PAN Card Upload */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">PAN Card Registry</label>
              <div className="flex flex-col items-center gap-4 p-5 bg-[#F5F5F5] rounded-2xl border-2 border-dashed border-[#E6E8EA] hover:border-[#F0B90B] transition-all group">
                <div 
                  className={`w-full aspect-square max-w-[160px] rounded-xl bg-white flex items-center justify-center text-[#F0B90B] shadow-md overflow-hidden border border-[#E6E8EA] transition-all ${formData.panCard ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''}`}
                  onClick={() => formData.panCard && window.open(getImageUrl(formData.panCard), '_blank')}
                >
                  {formData.panCard ? (
                    (formData.panCard.toLowerCase().endsWith('.pdf') || formData.panCard.startsWith('data:application/pdf')) ? (
                      <div className="flex flex-col items-center gap-2 text-center p-4">
                        <FileText size={48} className="text-[#F0B90B]" />
                        <span className="text-[10px] font-bold text-[#1E2026]">View PDF</span>
                      </div>
                    ) : (
                      <img src={getImageUrl(formData.panCard)} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <span className="material-symbols-outlined text-3xl opacity-20">badge</span>
                       <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Missing</p>
                    </div>
                  )}
                </div>

                <div className="flex w-full gap-2">
                  <label className="flex-1 cursor-pointer bg-[#1E2026] text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1 shadow-lg active:scale-95">
                    <UploadCloud size={14} />
                    {formData.panCard ? 'Replace' : 'Upload'}
                    <input 
                      type="file" className="hidden" 
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                        if (!validTypes.includes(file.type)) {
                          toast.error('Unsupported file format. Only images and PDFs are allowed.');
                          return;
                        }

                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const token = sessionStorage.getItem('token');
                          try {
                            setLoading(true);
                            const res = await axios.post(`/api/employees/${id}/pan-card`, { document: reader.result }, {
                              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
                            });
                            setFormData({ ...formData, panCard: res.data.panCard });
                            toast.success('PAN Card Protocol Synchronized');
                          } catch (err) {
                            toast.error('PAN Verification Failed');
                          } finally {
                            setLoading(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {formData.panCard && (
                    <button 
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = getImageUrl(formData.panCard);
                        link.download = `PAN_${formData.employeeId || 'doc'}`;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex-1 cursor-pointer bg-white text-[#1E2026] border border-[#E6E8EA] py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                    >
                      <Download size={14} /> Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <div className="mb-6 p-4 bg-[#F6465D]/10 text-[#F6465D] font-bold text-sm rounded-xl uppercase tracking-wider">{error}</div>}
        
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {isEdit && (
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Employee ID</label>
                 <input disabled value={formData.employeeId} className="w-full px-4 py-3 bg-[#F5F5F5] opacity-60 rounded-xl font-bold text-sm cursor-not-allowed" />
               </div>
             )}
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">First Name *</label>
               <input required name="firstName" value={formData.firstName} onChange={handleChange} className={`w-full px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.firstName ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm`} placeholder="John" />
               {errors.firstName && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.firstName}</p>}
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Middle Name</label>
               <input name="middleName" value={formData.middleName} onChange={handleChange} className={`w-full px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.middleName ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm`} placeholder="Middle" />
               {errors.middleName && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.middleName}</p>}
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Last Name *</label>
               <input required name="lastName" value={formData.lastName} onChange={handleChange} className={`w-full px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.lastName ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm`} placeholder="Doe" />
               {errors.lastName && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.lastName}</p>}
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Office Email Address *</label>
               <input 
                 type="email" required name="email" value={formData.email} onChange={handleChange} 
                 disabled={isEdit}
                 className={`w-full px-4 py-3 bg-[#F5F5F5] border-2 rounded-xl font-bold text-sm ${isEdit ? 'opacity-60 cursor-not-allowed border-transparent' : (errors.email ? 'border-[#F6465D] bg-white' : 'border-transparent focus:border-[#F0B90B] focus:bg-white')}`} 
                 placeholder="john@fluidhr.com" 
               />
               {errors.email && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.email}</p>}
             </div>
             
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Personal Email Address *</label>
                <input 
                  type="email" required name="personalEmail" value={formData.personalEmail} onChange={handleChange} 
                 className={`w-full px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.personalEmail ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm`} 
                 placeholder="john.doe@gmail.com" 
               />
               {errors.personalEmail && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.personalEmail}</p>}
             </div>
             
             {!isEdit && (
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Password *</label>
                 <input type="password" required={!isEdit} maxLength={20} name="password" value={formData.password} onChange={handleChange} className={`w-full px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.password ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm`} placeholder="••••••••" />
                 {errors.password && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.password}</p>}
               </div>
             )}

             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Phone Number *</label>
               <input name="phone" maxLength={10} value={formData.phone} onChange={handleChange} className={`w-full px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.phone ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm`} placeholder="1234567890" />
               {errors.phone && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.phone}</p>}
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Role *</label>
               <div className="relative">
                 <select required name="role" value={formData.role} onChange={handleChange} className={`w-full px-4 pr-10 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.role ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm appearance-none cursor-pointer transition-all`}>
                   <option value="employee">Employee</option>
                   <option value="manager">Manager</option>
                   <option value="hr">HR</option>
                   <option value="admin">Admin</option>
                 </select>
                 <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] pointer-events-none" />
               </div>
               {errors.role && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.role}</p>}
             </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Designation</label>
                <input name="designation" value={formData.designation} onChange={handleChange} className={`w-full px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 border-transparent focus:border-[#F0B90B] rounded-xl font-bold text-sm`} placeholder="Software Engineer" />
              </div>

             {/* Direct Manager Selection - Hidden for Leadership Nodes */}
             {!['hr', 'manager', 'admin'].includes(formData.role?.toLowerCase()) && (
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Direct Manager *</label>
                 <div className="relative">
                   <select 
                    name="managerId" 
                    value={formData.managerId} 
                    onChange={handleChange} 
                    className={`w-full px-4 pr-10 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.managerId ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm appearance-none cursor-pointer transition-all`}
                   >
                     <option value="">Select Manager</option>
                     {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                   </select>
                   <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] pointer-events-none" />
                 </div>
                 {errors.managerId && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.managerId}</p>}
               </div>
             )}

             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Join Date *</label>
               <input type="date" required name="joinDate" value={formData.joinDate} onChange={handleChange} className={`w-full px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.joinDate ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm`} />
               {errors.joinDate && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.joinDate}</p>}
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Birthdate *</label>
                <input type="date" required name="dob" value={formData.dob} onChange={handleChange} className={`w-full px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.dob ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm`} />
               {errors.dob && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.dob}</p>}
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Employment Type</label>
               <div className="relative">
                 <select name="employmentType" value={formData.employmentType} onChange={handleChange} className={`w-full px-4 pr-10 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.employmentType ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm appearance-none cursor-pointer transition-all`}>
                   <option value="Full-time">Full-time</option>
                   <option value="Part-time">Part-time</option>
                   <option value="Contract">Contract</option>
                 </select>
                 <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] pointer-events-none" />
               </div>
               {errors.employmentType && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.employmentType}</p>}
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Gender Identity *</label>
               <div className="relative">
                  <select required name="gender" disabled={isEdit} value={formData.gender} onChange={handleChange} className={`w-full px-4 pr-10 py-3 bg-[#F5F5F5] border-2 rounded-xl font-bold text-sm appearance-none transition-all ${isEdit ? 'opacity-60 cursor-not-allowed border-transparent' : (errors.gender ? 'border-[#F6465D] bg-white' : 'border-transparent focus:border-[#F0B90B] focus:bg-white cursor-pointer')}`}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown size={16} className={`absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] pointer-events-none ${isEdit ? 'opacity-50' : ''}`} />
                </div>
               {errors.gender && <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest mt-1">{errors.gender}</p>}
             </div>

             <div className="space-y-2 col-span-full">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#848E9C]">Location Node (Address) *</label>
               <textarea 
                 name="address" required maxLength={250} value={formData.address} onChange={handleChange} 
                 className={`w-full h-32 px-4 py-3 bg-[#F5F5F5] focus:bg-white border-2 ${errors.address ? 'border-[#F6465D]' : 'border-transparent focus:border-[#F0B90B]'} rounded-xl font-bold text-sm resize-none`} 
                 placeholder="Enter physical location address..." 
               />
               <div className="flex justify-between items-center mt-1">
                 {errors.address ? <p className="text-[10px] text-[#F6465D] font-bold uppercase tracking-widest">{errors.address}</p> : <div></div>}
                 <p className="text-[10px] font-bold uppercase tracking-widest text-[#848E9C]">{formData.address?.length || 0}/250</p>
               </div>
             </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-[#133029] flex justify-end">
             <button 
               type="submit" 
               disabled={loading}
               className="bg-[#00a76b] hover:bg-[#00915c] text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
             >
               {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
               {isEdit ? 'Save Employee Changes' : 'Save Employee'}
             </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default EmployeeForm;
