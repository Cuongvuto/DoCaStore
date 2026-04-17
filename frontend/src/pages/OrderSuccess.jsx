import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, ShoppingBag, Truck, MapPin, Receipt } from 'lucide-react';
import axiosClient from '../api/axiosClient'; 

const OrderSuccess = () => {
  const { orderId } = useParams();
  
  // State để lưu thông tin chi tiết đơn hàng gọi từ Backend về
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- GỌI API LẤY CHI TIẾT ĐƠN HÀNG ---
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        
        const res = await axiosClient.get(`/orders/${orderId}`);
        setOrderData(res.data?.data || res.data); // 
      } catch (error) {
        console.error("Lỗi lấy thông tin chi tiết đơn hàng:", error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  // Giả lập thời gian giao hàng dự kiến
  const getExpectedDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3); 
    return date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Màn hình chờ khi đang fetch data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
        <p>Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8">
      
      {/* BỐ CỤC NGANG: Dùng md:flex-row để chia 2 cột trên PC, mobile vẫn xếp chồng */}
      <div className="max-w-6xl w-full flex flex-col md:flex-row gap-6 lg:gap-8">

        {/* ================= CỘT TRÁI: THÔNG BÁO THÀNH CÔNG ================= */}
        <div className="flex-[4] bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center h-fit">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8 text-center sm:text-left">
            <div className="bg-green-100 p-4 rounded-full animate-bounce-short shrink-0">
              <CheckCircle className="h-12 w-12 text-green-500" strokeWidth={2} />
            </div>
            <div className="mt-2">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                Đặt hàng thành công!
              </h1>
              <p className="text-gray-600 text-lg">
                Cảm ơn bạn đã mua sắm tại <span className="font-semibold text-red-600">DocaStore</span>.
              </p>
            </div>
          </div>

          {/* Box Mã Đơn & Ngày Giao */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row gap-6 relative overflow-hidden">
            <Truck className="absolute -right-4 -bottom-4 h-24 w-24 text-gray-100 transform -rotate-12" />
            
            <div className="relative z-10 flex items-center gap-4 flex-1 border-b sm:border-b-0 sm:border-r border-gray-200 pb-4 sm:pb-0 sm:pr-4">
               <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 shrink-0">
                  <Package className="h-6 w-6 text-red-500" />
               </div>
               <div className="min-w-0">
                 <p className="text-sm font-medium text-gray-500 mb-0.5">Mã đơn hàng</p>
                 <p className="text-base font-bold text-gray-800 break-all">{orderId}</p>
               </div>
            </div>

            <div className="relative z-10 flex items-center gap-4 flex-1">
               <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 shrink-0">
                  <Truck className="h-6 w-6 text-blue-500" />
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-500 mb-0.5">Giao dự kiến vào</p>
                 <p className="text-base font-semibold text-gray-800">{getExpectedDate()}</p>
               </div>
            </div>
          </div>

          <div className="space-y-3 mb-10 text-gray-600 text-sm md:text-base px-2">
            <p className="flex items-start gap-2">📧 <span>Chúng tôi đã gửi email xác nhận chi tiết đơn hàng cho bạn.</span></p>
            <p className="flex items-start gap-2">📞 <span>Shipper sẽ gọi cho bạn qua số điện thoại trước khi giao hàng.</span></p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-auto">
            <Link to="/" className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md">
              <ShoppingBag className="h-5 w-5" /> Tiếp tục mua sắm
            </Link>
            <Link to="/profile" className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 px-6 rounded-xl transition-all border border-gray-200 shadow-sm">
              Lịch sử đơn hàng <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* ================= CỘT PHẢI: CHI TIẾT ĐƠN HÀNG ================= */}
        <div className="flex-[3] bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b">
            <Receipt className="h-5 w-5 text-gray-500" /> Tóm tắt đơn hàng
          </h2>

          {orderData ? (
            <>
              {/* 1. Danh sách sản phẩm (có thanh cuộn nếu quá nhiều SP) */}
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                {orderData.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={item.product_id?.imageUrl || item.image || "https://dummyimage.com/50x50/cccccc/ffffff&text=Img"} 
                        alt="Product" 
                        className="w-14 h-14 object-cover rounded-md border border-gray-200" 
                      />
                      <div>
                        {/* Tên SP */}
                        <p className="font-medium text-gray-800 text-sm line-clamp-2 max-w-[200px]">
                          {item.product_id?.name || item.name || "Sản phẩm"}
                        </p>
                        {/* SL x Đơn giá */}
                        <p className="text-xs text-gray-500 mt-0.5">
                          SL: {item.quantity} x {(item.price || item.product_id?.price || 0).toLocaleString()}đ
                        </p>
                      </div>
                    </div>
                    {/* Thành tiền 1 SP */}
                    <p className="font-semibold text-gray-800 whitespace-nowrap">
                      {((item.price || item.product_id?.price || 0) * item.quantity).toLocaleString()}đ
                    </p>
                  </div>
                ))}
              </div>

              {/* 2. Thông tin người nhận */}
              <div className="bg-gray-50 p-4 rounded-xl mb-6">
                <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-red-500"/> Địa chỉ nhận hàng
                </p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-800">{orderData.shippingAddress?.receiverName} - {orderData.shippingAddress?.phone}</p>
                  <p className="leading-relaxed">
                    {orderData.shippingAddress?.street}, {orderData.shippingAddress?.ward}, {orderData.shippingAddress?.district}, {orderData.shippingAddress?.city}
                  </p>
                </div>
              </div>

              {/* 3. Tổng kết tiền */}
              <div className="border-t pt-5 space-y-3 mt-auto">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Phương thức thanh toán</span>
                  <span className="font-medium text-gray-800">
                    {orderData.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : orderData.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-800 font-bold text-lg">TỔNG CỘNG</span>
                  <span className="text-red-600 text-2xl font-bold">
                    {(orderData.totalPrice || 0).toLocaleString()}đ
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p>Không tìm thấy thông tin chi tiết đơn hàng.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderSuccess;