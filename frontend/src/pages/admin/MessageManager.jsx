import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, MessageCircle, Search, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext'; // Lấy thông tin Admin thật từ Context
import { Pagination, ErrorState, LoadingState } from './components/AdminUI';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { toast } from 'sonner';

const MessageManager = () => {
  const { user } = useAuth(); // Lấy thông tin Admin đang đăng nhập
  const [conversations, setConversations] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [paging, setPaging] = useState({ totalPages: 1, totalCount: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [version, setVersion] = useState(0);
  const [historyError, setHistoryError] = useState('');
  const [historyVersion, setHistoryVersion] = useState(0);
  const [before, setBefore] = useState(null);
  const [olderLoading, setOlderLoading] = useState(false);
  const activeTicket = useRef(null);
  const olderScroll = useRef(false);
  const search = useDebouncedValue(searchTerm, 300);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { socket } = useNotification();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (olderScroll.current) { olderScroll.current = false; return; }
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const controller = new AbortController();
    setListLoading(true); setListError('');
    axiosClient.get('/messages/conversations', { params: { page, limit: 10, search }, signal: controller.signal })
      .then(res => { if (!controller.signal.aborted) { setConversations(res.data.conversations); setPaging(res.data); } })
      .catch(error => { if (!controller.signal.aborted) setListError(error.response?.data?.message || 'Không thể tải hội thoại.'); })
      .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    return () => controller.abort();
  }, [page, search, version]);

  const loadOlder = async () => {
    if (!before || olderLoading) return;
    const ticket = selectedTicket._id; setOlderLoading(true);
    try {
      const res = await axiosClient.get('/messages/' + ticket, { params: { before } });
      if (activeTicket.current !== ticket) return;
      olderScroll.current = true;
      setMessages(previous => Array.from(new Map([...res.data.messages, ...previous].map(message => [message._id, message])).values()));
      setBefore(res.data.nextBefore);
    } catch { toast.error('Không thể tải tin nhắn cũ.'); }
    finally { setOlderLoading(false); }
  };

  // KHẮC PHỤC LỖI MẤT TIN NHẮN: Chỉ fetch lại khi ID Ticket thay đổi
  useEffect(() => {
    if (!selectedTicket?._id) return;

    activeTicket.current = selectedTicket._id;
    setBefore(null); setHistoryError('');
    const controller = new AbortController();
    const fetchHistory = async () => {
      try {
        const res = await axiosClient.get(`/messages/${selectedTicket._id}`, { signal: controller.signal });
        if (res.data.success && !controller.signal.aborted) {
          setBefore(res.data.nextBefore);
          setMessages(previous => Array.from(new Map([...res.data.messages, ...previous.filter(message => message.conversationId === selectedTicket._id)].map(message => [message._id, message])).values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
          // Đánh dấu đã đọc ở UI Local
          setVersion(value => value + 1);
        }
      } catch {
        if (!controller.signal.aborted) setHistoryError('Không thể tải lịch sử trò chuyện.');
      }
    };
    fetchHistory();
    return () => { activeTicket.current = null; controller.abort(); };
  }, [selectedTicket?._id, historyVersion]);

  // Listen to Socket Events
  useEffect(() => {
    if (!socket) return;

    // Khi có tin nhắn mới
    const handleReceiveMessage = (newMessage) => {
      // 1. Cập nhật vào khung chat nếu đang mở đúng Ticket
      if (selectedTicket && newMessage.conversationId === selectedTicket._id) {
        setMessages(prev => prev.some(message => message._id === newMessage._id) ? prev : [...prev, newMessage]);
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
        setVersion(value => value + 1);
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

  const canReply = selectedTicket?.status === 'active' && (user?.role === 'superadmin' || selectedTicket?.assignedAdminId?._id === user?._id);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedTicket || !socket || !user || !canReply || sending) return;
    if (!socket.connected) return toast.error('Mất kết nối hỗ trợ. Vui lòng thử lại.');
    setSending(true);

    const messageData = {
      conversationId: selectedTicket._id,
      customerId: selectedTicket.customer?._id,
      adminId: user._id,
      sender: 'admin',
      text: inputText.trim()
    };

    socket.timeout(10000).emit('send_message', messageData, (error, response) => {
      setSending(false);
      if (error) return toast.error('Chưa nhận được xác nhận gửi. Hãy kiểm tra hội thoại trước khi gửi lại.');
      if (response && !response.success) {
        toast.error(response.message);
      } else {
        setInputText('');
      }
    });
  };

  const handleClaimSession = () => {
    if (!socket?.connected) return toast.error("Mất kết nối hỗ trợ. Vui lòng thử lại.");
    if (!window.confirm("Nhận xử lý yêu cầu hỗ trợ này?")) return;
    socket.emit('claim_session', {
      conversationId: selectedTicket._id,
      customerId: selectedTicket.customer?._id,
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
    if (!socket?.connected) return toast.error('Mất kết nối hỗ trợ. Vui lòng thử lại.');
    if (window.confirm("Xác nhận kết thúc phiên hỗ trợ?")) {
      socket.emit('end_session', {
          conversationId: selectedTicket._id,
          customerId: selectedTicket.customer._id
      }, response => {
        if (response?.success) toast.info('Đã kết thúc phiên hỗ trợ.');
        else toast.error(response?.message || 'Không thể kết thúc phiên hỗ trợ.');
      });
    }
  };

  // --- RENDER HELPERS ---

  // Lọc Ticket theo thanh tìm kiếm
  const filteredConversations = conversations;

  const getStatusBadge = (status) => {
      switch(status) {
          case 'pending': return <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/30">Đang chờ</span>;
          case 'active': return <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30">Đang xử lý</span>;
          case 'resolved': return <span className="bg-gray-500/20 text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-gray-500/30">Đã xong</span>;
          default: return null;
      }
  };

  return (
    <div className="flex h-[calc(100dvh-150px)] min-h-[450px] bg-[#101514] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">

      {/* Left Sidebar: Conversations List */}
      <div className={(selectedTicket ? "hidden md:flex " : "flex ") + "w-full md:w-80 shrink-0 border-r border-gray-800 flex-col bg-[#19211f]"}>
        <div className="p-5 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">Hỗ trợ khách hàng</h2>
          {/* Thanh tìm kiếm */}
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm mã vé, tên khách hàng..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full bg-[#202c28] text-sm text-gray-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[#88d7ae] border border-gray-700 transition-colors placeholder-gray-500"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {listError ? <ErrorState message={listError} onRetry={() => setVersion(value => value + 1)} /> : listLoading ? <LoadingState /> : filteredConversations.length === 0 ? (
             <p className="text-gray-500 text-center mt-10 text-sm">Không tìm thấy cuộc trò chuyện nào.</p>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv._id}
                role="button"
                tabIndex={0}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setMessages([]); setSelectedTicket(conv); } }}
                onClick={() => { setMessages([]); setSelectedTicket(conv); }}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${selectedTicket?._id === conv._id ? 'bg-[#88d7ae]/10 border border-[#88d7ae]/30' : 'hover:bg-[#202c28] border border-transparent'}`}
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
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#19211f]">
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
                      <span className="text-xs font-mono text-[#88d7ae]">{conv.ticketId}</span>
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
        <Pagination page={page} pages={paging.totalPages} total={paging.totalCount} loading={listLoading} onChange={setPage} />
      </div>

      {/* Right Content: Chat Area */}
      <div className={(selectedTicket ? "flex " : "hidden md:flex ") + "flex-1 min-w-0 flex-col bg-[#101514]"}>
        {selectedTicket ? (
          <>
            {/* Header Chat */}
            <button className="admin-button admin-chat-back m-3 self-start" onClick={() => setSelectedTicket(null)}><ArrowLeft size={16} />Danh sách yêu cầu</button>
            <div className="min-h-[76px] px-3 py-3 border-b border-gray-800 flex flex-wrap gap-3 justify-between items-center bg-[#19211f]">
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
                {canReply && (
                  <button onClick={handleEndSession} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Kết thúc phiên
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {historyError && <ErrorState message={historyError} onRetry={() => setHistoryVersion(value => value + 1)} />}
              {before && <button className="admin-button" disabled={olderLoading} onClick={loadOlder}>{olderLoading ? 'Đang tải…' : 'Tải tin nhắn cũ'}</button>}
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
                  {msg.sender === 'system' ? (
                    <div className="w-full text-center">
                      <span className="bg-[#202c28] text-gray-400 text-xs py-1.5 px-4 rounded-full inline-block border border-gray-800">
                        {msg.text}
                      </span>
                    </div>
                  ) : (
                    <div className={`max-w-[70%] ${msg.sender === 'customer' ? 'bg-[#202c28] text-gray-200 rounded-2xl rounded-tl-sm' : 'bg-[#88d7ae] text-[#10251a] rounded-2xl rounded-tr-sm'} p-4 shadow-md`}>
                      <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                      <span className={`text-[10px] mt-2 block ${msg.sender === 'customer' ? 'text-gray-500' : 'text-emerald-900'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#19211f] border-t border-gray-800">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={selectedTicket.status === 'resolved' ? "Phiên này đã đóng..." : !canReply ? "Nhận yêu cầu để trả lời khách hàng" : `Nhắn tin cho ${selectedTicket.customer?.name}...`}
                  disabled={!canReply || sending}
                  maxLength={2000}
                  aria-label="Nội dung trả lời khách hàng"
                  className="flex-1 bg-[#202c28] text-white rounded-xl px-5 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-[#88d7ae] border border-gray-700 transition-shadow placeholder-gray-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  aria-label="Gửi tin nhắn"
                  disabled={!inputText.trim() || !canReply || sending}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${inputText.trim() && selectedTicket.status !== 'resolved' ? 'bg-[#88d7ae] text-[#10251a] hover:bg-[#5a7bed]' : 'bg-transparent text-gray-500'}`}
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
