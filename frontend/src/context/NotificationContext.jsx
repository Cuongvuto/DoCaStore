import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client'; // 1. Import thêm đồ nghề socket
import axiosClient from '../api/axiosClient';
import { useAuth } from './AuthContext'; 

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [socketInstance, setSocketInstance] = useState(null); // Lưu trữ Socket để các trang khác dùng chung
  const { user } = useAuth(); // Lấy trạng thái user

  // Hàm gọi API lấy số đếm
  const fetchUnreadCount = async () => {
    try {
      const res = await axiosClient.get('/notifications/unread-count');
      if (res.data.success) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (error) {
      console.error('Lỗi lấy số đếm thông báo:', error);
    }
  };

  // TÍCH HỢP SOCKET.IO VÀO USEEFFECT
  useEffect(() => {
    let socket; // Khai báo biến socket ở đây để lúc return còn biết đường mà dọn dẹp

    if (user) {
      // 1. Vẫn gọi API lấy số đếm lần đầu như cũ
      fetchUnreadCount();

      // Lấy ID user (đề phòng sếp dùng _id hoặc id)
      const userId = user.id || user._id;

      // 2. Khởi tạo kết nối tới Backend thông qua Biến Môi trường Vite
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
      socket = io(socketUrl);
      setSocketInstance(socket); // Cất vào State

      // 3. Khi vừa cắm dây thành công -> Khai báo ID để Backend ghi sổ
      socket.on('connect', () => {
        console.log('✅ Đã kết nối Socket với Backend!');
        if (userId) {
          socket.emit('registerUser', userId);
        }
      });

      // 4. Bật loa lắng nghe, hễ Backend hét 'NEW_NOTIFICATION' là hành động
      socket.on('NEW_NOTIFICATION', (data) => {
        console.log('🔔 Ting ting! Có thông báo mới:', data);
        fetchUnreadCount(); // Tự động gọi API cập nhật lại số đếm
      });

    } else {
      setUnreadCount(0); // Clear số đếm nếu log out
    }

    // 5. Dọn dẹp: Rút phích cắm khi user thoát web hoặc đăng xuất
    return () => {
      if (socket) {
        socket.disconnect();
        setSocketInstance(null);
      }
    };
  }, [user]); // Bất cứ khi nào cục `user` thay đổi, nó sẽ chạy lại luồng này

  // Hàm này để sếp gọi ở trang /notifications khi user lỡ bấm đọc 1 tin
  const decreaseUnreadCount = () => {
    setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
  };

  // Hàm này để sếp gọi khi bấm nút "Đọc tất cả"
  const clearUnreadCount = () => {
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ socket: socketInstance, unreadCount, fetchUnreadCount, decreaseUnreadCount, clearUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};