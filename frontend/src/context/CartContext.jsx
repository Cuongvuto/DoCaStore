import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import axiosClient from '../api/axiosClient';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const fetchCartCount = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axiosClient.get('/cart');
      setCartCount(response.data?.data?.items?.length || 0);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Không thể tải giỏ hàng:', error);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    axiosClient.get('/cart').then((response) => {
      if (active) setCartCount(response.data?.data?.items?.length || 0);
    }).catch((error) => {
      if (error.response?.status !== 401) console.error('Không thể tải giỏ hàng:', error);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const value = useMemo(
    () => ({ cartCount, fetchCartCount, updateCartCount: fetchCartCount }),
    [cartCount, fetchCartCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart phải được dùng bên trong CartProvider.');
  return context;
};
