import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
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
  FileText,
  ArrowLeft,
  Save,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import CustomDatePicker from '../../components/CustomDatePicker';
import { getImageUrl } from '@shared/services/api';
import { compressImageAndConvertToBase64 } from '@shared/utils/imageCompressor';

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

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const today = new Date();
  const maxDobDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];

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
    permanentAddress: '',
    role: 'employee',
    department: '',
    designation: '',
    managerId: '',
    joinDate: new Date().toISOString().split('T')[0],
    employmentType: 'Full-time',
    profileImage: '',
    adharCard: '',
    bankDetails: '',
    panCard: ''
  });

  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
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
  const [previewDoc, setPreviewDoc] = useState(null);
  const [imgError, setImgError] = useState(false);

  const handlePreviewDoc = (title, localFile, serverPath) => {
    setImgError(false);
    if (localFile) {
      const blobUrl = URL.createObjectURL(localFile);
      setPreviewDoc({ title, url: blobUrl });
    } else if (serverPath) {
      setPreviewDoc({ title, url: getImageUrl(serverPath) });
    } else {
      toast.error(`No ${title} document uploaded yet.`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewDoc) {
        setPreviewDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc]);

  const defaultDepartments = [
    'Engineering',
    'Sales',
    'Marketing',
    'Finance',
    'HR',
    'Design',
    'Operations'
  ];

  const departmentList = departments.length > 0
    ? departments.map(d => typeof d === 'string' ? d : d.name).filter(Boolean)
    : defaultDepartments;

  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await axios.get('/api/personnel/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setManagers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        try {
          const mgrRes = await axios.get('/api/managers', { headers: { Authorization: `Bearer ${token}` } });
          setManagers(mgrRes.data || []);
        } catch (e) {
          console.warn('Personnel Sync Delayed');
        }
      }
    };

    const fetchSystemRoles = async () => {
      try {
        const res = await axios.get('/api/system-roles', { headers: { Authorization: `Bearer ${token}` } });
        if (Array.isArray(res.data) && res.data.length > 0) {
          setSystemRoles(res.data);
        }
      } catch (err) {
        console.warn('System Roles Sync Delayed');
      }
    };
    fetchSystemRoles();

    const fetchDepartments = async () => {
      try {
        const res = await axios.get('/api/departments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDepartments(res.data);
        }
      } catch (err) { console.warn('Departments Sync Delayed'); }
    };
    fetchDepartments();

    const fetchEmployeeData = async () => {
      if (isEdit) {
        try {
          const empRes = await axios.get(`/api/employees/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const emp = empRes.data;
          const nameParts = (emp.fullName || emp.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
          const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

          const fetchedRole = emp.userId?.role || emp.role || 'employee';
          let fetchedDesignation = emp.designation || emp.position || '';
          if (['Employee', 'Associate', 'Staff Member', 'Admin', 'HR', 'Manager', 'N/A'].includes(fetchedDesignation)) {
            fetchedDesignation = '';
          }

          setFormData({
            employeeId: emp.employeeId || '',
            firstName,
            middleName,
            lastName,
            email: emp.email || '',
            personalEmail: emp.personalEmail || '',
            password: '',
            phone: emp.phone || '',
            gender: emp.gender || 'Male',
            dob: emp.dob ? emp.dob.split('T')[0] : '',
            address: emp.address || '',
            permanentAddress: emp.permanentAddress || '',
            role: fetchedRole,
            department: emp.department || '',
            designation: fetchedDesignation,
            managerId: emp.managerId?._id || emp.managerId || '',
            joinDate: emp.joinDate ? emp.joinDate.split('T')[0] : new Date().toISOString().split('T')[0],
            employmentType: emp.employmentType || 'Full-time',
            profileImage: emp.profileImage || '',
            adharCard: emp.adharCard || '',
            bankDetails: emp.bankDetails || '',
            panCard: emp.panCard || ''
          });

          if (emp.profileImage) {
            setPreviewUrl(getImageUrl(emp.profileImage));
          }
        } catch (err) {
          console.error('Fetch employee error:', err);
          toast.error('Failed to load employee data');
        }
      }
    };

    if (token) {
      fetchManagers();
      fetchEmployeeData();
    }
  }, [id, isEdit, token]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    let newErrors = { ...errors, [name]: '' };

    if (name === 'firstName' || name === 'lastName' || name === 'middleName') {
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
    if (name === 'role') {
      setFormData(prev => ({
        ...prev,
        role: value
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
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

  const toBase64 = file => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Custom Validation
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'First Name is required.';
    if (!formData.lastName) newErrors.lastName = 'Last Name is required.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email) {
      newErrors.email = 'Office Email Address is required.';
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

    if (!isEdit && !formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password) {
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

    if (!['hr', 'manager', 'admin'].includes(formData.role?.toLowerCase()) && !formData.managerId) {
      newErrors.managerId = 'Reporting Manager is required.';
    }
    if (!formData.address) newErrors.address = 'Physical Address is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '', employeeId: '', status: '' });

    try {
      const submitData = {
        name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
        fullName: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
        email: formData.email,
        personalEmail: formData.personalEmail,
        role: formData.role,
        department: formData.department,
        designation: formData.designation,
        phone: formData.phone,
        gender: formData.gender,
        address: formData.address,
        dob: formData.dob,
        joinDate: formData.joinDate,
        employmentType: formData.employmentType || 'Full-time',
        managerId: !['hr', 'manager', 'admin'].includes(formData.role?.toLowerCase()) ? formData.managerId : null
      };

      if (formData.password) {
        submitData.password = formData.password;
      }

      let profileId = id;

      if (isEdit) {
        await axios.put(`/api/employees/${id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        window.dispatchEvent(new Event('profileUpdated'));
      } else {
        const res = await axios.post('/api/users/create', submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        profileId = res.data.user?.profileId || res.data.user?._id;
      }

      // Parallel Compressed File Uploads (Ultra-Fast)
      if (profileId) {
        const uploadTasks = [];

        if (selectedFile) {
          uploadTasks.push(
            (async () => {
              try {
                const base64 = await compressImageAndConvertToBase64(selectedFile, 800, 800, 0.8);
                if (base64) {
                  await axios.post(`/api/employees/${profileId}/profile-image`, { image: base64 }, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                }
              } catch (imgErr) {
                console.warn('Photo upload failed:', imgErr);
              }
            })()
          );
        }

        if (adharFile) {
          uploadTasks.push(
            (async () => {
              try {
                const base64 = await compressImageAndConvertToBase64(adharFile, 1200, 1200, 0.75);
                if (base64) {
                  await axios.post(`/api/employees/${profileId}/adhar-card`, { document: base64 }, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                }
              } catch (err) {
                console.warn('Adhar upload failed:', err);
              }
            })()
          );
        }

        if (bankFile) {
          uploadTasks.push(
            (async () => {
              try {
                const base64 = await compressImageAndConvertToBase64(bankFile, 1200, 1200, 0.75);
                if (base64) {
                  await axios.post(`/api/employees/${profileId}/bank-details`, { document: base64 }, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                }
              } catch (err) {
                console.warn('Bank detail upload failed:', err);
              }
            })()
          );
        }

        if (panFile) {
          uploadTasks.push(
            (async () => {
              try {
                const base64 = await compressImageAndConvertToBase64(panFile, 1200, 1200, 0.75);
                if (base64) {
                  await axios.post(`/api/employees/${profileId}/pan-card`, { document: base64 }, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                }
              } catch (err) {
                console.warn('PAN Card upload failed:', err);
              }
            })()
          );
        }

        if (uploadTasks.length > 0) {
          await Promise.allSettled(uploadTasks);
        }
      }

      toast.success(isEdit ? 'Employee Profile Updated Successfully' : 'Employee Profile Created Successfully', {
        style: {
          background: '#00a76b',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '8px'
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#00a76b'
        }
      });

      navigate('/employees');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save employee profile.';
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

  const hasAdhar = !!(adharFile || formData.adharCard);
  const hasBank = !!(bankFile || formData.bankDetails);
  const hasPan = !!(panFile || formData.panCard);

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
          </div>
          <button onClick={() => setMessage({ type: '', text: '', employeeId: '', status: '' })} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer border-none bg-transparent">
            <X size={18} />
          </button>
        </div>
      )}

      {/* MASTER FORM LAYOUT */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200/80 dark:border-[#38352e]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {isEdit ? 'UPDATE EMPLOYEE' : 'Create Employee'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              {isEdit ? 'Update team member profile details, credentials, and verification documents.' : 'Add a new team member with profile details, credentials, and verification documents.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="px-4 py-2.5 bg-white dark:bg-[#181612] hover:bg-slate-50 dark:hover:bg-[#201d18] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200/80 dark:border-[#38352e] transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
          >
            ← Back
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Profile & Real-time Live Preview Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 shadow-xs flex flex-col items-center text-center">
              
              {/* Profile Picture */}
              <div className="relative group mb-4">
                <div className={`w-32 h-32 rounded-2xl bg-slate-100 dark:bg-[#221e19] flex items-center justify-center overflow-hidden transition-all ${
                  previewUrl ? 'border border-slate-200 dark:border-[#38352e]' : 'border-2 border-dashed border-slate-200 dark:border-[#38352e] group-hover:border-[#00a76b]'
                }`}>
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
                  : 'Employee Profile'}
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 capitalize mt-0.5">
                {formData.designation || (formData.role ? formData.role.charAt(0).toUpperCase() + formData.role.slice(1) : 'Staff Member')}
              </p>

              {formData.employeeId && (
                <div className="mt-2.5 flex items-center justify-center">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#00a76b] dark:text-emerald-400 uppercase tracking-wider inline-flex items-center gap-1 font-mono">
                    <Fingerprint size={12} className="text-[#00a76b]" /> Employee ID: {formData.employeeId}
                  </span>
                </div>
              )}

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
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Department</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                    {formData.department || 'Not selected'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Designation</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                    {formData.designation || 'Not specified'}
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

                {!['hr', 'manager', 'admin'].includes(formData.role?.toLowerCase()) && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Manager</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {managers.find(m => m._id === formData.managerId)?.name ||
                       managers.find(m => m._id === formData.managerId)?.fullName || 'Not assigned'}
                    </span>
                  </div>
                )}

                <div className="flex flex-col text-xs pt-1 space-y-2">
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400 mb-0.5 block">1. Local Address</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed break-words bg-slate-50 dark:bg-[#1f1b16] p-2 rounded-lg border border-slate-100 dark:border-[#2d2822] block">
                      {formData.address || 'No local address entered yet.'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400 mb-0.5 block">2. Permanent Address</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed break-words bg-slate-50 dark:bg-[#1f1b16] p-2 rounded-lg border border-slate-100 dark:border-[#2d2822] block">
                      {formData.permanentAddress || 'No permanent address entered yet.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Document Readiness Badges */}
              <div className="w-full mt-5 pt-5 border-t border-slate-100 dark:border-[#28241e]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3 text-left">Document Vault Status</p>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => handlePreviewDoc('Adharcard', adharFile, formData.adharCard)}
                    className={`p-2 rounded-xl border text-center text-[10px] font-bold select-none transition-all ${
                      hasAdhar
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:scale-[1.04] hover:shadow-sm active:scale-95'
                        : 'bg-slate-50 dark:bg-[#221e19] border-slate-200 dark:border-[#38352e] text-slate-400 opacity-60'
                    }`}
                    title={hasAdhar ? "Click to preview Adharcard" : "No Adharcard uploaded"}
                  >
                    Adhar {hasAdhar ? '✓' : ''}
                  </div>
                  <div
                    onClick={() => handlePreviewDoc('Bank Details', bankFile, formData.bankDetails)}
                    className={`p-2 rounded-xl border text-center text-[10px] font-bold select-none transition-all ${
                      hasBank
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:scale-[1.04] hover:shadow-sm active:scale-95'
                        : 'bg-slate-50 dark:bg-[#221e19] border-slate-200 dark:border-[#38352e] text-slate-400 opacity-60'
                    }`}
                    title={hasBank ? "Click to preview Bank Details" : "No Bank Details uploaded"}
                  >
                    Bank {hasBank ? '✓' : ''}
                  </div>
                  <div
                    onClick={() => handlePreviewDoc('PAN Card', panFile, formData.panCard)}
                    className={`p-2 rounded-xl border text-center text-[10px] font-bold select-none transition-all ${
                      hasPan
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:scale-[1.04] hover:shadow-sm active:scale-95'
                        : 'bg-slate-50 dark:bg-[#221e19] border-slate-200 dark:border-[#38352e] text-slate-400 opacity-60'
                    }`}
                    title={hasPan ? "Click to preview PAN Card" : "No PAN Card uploaded"}
                  >
                    PAN {hasPan ? '✓' : ''}
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Personal Information</h3>
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
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {isEdit ? 'Password (Leave blank to keep current)' : 'Password *'}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password" value={formData.password} onChange={handleChange} maxLength="20"
                      className="w-full h-11 pl-10 pr-10 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                      placeholder={isEdit ? '••••••••' : 'Password'}
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer border-none bg-transparent"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-[10px] font-semibold">{errors.password}</p>}
                </div>
              </div>
            </div>

            {/* SECTION 2: Role & Organization Setup */}
            <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#28241e] pb-4">
                <Shield size={18} className="text-[#00a76b]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Role & Organization Setup</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* System Role */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">System Role <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      name="role" value={formData.role} onChange={handleChange}
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] appearance-none cursor-pointer capitalize"
                    >
                      {systemRoles.length > 0 ? (
                        systemRoles.map((r) => (
                          <option key={r.roleKey || r._id} value={r.roleKey}>{r.label}</option>
                        ))
                      ) : (
                        <>
                          <option value="employee">Employee</option>
                          <option value="hr">HR</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </>
                      )}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.role && <p className="text-red-500 text-[10px] font-semibold">{errors.role}</p>}
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Department <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] appearance-none cursor-pointer"
                    >
                      <option value="">Select Department</option>
                      {departmentList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.department && <p className="text-red-500 text-[10px] font-semibold">{errors.department}</p>}
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Designation</label>
                  <input
                    name="designation" value={formData.designation} onChange={handleChange}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all"
                    placeholder="e.g. Software Engineer"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Gender <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      name="gender" value={formData.gender} onChange={handleChange}
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] appearance-none cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.gender && <p className="text-red-500 text-[10px] font-semibold">{errors.gender}</p>}
                </div>

                {/* Join Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Join Date <span className="text-red-500">*</span></label>
                  <CustomDatePicker
                    name="joinDate"
                    value={formData.joinDate}
                    onChange={handleChange}
                    placeholder="Select Join Date"
                  />
                  {errors.joinDate && <p className="text-red-500 text-[10px] font-semibold">{errors.joinDate}</p>}
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date of Birth <span className="text-red-500">*</span></label>
                  <input
                    type="date" name="dob" max={maxDobDate} value={formData.dob} onChange={handleChange}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] cursor-pointer"
                  />
                  {errors.dob && <p className="text-red-500 text-[10px] font-semibold">{errors.dob}</p>}
                </div>

                {/* Reporting Manager */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Reporting Manager {!['hr', 'manager', 'admin'].includes(formData.role?.toLowerCase()) && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <select
                      name="managerId" value={formData.managerId} onChange={handleChange}
                      disabled={['hr', 'manager', 'admin'].includes(formData.role?.toLowerCase())}
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="">Select Manager</option>
                      {managers.map(m => (
                        <option key={m._id} value={m._id}>
                          {m.name || m.fullName} ({m.employeeId || 'Manager'})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.managerId && <p className="text-red-500 text-[10px] font-semibold">{errors.managerId}</p>}
                </div>
              </div>

              {/* Residential Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Local Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">1. Local Address <span className="text-red-500">*</span></label>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{(formData.address || '').length}/250</span>
                  </div>
                  <textarea
                    required name="address" value={formData.address} onChange={handleChange} maxLength="250" rows="3"
                    className="w-full p-3 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all resize-none"
                    placeholder="Current local residential address..."
                  />
                  {errors.address && <p className="text-red-500 text-[10px] font-semibold">{errors.address}</p>}
                </div>

                {/* 2. Permanent Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">2. Permanent Address <span className="text-red-500">*</span></label>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{(formData.permanentAddress || '').length}/250</span>
                  </div>
                  <textarea
                    required name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} maxLength="250" rows="3"
                    className="w-full p-3 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00a76b] focus:ring-1 focus:ring-[#00a76b] transition-all resize-none"
                    placeholder="Permanent home address..."
                  />
                  {errors.permanentAddress && <p className="text-red-500 text-[10px] font-semibold">{errors.permanentAddress}</p>}
                </div>
              </div>
            </div>

            {/* SECTION 3: Identity Verification Documents */}
            <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#28241e] pb-4">
                <div className="flex items-center gap-2">
                  <Fingerprint size={18} className="text-[#00a76b]" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Identity Verification Documents</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">Accepted formats: JPG, PNG</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Adharcard */}
                <div className={`p-4 rounded-xl border border-dashed transition-all flex flex-col justify-between ${hasAdhar ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400' : 'bg-slate-50/50 dark:bg-[#1a1714] border-slate-200 dark:border-[#38352e]'}`}>
                  <div 
                    onClick={() => hasAdhar && handlePreviewDoc('Adharcard', adharFile, formData.adharCard)}
                    className={`flex items-center gap-3 mb-3 ${hasAdhar ? 'cursor-pointer group' : ''}`}
                    title={hasAdhar ? "Click to preview Adharcard" : ""}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#25201b] border border-slate-200 dark:border-[#38352e] flex items-center justify-center text-slate-500 group-hover:text-[#00a76b] group-hover:border-[#00a76b] shrink-0 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#00a76b] transition-colors">Adharcard</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{hasAdhar ? 'Attached' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasAdhar && (
                      <button
                        type="button"
                        onClick={() => handlePreviewDoc('Adharcard', adharFile, formData.adharCard)}
                        className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-xs"
                        title="View Document"
                      >
                        <Eye size={14} /> View
                      </button>
                    )}
                    <label className="h-9 text-xs bg-slate-900 hover:bg-[#00a76b] dark:bg-[#25201b] dark:hover:bg-[#00a76b] text-white font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors w-full">
                      {hasAdhar ? 'Change File' : 'Upload File'}
                      <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleDocumentChange(e, setAdharFile, 'Adharcard')} />
                    </label>
                  </div>
                </div>

                {/* Bank Details */}
                <div className={`p-4 rounded-xl border border-dashed transition-all flex flex-col justify-between ${hasBank ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400' : 'bg-slate-50/50 dark:bg-[#1a1714] border-slate-200 dark:border-[#38352e]'}`}>
                  <div 
                    onClick={() => hasBank && handlePreviewDoc('Bank Details', bankFile, formData.bankDetails)}
                    className={`flex items-center gap-3 mb-3 ${hasBank ? 'cursor-pointer group' : ''}`}
                    title={hasBank ? "Click to preview Bank Details" : ""}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#25201b] border border-slate-200 dark:border-[#38352e] flex items-center justify-center text-slate-500 group-hover:text-[#00a76b] group-hover:border-[#00a76b] shrink-0 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#00a76b] transition-colors">Bank Details</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{hasBank ? 'Attached' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasBank && (
                      <button
                        type="button"
                        onClick={() => handlePreviewDoc('Bank Details', bankFile, formData.bankDetails)}
                        className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-xs"
                        title="View Document"
                      >
                        <Eye size={14} /> View
                      </button>
                    )}
                    <label className="h-9 text-xs bg-slate-900 hover:bg-[#00a76b] dark:bg-[#25201b] dark:hover:bg-[#00a76b] text-white font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors w-full">
                      {hasBank ? 'Change File' : 'Upload File'}
                      <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleDocumentChange(e, setBankFile, 'Bank Details')} />
                    </label>
                  </div>
                </div>

                {/* PAN Card */}
                <div className={`p-4 rounded-xl border border-dashed transition-all flex flex-col justify-between ${hasPan ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400' : 'bg-slate-50/50 dark:bg-[#1a1714] border-slate-200 dark:border-[#38352e]'}`}>
                  <div 
                    onClick={() => hasPan && handlePreviewDoc('PAN Card', panFile, formData.panCard)}
                    className={`flex items-center gap-3 mb-3 ${hasPan ? 'cursor-pointer group' : ''}`}
                    title={hasPan ? "Click to preview PAN Card" : ""}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#25201b] border border-slate-200 dark:border-[#38352e] flex items-center justify-center text-slate-500 group-hover:text-[#00a76b] group-hover:border-[#00a76b] shrink-0 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#00a76b] transition-colors">PAN Card</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{hasPan ? 'Attached' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPan && (
                      <button
                        type="button"
                        onClick={() => handlePreviewDoc('PAN Card', panFile, formData.panCard)}
                        className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-xs"
                        title="View Document"
                      >
                        <Eye size={14} /> View
                      </button>
                    )}
                    <label className="h-9 text-xs bg-slate-900 hover:bg-[#00a76b] dark:bg-[#25201b] dark:hover:bg-[#00a76b] text-white font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors w-full">
                      {hasPan ? 'Change File' : 'Upload File'}
                      <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleDocumentChange(e, setPanFile, 'PAN Card')} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BAR */}
            <div className="bg-white dark:bg-[#181612] border border-slate-200/80 dark:border-[#38352e] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                <Info size={16} className="text-[#00a76b] shrink-0" />
                {isEdit ? 'Changes will update the employee profile across all systems.' : 'Employee profile will be registered with assigned role permissions.'}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button" 
                  onClick={() => navigate('/employees')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#25201b] dark:hover:bg-[#2d2721] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={loading}
                  className="px-7 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer w-full sm:w-auto uppercase tracking-wider"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  {loading ? 'Saving...' : (isEdit ? 'SAVE EMPLOYEE' : 'Save Employee')}
                </button>
              </div>
            </div>

          </div>
        </div>
      </form>

      {/* DOCUMENT PREVIEW LIGHTBOX MODAL */}
      {previewDoc && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
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
            className="relative w-full max-w-4xl h-[80vh] max-h-[640px] min-h-[480px] flex flex-col bg-slate-900/95 dark:bg-[#181612]/95 border border-slate-700/80 dark:border-[#38352e] rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-700/60 dark:border-[#38352e]">
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-[#00a76b]" /> {previewDoc.title}
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download={previewDoc.title}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Download / Open in new tab"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4 bg-black/40 rounded-2xl">
              {(previewDoc.url.toLowerCase().endsWith('.pdf') || previewDoc.url.startsWith('data:application/pdf')) ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-full h-full rounded-xl border border-slate-700"
                />
              ) : !imgError ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  onError={() => setImgError(true)}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-4">
                    <FileText size={32} className="text-amber-500" />
                  </div>
                  <h5 className="text-sm font-bold text-white mb-1.5">{previewDoc.title}</h5>
                  <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">
                    Preview could not be displayed directly. You can open or download the document below.
                  </p>
                  <a
                    href={previewDoc.url}
                    download={previewDoc.title}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Download size={15} /> Open / Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmployeeForm;
