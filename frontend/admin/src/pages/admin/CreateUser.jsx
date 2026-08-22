import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Shield,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Info,
  Fingerprint,
  RefreshCw,
  Plus,
  ChevronDown,
  Camera,
  MapPin,
  Phone,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Helper to format date strings as DD-MM-YYYY
const formatDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year.length === 4) {
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }
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

const CreateUser = () => {
  const navigate = useNavigate();
  const today = new Date();
  const maxDobDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    phone: '',
    password: '',
    role: 'employee',
    designation: '',
    gender: 'Male',
    address: '',
    dob: '',
    joinDate: new Date().toISOString().split('T')[0],
    reportingManager: ''
  });
  const [managers, setManagers] = useState([]);
  const [nextId, setNextId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '', employeeId: '', status: '' });
  const [errors, setErrors] = useState({});

  // Image State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Document State
  const [adharFile, setAdharFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [panFile, setPanFile] = useState(null);

  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchNextId = async () => {
      try {
        const res = await axios.get(`/api/personnel/next-id/${formData.role}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNextId(res.data.nextId);
      } catch (err) { console.warn('ID Sync Delayed'); }
    };

    const fetchManagers = async () => {
      try {
        const res = await axios.get('/api/personnel/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setManagers(Array.isArray(res.data) ? res.data : []);
      } catch (err) { console.warn('Personnel Sync Delayed'); }
    };

    if (token) {
      fetchNextId();
      fetchManagers();
    }
  }, [formData.role, token]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    let newErrors = { ...errors, [name]: '' };

    if (name === 'firstName' || name === 'lastName' || name === 'middleName') {
      // Remove spaces and non-alphabetic characters
      if (value && !/^[A-Za-z]*$/.test(value)) {
        const fieldDisplayName = name === 'firstName' ? 'First Name' : name === 'lastName' ? 'Last Name' : 'Middle Name';
        newErrors[name] = `${fieldDisplayName} allows only alphabetic characters (no spaces).`;
        value = value.replace(/[^A-Za-z]/g, '');
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
      } else if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[name] = 'Please enter a valid email format (e.g., user@example.com).';
      }
    }

    if (name === 'password' && value) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
      if (!passwordRegex.test(value)) {
        newErrors.password = 'Password must be minimum 8 characters, 1 special symbol, minimum 1 capital letter, and minimum 1 number.';
      }
    }

    setErrors(newErrors);
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setErrors(prev => ({ ...prev, profilePicture: '' }));
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, profilePicture: 'Only JPG and PNG images are allowed.' }));
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDocumentChange = (e, setter, documentName) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error(`Invalid format for ${documentName}. Please upload a JPG or PNG image.`, {
        style: { background: '#ff4f00', color: '#fff', fontWeight: 'bold' }
      });
      e.target.value = '';
      return;
    }

    setter(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Custom Validation
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'First Name is required.';
    if (!formData.lastName) newErrors.lastName = 'Last Name is required.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email) {
      newErrors.email = 'Email Address is required.';
    } else if (!emailRegex.test(formData.email) || /@(gmal|gaml|gmil|gmial|gmaill)\.com$/i.test(formData.email)) {
      newErrors.email = 'Please enter a valid email format with correct spelling.';
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
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else {
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password = 'Password must be minimum 8 characters, 1 special symbol, minimum 1 capital letter, and minimum 1 number.';
      }
    }
    if (!formData.role) newErrors.role = 'System Role is required.';
    if (!formData.gender) newErrors.gender = 'Gender is required.';
    if (!formData.joinDate) newErrors.joinDate = 'Join Date is required.';

    if (!formData.dob) {
      newErrors.dob = 'Date of Birth is required.';
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      if (age < 18) {
        newErrors.dob = 'Employee must be at least 18 years old.';
      }
    }

    if (!['hr', 'manager', 'admin'].includes(formData.role) && !formData.reportingManager) {
      newErrors.reportingManager = 'Reporting Manager is required.';
    }
    if (!formData.address) newErrors.address = 'Physical Address is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '', employeeId: '', status: '' });

    try {
      const payload = {
        name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
        email: formData.email,
        personalEmail: formData.personalEmail,
        password: formData.password,
        role: formData.role,
        designation: formData.designation,
        phone: formData.phone,
        gender: formData.gender,
        address: formData.address,
        dob: formData.dob,
        joinDate: formData.joinDate,
        reportingManager: formData.role === 'employee' ? formData.reportingManager : null
      };

      // 1. Create User Core
      const response = await axios.post('/api/users/create', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { user } = response.data;
      const profileId = user.profileId; // 🎯 SYNC: Use the actual Profile ID, not User ID

      const toBase64 = file => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      // 2. Upload Photo if selected (Sequential Linkage)
      if (selectedFile && profileId) {
        try {
          const base64 = await toBase64(selectedFile);
          await axios.post(`/api/employees/${profileId}/profile-image`, { image: base64 }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (imgErr) {
          console.warn('Photo upload failed but user was created:', imgErr);
        }
      }

      // 3. Upload Documents if selected
      if (adharFile && profileId) {
        try {
          const base64 = await toBase64(adharFile);
          await axios.post(`/api/employees/${profileId}/adhar-card`, { document: base64 }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) { console.warn('Adhar upload failed:', err); }
      }

      if (bankFile && profileId) {
        try {
          const base64 = await toBase64(bankFile);
          await axios.post(`/api/employees/${profileId}/bank-details`, { document: base64 }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) { console.warn('Bank detail upload failed:', err); }
      }

      if (panFile && profileId) {
        try {
          const base64 = await toBase64(panFile);
          await axios.post(`/api/employees/${profileId}/pan-card`, { document: base64 }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) { console.warn('PAN Card upload failed:', err); }
      }

      setMessage({
        type: 'success',
        text: 'Employee profile created successfully.',
        employeeId: user?.employeeId,
        status: user?.status
      });

      toast.success('Employee Created Successfully', {
        style: {
          background: '#00a76b',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '4px',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#00a76b',
        }
      });

      // Cleanup
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        personalEmail: '',
        password: '',
        role: formData.role,
        designation: '',
        gender: 'Male',
        phone: '',
        address: '',
        dob: '',
        joinDate: new Date().toISOString().split('T')[0],
        reportingManager: ''
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setAdharFile(null);
      setBankFile(null);
      setPanFile(null);

    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to create employee.';
      if (errMsg.toLowerCase().includes('personal email')) {
        setErrors(prev => ({ ...prev, personalEmail: errMsg }));
      } else if (errMsg.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: errMsg }));
      } else {
        setMessage({
          type: 'error',
          text: errMsg
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in w-full pb-20 space-y-6">
      {/* TOAST NOTIFICATION */}
      {message.text && (
        <div className="fixed top-24 right-8 bg-white dark:bg-[#181612] border border-slate-200 dark:border-[#38352e] shadow-2xl p-5 rounded-2xl flex items-center gap-4 animate-fade-in z-[100] min-w-[360px]">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {message.type === 'success' ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-0.5">{message.type === 'success' ? 'Success' : 'Error'}</h4>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{message.text}</p>
            {message.employeeId && (
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-[#25201b] text-slate-800 dark:text-slate-200 rounded-md text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <Fingerprint size={12} /> {message.employeeId}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                  {message.status || 'ACTIVE'}
                </span>
              </div>
            )}
          </div>
          <button onClick={() => setMessage({ type: '', text: '', employeeId: '', status: '' })} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer border-none bg-transparent">
            <X size={18} />
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200/80 dark:border-[#38352e]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {nextId && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#00a76b] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Fingerprint size={12} className="text-[#00a76b]" /> Next Auto-ID: {nextId}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Create Employee</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Add a new team member with profile details, credentials, and verification documents.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-white dark:bg-[#181612] hover:bg-slate-50 dark:hover:bg-[#201d18] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200/80 dark:border-[#38352e] transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          ← Back
        </button>
      </div>

      {/* MASTER FORM LAYOUT */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Profile & Real-time Live Preview Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 shadow-xs flex flex-col items-center text-center">
              
              {/* Profile Picture */}
              <div className="relative group mb-4">
                <div className="w-32 h-32 rounded-2xl bg-slate-100 dark:bg-[#221e19] border-2 border-dashed border-slate-200 dark:border-[#38352e] flex items-center justify-center overflow-hidden transition-all group-hover:border-[#00a76b]">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className={`${errors.profilePicture ? 'text-red-400' : 'text-slate-400 dark:text-slate-600'} opacity-60`} />
                  )}
                </div>
                <label htmlFor="user-photo" className="absolute -bottom-2 -right-2 w-9 h-9 bg-[#00a76b] text-white rounded-xl flex items-center justify-center shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-all">
                  <Camera size={16} />
                  <input
                    id="user-photo"
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Dynamic Name & Designation */}
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight break-words max-w-full">
                {formData.firstName || formData.middleName || formData.lastName
                  ? `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim()
                  : 'New Employee'}
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 capitalize mt-0.5">
                {formData.designation || 'Staff Member'}
              </p>

              {/* Real-Time Live Data Summary */}
              <div className="w-full mt-5 pt-5 border-t border-slate-100 dark:border-[#28241e] space-y-3 text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">Live Employee Card</p>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">System Role</span>
                  <span className="font-bold text-[#00a76b] uppercase bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md text-[10px]">
                    {formData.role || 'employee'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Office Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={formData.email}>
                    {formData.email || 'Not specified'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Personal Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={formData.personalEmail}>
                    {formData.personalEmail || 'Not specified'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Phone Number</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formData.phone || 'Not specified'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Gender</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formData.gender}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Join Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatDDMMYYYY(formData.joinDate) || 'Today'}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Date of Birth</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatDDMMYYYY(formData.dob) || 'Not selected'}</span>
                </div>

                {!['hr', 'manager', 'admin'].includes(formData.role) && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Manager</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {managers.find(m => m._id === formData.reportingManager)?.name ||
                       managers.find(m => m._id === formData.reportingManager)?.fullName || 'Not assigned'}
                    </span>
                  </div>
                )}

                <div className="flex flex-col text-xs pt-1">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Address</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed break-words bg-slate-50 dark:bg-[#1f1b16] p-2 rounded-lg border border-slate-100 dark:border-[#2d2822]">
                    {formData.address || 'No physical address entered yet.'}
                  </span>
                </div>
              </div>

              {/* Document Readiness Badges */}
              <div className="w-full mt-5 pt-5 border-t border-slate-100 dark:border-[#28241e]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3 text-left">Document Vault Status</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className={`p-2 rounded-xl border text-center text-[10px] font-bold ${adharFile ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-[#221e19] border-slate-200 dark:border-[#38352e] text-slate-400'}`}>
                    Adhar {adharFile ? '✓' : ''}
                  </div>
                  <div className={`p-2 rounded-xl border text-center text-[10px] font-bold ${bankFile ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-[#221e19] border-slate-200 dark:border-[#38352e] text-slate-400'}`}>
                    Bank {bankFile ? '✓' : ''}
                  </div>
                  <div className={`p-2 rounded-xl border text-center text-[10px] font-bold ${panFile ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-[#221e19] border-slate-200 dark:border-[#38352e] text-slate-400'}`}>
                    PAN {panFile ? '✓' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Form Sections */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* SECTION 1: Personal & Work Info */}
            <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#28241e] pb-4">
                <User size={18} className="text-[#00a76b]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Personal & Account Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* First Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">First Name <span className="text-red-500">*</span></label>
                  <input
                    required name="firstName" value={formData.firstName} onChange={handleChange}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                    placeholder="First Name" maxLength="20"
                  />
                  {errors.firstName && <p className="text-red-500 text-[10px] font-semibold">{errors.firstName}</p>}
                </div>

                {/* Middle Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Middle Name</label>
                  <input
                    name="middleName" value={formData.middleName} onChange={handleChange}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                    placeholder="Middle Name (Optional)" maxLength="20"
                  />
                  {errors.middleName && <p className="text-red-500 text-[10px] font-semibold">{errors.middleName}</p>}
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Last Name <span className="text-red-500">*</span></label>
                  <input
                    required name="lastName" value={formData.lastName} onChange={handleChange}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                    placeholder="Last Name" maxLength="20"
                  />
                  {errors.lastName && <p className="text-red-500 text-[10px] font-semibold">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Office Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Office Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required name="email" value={formData.email} onChange={handleChange}
                      className="w-full h-11 pl-10 pr-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                      placeholder="email@organization.com"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-[10px] font-semibold">{errors.email}</p>}
                </div>

                {/* Personal Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Personal Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required name="personalEmail" value={formData.personalEmail} onChange={handleChange}
                      className="w-full h-11 pl-10 pr-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                      placeholder="personal@gmail.com"
                    />
                  </div>
                  {errors.personalEmail && <p className="text-red-500 text-[10px] font-semibold">{errors.personalEmail}</p>}
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Phone Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required name="phone" value={formData.phone} onChange={handleChange}
                      className="w-full h-11 pl-10 pr-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                      placeholder="10-digit phone number" maxLength="10"
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-[10px] font-semibold">{errors.phone}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required name="password" value={formData.password} onChange={handleChange} maxLength="20"
                      type={showPassword ? 'text' : 'password'}
                      className="w-full h-11 pl-10 pr-10 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00a76b] cursor-pointer border-none bg-transparent"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-[10px] font-semibold">{errors.password}</p>}
                </div>
              </div>
            </div>

            {/* SECTION 2: Role & Work Details */}
            <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#28241e] pb-4">
                <Shield size={18} className="text-[#00a76b]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Role & Organization Setup</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">System Role <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      required name="role" value={formData.role} onChange={handleChange}
                      className="w-full h-11 px-3.5 pr-8 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] appearance-none cursor-pointer"
                    >
                      <option value="hr">HR</option>
                      <option value="manager">Manager</option>
                      <option value="employee">Employee</option>
                      <option value="admin">System Admin</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Designation</label>
                  <input
                    name="designation" value={formData.designation} onChange={handleChange}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                    placeholder="e.g. Software Engineer" maxLength="50"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Gender <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      required name="gender" value={formData.gender} onChange={handleChange}
                      className="w-full h-11 px-3.5 pr-8 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] appearance-none cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Join Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Join Date <span className="text-red-500">*</span></label>
                  <input
                    required type="date" name="joinDate" value={formData.joinDate} onChange={handleChange}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b]"
                  />
                  {errors.joinDate && <p className="text-red-500 text-[10px] font-semibold">{errors.joinDate}</p>}
                </div>

                {/* Birth Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date of Birth <span className="text-red-500">*</span></label>
                  <input
                    required type="date" name="dob" value={formData.dob} onChange={handleChange} max={maxDobDate}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b]"
                  />
                  {errors.dob && <p className="text-red-500 text-[10px] font-semibold">{errors.dob}</p>}
                </div>

                {/* Reporting Manager */}
                {!['hr', 'manager', 'admin'].includes(formData.role) && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Reporting Manager <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        required name="reportingManager" value={formData.reportingManager} onChange={handleChange}
                        className="w-full h-11 px-3.5 pr-8 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] appearance-none cursor-pointer"
                      >
                        <option value="">Select Manager</option>
                        {managers
                          .filter(m => ['manager', 'admin'].includes(m.role?.toLowerCase()))
                          .map(m => (
                            <option key={m._id} value={m._id}>{m.name || m.fullName} ({m.role?.toUpperCase()})</option>
                          ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Physical Address */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Physical Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <textarea
                    name="address" value={formData.address} onChange={handleChange}
                    className="w-full h-24 pl-10 pr-3.5 pt-3 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] resize-none"
                    placeholder="Full residential address..."
                  />
                  <div className="absolute bottom-2.5 right-3 text-[10px] font-bold text-slate-400">
                    {formData.address?.length || 0}/250
                  </div>
                </div>
                {errors.address && <p className="text-red-500 text-[10px] font-semibold">{errors.address}</p>}
              </div>
            </div>

            {/* SECTION 3: Identity Documents */}
            <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#28241e] pb-4">
                <div className="flex items-center gap-2">
                  <Fingerprint size={18} className="text-[#00a76b]" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Identity Verification Documents</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">Accepted formats: JPG, PNG</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Adharcard */}
                <div className={`p-4 rounded-xl border border-dashed transition-all flex flex-col justify-between ${adharFile ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400' : 'bg-slate-50/50 dark:bg-[#1a1714] border-slate-200 dark:border-[#38352e]'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#25201b] border border-slate-200 dark:border-[#38352e] flex items-center justify-center text-slate-500 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Adharcard</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{adharFile ? 'Attached' : 'Required'}</p>
                    </div>
                  </div>
                  <label className="h-9 text-xs bg-slate-900 hover:bg-[#00a76b] dark:bg-[#25201b] dark:hover:bg-[#00a76b] text-white font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors w-full">
                    {adharFile ? 'Change File' : 'Upload File'}
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleDocumentChange(e, setAdharFile, 'Adharcard')} />
                  </label>
                </div>

                {/* Bank Details */}
                <div className={`p-4 rounded-xl border border-dashed transition-all flex flex-col justify-between ${bankFile ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400' : 'bg-slate-50/50 dark:bg-[#1a1714] border-slate-200 dark:border-[#38352e]'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#25201b] border border-slate-200 dark:border-[#38352e] flex items-center justify-center text-slate-500 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Bank Details</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{bankFile ? 'Attached' : 'Required'}</p>
                    </div>
                  </div>
                  <label className="h-9 text-xs bg-slate-900 hover:bg-[#00a76b] dark:bg-[#25201b] dark:hover:bg-[#00a76b] text-white font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors w-full">
                    {bankFile ? 'Change File' : 'Upload File'}
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleDocumentChange(e, setBankFile, 'Bank Details')} />
                  </label>
                </div>

                {/* PAN Card */}
                <div className={`p-4 rounded-xl border border-dashed transition-all flex flex-col justify-between ${panFile ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400' : 'bg-slate-50/50 dark:bg-[#1a1714] border-slate-200 dark:border-[#38352e]'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#25201b] border border-slate-200 dark:border-[#38352e] flex items-center justify-center text-slate-500 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">PAN Card</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{panFile ? 'Attached' : 'Required'}</p>
                    </div>
                  </div>
                  <label className="h-9 text-xs bg-slate-900 hover:bg-[#00a76b] dark:bg-[#25201b] dark:hover:bg-[#00a76b] text-white font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors w-full">
                    {panFile ? 'Change File' : 'Upload File'}
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleDocumentChange(e, setPanFile, 'PAN Card')} />
                  </label>
                </div>
              </div>
            </div>

            {/* ACTION BAR */}
            <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                <Info size={16} className="text-[#00a76b] shrink-0" />
                Employee profile will be registered with assigned role permissions.
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button" onClick={() => navigate(-1)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#25201b] dark:hover:bg-[#2d2721] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={loading}
                  className="px-7 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                  {loading ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateUser;
