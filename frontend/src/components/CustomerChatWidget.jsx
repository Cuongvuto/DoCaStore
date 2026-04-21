import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
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
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0); // Reset unread when opened
    }
  }, [messages, isOpen]);

  // Fetch initial history
  useEffect(() => {
    if (user && isOpen && messages.length === 0) {
      const fetchHistory = async () => {
        try {
          const res = await axiosClient.get(`/messages/${user._id}`);
          if (res.data.success) {
            setMessages(res.data.messages);
          }
        } catch (error) {
          console.error('Lỗi tải lịch sử chat:', error);
        }
      };
      fetchHistory();
    }
  }, [user, isOpen]);

  // Listen to incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage) => {
      // Only append if it belongs to this customer's room
      if (newMessage.customerId === user?._id) {
        setMessages((prev) => [...prev, newMessage]);
        // If chat is not open and sender is admin, increment badge
        if (!isOpen && newMessage.sender === 'admin') {
          setUnreadCount(prev => prev + 1);
        }
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, user, isOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !socket) return;

    const messageData = {
      customerId: user._id,
      sender: 'customer',
      text: inputText.trim()
    };

    socket.emit('send_message', messageData);
    setInputText('');
  };

  // Do not show widget for admins to avoid confusion
  if (user?.role && user.role !== 'customer') return null;

  return (
    <>
      {/* Header Icon Button */}
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

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed top-20 right-4 sm:right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 border border-gray-100" style={{ height: '500px', maxHeight: 'calc(100vh - 100px)' }}>
          {/* Header */}
          <div className="bg-[#5a8c76] p-4 text-white flex items-center justify-between shadow-md z-10 shrink-0">
            <div>
              <h3 className="font-bold text-lg">Hỗ trợ khách hàng</h3>
              <p className="text-sm opacity-80">Chúng tôi sẽ phản hồi sớm nhất!</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="opacity-80 hover:opacity-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
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
              messages.map((msg, idx) => (
                <div key={msg._id || idx} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${msg.sender === 'customer' ? 'bg-[#5a8c76] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                    <p className="text-sm">{msg.text}</p>
                    <span className={`text-[10px] mt-1 block ${msg.sender === 'customer' ? 'text-gray-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {user && (
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
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
          )}
        </div>
      )}
    </>
  );
};

export default CustomerChatWidget;
