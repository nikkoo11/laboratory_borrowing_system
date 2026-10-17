import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/me/');
      setUser(response.data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/login/', { username, password });
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    // Fetch profile
    const profileRes = await api.get('/me/');
    setUser(profileRes.data);
    return profileRes.data;
  };

  const register = async (userData) => {
    const response = await api.post('/register/', userData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const updateProfile = async (data) => {
    if (!user) return;
    const response = await api.put(`/users/${user.user_id}/update/`, data);
    setUser((prev) => ({ ...prev, ...response.data }));
    return response.data;
  };

  const changePassword = async (current_password, new_password) => {
    const response = await api.put('/users/password/', {
      current_password,
      new_password,
    });
    return response.data;
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshUser: fetchCurrentUser,
        isAdmin,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

