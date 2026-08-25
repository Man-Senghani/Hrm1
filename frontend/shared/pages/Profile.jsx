import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';
import { Eye, Shield, Lock, FileText, Upload, Trash2, Check, RefreshCw, Plus, Edit2, Save, X, Camera } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  // Status removed in favor of toast
  const [loading, setLoading] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [syncing, setSyncing] = useState(true);
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
      console.warn('Initial sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (token) fetchProfile();
  }, [token]);

  if (syncing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <RefreshCw size={32} className="animate-spin text-[#00a76b]" />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9ca3af' }}>Syncing Identity Node...</p>
      </div>
    );
  }

  const safeUserData = userData || {};
  const fullName = safeUserData.name || (safeUserData.profile ? `${safeUserData.profile.firstName || ''} ${safeUserData.profile.lastName || ''}`.trim() : 'System Admin');
  const userEmail = safeUserData.email || 'admin@fluidhr.com';
  const userRole = safeUserData.role || 'Personnel';
  const userDept = (safeUserData.department && typeof safeUserData.department === 'object') ? safeUserData.department.name : (safeUserData.department || 'General Operations');

  const empId = safeUserData.employeeId || 'PENDING-SYNC';
  const personalEmail = safeUserData.personalEmail || 'Not Configured';
  const joinDateRaw = safeUserData.joinDate || safeUserData.createdAt;
  const joinDate = joinDateRaw ? new Date(joinDateRaw).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Not Set';
  const phone = safeUserData.phone || 'Data Missing';
  const empType = safeUserData.employmentType || 'Standard';
  const gender = safeUserData.gender || 'Not Specified';
  const address = safeUserData.address || 'Locator Data Missing';
  const birthdate = safeUserData.dob ? new Date(safeUserData.dob).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Not Configured';
  const adharCard = safeUserData.adharCard || null;
  const bankDetails = safeUserData.bankDetails || null;
  const panCard = safeUserData.panCard || null;

  const initials = fullName ? fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'NA' : 'NA';

  const reportingManagerName = safeUserData.reportingManager
    ? (typeof safeUserData.reportingManager === 'object'
      ? (safeUserData.reportingManager.name || safeUserData.reportingManager.fullName)
      : safeUserData.reportingManager)
    : 'Not Assigned';

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
    if (!editForm.personalEmail?.trim() || !editForm.phone?.trim() || !editForm.address?.trim()) {
      toast.error('Personal Email, Phone Number, and Address are required fields.');
      return;
    }

    if (editForm.address && editForm.address.length > 250) {
      toast.error('Address cannot exceed 250 characters.');
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

    if (editForm.address && !/^[a-zA-Z0-9\s,.\-/#]*$/.test(editForm.address)) {
      toast.error('Address contains invalid special characters.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        fullName: editForm.fullName,
        personalEmail: editForm.personalEmail,
        phone: editForm.phone,
        address: editForm.address,
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
          address: editForm.address,
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
      fullName,
      personalEmail: personalEmail !== 'Not Configured' ? personalEmail : '',
      phone: phone !== 'Data Missing' ? phone : '',
      address: address !== 'Locator Data Missing' ? address : '',
      profileImage: null,
    });
    setIsEditing(true);
  };


  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: isDark ? '#08100e' : '#f9fdfc', minHeight: 'calc(100vh - 56px)', color: isDark ? '#cbd5e1' : '#3b3e3c', width: '100%', boxSizing: 'border-box', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <div style={{ width: '100%', maxWidth: '100%', padding: '32px 32px 60px', boxSizing: 'border-box' }}>

        {/* Alerts are handled via toast notifications */}

        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: isDark ? '#fff' : '#2c302e', margin: 0, letterSpacing: '-0.5px' }}>My profile</h1>
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
            <p style={{ fontSize: 13, color: '#8c918f', margin: '0 0 2px', fontWeight: 600 }}>{userRole.toUpperCase()}</p>
            <p style={{ fontSize: 13, color: '#00a76b', margin: '0 0 2px', fontWeight: 700 }}>ID: {empId}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, fontWeight: 600 }}>{userDept}</p>
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
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Address</label>
                  <input type="text" maxLength="250" readOnly={!isEditing} value={isEditing ? editForm.address : address} onChange={e => setEditForm({...editForm, address: e.target.value.replace(/[^a-zA-Z0-9\s,.\-/#]/g, '')})} className="verdant-input" style={{ backgroundColor: isEditing ? (isDark ? '#162722' : '#fff') : undefined }} />
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
                  <input type="text" readOnly value={userData?.designation || userData?.position || userRole} className="verdant-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
                  <input type="text" readOnly value={userDept} className="verdant-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a3b3af' : '#939084', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reporting Manager</label>
                  <input type="text" readOnly value={reportingManagerName} className="verdant-input" />
                </div>

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
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
              boxSizing: 'border-box'
            }}
            onClick={() => setViewingDoc(null)}
          >
            {/* Content Area (Borderless) */}
            <div 
              style={{
                position: 'relative',
                width: 'auto',
                maxWidth: viewingDoc.url.toLowerCase().includes('.pdf') ? '1000px' : '90%',
                maxHeight: '90vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button positioned at the top-right corner of the content */}
              <button 
                onClick={() => setViewingDoc(null)}
                style={{
                  position: 'absolute',
                  top: -15,
                  right: -15,
                  background: '#201515',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                  borderRadius: '50%',
                  transition: 'background-color 0.2s, transform 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 1010
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff4f00';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#201515';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <X size={16} />
              </button>

              {viewingDoc.url.toLowerCase().includes('.pdf') ? (
                <iframe 
                  src={viewingDoc.url} 
                  title={viewingDoc.name}
                  style={{
                    width: '100%',
                    height: '80vh',
                    border: 'none',
                    borderRadius: 16,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    backgroundColor: '#fff'
                  }}
                />
              ) : (
                <img 
                  src={viewingDoc.url} 
                  alt={viewingDoc.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '85vh',
                    objectFit: 'contain',
                    borderRadius: 16,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Profile;
