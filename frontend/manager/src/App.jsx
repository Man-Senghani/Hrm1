import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@shared/layouts/MainLayout';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  PlusCircle,
  Layers,
  Calendar,
  CalendarDays,
  MessageSquare,
  Globe,
  Briefcase,
  User,
  Bell,
  Camera,
  FileText,
  ClipboardList
} from 'lucide-react';
import { syncSessionFromActiveAccount, clearActiveAccountAndSession, setupCrossTabSessionSync } from '@shared/utils/sessionSync';

const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const Employees = lazy(() => import('./pages/Employees'));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'));
const Attendance = lazy(() => import('./pages/Attendance'));
const DailyReport = lazy(() => import('./pages/DailyReport'));
const ManagerTasks = lazy(() => import('./pages/ManagerTasks'));
const TaskCreate = lazy(() => import('./pages/TaskCreate'));
const ManagerProjects = lazy(() => import('./pages/ManagerProjects'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const Holidays = lazy(() => import('./pages/Holidays'));
const MyEvents = lazy(() => import('./pages/MyEvents'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Screenshots = lazy(() => import('./pages/Screenshots'));
const Profile = lazy(() => import('@shared/pages/Profile'));
const NotFound = lazy(() => import('@shared/pages/NotFound'));

const RouteLoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: '3px solid rgba(0,167,107,0.2)', borderTopColor: '#00a76b',
      animation: 'spin 0.7s linear infinite'
    }} />
    <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
  </div>
);

function App() {
  syncSessionFromActiveAccount();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  React.useEffect(() => {
    syncSessionFromActiveAccount();
    const handleAuthCheck = () => {
      const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!currentToken) {
        window.location.replace('/login');
      }
    };
    handleAuthCheck();
    window.addEventListener('pageshow', handleAuthCheck);
    window.addEventListener('popstate', handleAuthCheck);

    const cleanup = setupCrossTabSessionSync(() => {
      window.location.replace('/login');
    });
    return () => {
      window.removeEventListener('pageshow', handleAuthCheck);
      window.removeEventListener('popstate', handleAuthCheck);
      cleanup();
    };
  }, []);

  if (!token) return null;

  const handleLogout = () => {
    clearActiveAccountAndSession();
    window.location.replace('/login');
  };

  const navItems = [
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'Attendance', icon: CalendarDays, path: '/attendance' },
    { label: 'Leave Management', icon: ClipboardList, path: '/leave' },
    { label: 'Daily Report', icon: FileText, path: '/daily-report' },
    { label: 'Screenshots', icon: Camera, path: '/screenshots' },
    { label: 'My Profile', icon: User, path: '/profile' },
  ];

  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        containerStyle={{ top: 24, right: 24, zIndex: 99999 }}
        toastOptions={{
          duration: 4500,
          style: {
            background: '#111827',
            color: '#f9fafb',
            padding: '14px 18px',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            maxWidth: '440px'
          },
          success: {
            duration: 4000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff'
            },
            style: {
              background: '#064e3b',
              color: '#ecfdf5',
              border: '1px solid #059669'
            }
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff'
            },
            style: {
              background: '#450a0a',
              color: '#fef2f2',
              border: '1px solid #991b1b'
            }
          }
        }}
      />
      <MainLayout
        navItems={navItems}
        userRole="manager"
        userName={user?.name || user?.email || 'Manager'}
        onLogout={handleLogout}
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/attendance" replace />} />
            <Route path="/dashboard" element={<Navigate to="/attendance" replace />} />
            <Route path="/manager" element={<Navigate to="/attendance" replace />} />
            <Route path="/manager/dashboard" element={<Navigate to="/attendance" replace />} />

            {/* Attendance */}
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/manager/attendance" element={<Attendance />} />

            {/* Daily Report */}
            <Route path="/daily-report" element={<DailyReport />} />
            <Route path="/manager/daily-report" element={<DailyReport />} />

            {/* Leave Management */}
            <Route path="/leave" element={<LeaveManagement />} />
            <Route path="/manager/leave" element={<LeaveManagement />} />
            <Route path="/leaves" element={<LeaveManagement />} />
            <Route path="/manager/leaves" element={<LeaveManagement />} />

            {/* Notifications */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/manager/notifications" element={<Notifications />} />

            {/* Screenshots */}
            <Route path="/screenshots" element={<Screenshots />} />
            <Route path="/manager/screenshots" element={<Screenshots />} />

            {/* Profile */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/manager/profile" element={<Profile />} />

            {/* Fallback 404 for unlisted/hidden routes like /tasks or /manager/tasks */}
            <Route path="*" element={<NotFound role="manager" />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </ErrorBoundary>
  );
}

export default App;
