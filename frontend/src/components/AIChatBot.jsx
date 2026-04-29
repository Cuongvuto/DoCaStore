import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Trash2, Sparkles, ChevronDown } from 'lucide-react';
import axiosClient from '../api/axiosClient';

// ── Quick-reply suggestions shown at start ──────────────────────────────────
const QUICK_REPLIES = [
  "🚚 Chính sách giao hàng?",
  "🔄 Đổi trả hàng như thế nào?",
  "🎣 Cần câu lure loại nào tốt?",
  "🐟 Mồi câu cá lóc nhạy nhất?",
  "💳 Phương thức thanh toán?",
  "🏷️ Tôi có mã giảm giá, dùng thế nào?",
];

// ── Typing dots animation component ─────────────────────────────────────────
const TypingDots = () => (
  <div className="ai-chat-bubble ai-chat-bubble--bot">
    <span className="ai-typing-dot" style={{ animationDelay: '0ms' }} />
    <span className="ai-typing-dot" style={{ animationDelay: '150ms' }} />
    <span className="ai-typing-dot" style={{ animationDelay: '300ms' }} />
  </div>
);

// ── Simple markdown-to-JSX renderer (bold, newlines) ─────────────────────────
const renderBotText = (text) => {
  const lines = text.split('\n').filter(Boolean);
  return lines.map((line, i) => {
    // Replace **text** with <strong>
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} style={{ margin: '2px 0' }}>
        {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
      </p>
    );
  });
};

// ─────────────────────────────────────────────────────────────────────────────
const AIChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: 'user'|'bot', text: string }
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewMsg, setHasNewMsg] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasNewMsg(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const sendMessage = async (text) => {
    const trimmed = text?.trim();
    if (!trimmed || isTyping) return;

    const userMsg = { role: 'user', text: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsTyping(true);

    // Build history excluding the newest message (already sent as `message`)
    const history = messages.map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await axiosClient.post('/chat', { message: trimmed, history });
      const botText = res.data?.reply || 'Xin lỗi, Doca không hiểu câu hỏi này. Bạn thử hỏi lại nhé! 🎣';
      setMessages((prev) => [...prev, { role: 'bot', text: botText }]);

      if (!isOpen) setHasNewMsg(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: '😔 Doca đang gặp sự cố. Vui lòng thử lại sau!' },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleQuickReply = (text) => sendMessage(text);

  const handleClear = () => {
    if (window.confirm('Xóa toàn bộ cuộc trò chuyện?')) {
      setMessages([]);
    }
  };

  return (
    <>
      {/* ── Styles ─────────────────────────────────────────────────────────── */}
      <style>{`
        /* ===== CONTAINER ===== */
        .ai-chat-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        }

        /* ===== TOGGLE BUTTON ===== */
        .ai-chat-fab {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5a8c76 0%, #3d6b56 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(90,140,118,0.45);
          transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
          position: relative;
          outline: none;
        }
        .ai-chat-fab:hover {
          transform: scale(1.1) rotate(-5deg);
          box-shadow: 0 6px 28px rgba(90,140,118,0.6);
        }
        .ai-chat-fab-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: rgba(90,140,118,0.3);
          animation: ai-pulse 2s ease-in-out infinite;
        }
        @keyframes ai-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 0; }
        }
        .ai-chat-fab-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid white;
          animation: ai-badge-pop 0.3s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes ai-badge-pop {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }

        /* ===== PANEL ===== */
        .ai-chat-panel {
          position: absolute;
          bottom: 68px;
          right: 0;
          width: 360px;
          max-height: calc(100vh - 120px);
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
          overflow: hidden;
          animation: ai-panel-in 0.35s cubic-bezier(.34,1.56,.64,1);
          transform-origin: bottom right;
        }
        @keyframes ai-panel-in {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ===== HEADER ===== */
        .ai-chat-header {
          background: linear-gradient(135deg, #5a8c76 0%, #3d6b56 100%);
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .ai-chat-header-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ai-chat-header-info { flex: 1; }
        .ai-chat-header-name {
          font-weight: 700;
          font-size: 15px;
          color: #fff;
          line-height: 1.2;
        }
        .ai-chat-header-status {
          font-size: 11px;
          color: rgba(255,255,255,0.75);
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        .ai-chat-header-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #86efac;
          animation: ai-blink 1.8s ease-in-out infinite;
        }
        @keyframes ai-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .ai-chat-header-actions {
          display: flex;
          gap: 6px;
        }
        .ai-chat-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: background 0.2s;
        }
        .ai-chat-icon-btn:hover { background: rgba(255,255,255,0.28); }

        /* ===== MESSAGES ===== */
        .ai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #f8faf9;
          min-height: 200px;
          max-height: 340px;
        }
        .ai-chat-messages::-webkit-scrollbar { width: 4px; }
        .ai-chat-messages::-webkit-scrollbar-track { background: transparent; }
        .ai-chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

        /* ===== WELCOME ===== */
        .ai-chat-welcome {
          text-align: center;
          padding: 12px 8px;
        }
        .ai-chat-welcome-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5a8c76, #3d6b56);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
        }
        .ai-chat-welcome h4 {
          font-size: 15px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 4px;
        }
        .ai-chat-welcome p {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        /* ===== QUICK REPLIES ===== */
        .ai-chat-quick-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 0 16px 4px;
          flex-shrink: 0;
        }
        .ai-chat-chip {
          padding: 6px 12px;
          border-radius: 20px;
          border: 1.5px solid #5a8c76;
          background: transparent;
          color: #5a8c76;
          font-size: 11.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
        }
        .ai-chat-chip:hover {
          background: #5a8c76;
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(90,140,118,0.3);
        }

        /* ===== BUBBLES ===== */
        .ai-chat-row {
          display: flex;
          flex-direction: column;
          animation: ai-msg-in 0.25s ease-out;
        }
        @keyframes ai-msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ai-chat-row--user { align-items: flex-end; }
        .ai-chat-row--bot  { align-items: flex-start; }

        .ai-chat-bubble {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 18px;
          font-size: 13.5px;
          line-height: 1.55;
          word-break: break-word;
        }
        .ai-chat-bubble--user {
          background: linear-gradient(135deg, #5a8c76, #3d6b56);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .ai-chat-bubble--bot {
          background: white;
          color: #1f2937;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ai-chat-time {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 3px;
          padding: 0 4px;
        }

        /* ===== TYPING DOTS ===== */
        .ai-typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #9ca3af;
          display: inline-block;
          margin: 2px 2px;
          animation: ai-typing-bounce 1s ease-in-out infinite;
        }
        @keyframes ai-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%           { transform: translateY(-8px); }
        }

        /* ===== INPUT BAR ===== */
        .ai-chat-inputbar {
          padding: 12px 14px;
          border-top: 1px solid #f0f0f0;
          background: white;
          flex-shrink: 0;
        }
        .ai-chat-inputform {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f3f4f6;
          border-radius: 24px;
          padding: 6px 6px 6px 16px;
          transition: box-shadow 0.2s;
        }
        .ai-chat-inputform:focus-within {
          box-shadow: 0 0 0 2px rgba(90,140,118,0.25);
          background: white;
        }
        .ai-chat-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 13.5px;
          outline: none;
          color: #1f2937;
          min-width: 0;
        }
        .ai-chat-input::placeholder { color: #9ca3af; }
        .ai-chat-send-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5a8c76, #3d6b56);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          color: white;
        }
        .ai-chat-send-btn:disabled {
          background: #e5e7eb;
          cursor: not-allowed;
          color: #9ca3af;
        }
        .ai-chat-send-btn:not(:disabled):hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(90,140,118,0.4);
        }

        /* ===== FOOTER LABEL ===== */
        .ai-chat-footer-label {
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
          padding: 0 0 6px;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 480px) {
          .ai-chat-widget { bottom: 16px; right: 16px; }
          .ai-chat-panel  { width: calc(100vw - 32px); right: 0; }
        }
      `}</style>

      {/* ── Widget ──────────────────────────────────────────────────────────── */}
      <div className="ai-chat-widget">

        {/* Panel */}
        {isOpen && (
          <div className="ai-chat-panel" role="dialog" aria-label="Trợ lý AI DoCaStore">

            {/* Header */}
            <div className="ai-chat-header">
              <div className="ai-chat-header-avatar">
                <Bot size={20} color="white" />
              </div>
              <div className="ai-chat-header-info">
                <div className="ai-chat-header-name">Doca AI 🎣</div>
                <div className="ai-chat-header-status">
                  <span className="ai-chat-header-status-dot" />
                  Trợ lý ảo · Phản hồi ngay
                </div>
              </div>
              <div className="ai-chat-header-actions">
                {messages.length > 0 && (
                  <button className="ai-chat-icon-btn" onClick={handleClear} title="Xóa cuộc trò chuyện">
                    <Trash2 size={15} />
                  </button>
                )}
                <button className="ai-chat-icon-btn" onClick={() => setIsOpen(false)} title="Đóng">
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="ai-chat-messages">
              {messages.length === 0 ? (
                <div className="ai-chat-welcome">
                  <div className="ai-chat-welcome-icon">
                    <Sparkles size={24} color="white" />
                  </div>
                  <h4>Xin chào! Tôi là Doca 👋</h4>
                  <p>Trợ lý AI của DoCaStore sẵn sàng giúp bạn mọi thắc mắc về dụng cụ đi câu, đơn hàng và kinh nghiệm dòng cá!</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`ai-chat-row ai-chat-row--${msg.role}`}>
                    <div className={`ai-chat-bubble ai-chat-bubble--${msg.role}`}>
                      {msg.role === 'bot' ? renderBotText(msg.text) : msg.text}
                    </div>
                    <span className="ai-chat-time">
                      {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}

              {isTyping && (
                <div className="ai-chat-row ai-chat-row--bot">
                  <TypingDots />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies — only when no conversation yet */}
            {messages.length === 0 && !isTyping && (
              <div className="ai-chat-quick-replies">
                {QUICK_REPLIES.map((q) => (
                  <button key={q} className="ai-chat-chip" onClick={() => handleQuickReply(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div className="ai-chat-inputbar">
              <form className="ai-chat-inputform" onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  className="ai-chat-input"
                  type="text"
                  placeholder="Nhập câu hỏi..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isTyping}
                  aria-label="Nhập tin nhắn"
                />
                <button
                  type="submit"
                  className="ai-chat-send-btn"
                  disabled={!inputText.trim() || isTyping}
                  aria-label="Gửi"
                >
                  <Send size={15} style={{ marginLeft: '2px' }} />
                </button>
              </form>
            </div>

            <div className="ai-chat-footer-label">Powered by Gemini AI · DoCaStore</div>
          </div>
        )}

        {/* FAB Toggle Button */}
        <button
          id="ai-chatbot-toggle-btn"
          className="ai-chat-fab"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
        >
          {!isOpen && <span className="ai-chat-fab-pulse" />}
          {hasNewMsg && !isOpen && <span className="ai-chat-fab-badge" />}
          {isOpen ? (
            <X size={22} color="white" />
          ) : (
            <Bot size={22} color="white" />
          )}
        </button>
      </div>
    </>
  );
};

export default AIChatBot;
