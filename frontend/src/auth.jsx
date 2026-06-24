import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    setUser,
    async login(payload) {
      const { data } = await api.post('/auth/login', payload);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      return data.user;
    },
    async register(payload) {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      return data.user;
    },
    logout() {
      localStorage.removeItem('token');
      setUser(null);
    },
    async updateProfile(username) {
      const { data } = await api.put('/auth/profile', { username });
      if (data.token) localStorage.setItem('token', data.token);
      setUser(data.user);
      return data.user;
    },
    async uploadAvatar(file) {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data.user);
      return data.user;
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
