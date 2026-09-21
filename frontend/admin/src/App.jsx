import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// A route's lazy-loaded chunk can go stale if a tab was left open across a
// dev-server restart or a new deploy (chunk hashes changed underneath it).
// Reload once automatically instead of showing a broken "Failed to fetch
// dynamically imported module" screen; guard against a reload loop if the
// server is actually down.
window.addEventListener('vite:preloadError', () => {
  const key = 'hrm_chunk_reload_at';
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  }
});

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};
import { Toaster } from 'react-hot-toast';
import Login from '@shared/pages/Login';
import ForgotPassword from '@shared/pages/ForgotPassword';
import ResetPassword from '@shared/pages/ResetPassword';
import MainLayout from '@shared/layouts/MainLayout';
import { Users, Calendar, Bell, Camera, User, FileText, ClipboardList } from 'lucide-react';
import { syncSessionFromActiveAccount, setupCrossTabSessionSync } from '@shared/utils/sessionSync';

// Route-level pages are lazy-loaded so a role only downloads the code for
// the pages it actually visits, instead of every page in the app upfront.
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const HRDashboard = lazy(() => import('./pages/hr/HRDashboard'));
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const EmployeeForm = lazy(() => import('./pages/admin/EmployeeForm'));
const EmployeeDetail = lazy(() => import('./pages/admin/EmployeeDetail'));
const Tasks = lazy(() => import('./pages/admin/Tasks'));
const Attendance = lazy(() => import('./pages/Attendance'));
const DailyReport = lazy(() => import('./pages/admin/DailyReport'));

const HRTasks = lazy(() => import('./pages/hr/HRTasks'));
const LeaveManagement = lazy(() => import('./pages/hr/LeaveManagement'));
const ManagerLeaveManagement = lazy(() => import('./pages/manager/LeaveManagement'));
const TeamManagement = lazy(() => import('./pages/hr/TeamManagement'));
const HREmployees = lazy(() => import('./pages/hr/HREmployees'));
const EmployeeLeave = lazy(() => import('./pages/employee/LeaveManagement'));
const EmployeeHolidays = lazy(() => import('./pages/employee/Holidays'));
const EmployeePayslips = lazy(() => import('./pages/employee/EmployeePayslips'));
const EmployeeDocuments = lazy(() => import('./pages/employee/EmployeeDocuments'));
const EmployeePerformance = lazy(() => import('./pages/employee/EmployeePerformance'));
const Payroll = lazy(() => import('./pages/Payroll'));
const ManagerTasks = lazy(() => import('./pages/manager/ManagerTasks'));
const Performance = lazy(() => import('./pages/Performance'));
const Reports = lazy(() => import('./pages/Reports'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const Training = lazy(() => import('./pages/Training'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Departments = lazy(() => import('./pages/Departments'));
const Designations = lazy(() => import('./pages/Designations'));
const RolesPermissions = lazy(() => import('./pages/admin/RolesPermissions'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const Integrations = lazy(() => import('./pages/admin/Integrations'));
const CreateUser = lazy(() => import('./pages/admin/CreateUser'));
const Profile = lazy(() => import('@shared/pages/Profile'));
const ProjectManagement = lazy(() => import('./pages/hr/ProjectManagement'));
const ManagerProjects = lazy(() => import('./pages/manager/ManagerProjects'));
const EmployeeProjects = lazy(() => import('./pages/employee/EmployeeProjects'));
const Screenshots = lazy(() => import('./pages/Screenshots'));
const Chat = lazy(() => import('@shared/pages/Chat'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const TaskCreate = lazy(() => import('./pages/TaskCreate'));
const TaskUpdate = lazy(() => import('./pages/TaskUpdate'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AllNotifications = lazy(() => import('./pages/AllNotifications'));
const EventsManagement = lazy(() => import('./pages/EventsManagement'));
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

// ROUTE PROTECTION LOGIC
const ProtectedRoute = ({ children, allowedRole }) => {
  syncSessionFromActiveAccount();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const role = sessionStorage.getItem('role');

  if (!token) {
    window.location.replace('/login');
    return null;
  }

  // ROLE SPECIFIC CHECK (ADMIN OVERRIDE)
  if (role === 'admin') return children;

  if (allowedRole && role !== allowedRole) {
    const roleSubpaths = {
      admin: '/admin/',
      hr: '/hr/',
      employee: '/employee/',
      manager: '/manager/'
    };
    window.location.replace(roleSubpaths[role] || `/${role}/`);
    return null;
  }

  return children;
};

const App = () => {
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
  // Background chunk preloader to ensure instant navigation for key views without initial load freeze
  React.useEffect(() => {
    // Batch 1: Primary pages across all modules (1.5 seconds after mount)
    const timer1 = setTimeout(() => {
      // Employee & Shared
      import('./pages/employee/EmployeeDocuments').catch(() => { });
      import('./pages/employee/LeaveManagement').catch(() => { });
      import('./pages/employee/Holidays').catch(() => { });
      import('./pages/employee/EmployeePayslips').catch(() => { });
      import('./pages/employee/EmployeePerformance').catch(() => { });
      import('./pages/employee/EmployeeProjects').catch(() => { });
      import('./pages/Attendance').catch(() => { });
      import('@shared/pages/Chat').catch(() => { });

      // Admin, HR, Manager Dashboards / Core Pages
      import('./pages/admin/AdminDashboard').catch(() => { });
      import('./pages/hr/HRDashboard').catch(() => { });
      import('./pages/manager/ManagerDashboard').catch(() => { });
      import('./pages/admin/Employees').catch(() => { });
      import('./pages/admin/Tasks').catch(() => { });
      import('./pages/hr/LeaveManagement').catch(() => { });
      import('./pages/Screenshots').catch(() => { });
    }, 1500);

    // Batch 2: Secondary and Management pages (3.5 seconds after mount)
    const timer2 = setTimeout(() => {
      import('./pages/hr/HRTasks').catch(() => { });
      import('./pages/manager/LeaveManagement').catch(() => { });
      import('./pages/hr/TeamManagement').catch(() => { });
      import('./pages/hr/HREmployees').catch(() => { });
      import('./pages/Payroll').catch(() => { });
      import('./pages/manager/ManagerTasks').catch(() => { });
      import('./pages/Performance').catch(() => { });
      import('./pages/Reports').catch(() => { });
      import('./pages/Recruitment').catch(() => { });
      import('./pages/Training').catch(() => { });
      import('./pages/hr/ProjectManagement').catch(() => { });
      import('./pages/manager/ManagerProjects').catch(() => { });
      import('./pages/TaskManagement').catch(() => { });
      import('./pages/TaskCreate').catch(() => { });
      import('./pages/Notifications').catch(() => { });
    }, 3500);

    // Batch 3: System and configuration views (6 seconds after mount)
    const timer3 = setTimeout(() => {
      import('./pages/admin/Settings').catch(() => { });
      import('./pages/Departments').catch(() => { });
      import('./pages/Designations').catch(() => { });
      import('./pages/admin/RolesPermissions').catch(() => { });
      import('./pages/admin/AuditLogs').catch(() => { });
      import('./pages/admin/Integrations').catch(() => { });
      import('./pages/admin/CreateUser').catch(() => { });
      import('./pages/EventsManagement').catch(() => { });
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const adminNavItems = [
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'Employees', icon: Users, path: '/employees' },
    { label: 'Attendance', icon: Calendar, path: '/attendance' },
    { label: 'Daily Report', icon: FileText, path: '/daily-report' },
    { label: 'Screenshots', icon: Camera, path: '/screenshots' },
    { label: 'My Profile', icon: User, path: '/profile' },
  ];

  return (
    <>
      <ScrollToTop />
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
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* REDIRECTS FOR OLD PATHS */}
          <Route path="/select-role" element={<Navigate to="/login" replace />} />
          <Route path="/login/:role" element={<Navigate to="/login" replace />} />

          {/* ADMIN MODULE */}
          <Route path="/" element={
            <ProtectedRoute allowedRole="admin">
              <MainLayout navItems={adminNavItems} />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="employees" replace />} />
            <Route path="dashboard" element={<Navigate to="employees" replace />} />

            {/* Notifications */}
            <Route path="notifications" element={<Notifications />} />
            <Route path="notifications/all" element={<AllNotifications />} />
            <Route path="admin/notifications" element={<Notifications />} />
            <Route path="admin/notifications/all" element={<AllNotifications />} />

            {/* Employees */}
            <Route path="employees" element={<HREmployees />} />
            <Route path="employees/add" element={<EmployeeForm />} />
            <Route path="employees/edit/:id" element={<EmployeeForm />} />
            <Route path="employees/view/:id" element={<EmployeeDetail />} />
            <Route path="create-user" element={<CreateUser />} />
            <Route path="admin/employees" element={<HREmployees />} />
            <Route path="admin/employees/add" element={<EmployeeForm />} />
            <Route path="admin/employees/edit/:id" element={<EmployeeForm />} />
            <Route path="admin/employees/view/:id" element={<EmployeeDetail />} />
            <Route path="admin/create-user" element={<CreateUser />} />

            {/* Attendance */}
            <Route path="attendance" element={<Attendance />} />
            <Route path="admin/attendance" element={<Attendance />} />

            {/* Leave Management */}
            <Route path="leave" element={<LeaveManagement />} />
            <Route path="leaves" element={<LeaveManagement />} />
            <Route path="admin/leave" element={<LeaveManagement />} />
            <Route path="admin/leaves" element={<LeaveManagement />} />

            {/* Daily Report */}
            <Route path="daily-report" element={<DailyReport />} />
            <Route path="admin/daily-report" element={<DailyReport />} />

            {/* Screenshots */}
            <Route path="screenshots" element={<Screenshots />} />
            <Route path="admin/screenshots" element={<Screenshots />} />

            {/* Profile */}
            <Route path="profile" element={<Profile />} />
            <Route path="admin/profile" element={<Profile />} />

            {/* 404 Fallback for admin */}
            <Route path="*" element={<NotFound role="admin" />} />
          </Route>

          {/* Root Redirects */}
          <Route path="/" element={<Navigate to="/employees" replace />} />
          <Route path="/dashboard" element={<Navigate to="/employees" replace />} />

          {/* HR MODULE */}
          <Route path="/hr" element={
            <ProtectedRoute allowedRole="hr">
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="employees" replace />} />
            <Route path="dashboard" element={<Navigate to="employees" replace />} />
            <Route path="employees" element={<HREmployees />} />
            <Route path="employees/add" element={<EmployeeForm />} />
            <Route path="employees/view/:id" element={<EmployeeDetail />} />
            <Route path="employees/edit/:id" element={<EmployeeForm />} />
            <Route path="create-user" element={<CreateUser />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<LeaveManagement />} />
            <Route path="leaves" element={<LeaveManagement />} />
            <Route path="daily-report" element={<DailyReport />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="notifications/all" element={<AllNotifications />} />
            <Route path="screenshots" element={<Screenshots />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<NotFound role="hr" />} />
          </Route>

          {/* EMPLOYEE MODULE */}
          <Route path="/employee" element={
            <ProtectedRoute allowedRole="employee">
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="attendance" replace />} />
            <Route path="dashboard" element={<Navigate to="attendance" replace />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<EmployeeLeave />} />
            <Route path="leaves" element={<Navigate to="leave" replace />} />
            <Route path="daily-report" element={<DailyReport />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<NotFound role="employee" />} />
          </Route>

          {/* MANAGER MODULE */}
          <Route path="/manager" element={
            <ProtectedRoute allowedRole="manager">
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="attendance" replace />} />
            <Route path="dashboard" element={<Navigate to="attendance" replace />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="daily-report" element={<DailyReport />} />
            <Route path="leave" element={<ManagerLeaveManagement />} />
            <Route path="leaves" element={<Navigate to="leave" replace />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="notifications/all" element={<AllNotifications />} />
            <Route path="screenshots" element={<Screenshots />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<NotFound role="manager" />} />
          </Route>

          {/* GLOBAL FALLBACK */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
