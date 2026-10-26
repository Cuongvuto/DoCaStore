import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner"; 
import { Mail, Lock, User, LogIn, UserPlus, ArrowRight, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react"; 
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext"; 

const Auth = () => {
  const { token } = useParams(); 
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Thêm state 'verify' vào danh sách
  const [view, setView] = useState(token ? 'reset' : searchParams.get('view') === 'forgot' ? 'forgot' : 'login');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "", 
    otp: "", // 1. Thêm trường chứa mã OTP
  });

  const [timer, setTimer] = useState(0);
  const [pendingEmail, setPendingEmail] = useState(null);
  const googleClientRef = useRef(null);

  useEffect(() => {
    const email = localStorage.getItem('pendingEmail');
    if (email) {
      setPendingEmail(email);
    }
  }, []);

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) return undefined;

    const initGoogle = () => {
      if (window.google) {
        googleClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setIsLoading(true);
              try {
                const res = await axiosClient.post("/user/google-login", {
                  accessToken: tokenResponse.access_token
                });
                const responseData = res.data || res;
                const userToken = responseData.token;
                const userData = responseData.data || responseData.user;

                if (userToken && userData) {
                  login(userData, userToken);
                  toast.success(`Chào mừng ${userData.name || 'bạn'} quay trở lại!`);
                  navigate(userData.role !== 'customer' ? '/admin' : '/');
                } else {
                  toast.error("Phản hồi từ server thiếu thông tin!");
                }
              } catch (err) {
                console.error("Lỗi đăng nhập Google:", err);
                const errorMsg = err.response?.data?.message || err.message || "Đăng nhập Google thất bại!";
                toast.error(errorMsg);
              } finally {
                setIsLoading(false);
              }
            }
          }
        });
      }
    };

    if (window.google) {
      initGoogle();
      return undefined;
    }

    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', initGoogle);

    return () => script.removeEventListener('load', initGoogle);
  }, [login, navigate]);

  useEffect(() => {
    let interval = null;
    if (view === 'verify' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, timer]);

  useEffect(() => {
    if (token) setView('reset');
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleLoginClick = () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      toast.error("Google Sign-In chưa được cấu hình.");
      return;
    }
    if (googleClientRef.current) {
      googleClientRef.current.requestAccessToken();
    } else {
      toast.error("Google Sign-In chưa được khởi tạo. Vui lòng tải lại trang!");
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0 || isLoading) return;
    setIsLoading(true);
    try {
      await axiosClient.post("/user/resend-otp", { email: formData.email });
      toast.success("Mã OTP mới đã được gửi. Hãy check email!");
      setTimer(60);
    } catch (error) {
      console.error("Lỗi gửi lại OTP:", error);
      const errorMsg = error.response?.data?.message || error.message || "Không thể gửi lại mã OTP, vui lòng thử lại!";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeVerification = (email) => {
    setFormData((prev) => ({ ...prev, email: email }));
    setView('verify');
    setTimer(60);
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
          navigate(userData.role !== 'customer' ? '/admin' : '/');
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
        localStorage.setItem('pendingEmail', formData.email);
        setPendingEmail(formData.email);
        setView('verify'); // Chuyển sang màn hình xác thực OTP
        setTimer(60);
      } 

      // 3. XỬ LÝ XÁC THỰC OTP (MỚI)
      else if (view === 'verify') {
        await axiosClient.post("/user/verify-email", {
          email: formData.email,
          otp: formData.otp
        });
        toast.success("Xác thực thành công! Bạn có thể đăng nhập ngay.");
        localStorage.removeItem('pendingEmail');
        setPendingEmail(null);
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
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/95 via-brand-700/90 to-brand-900/95 backdrop-blur-sm z-0"></div>

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
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-sand-400 transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-sand-400/50 focus:ring-2 focus:ring-sand-400/50 transition-all duration-300"
                  placeholder="Họ và tên"
                />
              </div>
            )}

            {/* Input Email */}
            {view !== 'reset' && view !== 'verify' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-sand-400 transition-colors duration-300" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-sand-400/50 focus:ring-2 focus:ring-sand-400/50 transition-all duration-300"
                  placeholder="Địa chỉ Email"
                />
              </div>
            )}

            {/* Input OTP */}
            {view === 'verify' && (
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ShieldCheck className="h-5 w-5 text-gray-400 group-focus-within:text-sand-400 transition-colors duration-300" />
                  </div>
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleChange}
                    required
                    maxLength="6"
                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-sand-400/50 focus:ring-2 focus:ring-sand-400/50 transition-all duration-300 text-center tracking-[0.75em] font-bold text-xl"
                    placeholder="------"
                  />
                </div>
                <div className="flex justify-end text-sm px-1">
                  {timer > 0 ? (
                    <span className="text-gray-400">
                      Gửi lại mã sau <span className="text-sand-400 font-bold">{timer}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-sand-400 hover:text-sand-300 font-medium transition-colors duration-200"
                    >
                      Gửi lại mã OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Input Password */}
            {view !== 'forgot' && view !== 'verify' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-sand-400 transition-colors duration-300" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-sand-400/50 focus:ring-2 focus:ring-sand-400/50 transition-all duration-300"
                  placeholder={view === 'reset' ? "Mật khẩu mới" : "Mật khẩu"}
                />
              </div>
            )}

            {/* Input Confirm Password */}
            {view === 'reset' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400 group-focus-within:text-sand-400 transition-colors duration-300" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-sand-400/50 focus:ring-2 focus:ring-sand-400/50 transition-all duration-300"
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
                className="text-sm font-medium text-sand-400 hover:text-sand-300 transition-colors duration-200"
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-bold rounded-2xl ${
                isLoading 
                ? "bg-white/20 text-white cursor-not-allowed"
                : "text-brand-700 bg-gradient-to-r from-sand-400 to-sand-300 hover:from-sand-300 hover:to-sand-400 shadow-[0_0_20px_rgba(216,181,109,0.3)] hover:shadow-[0_0_25px_rgba(216,181,109,0.5)] transform hover:-translate-y-1"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sand-400 focus:ring-offset-brand-900 transition-all duration-300`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                <BtnIcon className={`h-5 w-5 ${isLoading ? "text-gray-400" : "text-brand-700 group-hover:text-brand-900 transition-colors duration-300"}`} />
              </span>
              {isLoading ? "Đang xử lý..." : btnText}
            </button>
          </div>

          {(view === 'login' || view === 'register') && (
            <div className="mt-6 space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative px-4 bg-brand-900/90 text-xs text-gray-400 uppercase tracking-wider backdrop-blur-sm rounded-full py-0.5 border border-white/5">
                  Hoặc tiếp tục với
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleLoginClick}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl text-white text-sm font-semibold transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Google</span>
                </button>
              </div>
            </div>
          )}
        </form>
        {pendingEmail && (view === 'login' || view === 'register') && (
          <div className="mt-6 p-4 bg-sand-400/10 border border-sand-400/25 rounded-2xl flex items-center justify-between text-xs text-gray-300 backdrop-blur-md">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-sand-400">Tài khoản chưa xác thực</span>
              <span className="text-gray-400 truncate max-w-[180px]">{pendingEmail}</span>
            </div>
            <button
              onClick={() => handleResumeVerification(pendingEmail)}
              className="px-3 py-1.5 bg-sand-400 hover:bg-sand-400 text-slate-950 font-bold rounded-xl transition-all duration-200"
            >
              Xác thực ngay
            </button>
          </div>
        )}

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
