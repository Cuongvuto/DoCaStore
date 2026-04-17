import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  // Biến  chứa một MẢNG CÁC ID SẢN PHẨM đã được yêu thích
  const [wishlist, setWishlist] = useState([]); 

  // Hàm gọi API lấy danh sách Wishlist khi vừa mở web
  const fetchWishlist = async () => {
    //  Kiểm tra xem user có token không (đã đăng nhập chưa)
    const token = localStorage.getItem('token');

    if (!token) {
      setWishlist([]); // Khách chưa đăng nhập thì mặc định danh sách tim trống trơn
      return; 
    }

    try {
      // Gọi API GET lấy wishlist
      const res = await axiosClient.get('/wishlist'); 
      
      // Lấy đúng đường dẫn data từ backend 
      const wishlistData = res.data?.data || res.data || []; 

      if (Array.isArray(wishlistData)) {
        const productIds = wishlistData.map(item => typeof item === 'object' ? item._id : item);
        setWishlist(productIds);
      }

    } catch (error) {
      console.log("Không thể lấy wishlist (Có thể token đã hết hạn).");
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  return (
    <WishlistContext.Provider value={{ wishlist, setWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);