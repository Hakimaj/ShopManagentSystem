import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/authApi';
import { registerUnauthorizedHandler } from '../services/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); // true = checking stored token
  const [authError, setAuthError] = useState('');

  // On mount: check if a stored JWT is still valid
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('antishop_token');
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const user = await authApi.getProfile();
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch {
        // Token invalid or expired — clear it
        localStorage.removeItem('antishop_token');
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (username, password) => {
    setAuthError('');
    try {
      const data = await authApi.login(username, password);
      localStorage.setItem('antishop_token', data.access_token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('antishop_token');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthError('');
  }, []);

  // Register the global 401 → logout handler so expired/invalid tokens auto-sign-out
  useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated,
      authLoading,
      authError,
      setAuthError,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
