import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';

// ✅ สังเกตตรงนี้: วงเล็บต้องว่างเปล่าครับ ไม่มีรับค่า props ใดๆ
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

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!adminToken ? <Login setAdminToken={handleLoginSuccess} /> : <Navigate to="/dashboard" replace />} 
        />
        <Route 
          path="/dashboard" 
          element={adminToken ? <Dashboard adminToken={adminToken} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={adminToken ? "/dashboard" : "/login"} replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}