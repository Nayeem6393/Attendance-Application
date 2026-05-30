import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Theme state: default to 'dark' for premium look, loaded from localStorage
  const [theme, setTheme] = useState(() => localStorage.getItem('attendance_theme') || 'dark');

  // Trigger brief alert notifications
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Sync theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('attendance_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const checkUserSession = async () => {
    const token = localStorage.getItem('attendance_jwt_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
    } catch (error) {
      console.warn('Session check failed or expired, clearing token.');
      localStorage.removeItem('attendance_jwt_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  const loginUser = async (loginIdentifier, password) => {
    try {
      const data = await api.post('/auth/login', { loginIdentifier, password });
      localStorage.setItem('attendance_jwt_token', data.token);
      setUser(data.user);
      showToast(data.message || 'Login successful!');
      return data.user;
    } catch (error) {
      showToast(error.message || 'Login failed.', 'error');
      throw error;
    }
  };

  const logoutUser = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Silent backend logout failed');
    } finally {
      localStorage.removeItem('attendance_jwt_token');
      setUser(null);
      showToast('Logged out successfully.');
    }
  };

  const registerUser = async (formData) => {
    try {
      const data = await api.post('/auth/register', formData);
      showToast(data.message || 'Registration successful!');
      return data;
    } catch (error) {
      showToast(error.message || 'Registration failed.', 'error');
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginUser,
        logoutUser,
        registerUser,
        showToast,
        theme,
        toggleTheme,
        refreshUserSession: checkUserSession
      }}
    >
      {children}

      {/* Premium Alert Toast notification overlays */}
      {toast && (
        <div className={`notification-toast toast-${toast.type} glass-panel`}>
          <div style={{ fontWeight: 600 }}>
            {toast.type === 'success' ? '✓ SUCCESS' : '⚠ ERROR'}
          </div>
          <div style={{ fontSize: '0.85rem' }}>{toast.message}</div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
