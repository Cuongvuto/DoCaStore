import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner"; 
import { Mail, Lock, User, LogIn, UserPlus, ArrowRight, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react"; 
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext"; 

const Auth = () => {
  const { token } = useParams(); 
  const navigate = useNavigate();
  const { login } = useAuth();

  // Thêm state 'verify' vào danh sách
  const [view, setView] = useState(token ? 'reset' : 'login'); 
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "", 
    otp: "", // 1. Thêm trường chứa mã OTP
  });

  useEffect(() => {
    if (token) setView('reset');
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. XỬ LÝ ĐĂNG NHẬP
      if (view === 'login') {
        const res = await axiosClient.post("/user/login", {
          email: formData.email,
          password: formData.password,
        });

        const responseData = res.data || res;
        const userToken = responseData.token;
        const userData = responseData.data || responseData.user;
        
        if (userToken && userData) {
          login(userData, userToken);
          toast.success(`Chào mừng ${userData.name || 'bạn'} quay trở lại!`);
          navigate(userData.role === 'admin' ? '/admin' : '/');
        } else {
          toast.error("Phản hồi từ server thiếu thông tin!");
        }
      } 
      
      // 2. XỬ LÝ ĐĂNG KÝ
      else if (view === 'register') {
        await axiosClient.post("/user/register", {
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        toast.success("Đăng ký thành công! Hãy kiểm tra Email để lấy mã OTP.");
        setView('verify'); // Chuyển sang màn hình xác thực OTP
      } 

      // 3. XỬ LÝ XÁC THỰC OTP (MỚI)
      else if (view === 'verify') {
        await axiosClient.post("/user/verify-email", {
          email: formData.email,
          otp: formData.otp
        });
        toast.success("Xác thực thành công! Bạn có thể đăng nhập ngay.");
        setView('login');
        setFormData({ ...formData, password: "", otp: "" });
      }
      
      // 4. XỬ LÝ GỬI LINK QUÊN MẬT KHẨU
      else if (view === 'forgot') {
        await axiosClient.post("/user/forgot-password", { email: formData.email });
        toast.success("Đã gửi liên kết khôi phục. Vui lòng kiểm tra Email!");
        setView('login');
      } 
      
      // 5. XỬ LÝ ĐẶT LẠI MẬT KHẨU
      else if (view === 'reset') {
        if (formData.password !== formData.confirmPassword) {
          toast.error("Mật khẩu xác nhận không khớp!");
          setIsLoading(false);
          return;
        }
        await axiosClient.put(`/user/reset-password/${token}`, { password: formData.password });
        toast.success("Đổi mật khẩu thành công! Hãy đăng nhập lại.");
        navigate('/auth'); 
        setView('login');
        setFormData({ ...formData, password: "", confirmPassword: "" });
      }

    } catch (error) {
      console.error("Lỗi xác thực:", error);
      const errorMsg = error.response?.data?.message || error.message || "Có lỗi xảy ra, vui lòng thử lại!";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitles = () => {
    switch (view) {
      case 'register': return { title: "Đăng Ký", sub: "Tạo tài khoản để nhận nhiều ưu đãi" };
      case 'verify': return { title: "Xác Thực Email", sub: `Nhập mã OTP 6 số đã gửi đến ${formData.email || 'email của bạn'}` };
      case 'forgot': return { title: "Quên Mật Khẩu", sub: "Nhập email của bạn để nhận liên kết khôi phục" };
      case 'reset': return { title: "Đặt Lại Mật Khẩu", sub: "Vui lòng nhập mật khẩu mới của bạn" };
      default: return { title: "Đăng Nhập", sub: "Chào mừng bạn trở lại với hệ thống" };
    }
  };

  const getButtonConfig = () => {
    switch (view) {
      case 'register': return { text: "Đăng Ký", Icon: UserPlus };
      case 'verify': return { text: "Xác Thực Ngay", Icon: ShieldCheck };
      case 'forgot': return { text: "Gửi Link Khôi Phục", Icon: Mail };
      case 'reset': return { text: "Xác Nhận Đổi Mật Khẩu", Icon: ShieldCheck };
      default: return { text: "Đăng Nhập", Icon: LogIn };
    }
  };

  const { title, sub } = getTitles();
  const { text: btnText, Icon: BtnIcon } = getButtonConfig();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1544321285-b91c06d0937a?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm transition-all duration-500"></div>

      <div className="max-w-md w-full space-y-8 bg-white/95 p-10 rounded-3xl shadow-2xl relative z-10 border border-white/20 transform transition-all hover:scale-[1.01]">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight transition-all">
            {title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            {sub}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            
            {/* Input Name */}
            {view === 'register' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#5a8c76] transition-colors" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-3 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a8c76] focus:border-transparent transition-all"
                  placeholder="Họ và tên"
                />
              </div>
            )}

            {/* Input Email (Ẩn ở reset và verify) */}
            {view !== 'reset' && view !== 'verify' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#5a8c76] transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-3 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a8c76] focus:border-transparent transition-all"
                  placeholder="Địa chỉ Email"
                />
              </div>
            )}

            {/* Input OTP (Chỉ hiện ở màn verify) */}
            {view === 'verify' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-gray-400 group-focus-within:text-[#5a8c76] transition-colors" />
                </div>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  required
                  maxLength="6"
                  className="block w-full pl-10 pr-3 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a8c76] focus:border-transparent transition-all text-center tracking-[0.5em] font-bold text-lg"
                  placeholder="------"
                />
              </div>
            )}

            {/* Input Password */}
            {view !== 'forgot' && view !== 'verify' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#5a8c76] transition-colors" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-3 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a8c76] focus:border-transparent transition-all"
                  placeholder={view === 'reset' ? "Mật khẩu mới" : "Mật khẩu"}
                />
              </div>
            )}

            {/* Input Confirm Password */}
            {view === 'reset' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400 group-focus-within:text-[#5a8c76] transition-colors" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-3 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a8c76] focus:border-transparent transition-all"
                  placeholder="Xác nhận mật khẩu mới"
                />
              </div>
            )}
          </div>

          {view === 'login' && (
            <div className="flex items-center justify-end">
              <button 
                type="button"
                onClick={() => setView('forgot')}
                className="text-sm font-semibold text-[#5a8c76] hover:text-[#3d6051] transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white ${
                isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#5a8c76] hover:bg-[#4a7562] hover:shadow-lg transform hover:-translate-y-0.5"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a8c76] transition-all duration-200`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                <BtnIcon className={`h-5 w-5 ${isLoading ? "text-gray-200" : "text-green-100 group-hover:text-white transition-colors"}`} />
              </span>
              {isLoading ? "Đang xử lý..." : btnText}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100">
          {(view === 'login' || view === 'register') ? (
            <button
              onClick={() => setView(view === 'login' ? 'register' : 'login')}
              className="w-full flex items-center justify-center text-sm font-medium text-gray-500 hover:text-[#5a8c76] transition-colors group"
            >
              {view === 'login' ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
              <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => setView('login')}
              className="w-full flex items-center justify-center text-sm font-medium text-gray-500 hover:text-[#5a8c76] transition-colors group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 transform group-hover:-translate-x-1 transition-transform" />
              Quay lại trang Đăng nhập
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;