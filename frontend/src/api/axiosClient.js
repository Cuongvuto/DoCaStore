import axios from 'axios';

// Khởi tạo một đối tượng axios với cấu hình mặc định (Lấy từ biến môi trường của Vite)
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors: Tự động nhét Token vào mỗi lần gửi Request
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token từ LocalStorage (sau này khi đăng nhập mình sẽ lưu token vào đây)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
