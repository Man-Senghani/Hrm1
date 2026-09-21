import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@shared/layouts/MainLayout';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Layers,
  ClipboardList,
  Calendar,
  Wallet,
  UserPlus,
  TrendingUp,
  GraduationCap,
  PartyPopper,
  BarChart3,
  Camera,
  FileText,
  MessageSquare,
  Bell,
  User,
  SlidersHorizontal,
  Settings as SettingsIcon
} from 'lucide-react';
import { syncSessionFromActiveAccount, clearActiveAccountAndSession, setupCrossTabSessionSync } from '@shared/utils/sessionSync';

// Route-level lazy-loaded pages
const HRDashboard = lazy(() => import('./pages/HRDashboard'));
const HREmployees = lazy(() => import('./pages/HREmployees'));
const EmployeeForm = lazy(() => import('./pages/EmployeeForm'));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'));
const CreateUser = lazy(() => import('./pages/CreateUser'));
const Tasks = lazy(() => import('./pages/Tasks'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const TaskCreate = lazy(() => import('./pages/TaskCreate'));
const TaskUpdate = lazy(() => import('./pages/TaskUpdate'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const Attendance = lazy(() => import('./pages/Attendance'));
const DailyReport = lazy(() => import('./pages/DailyReport'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Performance = lazy(() => import('./pages/Performance'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const ProjectManagement = lazy(() => import('./pages/ProjectManagement'));
const TeamManagement = lazy(() => import('./pages/TeamManagement'));
const Training = lazy(() => import('./pages/Training'));
const EventsManagement = lazy(() => import('./pages/EventsManagement'));
const Reports = lazy(() => import('./pages/Reports'));
const Screenshots = lazy(() => import('./pages/Screenshots'));
const EmployeeDocuments = lazy(() => import('./pages/EmployeeDocuments'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AllNotifications = lazy(() => import('./pages/AllNotifications'));
const Settings = lazy(() => import('./pages/Settings'));
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
    { label: 'Employees', icon: Users, path: '/employees' },
    { label: 'Attendance', icon: Calendar, path: '/attendance' },
    { label: 'Leave Management', icon: ClipboardList, path: '/leave' },
    { label: 'Daily Report', icon: FileText, path: '/daily-report' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
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
        userRole="hr"
        userName={user?.profile?.firstName || user?.name || user?.email || 'HR'}
        onLogout={handleLogout}
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/employees" replace />} />
            <Route path="/dashboard" element={<Navigate to="/employees" replace />} />
            <Route path="/hr" element={<Navigate to="/employees" replace />} />
            <Route path="/hr/dashboard" element={<Navigate to="/employees" replace />} />

            {/* Employees */}
            <Route path="/employees" element={<HREmployees />} />
            <Route path="/hr/employees" element={<HREmployees />} />
            <Route path="/employees/add" element={<EmployeeForm />} />
            <Route path="/hr/employees/add" element={<EmployeeForm />} />
            <Route path="/employees/edit/:id" element={<EmployeeForm />} />
            <Route path="/hr/employees/edit/:id" element={<EmployeeForm />} />
            <Route path="/employees/view/:id" element={<EmployeeDetail />} />
            <Route path="/hr/employees/view/:id" element={<EmployeeDetail />} />
            <Route path="/create-user" element={<CreateUser />} />
            <Route path="/hr/create-user" element={<CreateUser />} />

            {/* Attendance */}
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/hr/attendance" element={<Attendance />} />
            <Route path="/attendance-monitoring" element={<Attendance />} />
            <Route path="/hr/attendance-monitoring" element={<Attendance />} />

            {/* Leave Management */}
            <Route path="/leave" element={<LeaveManagement />} />
            <Route path="/hr/leave" element={<LeaveManagement />} />
            <Route path="/leaves" element={<LeaveManagement />} />
            <Route path="/hr/leaves" element={<LeaveManagement />} />
            <Route path="/leave-approvals" element={<LeaveManagement />} />
            <Route path="/hr/leave-approvals" element={<LeaveManagement />} />

            {/* Daily Report */}
            <Route path="/daily-report" element={<DailyReport />} />
            <Route path="/hr/daily-report" element={<DailyReport />} />

            {/* Notifications */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/hr/notifications" element={<Notifications />} />
            <Route path="/notifications/all" element={<AllNotifications />} />
            <Route path="/hr/notifications/all" element={<AllNotifications />} />

            {/* Screenshots */}
            <Route path="/screenshots" element={<Screenshots />} />
            <Route path="/hr/screenshots" element={<Screenshots />} />

            {/* Profile */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/hr/profile" element={<Profile />} />

            {/* Fallback 404 for any unlisted/hidden route like /tasks or /hr/tasks */}
            <Route path="*" element={<NotFound role="hr" />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </ErrorBoundary>
  );
}

export default App;
