import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axiosClient from '../api/axiosClient'; 

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth(); // Theo dõi xem có ông user nào đang đăng nhập không
  const [cartCount, setCartCount] = useState(0);

  // Hàm gọi API lấy số lượng giỏ hàng
  const fetchCartCount = async () => {
    // Nếu chưa đăng nhập thì giỏ hàng mặc định = 0
    if (!user) {
      setCartCount(0);
      return;
    }
    
    try {
      // 1. Gọi API lấy giỏ hàng 
      const res = await axiosClient.get('/cart');
      const items = res.data?.data?.items || [];
      setCartCount(items.length);
    } catch (error) {
      console.error("Lỗi lấy giỏ hàng:", error);
    }
  };

  // Mỗi khi biến 'user' thay đổi (khách vừa đăng nhập xong), tự động đi lấy số lượng giỏ hàng
  useEffect(() => {
    fetchCartCount();
  }, [user]);

  // Hàm này để trang Chi tiết sản phẩm gọi khi bấm "Thêm vào giỏ"
  const updateCartCount = () => {
    fetchCartCount();
  };

  return (
    <CartContext.Provider value={{ cartCount, fetchCartCount, updateCartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);