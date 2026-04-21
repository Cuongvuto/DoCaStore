import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
// Đã thêm LayoutDashboard vào danh sách import
import { Star, ShoppingCart, User, LogOut, ChevronDown, ChevronRight, Fish, Bell, Menu, X, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useNotification } from '../context/NotificationContext'; 
import axiosClient from '../api/axiosClient';
import CustomerChatWidget from './CustomerChatWidget';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlist } = useWishlist(); 
  const { unreadCount } = useNotification(); 
  
  const [categories, setCategories] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // State quản lý việc đóng/mở menu trên điện thoại
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axiosClient.get('/category');
        const categoryTree = response.data.data; 
        setCategories(categoryTree || []);
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
      }
    };
    fetchCategories();
  }, []);

  const isActive = (path) => location.pathname === path;

  // Tự động đóng menu mobile khi chuyển trang
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className={`sticky top-0 w-full transition-all duration-300 z-[100] ${
      isScrolled ? 'bg-[#5a8c76]/95 shadow-lg backdrop-blur-md py-2' : 'bg-[#5a8c76] py-3'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* --- KHU VỰC TRÁI: MENU MOBILE & LOGO --- */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Nút Hamburger (Chỉ hiện trên điện thoại) */}
            <button 
              className="lg:hidden text-white p-1 rounded-md hover:bg-white/10 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="bg-white p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300 shadow-md">
                <Fish className="text-[#5a8c76]" size={20} sm:size={24} />
              </div>
              <span className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white">
                Doca<span className="text-yellow-400">Store</span>
              </span>
            </Link>
          </div>

          {/* --- KHU VỰC GIỮA: NAVIGATION (Chỉ hiện trên máy tính) --- */}
          <nav className="hidden lg:flex items-center space-x-7 font-bold text-[13px] tracking-widest h-full">
            <Link to="/" className={`h-full flex items-center transition-colors hover:text-yellow-300 ${isActive('/') ? 'text-yellow-300' : 'text-white'}`}>
              TRANG CHỦ
            </Link>
            
            {/* Dropdown Sản phẩm (Desktop) */}
            <div className="relative group h-full flex items-center">
              <Link to="/products" className={`flex items-center gap-1 transition-colors hover:text-yellow-300 h-full ${isActive('/products') ? 'text-yellow-300' : 'text-white'}`}>
                SẢN PHẨM <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />
              </Link>
              
              <ul className="absolute left-0 top-[100%] w-60 bg-white text-gray-800 shadow-2xl rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-100 translate-y-2 group-hover:translate-y-0">
                {categories.map((category) => (
                  <li key={category._id} className="relative group/item px-2">
                    <Link to={`/category/${category.slug}`} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#5a8c76]/10 hover:text-[#5a8c76] transition-all font-semibold uppercase text-[11px]">
                      {category.name}
                      {category.children?.length > 0 && <ChevronRight size={14} className="text-gray-400" />}
                    </Link>
                    {category.children && category.children.length > 0 && (
                      <ul className="absolute left-[100%] top-0 ml-1 w-56 bg-white text-gray-800 shadow-2xl rounded-xl py-2 opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-300 border border-gray-100 translate-x-2 group-hover/item:translate-x-0">
                        {category.children.map((child) => (
                          <li key={child._id} className="px-2">
                            <Link to={`/category/${child.slug}`} className="block px-4 py-2.5 text-[11px] uppercase rounded-lg hover:bg-gray-50 hover:text-[#5a8c76] transition-colors font-semibold border-b border-gray-50 last:border-0">
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <Link to="/about" className={`h-full flex items-center transition-colors hover:text-yellow-300 ${isActive('/about') ? 'text-yellow-300' : 'text-white'}`}>GIỚI THIỆU</Link>
            <Link to="/news" className={`h-full flex items-center transition-colors hover:text-yellow-300 ${isActive('/news') ? 'text-yellow-300' : 'text-white'}`}>TIN TỨC</Link>
            <Link to="/contact" className={`h-full flex items-center transition-colors hover:text-yellow-300 ${isActive('/contact') ? 'text-yellow-300' : 'text-white'}`}>LIÊN HỆ</Link>
          </nav>

          {/* --- KHU VỰC PHẢI: ICONS & USER --- */}
          <div className="flex items-center gap-1 sm:gap-3">
            
            <CustomerChatWidget />

            {/* THÔNG BÁO */}
            <Link to="/notifications" className="p-1.5 sm:p-2.5 hover:bg-white/10 rounded-full transition-all relative group">
              <Bell size={20} className={`text-white group-hover:scale-110 transition-transform ${unreadCount > 0 ? 'animate-ring text-yellow-300' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] sm:text-[10px] font-black rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center border sm:border-2 border-[#5a8c76] shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* WISHLIST */}
            <Link to="/wishlist" className="hidden sm:block p-1.5 sm:p-2.5 hover:bg-white/10 rounded-full transition-all relative group">
              <Star size={20} className="text-white group-hover:scale-110 transition-transform" />
              {wishlist?.length > 0 && (
                <span className="absolute top-0 right-0 bg-yellow-400 text-[#5a8c76] text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-[#5a8c76] animate-bounce-short shadow-sm">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* GIỎ HÀNG */}
            <Link to="/cart" className="p-1.5 sm:p-2.5 hover:bg-white/10 rounded-full transition-all relative group">
              <ShoppingCart size={20} className="text-white group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-yellow-400 text-[#5a8c76] text-[9px] sm:text-[10px] font-black rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center border sm:border-2 border-[#5a8c76] animate-bounce-short shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            <div className="h-6 sm:h-8 w-[1px] bg-white/20 mx-0.5 sm:mx-1" />

            {/* USER LOGIN / LOGOUT */}
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 ml-1">
                <div className="hidden md:flex flex-col items-end leading-tight">
                  <span className="text-[10px] text-green-200 font-bold uppercase tracking-tighter">
                    {user.role === 'customer' ? 'Thành viên' : 'Quản trị viên'}
                  </span>
                  <span className="text-sm font-bold text-white uppercase">{user.name}</span>
                </div>
                <div className="relative group">
                   <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-all overflow-hidden shadow-inner">
                      <User size={18} className="text-white" />
                   </button>
                   <div className="absolute right-0 top-[120%] w-48 sm:w-52 bg-white rounded-2xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-100 translate-y-2 group-hover:translate-y-0 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 md:hidden">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Tài khoản</p>
                        <p className="text-sm font-bold text-[#5a8c76] truncate">{user.name}</p>
                      </div>
                      
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#5a8c76]/5 hover:text-[#5a8c76] transition-colors font-semibold">
                        <User size={16} /> Hồ sơ cá nhân
                      </Link>

                      {/* --- NÚT TỚI TRANG QUẢN TRỊ (CHỈ HIỆN KHI LÀ ADMIN) --- */}
                      {user.role && user.role !== 'customer' && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-sm text-[#5a8c76] hover:bg-[#5a8c76]/10 transition-colors font-bold border-t border-gray-50">
                          <LayoutDashboard size={16} /> Trang quản trị
                        </Link>
                      )}

                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-bold border-t border-gray-50 transition-colors">
                        <LogOut size={16} /> Đăng xuất
                      </button>
                   </div>
                </div>
              </div>
            ) : (
              <>
                {/* Nút Đăng nhập cho Desktop (To) */}
                <Link to="/login" className="hidden sm:flex bg-white text-[#5a8c76] px-5 py-2.5 rounded-xl text-sm font-black hover:bg-yellow-400 transition-all shadow-md active:scale-95 uppercase">
                  Đăng nhập
                </Link>
                {/* Nút Đăng nhập cho Mobile (Bé xíu hình User) */}
                <Link to="/login" className="sm:hidden w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#5a8c76] shadow-md active:scale-95 ml-1">
                  <User size={18} />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- MENU MOBILE DROPDOWN (Chỉ hiện khi bấm nút 3 gạch) --- */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out bg-[#4a7562] ${isMobileMenuOpen ? 'max-h-[400px] border-t border-white/10' : 'max-h-0'}`}>
        <div className="flex flex-col px-4 py-2 space-y-1 font-bold text-[13px] tracking-wider">
          <Link to="/" className="text-white py-3 border-b border-white/10 flex items-center">TRANG CHỦ</Link>
          <Link to="/products" className="text-white py-3 border-b border-white/10 flex items-center justify-between">
            SẢN PHẨM <ChevronRight size={16} />
          </Link>
          <Link to="/about" className="text-white py-3 border-b border-white/10 flex items-center">GIỚI THIỆU</Link>
          <Link to="/news" className="text-white py-3 border-b border-white/10 flex items-center">TIN TỨC</Link>
          <Link to="/contact" className="text-white py-3 flex items-center">LIÊN HỆ</Link>
        </div>
      </div>

      <style>{`
        /* Giữ nguyên phần CSS keyframes của bạn ở đây */
        @keyframes bounce-short { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .animate-bounce-short { animation: bounce-short 2.5s ease-in-out infinite; }
        @keyframes ring { 0% { transform: rotate(0); } 10% { transform: rotate(15deg); } 20% { transform: rotate(-10deg); } 30% { transform: rotate(15deg); } 40% { transform: rotate(-10deg); } 50% { transform: rotate(0); } 100% { transform: rotate(0); } }
        .animate-ring { animation: ring 2s ease-in-out infinite; transform-origin: top center; }
      `}</style>
    </header>
  );
};

export default Header;