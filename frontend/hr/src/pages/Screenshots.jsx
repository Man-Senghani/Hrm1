import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Camera, Search, Calendar, User, 
  Filter, RefreshCw, Download, ExternalLink,
  ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon,
  Trash2, Eye, X, Folder, Users, Shield, History, ArrowLeft, Check
} from 'lucide-react';
import { API_BASE_URL, getImageUrl } from '@shared/services/api';

const getLocalISODate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const filterUser = '';
  const [searchEmployeeName, setSearchEmployeeName] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [navigationPath, setNavigationPath] = useState([]); // ['role', 'name']
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/screenshot/all', {
        params: { role, userId: sessionStorage.getItem('userId') },
        headers: { Authorization: `Bearer ${token}` }
      });
      setScreenshots(res.data);
    } catch (err) {
      console.error('Fetch Screenshots Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 📡 REAL-TIME SYNC ENGINE
    const socket = io(window.location.origin, {
       transports: ['websocket']
    });

    socket.on('connect', () => {
       socket.emit('join_notifications', { userId: sessionStorage.getItem('userId'), role });
    });

    socket.on('new_screenshot', (data) => {
       setScreenshots(prev => [data, ...prev]);
    });

    return () => {
       socket.off('new_screenshot');
       socket.disconnect();
    };
  }, [role]);

  const getRoles = () => {
    return ['hr', 'manager', 'employee'];
  };

  const getFilteredData = () => {
    let data = screenshots;
    if (navigationPath.length > 0) {
      data = data.filter(s => s.role === navigationPath[0]);
    }
    if (navigationPath.length > 1) {
      data = data.filter(s => s.employeeName === navigationPath[1]);
    }
    
    // Apply search filters on top of navigation
    return data.filter(s => {
      const matchesUser = s.employeeName?.toLowerCase().includes(filterUser.toLowerCase());
      const matchesDate = filterDate ? s.timestamp.startsWith(filterDate) : true;
      return matchesUser && matchesDate;
    });
  };

  const filtered = getFilteredData();

  // Helper to count entries in a folder
  const countInFolder = (type, value) => {
    if (type === 'role') return screenshots.filter(s => s.role === value).length;
    if (type === 'name') return screenshots.filter(s => s.role === navigationPath[0] && s.employeeName === value).length;
    return 0;
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
      const dateStr = filterDate || getLocalISODate();
      const zipFilename = `Screenshots-${navigationPath[1] || 'All'}-${dateStr}.zip`;
      
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
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      setFilterDate(getLocalISODate(yesterday));
    }
    if (type === 'all') setFilterDate('');
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
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
          {navigationPath.length === (role === 'manager' ? 1 : 2) && (
            <>
              {/* Custom Date Picker Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] hover:border-[#00a76b] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-xs cursor-pointer"
                >
                  <Calendar size={14} className="text-[#00a76b]" />
                  <span>{filterDate ? formatDDMMYYYY(filterDate) : 'dd-mm-yyyy'}</span>
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
                        const isSelected = filterDate && new Date(filterDate).toDateString() === day.toDateString();
                        const isToday = new Date().toDateString() === day.toDateString();
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
                            className={`text-xs font-semibold py-1.5 rounded-lg transition-all ${
                              isSelected 
                                ? 'bg-[#00a76b] text-white shadow-xs' 
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
                          setFilterDate('');
                          setShowDatePicker(false);
                        }}
                        className="text-rose-500 hover:underline"
                      >
                        Clear
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterDate(getLocalISODate());
                          setShowDatePicker(false);
                        }}
                        className="text-[#00a76b] hover:underline"
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
      {navigationPath.length === (role === 'manager' ? 1 : 2) && (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setQuickDate('today')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterDate === getLocalISODate() ? 'bg-[#00a76b] text-white shadow-xs' : 'bg-white dark:bg-[#111c18] border border-slate-200 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'}`}
          >
            Today
          </button>
          <button 
            onClick={() => setQuickDate('yesterday')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'bg-[#00a76b] text-white shadow-xs' : 'bg-white dark:bg-[#111c18] border border-slate-200 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'}`}
          >
            Yesterday
          </button>
          <button 
            onClick={() => setQuickDate('all')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${!filterDate ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs' : 'bg-white dark:bg-[#111c18] border border-slate-200 dark:border-[#38352e] text-slate-600 dark:text-slate-300 hover:border-[#00a76b]'}`}
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
          {/* LEVEL 0: ROLE FOLDERS */}
          {navigationPath.length === 0 && (
            <div className="flex flex-wrap gap-4">
              {getRoles().map(r => (
                <div 
                  key={r} 
                  onClick={() => setNavigationPath([r])}
                  className="w-full sm:w-56 bg-white dark:bg-[#111c18] border border-slate-200/80 dark:border-[#38352e] rounded-xl p-4 shadow-xs hover:shadow-md hover:border-[#00a76b] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col items-center text-center group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Folder size={24} />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-0.5">
                    {r} Folders
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {countInFolder('role', r)} Total Captures
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* LEVEL 1: EMPLOYEE NAME FOLDERS */}
          {navigationPath.length === 1 && (
            <div className="space-y-4">
              {/* Employee search bar */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search employee folder..." 
                  value={searchEmployeeName}
                  onChange={(e) => setSearchEmployeeName(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-white dark:bg-[#1a1714] border border-slate-200 dark:border-[#38352e] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00a76b] shadow-xs"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                {[...new Set(screenshots
                  .filter(s => s.role === navigationPath[0])
                  .map(s => s.employeeName))]
                  .filter(name => name?.toLowerCase().includes(searchEmployeeName.toLowerCase()))
                  .map(name => (
                    <div 
                      key={name} 
                      onClick={() => setNavigationPath([navigationPath[0], name])}
                      className="w-full sm:w-60 bg-white dark:bg-[#111c18] border border-slate-200/80 dark:border-[#38352e] rounded-xl p-3.5 shadow-xs hover:shadow-md hover:border-[#00a76b] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-3 group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-emerald-950/60 text-white dark:text-[#00a76b] flex items-center justify-center font-bold text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate mb-0.5">{name}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <History size={12} className="text-[#00a76b]" />
                          {countInFolder('name', name) || screenshots.filter(s => s.employeeName === name).length} Captures
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* LEVEL 2: ACTUAL SCREENSHOTS (Visible when a person is selected) */}
          {navigationPath.length === 2 && (
            <>
              {filtered.length === 0 ? (
                <div className="py-28 text-center">
                  <Camera size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No screenshots found for {navigationPath[1]}</p>
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
                  ).map(([date, group]) => (
                    <div key={date} className="space-y-4">
                      {/* Date Header */}
                      <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{date}</h2>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{group.length} Captures</span>
                      </div>

                      {/* Photo Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.map((s) => (
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
                  ))}
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
            </>
          )}
        </>
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
          <div className="relative max-w-5xl w-full bg-white dark:bg-[#0c1815] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xl flex flex-col gap-4 z-10">
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
