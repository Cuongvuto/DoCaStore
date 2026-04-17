import React from 'react';
import { Mail, Phone, MapPin, User, CreditCard } from 'lucide-react';
import { FaFacebook, FaInstagram, FaXTwitter } from "react-icons/fa6";
import PageBanner from '../components/PageBanner'; // Tận dụng lại Banner sếp đã có

const ContactPage = () => {
  return (
    <div className="w-full bg-gray-50 min-h-screen pb-20">
      <PageBanner 
        title="LIÊN HỆ VỚI CHÚNG TÔI" 
        breadcrumbs={[
          { name: 'Trang Chủ', link: '/' }, 
          { name: 'Liên hệ' }
        ]} 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* CỘT TRÁI: THÔNG TIN LIÊN HỆ & BẢN ĐỒ */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-black text-[#1e293b] uppercase mb-4 tracking-tight">
                Thông tin <span className="text-[#5a8c76]">Cửa hàng</span>
              </h2>
              <p className="text-gray-500 font-medium">
                Sếp cần hỗ trợ hay có thắc mắc gì cứ liên hệ trực tiếp qua các thông tin bên dưới nhé. Chúng tôi luôn sẵn sàng phục vụ 24/7!
              </p>
            </div>

            {/* Các block thông tin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-[#5a8c76]/10 flex items-center justify-center text-[#5a8c76] mb-4">
                  <User size={24} />
                </div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">Chủ Shop</p>
                <p className="text-lg font-black text-gray-800">Vũ Duy Cương</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-4">
                  <CreditCard size={24} />
                </div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">Số Tài Khoản (MBank)</p>
                <p className="text-lg font-black text-gray-800 tracking-wider">0523012949</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
                  <Phone size={24} />
                </div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">Điện Thoại</p>
                <a href="tel:0523012949" className="text-lg font-black text-gray-800 hover:text-red-600 transition-colors">
                  0523.012.949
                </a>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 mb-4">
                  <Mail size={24} />
                </div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">Email</p>
                <a href="mailto:anhdeptraic@gmail.com" className="text-base font-bold text-gray-800 hover:text-yellow-600 transition-colors truncate block">
                  anhdeptraic@gmail.com
                </a>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex gap-4 items-start mb-6">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 flex-shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-bold uppercase mb-1">Địa chỉ trực tiếp</p>
                  <p className="text-base font-bold text-gray-800 leading-relaxed">
                    Hinode Royal Park, Hoài Đức, Hà Nội
                  </p>
                </div>
              </div>
              
              {/* Mini Map theo yêu cầu của sếp */}
              <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 shadow-inner">
                <iframe 
                  title="Bản đồ"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.4736632144365!2d105.7061763!3d21.053736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3134542783859663%3A0x6335f6063e7c3a07!2sHinode%20Royal%20Park!5e0!3m2!1svi!2s!4v1712123456789" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen="" 
                  loading="lazy" 
                ></iframe>
              </div>
            </div>

            {/* Mạng xã hội */}
            <div className="pt-4">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Kết nối với chúng tôi</p>
              <div className="flex gap-4">
                <a href="https://www.facebook.com/cuong.vu.110757" className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <FaFacebook size={22} />
                </a>
                <a href="https://www.instagram.com/cuongvuxxz/" className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-pink-600 hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-500 hover:text-white hover:border-transparent shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <FaInstagram size={22} />
                </a>
                <a href="https://x.com/Cuongvu66874918" className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-800 hover:bg-gray-900 hover:text-white hover:border-gray-900 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <FaXTwitter size={22} />
                </a>
              </div>
            </div>

          </div>

          {/* CỘT PHẢI: FORM LIÊN HỆ */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
            <h3 className="text-2xl font-black text-gray-800 mb-6 uppercase">Gửi tin nhắn cho chúng tôi</h3>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Họ và Tên</label>
                <input 
                  type="text" 
                  placeholder="Nhập tên của bạn..." 
                  className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#5a8c76] focus:ring-2 focus:ring-[#5a8c76]/20 transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại</label>
                  <input 
                    type="tel" 
                    placeholder="Nhập số điện thoại..." 
                    className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#5a8c76] focus:ring-2 focus:ring-[#5a8c76]/20 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <input 
                    type="email" 
                    placeholder="Nhập email..." 
                    className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#5a8c76] focus:ring-2 focus:ring-[#5a8c76]/20 transition-all outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nội dung lời nhắn</label>
                <textarea 
                  rows="5" 
                  placeholder="Bạn cần chúng tôi hỗ trợ vấn đề gì?..." 
                  className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#5a8c76] focus:ring-2 focus:ring-[#5a8c76]/20 transition-all outline-none resize-none"
                ></textarea>
              </div>
              <button 
                type="submit" 
                className="w-full bg-[#5a8c76] text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-yellow-400 hover:text-[#5a8c76] transition-all shadow-md active:scale-95"
              >
                Gửi Tin Nhắn Ngay
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContactPage;