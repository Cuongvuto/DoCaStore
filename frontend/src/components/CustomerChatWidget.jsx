import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, XCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import axiosClient from '../api/axiosClient';

const CustomerChatWidget = () => {
  const { user } = useAuth();
  const { socket } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  
  // THÊM STATE QUẢN LÝ TICKET HIỆN TẠI
  const [currentTicket, setCurrentTicket] = useState(null); 
  const messagesEndRef = useRef(null);

  // ==================================================
  // PHÂN TÍCH TRẠNG THÁI PHIÊN CỦA KHÁCH
  // ==================================================
  let sessionState = currentTicket?.status === 'resolved' ? 'resolved' : 'active'; 
  
  // Vẫn giữ vòng lặp của bạn để check realtime từ tin nhắn hệ thống
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].action === 'end_support') {
      sessionState = 'resolved';
      break;
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0); 
    }
  }, [messages, isOpen]);

  // FETCH LỊCH SỬ CHAT THEO API TICKET MỚI
  useEffect(() => {
    if (user && isOpen && messages.length === 0) {
      const fetchHistory = async () => {
        try {
          // Sử dụng endpoint dành riêng cho Khách hàng đã viết ở Backend
          const res = await axiosClient.get(`/messages/customer/${user._id}`);
          if (res.data.success) {
            setMessages(res.data.messages || []);
            setCurrentTicket(res.data.conversation || null);
          }
        } catch (error) {
          console.error('Lỗi tải lịch sử chat:', error);
        }
      };
      fetchHistory();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage) => {
      // Đảm bảo tin nhắn thuộc về khách hàng này
      if (newMessage.customerId === user?._id) {
        setMessages((prev) => [...prev, newMessage]);
        // Báo noti nếu có tin nhắn từ admin hoặc hệ thống khi đang đóng popup
        if (!isOpen && newMessage.sender !== 'customer') {
          setUnreadCount(prev => prev + 1);
        }
      }
    };
    
    // Cập nhật lại status của Ticket nếu Admin nhấn Nhận hoặc Kết thúc
    const handleTicketUpdated = (updatedTicket) => {
      if (currentTicket && updatedTicket._id === currentTicket._id) {
        setCurrentTicket(updatedTicket);
      }
    };

    // Xóa sạch khung chat khi hết phiên 10 phút tự động (từ Server)
    const handleSessionEnded = () => {
       setMessages([]);
       setCurrentTicket(null);
    };
    
    socket.on('receive_message', handleReceiveMessage);
    socket.on('ticket_updated', handleTicketUpdated);
    socket.on('chat_session_ended', handleSessionEnded);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('ticket_updated', handleTicketUpdated);
      socket.off('chat_session_ended', handleSessionEnded);
    };
  }, [socket, user, isOpen, currentTicket]);

  // ==================================================
  // XỬ LÝ SỰ KIỆN GỬI & TẠO TICKET
  // ==================================================
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !socket) return;

    const messageData = {
      customerId: user._id,
      conversationId: currentTicket?._id || null, // Gửi kèm ID Ticket
      sender: 'customer',
      text: inputText.trim()
    };

    // Lắng nghe callback từ server để lấy ID Ticket nếu vừa tạo mới
    socket.emit('send_message', messageData, (res) => {
      if (res && res.success && res.conversationId) {
        if (!currentTicket || currentTicket._id !== res.conversationId) {
          setCurrentTicket({ _id: res.conversationId, status: 'active' });
        }
      }
    });
    
    setInputText('');
  };

  const handleEndSession = () => {
    if (window.confirm("Bạn muốn kết thúc phiên hỗ trợ này?")) {
      socket.emit('end_session', { 
        conversationId: currentTicket?._id, // Truyền đúng ID Ticket cần đóng
        customerId: user._id 
      });
    }
  };

  const handleStartNewSession = () => {
    setMessages([]); // Làm rỗng màn hình -> Bắt đầu vòng lặp mới
    setCurrentTicket(null); // Reset Ticket ID -> Tin nhắn tiếp theo sẽ tạo Bìa hồ sơ mới
  };

  if (user?.role && user.role !== 'customer') return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 sm:p-2.5 hover:bg-white/10 rounded-full transition-all relative group"
      >
        <MessageCircle size={20} className="text-white group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] sm:text-[10px] font-black rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center border sm:border-2 border-[#5a8c76] shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed top-20 right-4 sm:right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 border border-gray-100" style={{ height: '500px', maxHeight: 'calc(100vh - 100px)' }}>
          <div className="bg-[#5a8c76] p-4 text-white flex items-center justify-between shadow-md z-10 shrink-0">
            <div>
              <h3 className="font-bold text-lg">Hỗ trợ khách hàng</h3>
              <p className="text-sm opacity-80">Chúng tôi sẽ phản hồi sớm nhất!</p>
            </div>
            <div className="flex gap-3">
              {sessionState === 'active' && messages.length > 0 && (
                <button onClick={handleEndSession} title="Kết thúc chat" className="opacity-80 hover:opacity-100 hover:text-red-200 transition-colors">
                  <XCircle className="w-5 h-5"/>
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="opacity-80 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3 custom-scrollbar text-left">
            {!user ? (
              <div className="text-center text-gray-500 my-auto">
                <p className="mb-2">Vui lòng đăng nhập để chat.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 my-auto">
                <p>Chưa có tin nhắn nào. Hãy gửi lời chào!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                
                // UI DÀNH RIÊNG CHO TIN NHẮN BOT TỰ ĐỘNG VÀ THÔNG BÁO HỆ THỐNG
                if (msg.sender === 'system') {
                  return (
                    <div key={msg._id || idx} className="flex justify-center my-2">
                      <span className={`text-[12px] px-4 py-2 rounded-xl font-medium shadow-sm text-center max-w-[90%] ${msg.action === 'join_support' ? 'bg-[#5a8c76]/10 text-[#5a8c76] border border-[#5a8c76]/20' : msg.action === 'end_support' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-gray-200/60 text-gray-600 border border-gray-200'}`}>
                        {msg.action === 'join_support' ? '👩‍💼' : msg.action === 'end_support' ? '🔒' : '🤖'} {msg.text}
                      </span>
                    </div>
                  );
                }

                // UI CHO TIN NHẮN BÌNH THƯỜNG
                return (
                  <div key={msg._id || idx} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${msg.sender === 'customer' ? 'bg-[#5a8c76] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                      <p className="text-sm">{msg.text}</p>
                      <span className={`text-[10px] mt-1 block ${msg.sender === 'customer' ? 'text-gray-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* HIỂN THỊ Ô INPUT HOẶC NÚT TẠO MỚI DỰA THEO STATE */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            {user && sessionState === 'resolved' ? (
              <button onClick={handleStartNewSession} className="w-full flex items-center justify-center gap-2 bg-[#5a8c76] text-white py-2.5 rounded-xl hover:bg-[#46705d] transition-colors font-medium">
                <RotateCcw className="w-4 h-4" /> Bắt đầu trò chuyện mới
              </button>
            ) : user ? (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5a8c76]/30 transition-all text-gray-900"
                />
                <button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${inputText.trim() ? 'bg-[#5a8c76] text-white hover:bg-[#46705d]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  <Send className="w-4 h-4 ml-1" />
                </button>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerChatWidget;