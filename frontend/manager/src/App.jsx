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
  FileText
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
const Settings = lazy(() => import('@shared/pages/Settings'));
const Chat = lazy(() => import('@shared/pages/Chat'));

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
  const token = sessionStorage.getItem('token');

  React.useEffect(() => {
    syncSessionFromActiveAccount();
    const currentToken = sessionStorage.getItem('token');
    if (!currentToken) {
      window.location.href = '/login';
    }

    const cleanup = setupCrossTabSessionSync(() => {
      window.location.href = '/login';
    });
    return cleanup;
  }, []);

  if (!token) return null;

  const handleLogout = () => {
    clearActiveAccountAndSession();
    window.location.href = '/login';
  };

  const navItems = [
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'My Team', icon: Users, path: '/manager' },
    { label: 'Attendance', icon: CalendarDays, path: '/attendance' },
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
            <Route path="/" element={<Employees />} />
            <Route path="/dashboard" element={<Employees />} />
            <Route path="/manager" element={<Employees />} />
            <Route path="/manager/dashboard" element={<Employees />} />

            <Route path="/employees" element={<Employees />} />
            <Route path="/manager/employees" element={<Employees />} />
            <Route path="/employees/view/:id" element={<EmployeeDetail />} />
            <Route path="/manager/employees/view/:id" element={<EmployeeDetail />} />
            <Route path="/manager/manager/employees/view/:id" element={<EmployeeDetail />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/manager/attendance" element={<Attendance />} />
            <Route path="/daily-report" element={<DailyReport />} />
            <Route path="/manager/daily-report" element={<DailyReport />} />
            <Route path="/tasks" element={<ManagerTasks />} />
            <Route path="/manager/tasks" element={<ManagerTasks />} />
            <Route path="/tasks/create" element={<TaskCreate />} />
            <Route path="/manager/tasks/create" element={<TaskCreate />} />
            <Route path="/projects" element={<ManagerProjects />} />
            <Route path="/manager/projects" element={<ManagerProjects />} />
            <Route path="/leave" element={<LeaveManagement />} />
            <Route path="/manager/leave" element={<LeaveManagement />} />
            <Route path="/leaves" element={<LeaveManagement />} />
            <Route path="/manager/leaves" element={<LeaveManagement />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/manager/holidays" element={<Holidays />} />
            <Route path="/events" element={<MyEvents />} />
            <Route path="/manager/events" element={<MyEvents />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/manager/notifications" element={<Notifications />} />
            <Route path="/screenshots" element={<Screenshots />} />
            <Route path="/manager/screenshots" element={<Screenshots />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/manager/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/manager/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/manager/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </ErrorBoundary>
  );
}

export default App;
