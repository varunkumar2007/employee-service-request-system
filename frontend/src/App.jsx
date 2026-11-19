import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/auth/Unauthorized';

import Dashboard from './pages/dashboard/Dashboard';
import RequestList from './pages/requests/RequestList';
import CreateRequest from './pages/requests/CreateRequest';
import RequestDetails from './pages/requests/RequestDetails';
import NotificationCenter from './pages/notifications/NotificationCenter';
import DepartmentManagement from './pages/admin/DepartmentManagement';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Authenticated Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="requests" element={<RequestList />} />
              <Route
                path="requests/new"
                element={
                  <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                    <CreateRequest />
                  </ProtectedRoute>
                }
              />
              <Route path="requests/:id" element={<RequestDetails />} />
              <Route path="notifications" element={<NotificationCenter />} />

              {/* Admin-only Routes */}
              <Route
                path="admin/departments"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <DepartmentManagement />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
