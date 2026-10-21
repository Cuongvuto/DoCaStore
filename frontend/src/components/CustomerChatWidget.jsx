import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, XCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { toast } from 'sonner';
import axiosClient from '../api/axiosClient';

const CustomerChatWidget = ({ triggerClassName = '' }) => {
  const { user } = useAuth();
  const { socket } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const sendPending = useRef(false);
  const [before, setBefore] = useState(null);
  const [olderLoading, setOlderLoading] = useState(false);
  const skipScroll = useRef(false);
  const activeConversation = useRef(null);
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
    if (skipScroll.current) { skipScroll.current = false; return; }
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const loadOlder = async () => {
    if (!before || !currentTicket || olderLoading) return;
    const ticket = currentTicket._id;
    setOlderLoading(true);
    try {
      const res = await axiosClient.get('/messages/' + ticket, { params: { before } });
      if (activeConversation.current !== ticket) return;
      skipScroll.current = true;
      setMessages(previous => Array.from(new Map([...res.data.messages, ...previous].map(message => [message._id, message])).values()));
      setBefore(res.data.nextBefore);
    } catch { toast.error('Không thể tải tin nhắn cũ. Vui lòng thử lại.'); }
    finally { setOlderLoading(false); }
  };

  const toggleChat = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) setUnreadCount(0);
  };

  useEffect(() => {
    setMessages([]); setCurrentTicket(null); setStartingNew(false); setBefore(null);
    activeConversation.current = null;
  }, [user?._id]);

  useEffect(() => {
    if (!user || !isOpen || startingNew) return;
    const controller = new AbortController();
    axiosClient.get('/messages/customer/' + user._id, { signal: controller.signal })
      .then(res => {
        if (controller.signal.aborted) return;
        setMessages(previous => Array.from(new Map([...(res.data.messages || []), ...previous.filter(message => message.conversationId === res.data.conversation?._id)].map(message => [message._id, message])).values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
        setBefore(res.data.nextBefore);
        activeConversation.current = res.data.conversation?._id;
        setCurrentTicket(res.data.conversation || null);
      }).catch(() => { if (!controller.signal.aborted) toast.error('Không thể tải hội thoại. Hãy đóng rồi mở lại cửa sổ hỗ trợ.'); });
    return () => controller.abort();
  }, [user, isOpen, startingNew]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage) => {
      // Đảm bảo tin nhắn thuộc về khách hàng này
      if (newMessage.customerId === user?._id) {
        setMessages((prev) => prev.some(message => message._id === newMessage._id) ? prev : [...prev, newMessage]);
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
    if (!inputText.trim() || !user || !socket || sendPending.current) return;
    if (!socket.connected) return toast.error('Mất kết nối hỗ trợ. Vui lòng thử lại.');
    sendPending.current = true; setSending(true);

    const messageData = {
      customerId: user._id,
      conversationId: currentTicket?._id || null, // Gửi kèm ID Ticket
      sender: 'customer',
      text: inputText.trim()
    };

    // Lắng nghe callback từ server để lấy ID Ticket nếu vừa tạo mới
    socket.timeout(10000).emit('send_message', messageData, (error, res) => {
      sendPending.current = false; setSending(false);
      if (error || !res?.success) return toast.error(res?.message || 'Chưa nhận được xác nhận gửi. Vui lòng kiểm tra hội thoại trước khi gửi lại.');
      setInputText('');
      if (res && res.success && res.conversationId) {
        if (!currentTicket || currentTicket._id !== res.conversationId) {
          setCurrentTicket({ _id: res.conversationId, status: 'pending' });
          activeConversation.current = res.conversationId;
        }
      }
    });

  };

  const handleEndSession = () => {
    if (!socket?.connected) return toast.error('Mất kết nối hỗ trợ.');
    if (window.confirm("Bạn muốn kết thúc phiên hỗ trợ này?")) {
      socket.emit('end_session', { 
        conversationId: currentTicket?._id, // Truyền đúng ID Ticket cần đóng
        customerId: user._id 
      });
    }
  };

  const handleStartNewSession = () => {
    setStartingNew(true); setBefore(null); activeConversation.current = null;
    setMessages([]); // Làm rỗng màn hình -> Bắt đầu vòng lặp mới
    setCurrentTicket(null); // Reset Ticket ID -> Tin nhắn tiếp theo sẽ tạo Bìa hồ sơ mới
  };

  if (!user || user.role !== 'customer') return null;

  return (
    <>
      <button
        onClick={toggleChat}
        className={triggerClassName || 'p-1.5 sm:p-2.5 hover:bg-white/10 rounded-full transition-all relative group'}
        aria-label={isOpen ? 'Đóng hỗ trợ khách hàng' : 'Mở hỗ trợ khách hàng'}
        aria-expanded={isOpen}
      >
        <MessageCircle size={20} className={triggerClassName ? '' : 'text-white group-hover:scale-110 transition-transform'} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] sm:text-[10px] font-black rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center border sm:border-2 border-brand-700 shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Hỗ trợ khách hàng" className="fixed top-20 right-4 sm:right-6 w-[calc(100vw-2rem)] max-w-96 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 border border-gray-100" style={{ height: '500px', maxHeight: 'calc(100vh - 100px)' }}>
          <div className="bg-brand-700 p-4 text-white flex items-center justify-between shadow-md z-10 shrink-0">
            <div>
              <h3 className="font-bold text-lg">Hỗ trợ khách hàng</h3>
              <p className="text-sm opacity-80">Chúng tôi sẽ phản hồi sớm nhất!</p>
            </div>
            <div className="flex gap-3">
              {sessionState === 'active' && messages.length > 0 && (
                <button onClick={handleEndSession} title="Kết thúc chat" aria-label="Kết thúc phiên hỗ trợ" className="opacity-80 hover:opacity-100 hover:text-red-200 transition-colors">
                  <XCircle className="w-5 h-5"/>
                </button>
              )}
              <button onClick={() => setIsOpen(false)} aria-label="Đóng cửa sổ hỗ trợ" className="opacity-80 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3 custom-scrollbar text-left">
            {before && <button className="text-sm underline p-2" disabled={olderLoading} onClick={loadOlder}>{olderLoading ? 'Đang tải…' : 'Tải tin nhắn cũ'}</button>}
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
                      <span className={`text-[12px] px-4 py-2 rounded-xl font-medium shadow-sm text-center max-w-[90%] ${msg.action === 'join_support' ? 'bg-brand-700/10 text-brand-700 border border-brand-700/20' : msg.action === 'end_support' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-gray-200/60 text-gray-600 border border-gray-200'}`}>
                        {msg.action === 'join_support' ? '👩‍💼' : msg.action === 'end_support' ? '🔒' : '🤖'} {msg.text}
                      </span>
                    </div>
                  );
                }

                // UI CHO TIN NHẮN BÌNH THƯỜNG
                return (
                  <div key={msg._id || idx} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${msg.sender === 'customer' ? 'bg-brand-700 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                      <p className="text-sm">{msg.text}</p>
                      <span className={`text-[10px] mt-1 block ${msg.sender === 'customer' ? 'text-gray-200' : 'text-gray-400'}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
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
              <button onClick={handleStartNewSession} className="w-full flex items-center justify-center gap-2 bg-brand-700 text-white py-2.5 rounded-xl hover:bg-brand-800 transition-colors font-medium">
                <RotateCcw className="w-4 h-4" /> Bắt đầu trò chuyện mới
              </button>
            ) : user ? (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  maxLength={2000}
                  disabled={sending}
                  aria-label="Tin nhắn hỗ trợ"
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-700/30 transition-all text-gray-900"
                />
                <button 
                  type="submit" 
                  disabled={sending || !inputText.trim()}
                  aria-label="Gửi tin nhắn"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${inputText.trim() ? 'bg-brand-700 text-white hover:bg-brand-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
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
