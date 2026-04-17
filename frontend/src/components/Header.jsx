import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Star, ShoppingCart, User, LogOut, ChevronDown, ChevronRight, Fish, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useNotification } from '../context/NotificationContext'; 
import axiosClient from '../api/axiosClient';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlist } = useWishlist(); 
  const { unreadCount } = useNotification(); 
  
  const [categories, setCategories] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);

  // 1. Hiệu ứng đổi màu header khi cuộn chuột
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 2. Lấy danh mục từ Backend và Dựng cây Cha - Con
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axiosClient.get('/category');
        const categoryTree = response.data.data; 
        console.log("Cây danh mục chuẩn từ Backend:", categoryTree);
        setCategories(categoryTree);
        // if (response && response.success) {
        //   const categoryTree = response.data; 
        //   console.log("Cây danh mục chuẩn từ Backend:", categoryTree);
          
        //   // Thêm || [] để đảm bảo categories luôn là một mảng, không bao giờ bị lỗi .map()
        //   setCategories(categoryTree || []); 
        // }
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
      }
    };
    fetchCategories();
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <header className={`sticky top-0 w-full transition-all duration-300 z-[100] ${
      isScrolled ? 'bg-[#5a8c76]/95 shadow-lg backdrop-blur-md py-2' : 'bg-[#5a8c76] py-3'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* --- LOGO --- */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-white p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300 shadow-md">
                <Fish className="text-[#5a8c76]" size={24} />
              </div>
              <span className="text-2xl font-black uppercase tracking-tighter text-white">
                Doca<span className="text-yellow-400">Store</span>
              </span>
            </Link>
          </div>

          {/* --- NAVIGATION --- */}
          <nav className="hidden lg:flex items-center space-x-7 font-bold text-[13px] tracking-widest h-full">
            <Link 
              to="/" 
              className={`h-full flex items-center transition-colors hover:text-yellow-300 ${isActive('/') ? 'text-yellow-300' : 'text-white'}`}
            >
              TRANG CHỦ
            </Link>
            
            {/* Dropdown Sản phẩm (Cấp 1) */}
            <div className="relative group h-full flex items-center">
              <Link 
                to="/products" 
                className={`flex items-center gap-1 transition-colors hover:text-yellow-300 h-full ${isActive('/products') ? 'text-yellow-300' : 'text-white'}`}
              >
                SẢN PHẨM <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />
              </Link>
              
              {/* CẤP 2: DANH MỤC CHA */}
              <ul className="absolute left-0 top-[100%] w-60 bg-white text-gray-800 shadow-2xl rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-100 translate-y-2 group-hover:translate-y-0">
                {categories.map((category) => (
                  <li key={category._id} className="relative group/item px-2">
                    
                    <Link 
                      to={`/category/${category.slug}`} 
                      className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#5a8c76]/10 hover:text-[#5a8c76] transition-all font-semibold uppercase text-[11px]"
                    >
                      {category.name}
                      {/* Nếu có danh mục con thì hiện mũi tên */}
                      {category.children?.length > 0 && <ChevronRight size={14} className="text-gray-400" />}
                    </Link>

                    {/* CẤP 3: DANH MỤC CON (Hiện sang bên phải) */}
                    {category.children && category.children.length > 0 && (
                      <ul className="absolute left-[100%] top-0 ml-1 w-56 bg-white text-gray-800 shadow-2xl rounded-xl py-2 opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-300 border border-gray-100 translate-x-2 group-hover/item:translate-x-0">
                        {category.children.map((child) => (
                          <li key={child._id} className="px-2">
                            <Link 
                              to={`/category/${child.slug}`} 
                              className="block px-4 py-2.5 text-[11px] uppercase rounded-lg hover:bg-gray-50 hover:text-[#5a8c76] transition-colors font-semibold border-b border-gray-50 last:border-0"
                            >
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

          {/* --- ICONS & USER SECTION --- */}
          <div className="flex items-center gap-3">
            
            {/* THÔNG BÁO (BELL) */}
            <Link to="/notifications" className="p-2.5 hover:bg-white/10 rounded-full transition-all relative group">
              <Bell size={22} className={`text-white group-hover:scale-110 transition-transform ${unreadCount > 0 ? 'animate-ring text-yellow-300' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-[#5a8c76] shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* WISHLIST */}
            <Link to="/wishlist" className="p-2.5 hover:bg-white/10 rounded-full transition-all relative group">
              <Star size={22} className="text-white group-hover:scale-110 transition-transform" />
              {wishlist?.length > 0 && (
                <span className="absolute top-1 right-1 bg-yellow-400 text-[#5a8c76] text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-[#5a8c76] animate-bounce-short shadow-sm">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* GIỎ HÀNG */}
            <Link to="/cart" className="p-2.5 hover:bg-white/10 rounded-full transition-all relative group">
              <ShoppingCart size={22} className="text-white group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-yellow-400 text-[#5a8c76] text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-[#5a8c76] animate-bounce-short shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            <div className="h-8 w-[1px] bg-white/20 mx-1 hidden sm:block" />

            {/* User Logic */}
            {user ? (
              <div className="flex items-center gap-3 ml-1">
                <div className="hidden md:flex flex-col items-end leading-tight">
                  <span className="text-[10px] text-green-200 font-bold uppercase tracking-tighter">Thành viên</span>
                  <span className="text-sm font-bold text-white uppercase">{user.name}</span>
                </div>
                
                <div className="relative group">
                   <button className="w-10 h-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-all overflow-hidden shadow-inner">
                      <User size={20} className="text-white" />
                   </button>
                   
                   <div className="absolute right-0 top-[120%] w-52 bg-white rounded-2xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-100 translate-y-2 group-hover:translate-y-0 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 sm:hidden">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Tài khoản</p>
                        <p className="text-sm font-bold text-[#5a8c76] truncate">{user.name}</p>
                      </div>
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#5a8c76]/5 hover:text-[#5a8c76] transition-colors font-semibold">
                        <User size={16} /> Hồ sơ cá nhân
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-bold border-t border-gray-50 transition-colors"
                      >
                        <LogOut size={16} /> Đăng xuất
                      </button>
                   </div>
                </div>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-white text-[#5a8c76] px-5 py-2.5 rounded-xl text-sm font-black hover:bg-yellow-400 transition-all shadow-md active:scale-95 uppercase"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-short {
          animation: bounce-short 2.5s ease-in-out infinite;
        }

        @keyframes ring {
          0% { transform: rotate(0); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          50% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
        .animate-ring {
          animation: ring 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>
    </header>
  );
};

export default Header;