import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, loading, getRole, mustChangePassword } = useAuth();
  const role = getRole();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword() && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If not authorized for this route, redirect to authorized page based on role
    if (role === 'WAITER') return <Navigate to="/waiter" replace />;
    if (role === 'KITCHEN') return <Navigate to="/kitchen" replace />;
    if (role === 'CASHIER') return <Navigate to="/counter" replace />;
    // Admin/Manager fallback
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
