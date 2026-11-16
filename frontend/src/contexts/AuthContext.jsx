import { useCallback, useEffect, useState } from 'react';
import authApi from '../api/authApi';
import AuthContext from './authStateContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Lỗi phân tích auth_user từ localStorage:', e);
      localStorage.removeItem('auth_user');
      return null;
    }
  });

  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('access_token')));

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authApi.login(credentials);
      const { access_token: accessToken, user: userData } = response.data || {};

      if (!accessToken || !userData) {
        throw new Error('Phản hồi đăng nhập từ máy chủ không hợp lệ.');
      }

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Lỗi khi gọi API logout:', e);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      setUser(null);
    }
  };

  const fetchMe = useCallback(async () => {
    try {
      const response = await authApi.getMe();
      const userData = response.data;
      if (!userData) {
        throw new Error('Phản hồi thông tin người dùng từ máy chủ không hợp lệ.');
      }

      localStorage.setItem('auth_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (e) {
      console.error('Phiên đăng nhập hết hạn:', e);
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    if (localStorage.getItem('access_token')) {
      Promise.resolve().then(fetchMe);
    }

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}