import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const token = localStorage.getItem('kb_token');
    const userData = localStorage.getItem('kb_user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = (loginResponse) => {
    const userData = {
      token: loginResponse.token,
      username: loginResponse.username,
      displayName: loginResponse.displayName,
      role: loginResponse.role,
      mustChangePassword: loginResponse.mustChangePassword,
    };
    localStorage.setItem('kb_token', loginResponse.token);
    localStorage.setItem('kb_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('kb_token');
    localStorage.removeItem('kb_user');
    setUser(null);
  };

  const updateMustChangePassword = (value) => {
    const updated = { ...user, mustChangePassword: value };
    localStorage.setItem('kb_user', JSON.stringify(updated));
    setUser(updated);
  };

  const isAuthenticated = () => !!user?.token;
  const getToken = () => user?.token;
  const getRole = () => user?.role;
  const mustChangePassword = () => user?.mustChangePassword;

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading,
      isAuthenticated, getToken, getRole, mustChangePassword,
      updateMustChangePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
