import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@shared/layouts/MainLayout';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  CheckSquare,
  PlusCircle,
  Layers,
  Calendar,
  MessageSquare,
  Globe,
  Briefcase,
  User
} from 'lucide-react';

const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const ManagerTasks = lazy(() => import('./pages/ManagerTasks'));
const TaskCreate = lazy(() => import('./pages/TaskCreate'));
const ManagerProjects = lazy(() => import('./pages/ManagerProjects'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const Holidays = lazy(() => import('./pages/Holidays'));
const MyEvents = lazy(() => import('./pages/MyEvents'));
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
    { label: 'Tasks', icon: CheckSquare, path: '/tasks' },
    { label: 'Create Task', icon: PlusCircle, path: '/tasks/create' },
    { label: 'Projects', icon: Layers, path: '/projects' },
    { label: 'Leave Approvals', icon: Calendar, path: '/leaves' },
    { label: 'Team Chat', icon: MessageSquare, path: '/chat' },
    { label: 'Company Holidays', icon: Globe, path: '/holidays' },
    { label: 'Events', icon: Briefcase, path: '/events' },
    { label: 'My Profile', icon: User, path: '/profile' },
  ];

  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      <MainLayout
        navItems={navItems}
        userRole="manager"
        userName={user?.name || user?.email || 'Manager'}
        onLogout={handleLogout}
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<ManagerDashboard />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/tasks" element={<ManagerTasks />} />
            <Route path="/tasks/create" element={<TaskCreate />} />
            <Route path="/projects" element={<ManagerProjects />} />
            <Route path="/leaves" element={<LeaveManagement />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/events" element={<MyEvents />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </ErrorBoundary>
  );
}

export default App;
