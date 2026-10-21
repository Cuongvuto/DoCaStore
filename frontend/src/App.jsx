import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';

const Home = lazy(() => import('./pages/Home/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const ProductDetail = lazy(() => import('./pages/client/ProductDetail'));
const CartPage = lazy(() => import('./pages/client/CartPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/NotificationsPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ProductManager = lazy(() => import('./pages/admin/ProductManager'));
const CategoryManager = lazy(() => import('./pages/admin/CategoryManager'));
const BannerManager = lazy(() => import('./pages/admin/BannerManager'));
const NewsManager = lazy(() => import('./pages/admin/NewsManager'));
const CouponManager = lazy(() => import('./pages/admin/CouponManager'));
const OrderManager = lazy(() => import('./pages/admin/OrderManager'));
const UserManager = lazy(() => import('./pages/admin/UserManager'));
const NotificationManager = lazy(() => import('./pages/admin/NotificationManager'));
const MessageManager = lazy(() => import('./pages/admin/MessageManager'));

const STAFF_ROLES = ['superadmin', 'admin', 'product_admin', 'order_admin', 'support_admin'];
const PRODUCT_ROLES = ['superadmin', 'admin', 'product_admin'];
const ORDER_ROLES = ['superadmin', 'admin', 'order_admin'];
const SUPPORT_ROLES = ['superadmin', 'admin', 'support_admin'];
const USER_ROLES = ['superadmin', 'admin'];

const LoadingScreen = () => (
  <div className="min-h-[50vh] flex items-center justify-center bg-slate-50" role="status">
    <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
      Đang tải nội dung...
    </div>
  </div>
);

const guarded = (element, allowedRoles) => (
  <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
);

const App = () => (
  <>
    <ScrollToTop />
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<ProductPage />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="news/:slug" element={<NewsDetail />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="about" element={<AboutPage />} />

          <Route path="cart" element={guarded(<CartPage />)} />
          <Route path="wishlist" element={guarded(<WishlistPage />)} />
          <Route path="checkout" element={guarded(<Checkout />)} />
          <Route path="order-success/:orderId" element={guarded(<OrderSuccess />)} />
          <Route path="profile" element={guarded(<Profile />)} />
          <Route path="notifications" element={guarded(<Notifications />)} />
          <Route path="payment/:orderId" element={guarded(<PaymentPage />)} />
        </Route>

        <Route path="/login" element={<Auth />} />
        <Route path="/auth/:token?" element={<Auth />} />
        <Route path="/reset-password/:token" element={<Auth />} />

        <Route path="/admin" element={guarded(<AdminLayout />, STAFF_ROLES)}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={guarded(<ProductManager />, PRODUCT_ROLES)} />
          <Route path="categories" element={guarded(<CategoryManager />, PRODUCT_ROLES)} />
          <Route path="banners" element={guarded(<BannerManager />, PRODUCT_ROLES)} />
          <Route path="news" element={guarded(<NewsManager />, PRODUCT_ROLES)} />
          <Route path="orders" element={guarded(<OrderManager />, ORDER_ROLES)} />
          <Route path="coupons" element={guarded(<CouponManager />, ORDER_ROLES)} />
          <Route path="users" element={guarded(<UserManager />, USER_ROLES)} />
          <Route path="notifications" element={guarded(<NotificationManager />, SUPPORT_ROLES)} />
          <Route path="messages" element={guarded(<MessageManager />, SUPPORT_ROLES)} />
        </Route>

        <Route
          path="*"
          element={
            <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
              <p className="text-7xl font-black text-brand-800">404</p>
              <h1 className="mt-4 text-2xl font-bold text-slate-900">Không tìm thấy trang</h1>
              <p className="mt-2 text-slate-600">Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi.</p>
              <a href="/" className="mt-6 rounded-xl bg-brand-800 px-5 py-3 font-bold text-white">
                Về trang chủ
              </a>
            </main>
          }
        />
      </Routes>
    </Suspense>
  </>
);

export default App;
