import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);

  const normalizeWishlist = useCallback((data) => (
    Array.isArray(data)
      ? data.map((item) => (typeof item === 'object' ? item._id : item))
      : []
  ), []);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axiosClient.get('/wishlist');
      setWishlist(normalizeWishlist(response.data?.data || response.data));
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Không thể tải danh sách yêu thích:', error);
      }
    }
  }, [normalizeWishlist, user]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    axiosClient.get('/wishlist').then((response) => {
      if (active) setWishlist(normalizeWishlist(response.data?.data || response.data));
    }).catch((error) => {
      if (error.response?.status !== 401) console.error('Không thể tải danh sách yêu thích:', error);
    });
    return () => {
      active = false;
    };
  }, [normalizeWishlist, user]);

  const value = useMemo(
    () => ({ wishlist, setWishlist, fetchWishlist }),
    [wishlist, fetchWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist phải được dùng bên trong WishlistProvider.');
  return context;
};
