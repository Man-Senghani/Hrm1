import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Compass } from 'lucide-react';

const NotFound = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine user role and corresponding home route
  const currentRole = role || sessionStorage.getItem('role') || localStorage.getItem('role') || 'employee';

  const getHomeRoute = () => {
    switch (currentRole) {
      case 'admin':
        return '/employees';
      case 'hr':
        return '/employees';
      case 'manager':
        return '/attendance';
      case 'employee':
      default:
        return '/attendance';
    }
  };

  const handleGoHome = () => {
    navigate(getHomeRoute());
  };

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(getHomeRoute());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[68vh] px-4 py-12 text-center select-none animate-in fade-in zoom-in-95 duration-300">
      {/* Visual Indicator */}
      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5 mx-auto backdrop-blur-sm">
          <ShieldAlert className="w-12 h-12 sm:w-14 sm:h-14 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-[#00a76b] text-white text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-md border-2 border-white dark:border-gray-900">
          404
        </div>
      </div>

      {/* Main Status Text */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
        Page Not Found
      </h1>
      
      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4 leading-relaxed font-medium">
        The requested page does not exist, has been restricted, or is not accessible from your current workspace.
      </p>

      {/* Attempted Path Tag */}
      {location.pathname && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-7 rounded-lg bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 font-mono">
          <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate max-w-[280px]">{location.pathname}</span>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>

        <button
          type="button"
          onClick={handleGoHome}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a76b] hover:bg-[#008f5b] text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Back to Workspace
        </button>
      </div>
    </div>
  );
};

export default NotFound;
