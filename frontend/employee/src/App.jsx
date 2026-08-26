import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from '@shared/layouts/MainLayout';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  Clock,
  MessageSquare,
  CalendarDays,
  Calendar,
  FolderOpen,
  Wallet,
  FileText,
  Target,
  Globe,
  Briefcase,
  User
} from 'lucide-react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Attendance = lazy(() => import('./pages/Attendance'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const EmployeePayslips = lazy(() => import('./pages/EmployeePayslips'));
const EmployeePerformance = lazy(() => import('./pages/EmployeePerformance'));
const EmployeeProjects = lazy(() => import('./pages/EmployeeProjects'));
const TimeTracker = lazy(() => import('./pages/TimeTracker'));
const EmployeeDocuments = lazy(() => import('./pages/EmployeeDocuments'));
const Holidays = lazy(() => import('./pages/Holidays'));
const MyEvents = lazy(() => import('./pages/MyEvents'));
const Chat = lazy(() => import('@shared/pages/Chat'));
const Profile = lazy(() => import('@shared/pages/Profile'));
const Settings = lazy(() => import('@shared/pages/Settings'));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

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
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      window.location.href = '/';
    }
  }, [token]);

  if (!token) {
    return null;
  }

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/';
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Team Chat', icon: MessageSquare, path: '/chat' },
    { label: 'My Attendance', icon: CalendarDays, path: '/attendance' },
    { label: 'My Leave', icon: Calendar, path: '/leave' },
    { label: 'My Projects', icon: FolderOpen, path: '/projects' },
    { label: 'My Payslips', icon: Wallet, path: '/payslips' },
    { label: 'My Documents', icon: FileText, path: '/documents' },
    { label: 'My Performance', icon: Target, path: '/performance' },
    { label: 'Company Holidays', icon: Globe, path: '/holidays' },
    { label: 'Events', icon: Briefcase, path: '/events' },
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
      <ScrollToTop />
      <MainLayout
        navItems={navItems}
        userRole="employee"
        userName={user?.profile?.firstName || user?.name || user?.email || 'Employee'}
        onLogout={handleLogout}
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/time-tracker" element={<TimeTracker />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/projects" element={<EmployeeProjects />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/events" element={<MyEvents />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/leave" element={<LeaveManagement />} />
            <Route path="/leaves" element={<Navigate to="/leave" replace />} />
            <Route path="/payslips" element={<EmployeePayslips />} />
            <Route path="/documents" element={<EmployeeDocuments />} />
            <Route path="/performance" element={<EmployeePerformance />} />

            {/* Prefixed routes matching /employee/* */}
            <Route path="/employee" element={<Navigate to="/" replace />} />
            <Route path="/employee/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/employee/leave" element={<LeaveManagement />} />
            <Route path="/employee/leaves" element={<Navigate to="/leave" replace />} />
            <Route path="/employee/projects" element={<EmployeeProjects />} />
            <Route path="/employee/attendance" element={<Attendance />} />
            <Route path="/employee/time-tracker" element={<TimeTracker />} />
            <Route path="/employee/payslips" element={<EmployeePayslips />} />
            <Route path="/employee/profile" element={<Profile />} />
            <Route path="/employee/settings" element={<Settings />} />
            <Route path="/employee/documents" element={<EmployeeDocuments />} />
            <Route path="/employee/performance" element={<EmployeePerformance />} />
            <Route path="/employee/chat" element={<Chat />} />
            <Route path="/employee/events" element={<MyEvents />} />
            <Route path="/employee/holidays" element={<Holidays />} />

            {/* Fallbacks */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </ErrorBoundary>
  );
}

export default App;
