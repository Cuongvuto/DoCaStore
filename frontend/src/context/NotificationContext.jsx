import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { io } from 'socket.io-client';
import axiosClient from '../api/axiosClient';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const socket = useMemo(() => {
    if (!token) return null;
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    return io(socketUrl, {
      autoConnect: false,
      auth: { token },
      transports: ['websocket', 'polling']
    });
  }, [token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axiosClient.get('/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Không thể tải số thông báo chưa đọc:', error);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNotification = () => {
      void fetchUnreadCount();
    };

    socket.on('connect', handleNotification);
    socket.on('NEW_NOTIFICATION', handleNotification);
    socket.connect();

    return () => {
      socket.off('connect', handleNotification);
      socket.off('NEW_NOTIFICATION', handleNotification);
      socket.disconnect();
    };
  }, [socket, fetchUnreadCount]);

  const decreaseUnreadCount = useCallback(() => {
    setUnreadCount((previous) => Math.max(previous - 1, 0));
  }, []);

  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({
      socket,
      unreadCount,
      fetchUnreadCount,
      decreaseUnreadCount,
      clearUnreadCount
    }),
    [socket, unreadCount, fetchUnreadCount, decreaseUnreadCount, clearUnreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification phải được dùng bên trong NotificationProvider.');
  }
  return context;
};
