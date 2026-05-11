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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat relative">
      {/* Dark overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/90 backdrop-blur-sm z-0"></div>

      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative z-10 border border-white/20 transform transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.4)]">
        <div>
          <h2 className="text-center text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
            {title}
          </h2>
          <p className="mt-3 text-center text-sm text-gray-300 font-medium">
            {sub}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            
            {/* Input Name */}
            {view === 'register' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-400 transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/50 transition-all duration-300"
                  placeholder="Họ và tên"
                />
              </div>
            )}

            {/* Input Email */}
            {view !== 'reset' && view !== 'verify' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-400 transition-colors duration-300" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/50 transition-all duration-300"
                  placeholder="Địa chỉ Email"
                />
              </div>
            )}

            {/* Input OTP */}
            {view === 'verify' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-400 transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  required
                  maxLength="6"
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/50 transition-all duration-300 text-center tracking-[0.75em] font-bold text-xl"
                  placeholder="------"
                />
              </div>
            )}

            {/* Input Password */}
            {view !== 'forgot' && view !== 'verify' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-400 transition-colors duration-300" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/50 transition-all duration-300"
                  placeholder={view === 'reset' ? "Mật khẩu mới" : "Mật khẩu"}
                />
              </div>
            )}

            {/* Input Confirm Password */}
            {view === 'reset' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-400 transition-colors duration-300" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/50 transition-all duration-300"
                  placeholder="Xác nhận mật khẩu mới"
                />
              </div>
            )}
          </div>

          {view === 'login' && (
            <div className="flex items-center justify-end mt-2">
              <button 
                type="button"
                onClick={() => setView('forgot')}
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors duration-200"
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-bold rounded-2xl text-white ${
                isLoading 
                ? "bg-white/20 cursor-not-allowed" 
                : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-1"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all duration-300`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                <BtnIcon className={`h-5 w-5 ${isLoading ? "text-gray-400" : "text-emerald-100 group-hover:text-white transition-colors duration-300"}`} />
              </span>
              {isLoading ? "Đang xử lý..." : btnText}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10">
          {(view === 'login' || view === 'register') ? (
            <button
              onClick={() => setView(view === 'login' ? 'register' : 'login')}
              className="w-full flex items-center justify-center text-sm font-medium text-gray-400 hover:text-white transition-colors duration-300 group"
            >
              {view === 'login' ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
              <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          ) : (
            <button
              onClick={() => setView('login')}
              className="w-full flex items-center justify-center text-sm font-medium text-gray-400 hover:text-white transition-colors duration-300 group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 transform group-hover:-translate-x-1 transition-transform duration-300" />
              Quay lại trang Đăng nhập
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;