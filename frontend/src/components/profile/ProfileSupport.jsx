import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, LifeBuoy, MessageSquare } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { PurchaseAlert, PurchaseLoading } from '../purchase/PurchaseUI';
import { dateTime } from '../purchase/purchaseFormat';
import { ProfileEmpty, ProfilePagination, ProfileRefresh } from './ProfileUI';
import useProfileResource from './useProfileResource';

function TicketMessages({ ticketId }) {
  const [messages, setMessages] = useState([]);
  const [before, setBefore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [olderLoading, setOlderLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const life = useRef(null);
  const lock = useRef(false);
  const container = useRef(null);
  const scroll = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    life.current = controller;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const response = await axiosClient.get('/messages/' + ticketId, { signal: controller.signal });
        if (controller.signal.aborted) return;
        scroll.current = null;
        setMessages(response.data.messages || []); setBefore(response.data.nextBefore || null);
      } catch (failure) { if (!controller.signal.aborted) setError(failure.response?.data?.message || 'Chưa tải được tin nhắn.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [ticketId, version]);
  useLayoutEffect(() => {
    if (!container.current) return;
    const element = container.current;
    element.scrollTop = scroll.current ? element.scrollHeight - scroll.current.height + scroll.current.top : element.scrollHeight;
    scroll.current = null;
  }, [messages, loading]);
  const loadOlder = async () => {
    if (!before || lock.current) return;
    lock.current = true; setOlderLoading(true); setError('');
    const controller = life.current;
    try {
      const response = await axiosClient.get('/messages/' + ticketId, { params: { before }, signal: controller.signal });
      if (controller.signal.aborted) return;
      scroll.current = container.current ? { height: container.current.scrollHeight, top: container.current.scrollTop } : null;
      setMessages(previous => Array.from(new Map([...(response.data.messages || []), ...previous].map(message => [message._id, message])).values()));
      setBefore(response.data.nextBefore || null);
    } catch (failure) { if (!controller.signal.aborted) setError(failure.response?.data?.message || 'Chưa tải được tin nhắn cũ.'); }
    finally { lock.current = false; if (!controller.signal.aborted) setOlderLoading(false); }
  };
  return <div className="profile-ticket-content">{loading ? <PurchaseLoading /> : <>
    {error && <PurchaseAlert onRetry={messages.length && before ? loadOlder : () => setVersion(value => value + 1)} busy={olderLoading}>{error}</PurchaseAlert>}
    <div className="profile-message-toolbar">{before && <button type="button" className="purchase-text-button" onClick={loadOlder} disabled={olderLoading}>{olderLoading ? 'Đang tải…' : 'Xem tin nhắn cũ hơn'}</button>}<button type="button" className="purchase-text-button" disabled={olderLoading} onClick={() => setVersion(value => value + 1)}>Cập nhật hội thoại</button></div>
    {!messages.length && !error ? <p className="profile-message-empty">Chưa có tin nhắn trong phiên này.</p> : <div className="profile-messages" ref={container} role="region" aria-label="Nội dung hội thoại" tabIndex={0}>{messages.map(message => message.sender === 'system' ? <p key={message._id} className="profile-system-message">{message.text}</p> : <div key={message._id} className={'profile-message' + (message.sender === 'customer' ? ' profile-message-own' : '')}><div><span>{message.sender === 'customer' ? 'Bạn' : 'Nhân viên hỗ trợ'}</span><p>{message.text}</p><time dateTime={message.createdAt}>{dateTime(message.createdAt)}</time></div></div>)}</div>}
    <p className="purchase-muted profile-history-note">Đây là lịch sử trao đổi. Mở khung chat hỗ trợ để tiếp tục trò chuyện.</p>
  </>}</div>;
}

export default function ProfileSupport({ userId }) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const { data, error, loading, refresh } = useProfileResource('/messages/customer-tickets/' + userId + '?page=' + page + '&limit=6');
  const statuses = { pending: 'Đang chờ', active: 'Đang hỗ trợ', resolved: 'Đã đóng' };
  return <div className="purchase-stack"><div className="profile-section-title"><div><h2>Lịch sử hỗ trợ</h2><p>Xem lại các trao đổi giữa bạn và cửa hàng.</p></div><ProfileRefresh busy={loading} onClick={refresh} /></div>
    <div className="profile-help-banner"><LifeBuoy size={24} /><div><strong>Cửa hàng luôn sẵn sàng lắng nghe</strong><p>Mở khung chat trên trang hoặc xem thông tin liên hệ.</p></div><Link to="/contact" className="cart-button cart-button-outline">Liên hệ <ArrowRight size={14} /></Link></div>
    {loading ? <PurchaseLoading /> : error ? <PurchaseAlert onRetry={refresh}>{error}</PurchaseAlert> : !data?.conversations?.length ? <div className="purchase-card"><ProfileEmpty icon={MessageSquare} title="Chưa có cuộc trò chuyện" description="Khi bạn liên hệ qua khung chat hỗ trợ, lịch sử trao đổi sẽ xuất hiện tại đây." /></div> : <>
      <p className="profile-result-count">{data.totalCount} phiên hỗ trợ</p>
      {data.conversations.map(ticket => <article key={ticket._id} className="profile-ticket"><button type="button" className="profile-ticket-toggle" aria-expanded={expandedId === ticket._id} aria-controls={'ticket-' + ticket._id} onClick={() => setExpandedId(previous => previous === ticket._id ? null : ticket._id)}><span className="profile-ticket-icon"><MessageSquare size={20} /></span><span className="profile-ticket-title"><strong>{ticket.ticketId || 'Phiên #' + ticket._id.slice(-6).toUpperCase()}</strong><time dateTime={ticket.createdAt}>{dateTime(ticket.createdAt)}</time></span><span className={'profile-status profile-status-' + ticket.status}>{statuses[ticket.status] || 'Đang cập nhật'}</span><ChevronDown size={17} className={expandedId === ticket._id ? 'profile-chevron-open' : ''} /></button>{expandedId === ticket._id && <div id={'ticket-' + ticket._id}><TicketMessages ticketId={ticket._id} /></div>}</article>)}
      <ProfilePagination page={data.currentPage || page} totalPages={data.totalPages || 1} onChange={next => { setPage(next); setExpandedId(null); }} />
    </>}
  </div>;
}
