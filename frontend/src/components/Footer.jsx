import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { Mail, Phone, MapPin, ShieldCheck, ChevronRight, Fish } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#f8fafc] border-t border-gray-200 pt-16 pb-8 text-sm text-gray-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* CỘT 1: THƯƠNG HIỆU & GIỚI THIỆU */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 group">
              <div className="bg-[#5a8c76] p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                <Fish className="text-white" size={24} />
              </div>
              <span className="text-xl font-black uppercase tracking-tighter text-[#1e293b]">
                Doca<span className="text-[#5a8c76]">Store</span>
              </span>
            </div>
            <p className="leading-relaxed text-gray-500">
              Điểm đến tin cậy cho các "cần thủ" chuyên nghiệp. Chúng tôi cung cấp trang thiết bị câu cá chính hãng, giúp mọi chuyến ra khơi của bạn trở thành những trải nghiệm đáng nhớ.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: FaFacebook, link: "#" },
                { icon: FaInstagram, link: "#" },
                { icon: FaXTwitter, link: "#" },
                { icon: FaYoutube, link: "#" }
              ].map((social, index) => (
                <a 
                  key={index} 
                  href={social.link} 
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#5a8c76] hover:border-[#5a8c76] hover:shadow-lg hover:shadow-green-100 transition-all"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* CỘT 2: CHÍNH SÁCH & PHÁP LÝ */}
          <div>
            <h3 className="text-[#1e293b] font-bold text-sm mb-6 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#5a8c76]" /> Pháp lý & Chính sách
            </h3>
            <ul className="space-y-4">
              {/* 🔥 ĐÃ FIX: Xóa Điều khoản sử dụng và trỏ link về trang bài viết (/news/slug) */}
              {[
                { name: 'Chính sách bảo mật', path: '/news/chinh-sach-bao-mat' },
                { name: 'Giao hàng & Thanh toán', path: '/news/chinh-sach-thanh-toan' },
                { name: 'Bảo hành & Đổi trả', path: '/news/chinh-sach-doi-tra-hoan-tien' }
              ].map((item, index) => (
                <li key={index}>
                  <Link 
                    to={item.path} 
                    className="flex items-center gap-2 hover:text-[#5a8c76] hover:translate-x-1 transition-all group text-gray-500"
                  >
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#5a8c76]" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-gray-100">
               <p className="text-[11px] leading-relaxed text-gray-400 uppercase font-bold mb-1">Giấy phép kinh doanh</p>
               <p className="text-[12px]">Số: <span className="font-mono font-bold text-gray-700">0523012949</span></p>
               <p className="text-[12px]">Cấp ngày: 20/05/2011</p>
               <p className="text-[12px]">Chủ sở hữu: <span className="font-bold text-gray-700">DocauStore Co.ltd</span></p>
            </div>
          </div>

          {/* CỘT 3: LIÊN HỆ TẠI HÀ NỘI */}
          <div>
            <h3 className="text-[#1e293b] font-bold text-sm mb-6 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={18} className="text-[#5a8c76]" /> Thông tin liên hệ
            </h3>
            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#5a8c76]/10 flex items-center justify-center text-[#5a8c76] flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <p className="text-gray-500 leading-relaxed">
                  Lk24-03 Hinode Royal Park, <br /> Hoài Đức, Hà Nội
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50/80 flex items-center justify-center text-red-500 flex-shrink-0">
                  <Phone size={16} />
                </div>
                <a href="tel:0523012949" className="text-gray-800 font-black text-lg hover:text-red-600 transition-colors">
                  0523.012.949
                </a>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                  <Mail size={16} />
                </div>
                <p className="text-gray-500">support@docaustore.vn</p>
              </div>
            </div>
          </div>

          {/* CỘT 4: BẢN ĐỒ & THANH TOÁN */}
          <div>
            <h3 className="text-[#1e293b] font-bold text-sm mb-6 uppercase tracking-widest">Vị trí cửa hàng</h3>
            <div className="w-full h-32 bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-inner mb-6">
               <iframe 
                title="Bản đồ DocauStore"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.4736632144365!2d105.7061763!3d21.053736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3134542783859663%3A0x6335f6063e7c3a07!2sHinode%20Royal%20Park!5e0!3m2!1svi!2s!4v1712123456789" 
                width="100%" 
                height="100%" 
                style={{ border: 0, filter: 'grayscale(0.2)' }} 
                allowFullScreen="" 
                loading="lazy" 
              ></iframe>
            </div>
            <div className="flex flex-wrap gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
               <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4" alt="Paypal" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" alt="Visa" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4" alt="Mastercard" />
            </div>
          </div>

        </div>

        {/* BOTTOM FOOTER */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-gray-400 font-medium uppercase tracking-widest">
          <p>© {currentYear} DOCAUSTORE FISHING - ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6">
            <span>Thiết kế bởi Team Dev Doca</span>
            <span className="text-[#5a8c76]">Chất lượng hàng đầu</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;