import axios from 'axios';
import { toast } from 'sonner';

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

// axiosClient.interceptors.response.use(
//   (response) => {
//     // Nếu có dữ liệu trả về, mình lấy luôn phần data bên trong
//     return response.data;
//   },
//   (error) => {
   
//     if (error.response && error.response.status === 401) {
//       localStorage.removeItem('token');
//       toast.error("Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!");
//       setTimeout(() => {
//         window.location.href = '/auth';
//       }, 1500); // Đợi 1.5 giây
//     }
//     return Promise.reject(error);
//   }
// );

export default axiosClient;