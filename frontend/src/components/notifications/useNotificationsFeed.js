import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import { useNotification } from '../../context/NotificationContext';

export default function useNotificationsFeed() {
  const { socket, unreadCount, fetchUnreadCount } = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [readingIds, setReadingIds] = useState([]);
  const [readError, setReadError] = useState(null);
  const request = useRef(null);
  const lifetime = useRef(null);
  const confirmedReads = useRef(new Set());
  const readLocks = useRef(new Set());
  const allLock = useRef(false);
  const eventVersion = useRef(0);

  const load = useCallback(async (nextPage = 1, replace = true) => {
    if (!replace && request.current) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const startVersion = eventVersion.current;
    if (replace) { setLoading(true); setLoadingMore(false); setError(''); }
    else { setLoadingMore(true); setMoreError(''); }
    try {
      const response = await axiosClient.get('/notifications', { params: { page: nextPage, limit: 10 }, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!Array.isArray(response.data?.data)) throw new Error('Invalid notification response');
      const rows = response.data.data.map(item => ({ ...item, isRead: item.isRead || confirmedReads.current.has(item._id) }));
      setItems(previous => Array.from(new Map([...(replace ? [] : previous), ...rows].map(item => [item._id, item])).values()));
      setPage(nextPage); setTotalPages(response.data.totalPages || 0); setMoreError('');
      if (replace && startVersion === eventVersion.current) setHasUpdates(false);
    } catch (failure) {
      if (!controller.signal.aborted) {
        const message = failure.response?.data?.message || 'Chưa thể tải thông báo. Vui lòng thử lại.';
        if (replace) setError(message); else setMoreError(message);
      }
    } finally {
      if (request.current === controller && !controller.signal.aborted) {
        request.current = null; setLoading(false); setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    void load();
    return () => { controller.abort(); request.current?.abort(); };
  }, [load]);
  useEffect(() => { void fetchUnreadCount(); }, [fetchUnreadCount]);
  useEffect(() => {
    const notify = () => { eventVersion.current += 1; setHasUpdates(true); };
    socket?.on('NEW_NOTIFICATION', notify);
    socket?.on('connect', notify);
    return () => { socket?.off('NEW_NOTIFICATION', notify); socket?.off('connect', notify); };
  }, [socket]);

  const markRead = async item => {
    if (item.isRead || confirmedReads.current.has(item._id) || readLocks.current.has(item._id) || allLock.current) return;
    const controller = lifetime.current;
    readLocks.current.add(item._id); setReadingIds([...readLocks.current]); setReadError(null);
    try {
      await axiosClient.put('/notifications/' + item._id + '/read', {}, { signal: controller.signal });
      if (controller.signal.aborted) return;
      confirmedReads.current.add(item._id);
      setItems(previous => previous.map(row => row._id === item._id ? { ...row, isRead: true } : row));
      void fetchUnreadCount();
    } catch (failure) {
      if (!controller.signal.aborted) setReadError({ id: item._id, message: failure.response?.data?.message || 'Chưa đánh dấu được thông báo đã đọc. Vui lòng thử lại.' });
    } finally {
      readLocks.current.delete(item._id);
      if (!controller.signal.aborted) setReadingIds([...readLocks.current]);
    }
  };

  const markAll = async () => {
    if (allLock.current || readLocks.current.size) return;
    const controller = lifetime.current;
    const visibleIds = new Set(items.map(item => item._id));
    allLock.current = true; setMarkingAll(true); setReadError(null);
    try {
      await axiosClient.put('/notifications/read-all', {}, { signal: controller.signal });
      if (controller.signal.aborted) return;
      visibleIds.forEach(id => confirmedReads.current.add(id));
      setItems(previous => previous.map(item => visibleIds.has(item._id) ? { ...item, isRead: true } : item));
      void fetchUnreadCount();
      toast.success('Đã đánh dấu tất cả thông báo đã đọc.');
    } catch (failure) {
      if (!controller.signal.aborted) toast.error(failure.response?.data?.message || 'Chưa thể đánh dấu tất cả đã đọc. Vui lòng thử lại.');
    } finally { allLock.current = false; if (!controller.signal.aborted) setMarkingAll(false); }
  };
  return { items, loading, loadingMore, error, moreError, page, totalPages, hasUpdates, unreadCount, markingAll, readingIds, readError, markRead, markAll, refresh: () => { void load(); void fetchUnreadCount(); }, loadMore: () => load(page + 1, false) };
}
