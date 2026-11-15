import { createContext, useContext, useEffect, useState } from 'react';
import authApi from '../api/authApi';

const AuthContext = createContext(null);

// Quy ước điều hướng tự động theo CV04.4
export const getDefaultRouteByRole = (role) => {
  switch (role) {
    case 'Admin':
      return '/admin';
    case 'Sales':
      return '/sales';
    case 'Farm_Staff':
      return '/farm';
    case 'Customer':
    default:
      return '/';
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('access_token')));

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authApi
        .getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('auth_user', JSON.stringify(res.data));
        })
        .catch(() => {
          setUser(null);
        })
        .finally(() => setLoading(false));
    }

    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Bỏ qua nếu token đã hết hạn sẵn
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);