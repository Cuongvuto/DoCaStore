import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, CreditCard, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import { useCart } from '../../context/CartContext';

const CartPage = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const { updateCartCount } = useCart();
  const navigate = useNavigate();

  // 1. LẤY DỮ LIỆU GIỎ HÀNG
  const fetchCart = async () => {
    try {
      const res = await axiosClient.get('/cart');
      setCart(res.data.data);
    } catch (error) {
      console.error("Lỗi lấy giỏ hàng:", error);
      toast.error("Không thể tải giỏ hàng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // 2. CẬP NHẬT SỐ LƯỢNG (Tăng/Giảm)
  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return; // Không cho giảm dưới 1 (Xóa thì dùng nút xóa riêng)
    try {
      // Gọi API update số lượng của sếp
      await axiosClient.put(`/cart/${productId}`, { quantity: newQuantity });
      fetchCart(); // Load lại dữ liệu để cập nhật tổng tiền
    } catch (error) {
      toast.error("Lỗi cập nhật số lượng!");
    }
  };

  // 3. XÓA SẢN PHẨM
  const handleRemoveItem = async (productId) => {
    try {
      await axiosClient.delete(`/cart/${productId}`);
      toast.success("Đã xóa sản phẩm!");
      fetchCart();
      updateCartCount(); // Cập nhật lại số trên Header
    } catch (error) {
      toast.error("Lỗi khi xóa sản phẩm!");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#5a8c76] font-bold">Đang kiểm tra giỏ hàng của sếp...</div>;

  // Trường hợp giỏ hàng trống
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag size={40} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">Giỏ hàng đang trống!</h2>
        <p className="text-gray-500 mb-8 text-center">Sếp chưa chọn được "chiến hữu" nào để đi câu sao?</p>
        <Link to="/products" className="bg-[#5a8c76] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#4a7562] transition-all">
          <ArrowLeft size={20} /> TIẾP TỤC MUA SẮM
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4 uppercase tracking-tighter">
        Giỏ hàng của sếp <span className="text-sm font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-normal">({cart.items.length} sản phẩm)</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* --- DANH SÁCH SẢN PHẨM (CỘT TRÁI) --- */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {cart.items.map((item) => (
            <div key={item.product_id?._id || item._id} className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white border border-gray-100 rounded-3xl hover:shadow-xl hover:shadow-gray-100 transition-all group">
              {/* Ảnh sản phẩm */}
              <div className="w-32 h-32 bg-[#f8f9fa] rounded-2xl p-2 flex-shrink-0 relative overflow-hidden">
                <img 
                  src={item.product_id?.imageUrl || 'https://via.placeholder.com/150'} 
                  alt={item.product_id?.name || 'Sản phẩm'} 
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" 
                />
              </div>

              {/* Thông tin */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-black text-gray-900 uppercase leading-tight mb-1 group-hover:text-[#5a8c76] transition-colors line-clamp-2">
                  {item.product_id?.name || 'Sản phẩm không xác định'}
                </h3>
                <p className="text-[#5a8c76] font-bold text-xl mb-4">
                  {(item.product_id?.price || 0).toLocaleString('vi-VN')} <span className="text-sm">đ</span>
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-6">
                  {/* Bộ tăng giảm */}
                  <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-1">
                    <button 
                      onClick={() => handleUpdateQuantity(item.product_id?._id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white hover:text-red-500 rounded-lg transition-all"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-10 text-center font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.product_id?._id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white hover:text-green-600 rounded-lg transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  {/* Nút xóa */}
                  <button 
                    onClick={() => handleRemoveItem(item.product_id?._id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Thành tiền 1 món */}
              <div className="hidden sm:block text-right min-w-[120px]">
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Thành tiền</p>
                <p className="font-black text-gray-900">
                  {((item.product_id?.price || 0) * item.quantity).toLocaleString('vi-VN')} đ
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* --- TỔNG KẾT ĐƠN HÀNG (CỘT PHẢI) --- */}
        <div className="lg:col-span-1">
          <div className="bg-[#1a1a1a] text-white p-8 rounded-[2rem] sticky top-24 shadow-2xl shadow-gray-200">
            <h2 className="text-xl font-black mb-8 border-b border-white/10 pb-4 uppercase tracking-widest">Tóm tắt đơn hàng</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-400 font-medium">
                <span>Tạm tính ({cart.items.length} món)</span>
                <span>{(cart.subTotal || cart.totalPrice || 0).toLocaleString('vi-VN')} đ</span>
              </div>
              
              {/* Hiển thị phần giảm giá nếu có */}
              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-[#ff4757] font-medium">
                  <span>Giảm giá (Khách mới)</span>
                  <span>-{(cart.discountAmount || 0).toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              <div className="flex justify-between text-gray-400 font-medium">
                <span>Vận chuyển</span>
                <span className="text-green-400 font-bold italic underline">Miễn phí</span>
              </div>
            </div>

            <div className="flex justify-between items-end mb-10">
              <span className="text-gray-400 font-bold uppercase text-xs">Tổng cộng</span>
              <span className="text-4xl font-black text-white">
                {/* Lấy finalPrice, nếu không có thì lấy totalPrice (để tương thích ngược) */}
                {(cart.finalPrice || cart.totalPrice || 0).toLocaleString('vi-VN')} <span className="text-lg">đ</span>
              </span>
            </div>

            <button 
              onClick={() => navigate('/checkout')}
              className="w-full bg-[#5a8c76] hover:bg-[#6ba38a] text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 group shadow-lg shadow-green-900/20"
            >
              TIẾN HÀNH THANH TOÁN
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="mt-8 flex flex-col gap-4">
               <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                  <CreditCard size={16} /> Bảo mật thanh toán 100%
               </div>
               <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-[11px] text-gray-400 leading-relaxed italic">
                 "Đồ câu xịn, cá dính liền. Sếp yên tâm thanh toán, shop ship siêu tốc!"
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;