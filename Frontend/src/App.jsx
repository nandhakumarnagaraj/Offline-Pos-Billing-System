import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { getDashboard } from './service/api';
import SyncManager from './components/SyncManager';
import './App.css';

// Lazy Load Pages for Performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const WaiterPage = lazy(() => import('./pages/WaiterPage'));
const KitchenPage = lazy(() => import('./pages/KitchenPage'));
const CounterPage = lazy(() => import('./pages/CounterPage'));
const ManagerPage = lazy(() => import('./pages/ManagerPage'));

// Loading Component
const LoadingFallback = () => (
  <div className="loading-screen">
    <div className="spinner"></div>
    <p>Loading System...</p>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'WAITER') return <Navigate to="/waiter" replace />;
    if (user.role === 'KITCHEN') return <Navigate to="/kitchen" replace />;
    if (user.role === 'CASHIER') return <Navigate to="/counter" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

// Home Component with Role-Based Navigation
const Home = () => {
  const { user, logout } = useAuth();
  const validRoles = ['ADMIN', 'MANAGER'];
  return (
    <div className="home-container">
      <div className="home-content">
        <div className="brand-section">
          <div className="brand-logo">🍛</div>
          <h1 className="brand-title">KhanaBook</h1>
          <p className="brand-subtitle">Restaurant POS & Management System</p>
        </div>

        <div className="nav-grid">
          {(validRoles.includes(user?.role) || user?.role === 'WAITER') && (
            <Link to="/waiter" className="nav-card waiter-card">
              <div className="nav-icon">🍽️</div>
              <h2>Waiter</h2>

            </Link>
          )}

          {(validRoles.includes(user?.role) || user?.role === 'KITCHEN') && (
            <Link to="/kitchen" className="nav-card kitchen-card">
              <div className="nav-icon">👨‍🍳</div>
              <h2>Kitchen (KDS)</h2>

            </Link>
          )}

          {(validRoles.includes(user?.role) || user?.role === 'CASHIER') && (
            <Link to="/counter" className="nav-card counter-card">
              <div className="nav-icon">💰</div>
              <h2>Cashier / Billing</h2>

            </Link>
          )}

          {validRoles.includes(user?.role) && (
            <Link to="/manager" className="nav-card manager-card">
              <div className="nav-icon">📊</div>
              <h2>Manager</h2>

            </Link>
          )}
        </div>

        <div className="home-footer">
          <p>Logged in as {user?.username}</p>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <SyncManager />
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route path="/change-password" element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              } />

              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />

              <Route path="/waiter" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'WAITER']}>
                  <WaiterPage />
                </ProtectedRoute>
              } />

              <Route path="/kitchen" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'KITCHEN']}>
                  <KitchenPage />
                </ProtectedRoute>
              } />

              <Route path="/counter" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                  <CounterPage />
                </ProtectedRoute>
              } />

              <Route path="/manager" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <ManagerPage />
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
