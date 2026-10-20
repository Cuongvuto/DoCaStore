import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';
import useDebouncedValue from '../../../hooks/useDebouncedValue';

export const useAdminFilters = () => {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(params);
  const setFilter = (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, String(value)); else next.delete(key);
    if (key !== 'page') next.delete('page');
    return next;
  }, { replace: true });
  return { filters, setFilter, clearFilters: () => setParams({}) };
};

export default function useAdminList(endpoint, filters) {
  const serialized = useDebouncedValue(JSON.stringify(filters), 300);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ data: [], totalCount: 0, totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axiosClient.get(endpoint, { params: { page: 1, limit: 10, ...JSON.parse(serialized) }, signal: controller.signal });
        if (!controller.signal.aborted) setResult(response.data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.response?.data?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [endpoint, serialized, version]);
  return { ...result, loading, error, reload };
}
