import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

export default function useProfileResource(path) {
  const [result, setResult] = useState({ data: null, error: '', loading: true });
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => {
    setResult(previous => ({ ...previous, loading: true, error: '' }));
    setVersion(previous => previous + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setResult(previous => ({ ...previous, loading: true, error: '' }));
      try {
        const response = await axiosClient.get(path, { signal: controller.signal });
        if (!controller.signal.aborted) setResult({ data: response.data, error: '', loading: false });
      } catch (error) {
        if (!controller.signal.aborted) setResult(previous => ({ ...previous, error: error.response?.data?.message || 'Chưa thể tải dữ liệu. Vui lòng thử lại.', loading: false }));
      }
    };
    void load();
    return () => controller.abort();
  }, [path, version]);
  return { ...result, refresh };
}
