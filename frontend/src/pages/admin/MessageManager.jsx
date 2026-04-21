import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, MessageCircle } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useNotification } from '../../context/NotificationContext';

const MessageManager = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const { socket } = useNotification();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch all conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axiosClient.get('/messages/conversations');
        if (res.data.success) {
          setConversations(res.data.conversations);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };
    fetchConversations();
  }, []);

  // Fetch chat history when a customer is selected
  useEffect(() => {
    if (!selectedCustomer) return;

    const fetchHistory = async () => {
      try {
        const res = await axiosClient.get(`/messages/${selectedCustomer._id}`);
        if (res.data.success) {
          setMessages(res.data.messages);
          // Mark as read locally in the conversations list
          setConversations(prev => 
            prev.map(c => 
              c.customer._id === selectedCustomer._id 
                ? { ...c, unreadCount: 0 } 
                : c
            )
          );
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };
    fetchHistory();
  }, [selectedCustomer]);

  // Socket listener for new messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage) => {
      // If the message belongs to the currently open chat, append it
      if (selectedCustomer && newMessage.customerId === selectedCustomer._id) {
        setMessages((prev) => [...prev, newMessage]);
      } else {
        // If it belongs to someone else, update the unread count in the sidebar
        setConversations(prev => {
          const exists = prev.find(c => c.customer._id === newMessage.customerId);
          if (exists) {
            return prev.map(c => 
              c.customer._id === newMessage.customerId 
                ? { ...c, lastMessage: newMessage, unreadCount: c.unreadCount + 1 }
                : c
            ).sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
          } else {
            // Need to fetch full conversation list if it's a new customer
            window.location.reload(); 
            return prev;
          }
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    return () => socket.off('receive_message', handleReceiveMessage);
  }, [socket, selectedCustomer]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedCustomer || !socket) return;

    const messageData = {
      customerId: selectedCustomer._id,
      sender: 'admin',
      text: inputText.trim()
    };

    socket.emit('send_message', messageData);
    setInputText('');
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-[#202028] rounded-2xl overflow-hidden border border-gray-800">
      
      {/* Sidebar: Conversations List */}
      <div className="w-80 border-r border-gray-800 flex flex-col bg-[#1a1a24]">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Tin nhắn</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">Chưa có cuộc trò chuyện nào</p>
          ) : (
            conversations.map((conv) => (
              <div 
                key={conv.customer._id}
                onClick={() => setSelectedCustomer(conv.customer)}
                className={`p-4 border-b border-gray-800/50 cursor-pointer transition-colors flex items-center gap-3 ${selectedCustomer?._id === conv.customer._id ? 'bg-[#2a2a35]' : 'hover:bg-[#2a2a35]/50'}`}
              >
                <div className="w-12 h-12 rounded-full bg-gray-700 shrink-0 overflow-hidden relative">
                  {conv.customer.avatar ? (
                    <img src={conv.customer.avatar} alt={conv.customer.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400" />
                  )}
                  {conv.unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-[#1a1a24] rounded-full"></span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-gray-300'}`}>
                      {conv.customer.name}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {new Date(conv.lastMessage?.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                    {conv.lastMessage?.sender === 'admin' ? 'Bạn: ' : ''}{conv.lastMessage?.text}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">ID: {conv.customer._id.slice(-6).toUpperCase()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area: Chat Window */}
      <div className="flex-1 flex flex-col bg-[#202028]">
        {selectedCustomer ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center gap-3 bg-[#1a1a24]">
              <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                {selectedCustomer.avatar ? (
                  <img src={selectedCustomer.avatar} alt={selectedCustomer.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 mx-auto mt-2.5 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-white">{selectedCustomer.name}</h3>
                <p className="text-xs text-gray-400">ID: {selectedCustomer._id}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 my-auto">Chưa có tin nhắn nào</p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg._id || idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${msg.sender === 'admin' ? 'bg-[#7294ff] text-white rounded-tr-none' : 'bg-[#2a2a35] text-gray-200 rounded-tl-none border border-gray-700/50'}`}>
                      <p className="text-sm">{msg.text}</p>
                      <span className={`text-[10px] mt-1.5 block ${msg.sender === 'admin' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-[#1a1a24] border-t border-gray-800">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Nhắn tin cho ${selectedCustomer.name}...`}
                  className="flex-1 bg-[#2a2a35] text-white rounded-xl px-5 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-[#7294ff] border border-gray-700 transition-shadow placeholder-gray-500"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${inputText.trim() ? 'bg-[#7294ff] text-white hover:bg-[#5a7bed]' : 'bg-transparent text-gray-500'}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageCircle className="w-16 h-16 text-gray-700 mb-4" />
            <p className="text-lg">Chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default MessageManager;
