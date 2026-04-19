import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import ContentPage from './pages/ContentPage';
import UploadPage from './pages/UploadPage';
import NotificationsPage from './pages/NotificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';

export default function App() {
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('adminToken'));

  const handleLoginSuccess = (token: string) => {
    setAdminToken(token);
    localStorage.setItem('adminToken', token);
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('adminToken');
  };

  if (!adminToken) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login setAdminToken={handleLoginSuccess} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<DashboardPage token={adminToken} />} />
          <Route path="/dashboard" element={<DashboardPage token={adminToken} />} />
          <Route path="/users" element={<UsersPage token={adminToken} />} />
          <Route path="/users/:id" element={<UserDetailPage token={adminToken} />} />
          <Route path="/content" element={<ContentPage token={adminToken} />} />
          <Route path="/upload" element={<UploadPage token={adminToken} />} />
          <Route path="/notifications" element={<NotificationsPage token={adminToken} />} />
          <Route path="/analytics" element={<AnalyticsPage token={adminToken} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}