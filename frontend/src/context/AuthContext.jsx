import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient'; // BẮT BUỘC IMPORT CÁI NÀY

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  const [isAuthReady, setIsAuthReady] = useState(() => !localStorage.getItem('token'));

  const login = useCallback((userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setIsAuthReady(true);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    localStorage.setItem('role', userData.role); 
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAuthReady(true);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setIsAuthReady(true);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!token || isAuthReady) return undefined;

    const controller = new AbortController();
    const validateStoredSession = async () => {
      try {
        const res = await axiosClient.get('/user/me', { signal: controller.signal });
        const updatedUser = res.data?.data;
        if (updatedUser) {
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          localStorage.setItem('role', updatedUser.role);
        }
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          setUser(null);
        }
      } finally {
        if (!controller.signal.aborted) setIsAuthReady(true);
      }
    };

    void validateStoredSession();
    return () => controller.abort();
  }, [token, isAuthReady]);

  // ĐÃ DI CHUYỂN VÀO TRONG AuthProvider
  const refreshUser = useCallback(async () => {
    try {
      if (!token) return;

      
      const res = await axiosClient.get('/user/me'); 

      if (res.data && res.data.success) {
        const updatedUser = res.data.data;
        setUser(updatedUser); // Bây giờ đã gọi được setUser
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('role', updatedUser.role);
      }
    } catch (error) {
      console.error("Lỗi cập nhật user:", error);
    }
  }, [token]);

  const value = useMemo(
    () => ({ user, token, isAuthReady, login, logout, refreshUser }),
    [user, token, isAuthReady, login, logout, refreshUser]
  );

  return (
    // ĐÃ THÊM refreshUser VÀO value Ở ĐÂY
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
