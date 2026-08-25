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
  Settings as SettingsIcon
} from 'lucide-react';

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
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const token = sessionStorage.getItem('token');

  React.useEffect(() => {
    if (!token) {
      window.location.href = '/';
    }
  }, [token]);

  if (!token) return null;

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/';
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Employees', icon: Users, path: '/employees' },
    { label: 'Daily Tasks', icon: CheckSquare, path: '/tasks' },
    { label: 'Projects', icon: Layers, path: '/projects' },
    { label: 'Leave Approvals', icon: ClipboardList, path: '/leave' },
    { label: 'Attendance', icon: Calendar, path: '/attendance' },
    { label: 'Payroll', icon: Wallet, path: '/payroll' },
    { label: 'Recruitment', icon: UserPlus, path: '/recruitment' },
    { label: 'Performance', icon: TrendingUp, path: '/performance' },
    { label: 'Training', icon: GraduationCap, path: '/training' },
    { label: 'Events & Notices', icon: PartyPopper, path: '/events' },
    { label: 'HR Reports', icon: BarChart3, path: '/reports' },
    { label: 'Activity Logs', icon: Camera, path: '/screenshots' },
    { label: 'Documents', icon: FileText, path: '/documents' },
    { label: 'Team Chat', icon: MessageSquare, path: '/chat' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
  ];

  return (
    <ErrorBoundary>
      <Toaster position="bottom-right" toastOptions={{ duration: 3500 }} />
      <MainLayout
        navItems={navItems}
        userRole="hr"
        userName={user?.profile?.firstName || user?.name || user?.email || 'HR Manager'}
        onLogout={handleLogout}
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<HRDashboard />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* Workforce Management */}
            <Route path="/employees" element={<HREmployees />} />
            <Route path="/employees/add" element={<EmployeeForm />} />
            <Route path="/employees/edit/:id" element={<EmployeeForm />} />
            <Route path="/employees/view/:id" element={<EmployeeDetail />} />
            <Route path="/create-user" element={<CreateUser />} />
            <Route path="/team" element={<TeamManagement />} />
            <Route path="/teams" element={<TeamManagement />} />

            {/* Tasks & Projects */}
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/task-management" element={<TaskManagement />} />
            <Route path="/task-management/create" element={<TaskCreate />} />
            <Route path="/task-management/update/:id" element={<TaskUpdate />} />
            <Route path="/projects" element={<ProjectManagement />} />

            {/* Leave & Attendance */}
            <Route path="/leave" element={<LeaveManagement />} />
            <Route path="/leaves" element={<LeaveManagement />} />
            <Route path="/leave-approvals" element={<LeaveManagement />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance-monitoring" element={<Attendance />} />

            {/* Operations */}
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/recruitment" element={<Recruitment />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/training" element={<Training />} />
            <Route path="/events" element={<EventsManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/screenshots" element={<Screenshots />} />
            <Route path="/documents" element={<EmployeeDocuments />} />

            {/* Notifications, Chat, Profile & Settings */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/notifications/all" element={<AllNotifications />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </ErrorBoundary>
  );
}

export default App;
