import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, MessageCircle, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext'; // Lấy thông tin Admin thật từ Context
import { toast } from 'sonner';

const MessageManager = () => {
  const { user } = useAuth(); // Lấy thông tin Admin đang đăng nhập
  const [conversations, setConversations] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const { socket } = useNotification();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch all Tickets on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axiosClient.get('/messages/conversations');
        if (res.data.success) {
          setConversations(res.data.conversations);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Không thể tải danh sách cuộc trò chuyện!");
      }
    };
    fetchConversations();
  }, []);

  // KHẮC PHỤC LỖI MẤT TIN NHẮN: Chỉ fetch lại khi ID Ticket thay đổi
  useEffect(() => {
    if (!selectedTicket?._id) return;

    const fetchHistory = async () => {
      try {
        const res = await axiosClient.get(`/messages/${selectedTicket._id}`);
        if (res.data.success) {
          setMessages(res.data.messages);
          // Đánh dấu đã đọc ở UI Local
          setConversations(prev => prev.map(c => 
            c._id === selectedTicket._id ? { ...c, unreadCount: 0 } : c
          ));
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };
    fetchHistory();
  }, [selectedTicket?._id]); 

  // Listen to Socket Events
  useEffect(() => {
    if (!socket) return;

    // Khi có tin nhắn mới
    const handleReceiveMessage = (newMessage) => {
      // 1. Cập nhật vào khung chat nếu đang mở đúng Ticket
      if (selectedTicket && newMessage.conversationId === selectedTicket._id) {
        setMessages(prev => [...prev, newMessage]);
      }
      
      // 2. Cập nhật list bên trái (nổi lên đầu, tăng unread)
      setConversations(prev => {
        let updated = [...prev];
        const idx = updated.findIndex(c => c._id === newMessage.conversationId);
        
        if (idx > -1) {
          updated[idx].lastMessage = newMessage;
          updated[idx].updatedAt = new Date().toISOString();
          if (!selectedTicket || selectedTicket._id !== newMessage.conversationId) {
            if (newMessage.sender === 'customer') {
               updated[idx].unreadCount = (updated[idx].unreadCount || 0) + 1;
            }
          }
          // Đưa lên đầu
          const [item] = updated.splice(idx, 1);
          updated.unshift(item);
        }
        return updated;
      });
    };

    // Khi có Khách hàng mới gửi tin nhắn lần đầu -> Sinh Ticket mới
    const handleNewTicket = (newTicket) => {
        axiosClient.get('/messages/conversations').then(res => {
            if (res.data.success) setConversations(res.data.conversations);
        });
        toast.info(`Có một yêu cầu hỗ trợ mới: ${newTicket.ticketId}`);
    };

    // Khi một Ticket bị đổi trạng thái (Admin nhận / Đóng) -> Hiển thị tên Admin
    const handleTicketUpdated = (updatedTicket) => {
        setConversations(prev => prev.map(c => 
            c._id === updatedTicket._id ? { ...c, status: updatedTicket.status, assignedAdminId: updatedTicket.assignedAdminId } : c
        ));
        
        // Cập nhật lại UI của selectedTicket mà không làm mất object cũ
        setSelectedTicket(prev => {
            if (prev && prev._id === updatedTicket._id) {
                return { ...prev, status: updatedTicket.status, assignedAdminId: updatedTicket.assignedAdminId };
            }
            return prev;
        });
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('new_ticket_created', handleNewTicket);
    socket.on('ticket_updated', handleTicketUpdated);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('new_ticket_created', handleNewTicket);
      socket.off('ticket_updated', handleTicketUpdated);
    };
  }, [socket, selectedTicket]);

  // --- HÀM XỬ LÝ SỰ KIỆN CHÍNH ---

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedTicket || !socket || !user) return;

    const messageData = {
      conversationId: selectedTicket._id,
      customerId: selectedTicket.customer._id,
      adminId: user._id,
      sender: 'admin',
      text: inputText.trim()
    };

    socket.emit('send_message', messageData, (response) => {
      if (response && !response.success) {
        toast.error(response.message);
      } else {
        setInputText(''); 
      }
    });
  };

  const handleClaimSession = () => {
    if (!window.confirm("Bạn có chắc chắn muốn tham gia hỗ trợ khách hàng này?")) return;
    socket.emit('claim_session', {
      conversationId: selectedTicket._id,
      customerId: selectedTicket.customer._id,
      adminId: user._id,
      adminName: user.name || "Admin"
    }, (res) => {
      if (res && !res.success) {
        toast.error(res.message);
      } else {
        toast.success("Đã tham gia hỗ trợ khách hàng thành công!");
      }
    });
  };

  const handleEndSession = () => {
    if (window.confirm("Xác nhận kết thúc phiên hỗ trợ?")) {
      socket.emit('end_session', { 
          conversationId: selectedTicket._id,
          customerId: selectedTicket.customer._id 
      });
      toast.info(`Đã đóng phiên trò chuyện ${selectedTicket.ticketId}.`);
    }
  };

  // --- RENDER HELPERS ---

  // Lọc Ticket theo thanh tìm kiếm
  const filteredConversations = conversations.filter(c => 
    c.ticketId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
      switch(status) {
          case 'pending': return <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/30">Đang chờ</span>;
          case 'active': return <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30">Đang xử lý</span>;
          case 'resolved': return <span className="bg-gray-500/20 text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-gray-500/30">Đã xong</span>;
          default: return null;
      }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-[#14141b] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
      
      {/* Left Sidebar: Conversations List */}
      <div className="w-[350px] border-r border-gray-800 flex flex-col bg-[#1a1a24]">
        <div className="p-5 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">Hỗ trợ khách hàng</h2>
          {/* Thanh tìm kiếm */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Tìm mã vé, tên khách hàng..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#2a2a35] text-sm text-gray-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[#7294ff] border border-gray-700 transition-colors placeholder-gray-500"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
             <p className="text-gray-500 text-center mt-10 text-sm">Không tìm thấy cuộc trò chuyện nào.</p>
          ) : (
            filteredConversations.map((conv) => (
              <div 
                key={conv._id}
                onClick={() => setSelectedTicket(conv)}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${selectedTicket?._id === conv._id ? 'bg-[#7294ff]/10 border border-[#7294ff]/30' : 'hover:bg-[#2a2a35] border border-transparent'}`}
              >
                <div className="relative shrink-0">
                  {conv.customer?.avatar ? (
                    <img src={conv.customer.avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-gray-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center border-2 border-gray-700">
                      <UserIcon className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#1a1a24]">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-200 text-sm truncate pr-2">{conv.customer?.name}</h4>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[#7294ff]">{conv.ticketId}</span>
                      {getStatusBadge(conv.status)}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {conv.lastMessage ? (
                      conv.lastMessage.sender === 'admin' ? `Bạn: ${conv.lastMessage.text}` :
                      conv.lastMessage.sender === 'system' ? `[Hệ thống]: ${conv.lastMessage.text}` :
                      conv.lastMessage.text
                    ) : 'Chưa có tin nhắn'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Content: Chat Area */}
      <div className="flex-1 flex flex-col bg-[#14141b]">
        {selectedTicket ? (
          <>
            {/* Header Chat */}
            <div className="h-[76px] px-6 border-b border-gray-800 flex justify-between items-center bg-[#1a1a24]">
              <div className="flex items-center gap-4">
                {selectedTicket.customer?.avatar ? (
                  <img src={selectedTicket.customer.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                      {selectedTicket.customer?.name}
                      <span className="text-sm font-normal text-gray-400">({selectedTicket.ticketId})</span>
                  </h3>
                  {/* HIỂN THỊ TRẠNG THÁI VÀ TÊN ADMIN XỊN XÒ */}
                  <div className="text-xs flex items-center gap-2 mt-0.5">
                      {selectedTicket.status === 'pending' && <span className="text-yellow-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Đang chờ hỗ trợ</span>}
                      {selectedTicket.status === 'active' && <span className="text-blue-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Đang xử lý {selectedTicket.assignedAdminId?.name ? `bởi ${selectedTicket.assignedAdminId.name}` : ''}</span>}
                      {selectedTicket.status === 'resolved' && <span className="text-gray-500 flex items-center gap-1"> Đã kết thúc {selectedTicket.assignedAdminId?.name ? `(Hỗ trợ bởi: ${selectedTicket.assignedAdminId.name})` : ''}</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {selectedTicket.status === 'pending' && (
                  <button onClick={handleClaimSession} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Nhận hỗ trợ
                  </button>
                )}
                {selectedTicket.status === 'active' && (
                  <button onClick={handleEndSession} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Kết thúc phiên
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
                  {msg.sender === 'system' ? (
                    <div className="w-full text-center">
                      <span className="bg-[#2a2a35] text-gray-400 text-xs py-1.5 px-4 rounded-full inline-block border border-gray-800">
                        {msg.text}
                      </span>
                    </div>
                  ) : (
                    <div className={`max-w-[70%] ${msg.sender === 'customer' ? 'bg-[#2a2a35] text-gray-200 rounded-2xl rounded-tl-sm' : 'bg-[#7294ff] text-white rounded-2xl rounded-tr-sm'} p-4 shadow-md`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <span className={`text-[10px] mt-2 block ${msg.sender === 'customer' ? 'text-gray-500' : 'text-blue-200'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#1a1a24] border-t border-gray-800">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={selectedTicket.status === 'resolved' ? "Phiên này đã đóng..." : `Nhắn tin cho ${selectedTicket.customer?.name}...`}
                  disabled={selectedTicket.status === 'resolved'}
                  className="flex-1 bg-[#2a2a35] text-white rounded-xl px-5 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-[#7294ff] border border-gray-700 transition-shadow placeholder-gray-500 disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim() || selectedTicket.status === 'resolved'}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${inputText.trim() && selectedTicket.status !== 'resolved' ? 'bg-[#7294ff] text-white hover:bg-[#5a7bed]' : 'bg-transparent text-gray-500'}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageCircle className="w-16 h-16 text-gray-700 mb-4" />
            <p className="text-lg">Chọn một vé hỗ trợ để bắt đầu trò chuyện</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageManager;