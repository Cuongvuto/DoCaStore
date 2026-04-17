import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Tag, Info, CheckCheck, BellOff, Circle, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useNotification } from '../context/NotificationContext';
import { toast } from 'sonner';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [selectedNoti, setSelectedNoti] = useState(null);
  
  const { socket, decreaseUnreadCount, clearUnreadCount } = useNotification();

  const fetchNotifications = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/notifications?page=${pageNum}&limit=10`);
      if (res.data.success) {
        if (pageNum === 1) {
          setNotifications(res.data.data);
        } else {
          setNotifications(prev => [...prev, ...res.data.data]);
        }
        setTotalPages(res.data.totalPages);
      }
    } catch (error) {
      console.error("Lỗi lấy thông báo:", error);
      toast.error('Không thể tải thông báo!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  // Lắng nghe sự kiện cắm cờ Socket.io để Push Real-time
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data) => {
      if (data.noti) {
        // Đẩy thẳng thông báo mới vào đầu danh sách UI không cần tải lại trang
        setNotifications((prev) => [data.noti, ...prev]);
      } else {
        fetchNotifications(1);
      }
    };

    socket.on('NEW_NOTIFICATION', handleNewNotification);
    return () => socket.off('NEW_NOTIFICATION', handleNewNotification);
  }, [socket]);

  //  3. Viết lại hàm Click: Vừa mở Popup, vừa đánh dấu đã đọc
  const handleNotificationClick = async (noti) => {
    // Bước 1: Mở popup hiển thị thông tin ngay lập tức cho nóng
    setSelectedNoti(noti);

    // Bước 2: Nếu đọc rồi thì thôi, chưa đọc thì gọi API trừ số
    if (noti.isRead) return; 

    try {
      await axiosClient.put(`/notifications/${noti._id}/read`);
      setNotifications(prev => prev.map(n => n._id === noti._id ? { ...n, isRead: true } : n));
      decreaseUnreadCount();
    } catch (error) {
      console.error("Lỗi đánh dấu đọc:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosClient.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      clearUnreadCount();
      toast.success('Đã đánh dấu đọc tất cả!');
    } catch (error) {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getIcon = (type) => {
    switch (type) {
      case 'order': return <Package size={24} className="text-blue-500" />;
      case 'promotion': return <Tag size={24} className="text-yellow-500" />;
      default: return <Info size={24} className="text-[#5a8c76]" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* -- HEADER TRANG -- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
            Thông báo của bạn
          </h1>
          <button 
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 text-sm font-bold text-[#5a8c76] hover:text-green-800 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm"
          >
            <CheckCheck size={18} />
            Đánh dấu tất cả đã đọc
          </button>
        </div>

        {/* -- DANH SÁCH THÔNG BÁO -- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {notifications.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <BellOff size={48} className="mb-4 opacity-50" />
              <p className="font-semibold text-lg">Chưa có thông báo nào!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((noti) => (
                <div 
                  key={noti._id}
                  onClick={() => handleNotificationClick(noti)} //  Gọi hàm mới truyền cả Object vào
                  className={`relative p-5 cursor-pointer transition-colors flex gap-4 ${
                    noti.isRead ? 'bg-white hover:bg-gray-50' : 'bg-[#5a8c76]/5 hover:bg-[#5a8c76]/10'
                  }`}
                >
                  {!noti.isRead && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-2">
                      <Circle size={10} className="fill-red-500 text-red-500" />
                    </div>
                  )}

                  <div className={`p-3 rounded-xl h-fit flex-shrink-0 ml-3 sm:ml-0 ${noti.isRead ? 'bg-gray-50' : 'bg-white shadow-sm'}`}>
                    {getIcon(noti.type)}
                  </div>

                  <div className="flex-1">
                    <h3 className={`text-base mb-1 truncate ${noti.isRead ? 'text-gray-600 font-semibold' : 'text-gray-900 font-black'}`}>
                      {noti.title}
                    </h3>
                    <p className={`text-sm mb-2 line-clamp-1 ${noti.isRead ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                      {noti.message}
                    </p>
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                      {formatTime(noti.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* -- NÚT TẢI THÊM -- */}
        {page < totalPages && (
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchNotifications(nextPage);
              }}
              disabled={loading}
              className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? 'Đang tải...' : 'Xem thêm thông báo'}
            </button>
          </div>
        )}
      </div>

      {/*  4. KHU VỰC MODAL (POPUP) HIỂN THỊ CHI TIẾT THÔNG BÁO */}
      {selectedNoti && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all" 
          onClick={() => setSelectedNoti(null)} // Bấm ra ngoài rìa đen thì đóng Popup
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // Bấm vào trong khung trắng thì KHÔNG đóng
          >
            {/* Thanh Header của Popup */}
            <div className="flex justify-between items-center p-5 border-b border-gray-50 bg-gray-50/50">
              <div className="flex items-center gap-2 text-[#5a8c76] font-black uppercase text-sm">
                {getIcon(selectedNoti.type)}
                <span>Chi tiết thông báo</span>
              </div>
              <button 
                onClick={() => setSelectedNoti(null)} 
                className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Nội dung chính */}
            <div className="p-6">
              <h2 className="text-xl font-black text-gray-900 mb-2 leading-tight">
                {selectedNoti.title}
              </h2>
              
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Circle size={6} className="fill-[#5a8c76] text-[#5a8c76]" /> 
                {formatTime(selectedNoti.createdAt)}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                  {selectedNoti.message}
                </p>
              </div>
              
              {/* Nút hành động nếu có link đi kèm */}
              {selectedNoti.linkUrl && (
                <div className="mt-6">
                  <Link 
                    to={selectedNoti.linkUrl} 
                    className="flex justify-center items-center w-full py-3 bg-[#5a8c76] text-white rounded-xl font-black hover:bg-[#487360] transition-colors shadow-md active:scale-95"
                    onClick={() => setSelectedNoti(null)} // Bấm link thì đóng popup luôn
                  >
                    XEM NGAY
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animation cho CSS */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in-95 { from { transform: scale(0.95); } to { transform: scale(1); } }
        .animate-in { animation-duration: 200ms; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); animation-fill-mode: forwards; }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </div>
  );
};

export default Notifications;