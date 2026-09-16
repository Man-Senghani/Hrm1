import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Camera, Search, Calendar, User, 
  Filter, RefreshCw, Download, ExternalLink,
  ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon,
  Trash2, Eye, X, Folder, Users, Shield, History, ArrowLeft, Check,
  ArrowUp, ArrowDown, SlidersHorizontal
} from 'lucide-react';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';

const getLocalISODate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayISODate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalISODate(d);
};

const formatDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
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

const Screenshots = () => {
  const [screenshots, setScreenshots] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const filterUser = '';
  const [searchEmployeeName, setSearchEmployeeName] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = starting capture first (default), 'desc' = latest capture first
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [navigationPath, setNavigationPath] = useState([]); // [employeeName]
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  // Level 0 Employee Folder Filters
  const [showFolderFilterModal, setShowFolderFilterModal] = useState(false);
  const [folderFilterRole, setFolderFilterRole] = useState('all'); // 'all', 'employee', 'hr', 'manager'
  const [folderFilterDate, setFolderFilterDate] = useState('all'); // 'all', 'today', 'yesterday', 'last7days'
  const [folderFilterActivity, setFolderFilterActivity] = useState('all'); // 'all', 'active', 'inactive'
  const [folderSortBy, setFolderSortBy] = useState('name-asc'); // 'name-asc', 'name-desc', 'captures-desc', 'captures-asc'

  const activeFolderFiltersCount = [
    folderFilterRole !== 'all',
    folderFilterDate !== 'all',
    folderFilterActivity !== 'all',
    folderSortBy !== 'name-asc'
  ].filter(Boolean).length;

  const generateCalendarDays = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthTotalDays - i));
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  };
  
  const token = sessionStorage.getItem('token');
  const role = sessionStorage.getItem('role');
  const currentUserId = sessionStorage.getItem('userId');

  const getCurrentUserName = () => {
    try {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        return (u.name || u.fullName || '').trim().toLowerCase();
      }
    } catch (e) {}
    return '';
  };

  const isSelf = (s) => {
    if (!s) return false;
    const sUserId = (s.userId?._id || s.userId || '').toString();
    if (currentUserId && sUserId === currentUserId.toString()) return true;
    const curName = getCurrentUserName();
    const sName = (s.employeeName || '').trim().toLowerCase();
    if (curName && sName && sName === curName) return true;
    return false;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { role, userId: sessionStorage.getItem('userId') };
      if (filterDate && filterDate !== 'all') params.date = filterDate;

      const [resScreenshots, resEmployees] = await Promise.all([
        axios.get('/api/screenshot/all', {
          params,
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/employees', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => {
          console.warn('Failed to load employee directory:', err);
          return { data: [] };
        })
      ]);

      const list = Array.isArray(resScreenshots.data) ? resScreenshots.data : [];
      setScreenshots(list.filter(s => !isSelf(s)));

      const emps = Array.isArray(resEmployees.data) ? resEmployees.data : [];
      setEmployeesList(emps);
    } catch (err) {
      console.error('Fetch Screenshots Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role, filterDate]);

  useEffect(() => {
    // 📡 REAL-TIME SYNC ENGINE
    const socket = io(window.location.origin, {
       transports: ['websocket']
    });

    socket.on('connect', () => {
       socket.emit('join_notifications', { userId: sessionStorage.getItem('userId'), role });
    });

    socket.on('new_screenshot', (data) => {
       if (isSelf(data)) return;
       setScreenshots(prev => [data, ...prev]);
    });

    return () => {
       socket.off('new_screenshot');
       socket.disconnect();
    };
  }, [role]);

  // Aggregate employee list directly for display
  const getEmployeeFolders = () => {
    const map = new Map();

    // 1. Add all registered employees/managers (non-admin)
    employeesList.forEach(emp => {
      const name = emp.fullName || emp.name || emp.userId?.name;
      if (name && !isSelf({ employeeName: name, userId: emp.userId })) {
        const empRole = (emp.role || emp.userId?.role || 'employee').toLowerCase();
        if (empRole !== 'admin') {
          const trimmedName = name.trim();
          map.set(trimmedName.toLowerCase(), {
            id: emp._id,
            name: trimmedName,
            role: empRole,
            gender: emp.gender || emp.userId?.gender || '',
            designation: emp.designation || '',
            department: emp.department || '',
            profileImage: emp.profileImage || emp.userId?.profile || null,
            totalCaptures: screenshots.filter(s => (s.employeeName || '').trim().toLowerCase() === trimmedName.toLowerCase()).length
          });
        }
      }
    });

    // 2. Also ensure any person who has screenshots is included
    screenshots.forEach(s => {
      const name = (s.employeeName || '').trim();
      if (name && !isSelf(s) && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), {
          id: s.userId?._id || s.userId || name,
          name,
          role: (s.role || 'employee').toLowerCase(),
          gender: s.gender || s.userId?.gender || '',
          designation: '',
          department: '',
          profileImage: null,
          totalCaptures: screenshots.filter(x => (x.employeeName || '').trim().toLowerCase() === name.toLowerCase()).length
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getFilteredEmployeeFolders = () => {
    let list = getEmployeeFolders();

    // 1. Text search
    if (searchEmployeeName.trim()) {
      const q = searchEmployeeName.toLowerCase().trim();
      list = list.filter(emp =>
        emp.name.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    }

    // 2. Role filter
    if (folderFilterRole !== 'all') {
      list = list.filter(emp => (emp.role || '').toLowerCase() === folderFilterRole.toLowerCase());
    }

    // 3. Date window filter (adjusts totalCaptures according to date window)
    if (folderFilterDate !== 'all') {
      list = list.map(emp => {
        const trimmedName = (emp.name || '').trim().toLowerCase();
        const capturesInWindow = screenshots.filter(s => {
          if ((s.employeeName || '').trim().toLowerCase() !== trimmedName) return false;
          if (folderFilterDate === 'today') {
            return getLocalISODate(new Date(s.timestamp)) === getLocalISODate();
          }
          if (folderFilterDate === 'yesterday') {
            return getLocalISODate(new Date(s.timestamp)) === getYesterdayISODate();
          }
          if (folderFilterDate === 'last7days') {
            const t = new Date(s.timestamp).getTime();
            return t >= Date.now() - 7 * 24 * 60 * 60 * 1000;
          }
          return true;
        }).length;
        return { ...emp, totalCaptures: capturesInWindow };
      });
    }

    // 4. Activity status filter
    if (folderFilterActivity === 'active') {
      list = list.filter(emp => emp.totalCaptures > 0);
    } else if (folderFilterActivity === 'inactive') {
      list = list.filter(emp => emp.totalCaptures === 0);
    }

    // 5. Sorting
    list.sort((a, b) => {
      if (folderSortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (folderSortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (folderSortBy === 'captures-desc') return b.totalCaptures - a.totalCaptures;
      if (folderSortBy === 'captures-asc') return a.totalCaptures - b.totalCaptures;
      return 0;
    });

    return list;
  };

  const getFilteredData = () => {
    let data = screenshots;
    if (navigationPath.length > 0) {
      data = data.filter(s => (s.employeeName || '').trim().toLowerCase() === navigationPath[0].trim().toLowerCase());
    }
    
    // Apply search filters on top of navigation
    data = data.filter(s => {
      const matchesUser = s.employeeName?.toLowerCase().includes(filterUser.toLowerCase());
      let matchesDate = true;
      if (filterDate === 'last7days') {
        const captureTime = new Date(s.timestamp).getTime();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        matchesDate = captureTime >= sevenDaysAgo;
      } else if (filterDate && filterDate !== 'all') {
        const captureLocalDate = getLocalISODate(new Date(s.timestamp));
        matchesDate = captureLocalDate === filterDate || (s.timestamp && s.timestamp.startsWith(filterDate));
      }
      return matchesUser && matchesDate;
    });

    return [...data].sort((a, b) => {
      const dateA = getLocalISODate(new Date(a.timestamp));
      const dateB = getLocalISODate(new Date(b.timestamp));
      if (dateA !== dateB) {
        // Date groups: Always newest date first (16, 15, 14...)
        return dateB.localeCompare(dateA);
      }
      // Within each date: earliest capture first when 'asc' (start of timer first, latest in end)
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? tA - tB : tB - tA;
    });
  };

  const filtered = getFilteredData();

  // Helper to count entries for an employee
  const countInFolder = (name) => {
    return screenshots.filter(s => (s.employeeName || '').trim().toLowerCase() === (name || '').trim().toLowerCase()).length;
  };

  // Helper for single download (bypasses cross-origin issue)
  const handleSingleDownload = async (e, url, filename) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      const downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Failed to download image:', err);
      window.open(url, '_blank');
    }
  };

  // 📦 BULK DOWNLOAD ENGINE (Generates a single ZIP file)
  const handleDownloadAll = async () => {
    if (filtered.length === 0) return;
    if (!window.confirm(`Download all ${filtered.length} screenshots as a single ZIP archive?`)) return;

    setLoading(true);
    try {
      if (!window.JSZip) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const zip = new window.JSZip();
      
      const downloadPromises = filtered.map(async (s) => {
        try {
          const imageUrl = getImageUrl(s.imageUrl);
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          
          const timestampDate = new Date(s.timestamp);
          const dateStr = getLocalISODate(timestampDate);
          const timeStr = timestampDate.toTimeString().split(' ')[0].replace(/:/g, '-');
          const filename = `${s.employeeName}-${dateStr}-${timeStr}.png`;
          
          zip.file(filename, blob);
        } catch (err) {
          console.error(`Failed to download image: ${s.imageUrl}`, err);
        }
      });

      await Promise.all(downloadPromises);

      const content = await zip.generateAsync({ type: 'blob' });
      const dateStr = filterDate === 'last7days' ? 'last-7-days' : (filterDate && filterDate !== 'all') ? filterDate : getLocalISODate();
      const zipFilename = `Screenshots-${navigationPath[0] || 'All'}-${dateStr}.zip`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = zipFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to generate ZIP archive: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const setQuickDate = (type) => {
    const now = new Date();
    if (type === 'today') setFilterDate(getLocalISODate(now));
    if (type === 'yesterday') {
      setFilterDate(getYesterdayISODate());
    }
    if (type === 'last7days') {
      setFilterDate('last7days');
    }
    if (type === 'all') setFilterDate('all');
  };

  const openImageModal = (item) => {
    setSelectedImage(getImageUrl(item.imageUrl));
    setSelectedImageData(item);
  };

  const currentModalIndex = filtered.findIndex(s => 
    (selectedImageData?._id && s._id === selectedImageData._id) || 
    (selectedImageData?.imageUrl && s.imageUrl === selectedImageData.imageUrl)
  );
  const prevModalItem = filtered.length > 0 
    ? (currentModalIndex > 0 ? filtered[currentModalIndex - 1] : filtered[filtered.length - 1]) 
    : null;
  const nextModalItem = filtered.length > 0 
    ? (currentModalIndex >= 0 && currentModalIndex < filtered.length - 1 ? filtered[currentModalIndex + 1] : filtered[0]) 
    : null;

  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (prevModalItem) {
          openImageModal(prevModalItem);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (nextModalItem) {
          openImageModal(nextModalItem);
        }
      } else if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, prevModalItem, nextModalItem]);

  return (
    <div className="space-y-6 pb-20 font-['Inter',sans-serif]">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-[#38352e] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Screenshots
            </h1>
            <span className="bg-emerald-50 dark:bg-emerald-950/60 text-[#00a76b] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a76b] animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time desktop activity captures, employee monitoring traces & audit archives.
          </p>
        </div>
      </div>

      {/* ── 2. BREADCRUMBS & CONTROL TOOLBAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111c18] p-4 rounded-xl border border-slate-200/80 dark:border-[#38352e] shadow-xs">
        {/* Left Side: Breadcrumb Navigation */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <button 
            onClick={() => setNavigationPath([])} 
            className={`hover:text-[#00a76b] transition-colors flex items-center gap-1.5 ${navigationPath.length === 0 ? 'text-[#00a76b] font-bold' : ''}`}
          >
            <Folder size={14} className={navigationPath.length === 0 ? 'text-[#00a76b]' : 'text-slate-400'} />
            All Folders
          </button>

          {navigationPath.map((path, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
              <button 
                onClick={() => setNavigationPath(navigationPath.slice(0, idx + 1))}
                className={`hover:text-[#00a76b] transition-colors ${idx === navigationPath.length - 1 ? 'text-slate-900 dark:text-white font-bold' : ''}`}
              >
                {path.charAt(0).toUpperCase() + path.slice(1)}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Right Side: Filters & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {navigationPath.length === 1 && (
            <>
              {/* Custom Date Picker Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] hover:border-[#00a76b] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-xs cursor-pointer"
                >
                  <Calendar size={14} className="text-[#00a76b]" />
                  <span>
                    {filterDate === 'last7days' 
                      ? 'Last 7 Days' 
                      : filterDate && filterDate !== 'all' 
                        ? formatDDMMYYYY(filterDate) 
                        : 'dd-mm-yyyy'}
                  </span>
                  <ChevronRight size={12} className={`text-slate-400 transform transition-transform ${showDatePicker ? 'rotate-90' : ''}`} />
                </button>

                {showDatePicker && (
                  <div className="absolute right-0 mt-2 z-50 bg-white dark:bg-[#111c18] border border-slate-200 dark:border-[#38352e] rounded-xl shadow-xl p-4 w-72 animate-fade-in text-left">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const d = new Date(currentCalendarMonth);
                          d.setMonth(d.getMonth() - 1);
                          setCurrentCalendarMonth(d);
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-700 dark:text-slate-200"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {currentCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const d = new Date(currentCalendarMonth);
                          d.setMonth(d.getMonth() + 1);
                          setCurrentCalendarMonth(d);
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-700 dark:text-slate-200"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <span key={d} className="text-[10px] font-bold text-slate-400 py-1">{d}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays(currentCalendarMonth).map((day, idx) => {
                        const isCurrentMonth = day.getMonth() === currentCalendarMonth.getMonth();
                        const isSelected = filterDate && filterDate !== 'last7days' && filterDate !== 'all' && new Date(filterDate).toDateString() === day.toDateString();
                        const isToday = new Date().toDateString() === day.toDateString();
                        const isDayInLast7Days = () => {
                          const now = new Date();
                          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                          return day >= start && day <= end;
                        };
                        const isIn7DaysRange = filterDate === 'last7days' && isDayInLast7Days();
                        const isDisabled = day > new Date();
                        return (
                          <button
                            key={idx}
                            disabled={isDisabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterDate(getLocalISODate(day));
                              setShowDatePicker(false);
                            }}
                            className={`text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-[#00a76b] text-white shadow-xs' 
                                : isIn7DaysRange
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-[#00a76b] font-bold border border-emerald-300 dark:border-emerald-700'
                                  : isToday
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#00a76b] border border-emerald-300 dark:border-emerald-700'
                                    : isCurrentMonth 
                                      ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800' 
                                      : 'text-slate-400 opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800'
                            } ${isDisabled ? 'opacity-20 cursor-not-allowed' : ''}`}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickDate('all');
                          setShowDatePicker(false);
                        }}
                        className="text-rose-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickDate('last7days');
                          setShowDatePicker(false);
                        }}
                        className="text-[#00a76b] font-bold hover:underline cursor-pointer"
                      >
                        Last 7 Days
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickDate('today');
                          setShowDatePicker(false);
                        }}
                        className="text-slate-700 dark:text-slate-300 hover:text-[#00a76b] hover:underline cursor-pointer"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Captures Badge */}
              <div className="px-3.5 py-2 bg-slate-50 dark:bg-[#162722] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
                {filtered.length} Captures
              </div>

              {/* Download All ZIP Button */}
              <button 
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#00a76b] hover:bg-[#008f5b] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download size={14} /> Download All
              </button>

              {/* Grid / List View Toggle */}
              <div className="flex bg-slate-100 dark:bg-[#1a1714] p-1 rounded-xl items-center border border-slate-200 dark:border-[#38352e]">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-[#111c18] shadow-xs text-[#00a76b]' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={15} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-[#111c18] shadow-xs text-[#00a76b]' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  title="List View"
                >
                  <ListIcon size={15} />
                </button>
              </div>
            </>
          )}

          {/* Refresh Button */}
          <button 
            onClick={fetchData} 
            className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] hover:border-[#00a76b] text-slate-700 dark:text-slate-300 transition-all shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#00a76b]' : ''} />
          </button>
        </div>
      </div>

      {/* ── 3. QUICK DATE FILTER PILLS ── */}
      {navigationPath.length === 1 && (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setQuickDate('today')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterDate === getLocalISODate() ? 'bg-[#00a76b] text-white shadow-xs' : 'bg-white dark:bg-[#111c18] border border-slate-200 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'}`}
          >
            Today
          </button>
          <button 
            onClick={() => setQuickDate('yesterday')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterDate === getYesterdayISODate() ? 'bg-[#00a76b] text-white shadow-xs' : 'bg-white dark:bg-[#111c18] border border-slate-200 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'}`}
          >
            Yesterday
          </button>
          <button 
            onClick={() => setQuickDate('last7days')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterDate === 'last7days' ? 'bg-[#00a76b] text-white shadow-xs' : 'bg-white dark:bg-[#111c18] border border-slate-200 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'}`}
          >
            Last 7 Days
          </button>
          <button 
            onClick={() => setQuickDate('all')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${!filterDate || filterDate === 'all' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs' : 'bg-white dark:bg-[#111c18] border border-slate-200 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'}`}
          >
            View All
          </button>
        </div>
      )}

      {/* ── 4. CONTENT ENGINE ── */}
      {loading ? (
        <div className="py-28 text-center">
          <RefreshCw size={36} className="mx-auto mb-4 animate-spin text-[#00a76b]" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading Screenshots Registry...</p>
        </div>
      ) : (
        <>
          {/* LEVEL 0: DIRECT EMPLOYEE LIST */}
          {navigationPath.length === 0 && (
            <div className="space-y-4">
              {/* Employee search & summary bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search employee folder..." 
                    value={searchEmployeeName}
                    onChange={(e) => setSearchEmployeeName(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {/* Filter Button */}
                  <button
                    type="button"
                    onClick={() => setShowFolderFilterModal(true)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      activeFolderFiltersCount > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-[#00a76b] text-[#00a76b]'
                        : 'bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] hover:border-[#00a76b] text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Filter size={14} className={activeFolderFiltersCount > 0 ? "text-[#00a76b]" : "text-slate-400"} />
                    <span>Filter</span>
                    {activeFolderFiltersCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#00a76b] text-white text-[10px] flex items-center justify-center font-bold">
                        {activeFolderFiltersCount}
                      </span>
                    )}
                  </button>

                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {getFilteredEmployeeFolders().length} Employees
                  </div>
                </div>
              </div>

              {/* Active Filter Badges */}
              {activeFolderFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>
                  {folderFilterRole !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-[#00a76b]">
                      Role: {folderFilterRole.toUpperCase()}
                      <button type="button" onClick={() => setFolderFilterRole('all')} className="hover:text-rose-500 cursor-pointer"><X size={12} /></button>
                    </span>
                  )}
                  {folderFilterDate !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-[#00a76b]">
                      Date: {folderFilterDate === 'last7days' ? 'Last 7 Days' : folderFilterDate.charAt(0).toUpperCase() + folderFilterDate.slice(1)}
                      <button type="button" onClick={() => setFolderFilterDate('all')} className="hover:text-rose-500 cursor-pointer"><X size={12} /></button>
                    </span>
                  )}
                  {folderFilterActivity !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-[#00a76b]">
                      Status: {folderFilterActivity === 'active' ? 'With Captures' : 'Zero Captures'}
                      <button type="button" onClick={() => setFolderFilterActivity('all')} className="hover:text-rose-500 cursor-pointer"><X size={12} /></button>
                    </span>
                  )}
                  {folderSortBy !== 'name-asc' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-[#00a76b]">
                      Sort: {folderSortBy === 'name-desc' ? 'Z to A' : folderSortBy === 'captures-desc' ? 'Most Captures' : 'Fewest Captures'}
                      <button type="button" onClick={() => setFolderSortBy('name-asc')} className="hover:text-rose-500 cursor-pointer"><X size={12} /></button>
                    </span>
                  )}
                  <button 
                    type="button" 
                    onClick={() => {
                      setFolderFilterRole('all');
                      setFolderFilterDate('all');
                      setFolderFilterActivity('all');
                      setFolderSortBy('name-asc');
                    }}
                    className="text-[11px] font-bold text-rose-500 hover:underline ml-1 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {getFilteredEmployeeFolders().length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-[#111c18] border border-slate-200/80 dark:border-[#38352e] rounded-2xl">
                  <Users size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No employee folders found</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {searchEmployeeName || activeFolderFiltersCount > 0 ? 'Try adjusting your search query or filter options' : 'No employee records or activity captures found'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {getFilteredEmployeeFolders()
                    .map(emp => (
                      <div 
                        key={emp.name} 
                        onClick={() => {
                          setNavigationPath([emp.name]);
                          if (folderFilterDate !== 'all') {
                            setQuickDate(folderFilterDate);
                          }
                        }}
                        className="bg-white dark:bg-[#111c18] border border-slate-200/80 dark:border-[#38352e] rounded-xl p-4 shadow-xs hover:shadow-md hover:border-[#00a76b] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-3.5 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/60 dark:to-emerald-900/30 text-[#00a76b] dark:text-[#10b981] flex items-center justify-center font-extrabold text-base shadow-xs shrink-0 group-hover:scale-105 transition-transform border border-emerald-200/80 dark:border-emerald-800/40 select-none">
                          {emp.name?.trim()?.[0]?.toUpperCase() || 'E'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[#00a76b] transition-colors">
                              {emp.name}
                            </h3>
                            <span className="text-[9.5px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1a1714] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shrink-0">
                              {emp.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <History size={12} className="text-[#00a76b]" />
                            <span>{emp.totalCaptures} Captures</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 1: ACTUAL SCREENSHOTS FOR SELECTED EMPLOYEE */}
          {navigationPath.length === 1 && (
            <div className="space-y-4">
              {/* Back to employee list banner & Ascending/Descending sort controls */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setNavigationPath([])}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#00a76b] dark:hover:text-[#00a76b] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back to Employees
                </button>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1a1714] p-1 rounded-xl border border-slate-200/80 dark:border-[#38352e] shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSortOrder('asc')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      sortOrder === 'asc'
                        ? 'bg-[#00a76b] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Starting / earliest captures first (Ascending)"
                  >
                    <ArrowUp size={13} />
                    <span>Ascending</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder('desc')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      sortOrder === 'desc'
                        ? 'bg-[#00a76b] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Latest captures first (Descending)"
                  >
                    <ArrowDown size={13} />
                    <span>Descending</span>
                  </button>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="py-28 text-center bg-white dark:bg-[#111c18] border border-slate-200/80 dark:border-[#38352e] rounded-2xl">
                  <Camera size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No screenshots found for {navigationPath[0]}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {filterDate === 'last7days' 
                      ? 'No captures found in the last 7 days' 
                      : filterDate && filterDate !== 'all' 
                        ? `No captures found on ${formatDDMMYYYY(filterDate)}` 
                        : 'No activity captures logged yet'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="space-y-8">
                  {Object.entries(
                    filtered.reduce((groups, s) => {
                      const d = new Date(s.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                      if (!groups[d]) groups[d] = [];
                      groups[d].push(s);
                      return groups;
                    }, {})
                  ).sort(([, groupA], [, groupB]) => {
                    const dateA = getLocalISODate(new Date(groupA[0]?.timestamp || 0));
                    const dateB = getLocalISODate(new Date(groupB[0]?.timestamp || 0));
                    // Always show newest dates first (16, 15, 14...)
                    return dateB.localeCompare(dateA);
                  }).map(([date, group]) => {
                    const sortedGroup = [...group].sort((a, b) => {
                      const tA = new Date(a.timestamp).getTime();
                      const tB = new Date(b.timestamp).getTime();
                      return sortOrder === 'asc' ? tA - tB : tB - tA;
                    });
                    return (
                      <div key={date} className="space-y-4">
                        {/* Date Header */}
                        <div className="flex items-center gap-3">
                          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{date}</h2>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{sortedGroup.length} Captures</span>
                        </div>

                        {/* Photo Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {sortedGroup.map((s) => (
                            <div 
                              key={s._id} 
                              className="bg-white dark:bg-[#111c18] border border-slate-200/80 dark:border-[#38352e] rounded-xl p-1.5 shadow-xs hover:shadow-md hover:border-[#00a76b]/50 transition-all flex flex-col gap-1.5 group cursor-pointer"
                              onClick={() => openImageModal(s)}
                            >
                              {/* Image Container with Crisp Border Radius */}
                              <div className="relative aspect-video rounded-lg bg-slate-950 overflow-hidden border border-slate-200/80 dark:border-slate-800/80">
                                <img 
                                  src={getImageUrl(s.imageUrl)} 
                                  alt={`Capture ${s.employeeName}`} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <span className="bg-[#00a76b] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                    <Eye size={13} /> View Full
                                  </span>
                                </div>
                              </div>

                              {/* Card Footer Details */}
                              <div className="px-1 pb-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.employeeName}</p>
                                  <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                                    {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View Table */
                <div className="bg-white dark:bg-[#111c18] rounded-xl border border-slate-200/80 dark:border-[#38352e] shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#162722] border-b border-slate-200/80 dark:border-[#38352e]">
                          <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee Name</th>
                          <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capture Timestamp</th>
                          <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preview</th>
                          <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map((s) => (
                          <tr key={s._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-emerald-950 text-white dark:text-[#00a76b] flex items-center justify-center font-bold text-xs">
                                  {s.employeeName?.[0]}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">{s.employeeName}</p>
                                  <p className="text-[10px] font-semibold text-[#00a76b] uppercase">{s.role}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {new Date(s.timestamp).toLocaleString('en-GB')}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              <div 
                                className="w-20 h-12 rounded-md bg-slate-950 overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer" 
                                onClick={() => openImageModal(s)}
                              >
                                <img src={getImageUrl(s.imageUrl)} alt="" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => openImageModal(s)}
                                  className="p-1.5 text-slate-500 hover:text-[#00a76b] transition-colors cursor-pointer"
                                  title="View Photo"
                                >
                                  <Eye size={16} />
                                </button>
                                <button 
                                  onClick={(e) => handleSingleDownload(e, getImageUrl(s.imageUrl), `Screenshot-${s.employeeName}.png`)}
                                  className="p-1.5 text-slate-500 hover:text-[#00a76b] transition-colors cursor-pointer"
                                  title="Download Photo"
                                >
                                  <Download size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}


      {/* ── FOLDER FILTER RIGHT-SIDE DRAWER ── */}
      {showFolderFilterModal && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex justify-end bg-slate-900/50 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          onClick={() => setShowFolderFilterModal(false)}
        >
          <div 
            className="bg-white dark:bg-[#111c18] h-full w-full max-w-md shadow-2xl border-l border-slate-200 dark:border-[#38352e] flex flex-col justify-between animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#00a76b] flex items-center justify-center font-bold shadow-xs">
                  <SlidersHorizontal size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Filter Employees</h3>
                  <p className="text-[11px] text-slate-400">Filter folders by role, activity, and date</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowFolderFilterModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {/* 1. Employee Role */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Employee Role
                  </label>
                  {folderFilterRole !== 'all' && (
                    <span className="text-[10px] font-bold text-[#00a76b] capitalize">{folderFilterRole}</span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['all', 'employee', 'hr', 'manager'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFolderFilterRole(r)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center capitalize transition-all cursor-pointer ${
                        folderFilterRole === r
                          ? 'bg-[#00a76b] text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1a1714] border border-slate-200/80 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'
                      }`}
                    >
                      {r === 'all' ? 'All Roles' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Activity Date Window */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Activity Date Window
                  </label>
                  {folderFilterDate !== 'all' && (
                    <span className="text-[10px] font-bold text-[#00a76b]">
                      {folderFilterDate === 'last7days' ? 'Last 7 Days' : folderFilterDate}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'all', label: 'All Time' },
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'last7days', label: 'Last 7 Days' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFolderFilterDate(item.key)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                        folderFilterDate === item.key
                          ? 'bg-[#00a76b] text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1a1714] border border-slate-200/80 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Activity Status */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Activity Status
                  </label>
                  {folderFilterActivity !== 'all' && (
                    <span className="text-[10px] font-bold text-[#00a76b]">
                      {folderFilterActivity === 'active' ? 'With Captures' : 'Zero Captures'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'all', label: 'All Status' },
                    { key: 'active', label: 'With Captures' },
                    { key: 'inactive', label: 'Zero Captures' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFolderFilterActivity(item.key)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                        folderFilterActivity === item.key
                          ? 'bg-[#00a76b] text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1a1714] border border-slate-200/80 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Sort Order */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Sort By
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'name-asc', label: 'Name (A to Z)' },
                    { key: 'name-desc', label: 'Name (Z to A)' },
                    { key: 'captures-desc', label: 'Most Captures' },
                    { key: 'captures-asc', label: 'Fewest Captures' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFolderSortBy(item.key)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                        folderSortBy === item.key
                          ? 'bg-[#00a76b] text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1a1714] border border-slate-200/80 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-[#162722]/50 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFolderFilterRole('all');
                  setFolderFilterDate('all');
                  setFolderFilterActivity('all');
                  setFolderSortBy('name-asc');
                }}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
              >
                Reset All Filters
              </button>

              <button
                type="button"
                onClick={() => setShowFolderFilterModal(false)}
                className="px-6 py-2.5 rounded-xl bg-[#00a76b] hover:bg-[#008f5b] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Apply & View ({getFilteredEmployeeFolders().length})
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 5. FULLSCREEN PHOTO PREVIEW PORTAL MODAL ── */}
      {selectedImage && createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-14 animate-fade-in select-none">
          {/* Glass Overlay Click to Close */}
          <div 
            className="absolute inset-0 cursor-pointer"
            onClick={() => setSelectedImage(null)}
          ></div>
          
          {/* Outer Close Button (Top Right of Screen) */}
          <button 
            onClick={() => setSelectedImage(null)}
            className="fixed top-4 right-4 sm:top-6 sm:right-8 z-[1000000] w-10 h-10 rounded-full bg-slate-800/80 hover:bg-red-500 text-white flex items-center justify-center shadow-xl border border-white/20 backdrop-blur-md transition-all cursor-pointer hover:scale-110"
            title="Close Preview (Esc)"
          >
            <X size={20} />
          </button>

          {/* Outer Previous Image Button (Far Left of Screen) */}
          <button
            type="button"
            onClick={() => prevModalItem && openImageModal(prevModalItem)}
            disabled={!prevModalItem}
            className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-[1000000] w-12 h-12 rounded-full bg-slate-800/80 hover:bg-[#00a76b] text-white flex items-center justify-center shadow-2xl border border-white/20 backdrop-blur-md transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110"
            title="Previous Screenshot (Left Arrow Key)"
          >
            <ChevronLeft size={26} />
          </button>

          {/* Outer Next Image Button (Far Right of Screen) */}
          <button
            type="button"
            onClick={() => nextModalItem && openImageModal(nextModalItem)}
            disabled={!nextModalItem}
            className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-[1000000] w-12 h-12 rounded-full bg-slate-800/80 hover:bg-[#00a76b] text-white flex items-center justify-center shadow-2xl border border-white/20 backdrop-blur-md transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110"
            title="Next Screenshot (Right Arrow Key)"
          >
            <ChevronRight size={26} />
          </button>

          {/* Modal Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full bg-white dark:bg-[#0c1815] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xl flex flex-col gap-4 z-10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#00a76b] flex items-center justify-center">
                  <Camera size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {selectedImageData?.employeeName || 'Screenshot Preview'}
                  </h3>
                  {selectedImageData?.timestamp && (
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Captured on {new Date(selectedImageData.timestamp).toLocaleString('en-GB')} {filtered.length > 1 && currentModalIndex >= 0 ? `(${currentModalIndex + 1} of ${filtered.length})` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Image Preview Box */}
            <div className="relative max-h-[70vh] w-full flex items-center justify-center overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-slate-950 p-1">
              <img 
                src={selectedImage} 
                alt="Full Preview" 
                className="max-h-[68vh] max-w-full rounded-sm object-contain border border-slate-800/80 shadow-md transition-all"
              />
            </div>

            {/* Modal Actions Footer */}
            <div className="flex justify-end items-center gap-3 pt-2">
              <button 
                onClick={() => setSelectedImage(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Close Preview
              </button>
              <button 
                onClick={(e) => handleSingleDownload(e, selectedImage, `Screenshot-${selectedImageData?.employeeName || 'Capture'}.png`)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00a76b] hover:bg-[#008f5b] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download size={14} /> Download
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Screenshots;
