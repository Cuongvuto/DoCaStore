import React from 'react';
import { Routes, Route } from 'react-router-dom';

// --- LAYOUTS ---
import MainLayout from './layouts/MainLayout';
import AdminLayout from './pages/admin/AdminLayout';

// --- PAGES: Main ---
import Home from './pages/Home/Home';
import Auth from './pages/Auth';
import ScrollToTop from './components/ScrollToTop';

// --- PAGES: CLIENT ---
import ProductDetail from './pages/client/ProductDetail';
import CartPage from './pages/client/CartPage';
import ProductPage from './pages/ProductPage';
import CategoryPage from './pages/CategoryPage';
import NewsPage from './pages/NewsPage';
import NewsDetail from './pages/NewsDetail';
import WishlistPage from './pages/WishlistPage'; 
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import Profile from './pages/Profile';
import Notifications from './pages/NotificationsPage';
import PaymentPage from './pages/PaymentPage';

// --- PAGES: ADMIN ---
import ProductManager from './pages/admin/ProductManager';
import CategoryManager from './pages/admin/CategoryManager';
import BannerManager from './pages/admin/BannerManager';
import NewsManager from './pages/admin/NewsManager';
import CouponManager from './pages/admin/CouponManager';
import OrderManager from './pages/admin/OrderManager';
import UserManager from './pages/admin/UserManager';
import NotificationManager from './pages/admin/NotificationManager';


// --- CONTEXT PROVIDERS ---
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';

const App = () => {
  return (
    // 🟢 BỌC TRẠM PHÁT SÓNG Ở NGOÀI CÙNG APP LÀ CHUẨN XÁC!
    <AuthProvider>
      <CartProvider>
        {/* 🔥 BỌC THÊM WISHLIST PROVIDER VÀO ĐÂY NỮA LÀ ĐẸP */}
        <WishlistProvider>
          <ScrollToTop />
          <Routes>
            {/* ==========================================
                1. KHU VỰC KHÁCH HÀNG (Có Header & Footer) 
                ========================================== */}
            <Route path="/" element={<MainLayout />}>
              {/* Route index: Mặc định hiển thị trang Home */}
              <Route index element={<Home />} />
              <Route path="/products" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/news/:slug" element={<NewsDetail />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-success/:orderId" element={<OrderSuccess />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/payment/:orderId" element={<PaymentPage />} />

            </Route>

            {/* ==========================================
                2. TRANG XÁC THỰC (Đứng độc lập) 
                ========================================== */}
            <Route path="/login" element={<Auth />} />
            <Route path="/auth/:token?" element={<Auth />} />
            <Route path="/reset-password/:token" element={<Auth />} />

            {/* ==========================================
                3. KHU VỰC ADMIN (Có Layout riêng cho Quản trị) 
                ========================================== */}
            <Route path="/admin" element={<AdminLayout />}>
              {/* Route index của Admin */}
              <Route index element={<h2 className="p-4 text-2xl font-bold">Tổng quan Quản trị</h2>} />
              
              {/* Các trang quản lý con */}
              <Route path="products" element={<ProductManager />} />
              <Route path="categories" element={<CategoryManager />} />
              <Route path="orders" element={<OrderManager />} />
              <Route path="users" element={<UserManager />} />
              <Route path='banners' element={<BannerManager />} />
              <Route path="news" element={<NewsManager />} />
              <Route path="coupons" element={<CouponManager />} />
              <Route path="notifications" element={<NotificationManager />} />
            </Route>

            {/* ==========================================
                4. TRANG 404 (Bắt các lỗi gõ sai link) 
                ========================================== */}
            <Route 
              path="*" 
              element={
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                  <h1 className="text-6xl font-bold text-[#5a8c76] mb-4">404</h1>
                  <p className="text-xl text-gray-600">Trang bạn tìm kiếm không tồn tại!</p>
                </div>
              } 
            />
          </Routes>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;