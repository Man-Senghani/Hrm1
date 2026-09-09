import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';
import { Eye, Shield, Lock, FileText, Upload, Trash2, Check, RefreshCw, Plus, Edit2, Save, X, Camera } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const Profile = () => {
  const [userData, setUserData] = useState(() => {
    try {
      const stored = sessionStorage.getItem('user');
      return (stored && stored !== 'undefined' && stored !== 'null') ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  // Status removed in favor of toast
  const [loading, setLoading] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [syncing, setSyncing] = useState(!userData);
  const [viewingDoc, setViewingDoc] = useState(null);

  const token = sessionStorage.getItem('token');
  const location = useLocation();

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchProfile = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/auth/me?t=${timestamp}`, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' }
      });
      if (response.data) {
        setUserData(response.data);
        sessionStorage.setItem('user', JSON.stringify(response.data));
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (err) {
      console.warn('Profile sync fallback:', err?.response?.data || err.message);
      const stored = sessionStorage.getItem('user');
      if (stored && (!userData || Object.keys(userData).length === 0)) {
        try {
          setUserData(JSON.parse(stored));
        } catch (e) {}
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (token) fetchProfile();
  }, [token]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setViewingDoc(null);
    };
    if (viewingDoc) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingDoc]);

  if (syncing && !userData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <RefreshCw size={32} className="animate-spin text-[#00a76b]" />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9ca3af' }}>Loading Profile...</p>
      </div>
    );
  }

  const safeUserData = userData || {};
  const fullName = safeUserData.fullName || safeUserData.name || (safeUserData.profile ? `${safeUserData.profile.firstName || ''} ${safeUserData.profile.lastName || ''}`.trim() : '') || '';
  const userEmail = safeUserData.email || '';
  const userRole = safeUserData.role || sessionStorage.getItem('role') || '';
  const userDept = (safeUserData.department && typeof safeUserData.department === 'object') ? (safeUserData.department.name || '') : (safeUserData.department || safeUserData.dept || '');
  const currentRole = (userRole || '').toLowerCase();
  const showReportingManager = !['hr', 'admin', 'manager'].includes(currentRole) && 
    !(typeof window !== 'undefined' && (window.location.pathname.startsWith('/hr') || window.location.pathname.startsWith('/admin')));

  const empId = safeUserData.employeeId || '';
  const personalEmail = safeUserData.personalEmail || '';
  const joinDateRaw = safeUserData.joinDate;
  const joinDate = joinDateRaw ? new Date(joinDateRaw).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const phone = safeUserData.phone || '';
  const empType = safeUserData.employmentType || '';
  const gender = safeUserData.gender || '';
  const localAddress = safeUserData.localAddress || safeUserData.address || '';
  const permanentAddress = safeUserData.permanentAddress || '';
  const birthdate = safeUserData.dob ? new Date(safeUserData.dob).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const adharCard = safeUserData.adharCard || null;
  const bankDetails = safeUserData.bankDetails || null;
  const panCard = safeUserData.panCard || null;

  const initials = fullName ? fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2) : '';

  const reportingManagerName = safeUserData.reportingManager
    ? (typeof safeUserData.reportingManager === 'object'
      ? (safeUserData.reportingManager.name || safeUserData.reportingManager.fullName || '')
      : safeUserData.reportingManager)
    : '';

  const handleDocumentUpload = async (type, file) => {
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid document format (PDF, JPG, PNG, DOC, DOCX).');
      return;
    }

    setUploadingDocType(type);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const payload = {};
        payload[type] = reader.result;
        
        try {
          const response = await axios.put('/api/auth/profile', payload, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data) {
            await fetchProfile();
            const friendlyName = type === 'adharCard' ? 'Aadhar Card' : type === 'panCard' ? 'PAN Card' : type === 'bankDetails' ? 'Bank Details' : type;
            toast.success(`${friendlyName} updated successfully`);
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
          setUploadingDocType(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to read file');
      setUploadingDocType(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.personalEmail?.trim() || !editForm.phone?.trim()) {
      toast.error('Personal Email and Phone Number are required fields.');
      return;
    }

    if (editForm.localAddress && editForm.localAddress.length > 250) {
      toast.error('Local Address cannot exceed 250 characters.');
      return;
    }

    if (editForm.permanentAddress && editForm.permanentAddress.length > 250) {
      toast.error('Permanent Address cannot exceed 250 characters.');
      return;
    }

    if (editForm.phone && !/^\d+$/.test(editForm.phone)) {
      toast.error('Phone number must contain only numeric values.');
      return;
    }

    if (editForm.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.personalEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (editForm.localAddress && !/^[a-zA-Z0-9\s,.\-/#]*$/.test(editForm.localAddress)) {
      toast.error('Local Address contains invalid special characters.');
      return;
    }

    if (editForm.permanentAddress && !/^[a-zA-Z0-9\s,.\-/#]*$/.test(editForm.permanentAddress)) {
      toast.error('Permanent Address contains invalid special characters.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        fullName: editForm.fullName,
        personalEmail: editForm.personalEmail,
        phone: editForm.phone,
        address: editForm.localAddress,
        localAddress: editForm.localAddress,
        permanentAddress: editForm.permanentAddress,
        profileImage: editForm.profileImage,
      };
      const response = await axios.put('/api/auth/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setUserData(prev => ({
          ...prev,
          name: editForm.fullName,
          fullName: editForm.fullName,
          personalEmail: editForm.personalEmail,
          phone: editForm.phone,
          address: editForm.localAddress,
          localAddress: editForm.localAddress,
          permanentAddress: editForm.permanentAddress,
          profileImage: editForm.profileImage || prev?.profileImage
        }));
        await fetchProfile();
        setIsEditing(false);
        toast.success('Profile updated successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setEditForm({
      fullName: fullName || '',
      personalEmail: personalEmail || '',
      phone: phone || '',
      localAddress: localAddress || '',
      permanentAddress: permanentAddress || '',
      profileImage: null,
    });
    setIsEditing(true);
  };


  return (
    <div style={{ fontFamily: "'Poppins', -apple-system, sans-serif", background: isDark ? '#08100e' : '#f9fdfc', minHeight: 'calc(100vh - 56px)', color: isDark ? '#cbd5e1' : '#3b3e3c', width: '100%', boxSizing: 'border-box', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <div style={{ width: '100%', maxWidth: '100%', padding: '32px 32px 60px', boxSizing: 'border-box' }}>

        {/* Alerts are handled via toast notifications */}

        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: isDark ? '#fff' : '#2c302e', margin: 0, letterSpacing: '-0.5px' }}>My profile</h1>
              <p style={{ fontSize: 14, color: isDark ? '#a3b3af' : '#8c918f', margin: '4px 0 0' }}>Personal information.</p>
            </div>

          </div>
        </div>

        {/* PROFILE METADATA GRID */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'stretch', flexWrap: 'wrap', marginBottom: 24 }}>

          {/* LEFT COLUMN: IDENTITY & DOCUMENTS VAULT */}
          <div style={{ flex: '0 0 320px', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* IDENTITY CARD */}
            <div className="verdant-card" style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#3b3e3c', margin: '0 0 24px', textAlign: 'left' }}>Identity</p>

            <div style={{ display: 'inline-flex', position: 'relative', margin: '0 auto 16px' }}>
              <div 
                onClick={() => {
                  if (!isEditing && userData?.profileImage) {
                    setViewingDoc({ url: getImageUrl(userData.profileImage), name: 'Profile Picture' });
                  }
                }}
                style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  background: '#00a76b', 
                  color: '#fff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 32, 
                  fontWeight: 800, 
                  overflow: 'hidden', 
                  boxShadow: '0 4px 10px rgba(0,167,107,0.1)',
                  cursor: (!isEditing && userData?.profileImage) ? 'pointer' : 'default'
                }}
              >
                {editForm.profileImage ? (
                  <img src={editForm.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : userData?.profileImage ? (
                  <img src={getImageUrl(userData.profileImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}
              </div>
              {isEditing && (
                <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#111c18', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #fff' }}>
                  <Camera size={14} />
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                      if (!validTypes.includes(file.type)) {
                        toast.error('Please upload a valid image file (JPG, PNG, WEBP).');
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => setEditForm({ ...editForm, profileImage: reader.result });
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              )}
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#3b3e3c', margin: '0 0 4px' }}>{fullName}</h3>
            {userRole ? <p style={{ fontSize: 13, color: '#8c918f', margin: '0 0 2px', fontWeight: 600 }}>{userRole.toUpperCase()}</p> : null}
            {empId ? <p style={{ fontSize: 13, color: '#00a76b', margin: '0 0 2px', fontWeight: 700 }}>ID: {empId}</p> : null}
            {userDept ? <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, fontWeight: 600 }}>{userDept}</p> : null}
          </div>

          {/* VERIFIED DOCUMENTS VAULT */}
          <div className="verdant-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#3b3e3c', marginBottom: 24, marginTop: 0 }}>Verified Documents Vault</h3>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: 16 }}>

              {/* Adharcard Display */}
              <div className="verdant-highlight-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: 20 }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', tracking: 1, color: isDark ? '#a3b3af' : '#8c918f', margin: '0 0 4px' }}>National ID</p>
                  {adharCard ? (
                    <button 
                      onClick={() => setViewingDoc({ url: getImageUrl(adharCard), name: 'Adharcard' })} 
                      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', outline: 'none' }}
                    >
                      <p style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#34d399' : '#00a76b', margin: '0 0 4px', textDecoration: 'underline' }}>Adharcard</p>
                    </button>
                  ) : (
                    <p style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#fff' : '#3b3e3c', margin: '0 0 4px' }}>Adharcard</p>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 100 }}>
                  {isEditing && (
                    <label className="verdant-btn-outline" style={{ fontSize: 12, padding: '8px 16px', height: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {uploadingDocType === 'adharCard' ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                      {adharCard ? 'Replace' : 'Upload'}
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => handleDocumentUpload('adharCard', e.target.files[0])} disabled={uploadingDocType !== null} />
                    </label>
                  )}
                </div>
              </div>

              {/* Bank Details Display */}
              <div className="verdant-highlight-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: 20 }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', tracking: 1, color: isDark ? '#a3b3af' : '#8c918f', margin: '0 0 4px' }}>Financial ID</p>
                  {bankDetails ? (
                    <button 
                      onClick={() => setViewingDoc({ url: getImageUrl(bankDetails), name: 'Bank Details' })} 
                      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', outline: 'none' }}
                    >
                      <p style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#34d399' : '#00a76b', margin: '0 0 4px', textDecoration: 'underline' }}>Bank Details</p>
                    </button>
                  ) : (
                    <p style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#fff' : '#3b3e3c', margin: '0 0 4px' }}>Bank Details</p>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 100 }}>
                  {isEditing && (
                    <label className="verdant-btn-outline" style={{ fontSize: 12, padding: '8px 16px', height: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {uploadingDocType === 'bankDetails' ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                      {bankDetails ? 'Replace' : 'Upload'}
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => handleDocumentUpload('bankDetails', e.target.files[0])} disabled={uploadingDocType !== null} />
                    </label>
                  )}
                </div>
              </div>

              {/* PAN Card Display */}
              <div className="verdant-highlight-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: 20 }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', tracking: 1, color: isDark ? '#a3b3af' : '#8c918f', margin: '0 0 4px' }}>Identity Node</p>
                  {panCard ? (
                    <button 
                      onClick={() => setViewingDoc({ url: getImageUrl(panCard), name: 'Pancard' })} 
                      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', outline: 'none' }}
                    >
                      <p style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#34d399' : '#00a76b', margin: '0 0 4px', textDecoration: 'underline' }}>Pancard</p>
                    </button>
                  ) : (
                    <p style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#fff' : '#3b3e3c', margin: '0 0 4px' }}>Pancard</p>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 100 }}>
                  {isEditing && (
                    <label className="verdant-btn-outline" style={{ fontSize: 12, padding: '8px 16px', height: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {uploadingDocType === 'panCard' ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                      {panCard ? 'Replace' : 'Upload'}
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => handleDocumentUpload('panCard', e.target.files[0])} disabled={uploadingDocType !== null} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: DETAILS FORMS */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* PERSONAL DETAILS CARD */}
            <div className="verdant-card" style={{ height: '100%' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#3b3e3c', marginBottom: 24, marginTop: 0 }}>Personal details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px 24px' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full name</label>
                  <input type="text" readOnly={!isEditing} value={isEditing ? editForm.fullName : fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="verdant-input" style={{ backgroundColor: isEditing ? (isDark ? '#162722' : '#fff') : undefined }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                  <input type="email" readOnly value={userEmail} className="verdant-input" style={{ opacity: 0.7 }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Email</label>
                  <input type="email" readOnly={!isEditing} value={isEditing ? editForm.personalEmail : personalEmail} onChange={e => setEditForm({...editForm, personalEmail: e.target.value})} className="verdant-input" style={{ backgroundColor: isEditing ? (isDark ? '#162722' : '#fff') : undefined }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                  <input type="text" maxLength="10" readOnly={!isEditing} value={isEditing ? editForm.phone : phone} onChange={e => setEditForm({...editForm, phone: e.target.value.replace(/\D/g, '')})} className="verdant-input" style={{ backgroundColor: isEditing ? (isDark ? '#162722' : '#fff') : undefined }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date of Birth</label>
                  <input type="text" readOnly value={birthdate} className="verdant-input" style={{ opacity: 0.7 }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</label>
                  <input type="text" readOnly value={gender} className="verdant-input" style={{ opacity: 0.7 }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Local Address</label>
                  <input type="text" maxLength="250" readOnly={!isEditing} value={isEditing ? editForm.localAddress : localAddress} onChange={e => setEditForm({...editForm, localAddress: e.target.value.replace(/[^a-zA-Z0-9\s,.\-/#]/g, '')})} className="verdant-input" style={{ backgroundColor: isEditing ? (isDark ? '#162722' : '#fff') : undefined }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permanent Address</label>
                  <input type="text" maxLength="250" readOnly={!isEditing} value={isEditing ? editForm.permanentAddress : permanentAddress} onChange={e => setEditForm({...editForm, permanentAddress: e.target.value.replace(/[^a-zA-Z0-9\s,.\-/#]/g, '')})} className="verdant-input" style={{ backgroundColor: isEditing ? (isDark ? '#162722' : '#fff') : undefined }} />
                </div>
              </div>
            </div>

            {/* EMPLOYMENT DETAILS CARD */}
            <div className="verdant-card" style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#3b3e3c', marginBottom: 24, marginTop: 0 }}>Employment details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px 24px' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee ID</label>
                  <input type="text" readOnly value={empId} className="verdant-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Designation</label>
                  <input type="text" readOnly value={safeUserData.designation || safeUserData.position || ''} className="verdant-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
                  <input type="text" readOnly value={userDept} className="verdant-input" />
                </div>

                {showReportingManager && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reporting Manager</label>
                    <input type="text" readOnly value={reportingManagerName} className="verdant-input" />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joining Date</label>
                  <input type="text" readOnly value={joinDate} className="verdant-input" />
                </div>

              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          {!isEditing ? (
            <button onClick={handleEditClick} className="verdant-btn-outline" style={{ height: 36, padding: '0 16px', fontSize: 12 }}>
              <Edit2 size={14} />
              Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSaveProfile} disabled={loading} className="verdant-btn-outline" style={{ height: 36, padding: '0 16px', fontSize: 12 }}>
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
              <button onClick={() => setIsEditing(false)} disabled={loading} className="verdant-btn-outline" style={{ height: 36, padding: '0 16px', fontSize: 12 }}>
                <X size={14} />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* DOCUMENT VIEW POPUP MODAL */}
        {viewingDoc && (
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setViewingDoc(null)}
          >
            {/* Proper Modal Card Box with Uniform Dimensions */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full ${
                viewingDoc.url.toLowerCase().includes('.pdf')
                  ? 'max-w-4xl h-[85vh]'
                  : 'max-w-2xl h-[580px] max-h-[90vh]'
              } flex flex-col bg-white dark:bg-[#162722] border border-slate-200 dark:border-[#1a2d29] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 cursor-default`}
            >
              {/* Box Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1a2d29] bg-slate-50/70 dark:bg-[#111c18]/70 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                      {viewingDoc.name || 'Image Preview'}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      {viewingDoc.url.toLowerCase().includes('.pdf') ? 'Document Viewer' : 'Photo Viewer'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={viewingDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 px-3 rounded-xl bg-slate-100 dark:bg-[#111c18] hover:bg-slate-200 dark:hover:bg-[#1a2d29] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="Open Original in New Tab"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Open Original</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setViewingDoc(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-[#111c18] hover:bg-slate-200 dark:hover:bg-[#1a2d29] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Box Viewport: Uniform dimensions for all images (small or large) */}
              <div className="flex-1 w-full p-4 sm:p-6 flex items-center justify-center overflow-hidden bg-slate-950/[0.03] dark:bg-black/40 relative">
                {viewingDoc.url.toLowerCase().includes('.pdf') ? (
                  <iframe 
                    src={viewingDoc.url} 
                    title={viewingDoc.name}
                    className="w-full h-full rounded-xl border border-slate-200 dark:border-[#1a2d29] bg-white shadow-xs"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src={viewingDoc.url} 
                      alt={viewingDoc.name}
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-md select-none transition-all duration-200"
                    />
                  </div>
                )}
              </div>

              {/* Box Footer */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-[#1a2d29] bg-slate-50/50 dark:bg-[#111c18]/50 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate max-w-xs">
                  {viewingDoc.name}
                </span>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Profile;
