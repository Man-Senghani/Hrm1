import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  Monitor, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  X,
  Sparkles,
  ArrowDownToLine
} from 'lucide-react';

const DesktopAppRequiredModal = ({
  isOpen,
  onClose,
  onRetry,
  token,
  isRetrying = false
}) => {
  const [appInfo, setAppInfo] = useState({
    version: '1.2.8',
    platform: 'Windows (x64)',
    downloadUrl: '/api/desktop-app/download'
  });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch latest app release info dynamically from backend
      axios.get('/api/desktop-app/info')
        .then(res => {
          if (res.data && res.data.success) {
            setAppInfo(res.data);
          }
        })
        .catch(() => {
          // Keep defaults
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLaunchApp = () => {
    const userToken = token || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : '');
    window.location.href = `fluidhr-tracker://start?token=${encodeURIComponent(userToken || '')}`;
  };

  const handleDownloadApp = () => {
    setDownloading(true);
    const targetUrl = appInfo.downloadUrl || '/api/desktop-app/download';
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      setDownloading(false);
    }, 2000);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#fffefb] dark:bg-[#161311] border border-[#d5cfbe] dark:border-[#38352e] rounded-[28px] shadow-[0_25px_70px_rgba(0,0,0,0.35)] overflow-hidden animate-in zoom-in-95 duration-200 p-6 sm:p-8"
        style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top decorative gradient line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-[#00a76b]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-500 hover:text-gray-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Header Section */}
        <div className="flex items-start gap-4 mb-5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-rose-500/5 dark:from-rose-500/25 dark:to-amber-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
              <Monitor size={26} className="stroke-[2.2]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-white dark:border-[#161311]"></span>
            </span>
          </div>

          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-[#201515] dark:text-white text-lg tracking-tight">
                Desktop App Required
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 rounded-md">
                <AlertTriangle size={11} /> FluidHR Tracker
              </span>
            </div>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
              FluidHR Desktop Application is not running on your computer.
            </p>
          </div>
        </div>

        {/* Information & Feature Cards Box */}
        <div className="bg-[#f8f6f0] dark:bg-[#1f1b17] border border-[#eceae3] dark:border-[#2f2b26] rounded-2xl p-4 sm:p-5 mb-5 space-y-3.5">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
            To check in and track work hours automatically, FluidHR Desktop Application must be running:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#171412] border border-[#e5e1d3] dark:border-[#2b2722] shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#00a76b] flex items-center justify-center shrink-0">
                <Clock size={15} />
              </div>
              <div className="text-[11px] leading-tight font-semibold text-gray-700 dark:text-gray-300">
                Auto Time Tracking
                <span className="block text-[10px] text-gray-400 font-normal mt-0.5">Real-time sync</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#171412] border border-[#e5e1d3] dark:border-[#2b2722] shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0">
                <CheckCircle size={15} />
              </div>
              <div className="text-[11px] leading-tight font-semibold text-gray-700 dark:text-gray-300">
                Live Attendance
                <span className="block text-[10px] text-gray-400 font-normal mt-0.5">Instant check-in</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🚀 Download & Installation Card if App is Not Installed */}
        <div className="mb-5 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#00a76b] text-white flex items-center justify-center shrink-0 shadow-sm">
              <ArrowDownToLine size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-bold text-xs text-emerald-950 dark:text-emerald-200 truncate">
                  Download Desktop App
                </p>
                <span className="text-[10px] font-extrabold bg-[#00a76b] text-white px-1.5 py-0.2 rounded">
                  v{appInfo.version || '1.1.1'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                Windows 64-bit Installer (~{appInfo.sizeMb || '77'} MB)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadApp}
            disabled={downloading}
            className="shrink-0 px-3.5 py-2 rounded-xl font-bold text-xs bg-[#00a76b] hover:bg-[#00915c] text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-75"
          >
            <Download size={13} className={downloading ? 'animate-bounce' : ''} />
            <span>{downloading ? 'Downloading...' : 'Download'}</span>
          </button>
        </div>


        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleLaunchApp}
            className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#00a76b] to-[#008f5b] hover:from-[#008f5b] hover:to-[#007a4e] text-white flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer active:scale-[0.98]"
          >
            <ExternalLink size={16} />
            <span>Launch FluidHR Desktop App</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => {
                onClose();
                if (onRetry) onRetry();
              }}
              disabled={isRetrying}
              className="py-3 px-4 rounded-xl font-bold text-xs bg-[#f0ede4] hover:bg-[#e4e0d4] dark:bg-[#282420] dark:hover:bg-[#34302a] text-[#201515] dark:text-white flex items-center justify-center gap-2 border border-[#d5cfbe]/60 dark:border-[#38352e] transition-colors cursor-pointer active:scale-[0.98]"
            >
              <RefreshCw size={13} className={isRetrying ? 'animate-spin' : ''} />
              <span>Retry Check-In</span>
            </button>

            <button
              onClick={onClose}
              className="py-3 px-4 rounded-xl font-bold text-xs bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DesktopAppRequiredModal;
