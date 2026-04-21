import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient'; // BẮT BUỘC IMPORT CÁI NÀY

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (error) {
        console.error("Lỗi đọc dữ liệu user:", error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    localStorage.setItem('role', userData.role); 
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  };

  // ĐÃ DI CHUYỂN VÀO TRONG AuthProvider
  const refreshUser = async () => {
    try {
      if (!token) return;

      
      const res = await axiosClient.get('/user/me'); 

      if (res.data && res.data.success) {
        const updatedUser = res.data.data;
        setUser(updatedUser); // Bây giờ đã gọi được setUser
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Lỗi cập nhật user:", error);
    }
  };

  return (
    // ĐÃ THÊM refreshUser VÀO value Ở ĐÂY
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);