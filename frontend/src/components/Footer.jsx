import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { Mail, Phone, MapPin, ShieldCheck, ChevronRight, Fish } from 'lucide-react';
import { storeMapEmbedUrl } from '../config/storeLocation';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-700 border-t border-white/15 pt-16 pb-8 text-sm text-brand-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* CỘT 1: THƯƠNG HIỆU & GIỚI THIỆU */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 group">
              <div className="bg-sand-400 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                <Fish className="text-brand-700" size={24} />
              </div>
              <span className="text-xl font-black uppercase tracking-tighter text-white">
                Doca<span className="text-sand-400">Store</span>
              </span>
            </div>
            <p className="leading-relaxed text-brand-200">
              Điểm đến tin cậy cho các "cần thủ" chuyên nghiệp. Chúng tôi cung cấp trang thiết bị câu cá chính hãng, giúp mọi chuyến ra khơi của bạn trở thành những trải nghiệm đáng nhớ.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: FaFacebook, name: "Facebook" },
                { icon: FaInstagram, name: "Instagram" },
                { icon: FaXTwitter, name: "X" },
                { icon: FaYoutube, name: "YouTube" }
              ].map((social, index) => (
                <span
                  key={index} 
                  aria-label={`${social.name} đang được cập nhật`}
                  title={`${social.name} đang được cập nhật`}
                  className="w-10 h-10 rounded-full bg-brand-800 border border-white/20 flex items-center justify-center text-brand-200 hover:text-sand-400 hover:border-sand-400 hover:shadow-lg hover:shadow-black/10 transition-all"
                >
                  <social.icon size={18} />
                </span>
              ))}
            </div>
          </div>

          {/* CỘT 2: CHÍNH SÁCH & PHÁP LÝ */}
          <div>
            <h3 className="text-white font-bold text-sm mb-6 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={18} className="text-sand-400" /> Pháp lý & Chính sách
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
                    className="flex items-center gap-2 hover:text-sand-400 hover:translate-x-1 transition-all group text-brand-200"
                  >
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-sand-400" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-white/20">
               <p className="text-[11px] leading-relaxed text-brand-200 uppercase font-bold mb-1">Giấy phép kinh doanh</p>
               <p className="text-[12px]">Số: <span className="font-mono font-bold text-white">0523012949</span></p>
               <p className="text-[12px]">Cấp ngày: 20/05/2011</p>
               <p className="text-[12px]">Chủ sở hữu: <span className="font-bold text-white">DocauStore Co.ltd</span></p>
            </div>
          </div>

          {/* CỘT 3: LIÊN HỆ TẠI HÀ NỘI */}
          <div>
            <h3 className="text-white font-bold text-sm mb-6 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={18} className="text-sand-400" /> Thông tin liên hệ
            </h3>
            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sand-400 flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <p className="text-brand-200 leading-relaxed">
                  Lk24-03 Hinode Royal Park, <br /> Hoài Đức, Hà Nội
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sand-400 flex-shrink-0">
                  <Phone size={16} />
                </div>
                <a href="tel:0523012949" className="text-white font-black text-lg hover:text-sand-300 transition-colors">
                  0523.012.949
                </a>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sand-400 flex-shrink-0">
                  <Mail size={16} />
                </div>
                <a href="mailto:support@docaustore.vn" className="text-brand-200 hover:text-sand-400">support@docaustore.vn</a>
              </div>
            </div>
          </div>

          {/* CỘT 4: BẢN ĐỒ & THANH TOÁN */}
          <div>
            <h3 className="text-white font-bold text-sm mb-6 uppercase tracking-widest">Vị trí cửa hàng</h3>
            <div className="w-full h-32 bg-brand-800 rounded-2xl overflow-hidden border border-white/20 shadow-inner mb-6">
               <iframe 
                title="Bản đồ DocauStore"
                src={storeMapEmbedUrl}
                width="100%" 
                height="100%" 
                style={{ border: 0, filter: 'grayscale(0.2)' }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-black tracking-wide text-brand-200">
               <span className="rounded border border-white/20 bg-brand-800 px-2 py-1">PayPal</span>
               <span className="rounded border border-white/20 bg-white px-2 py-1 text-blue-700">VISA</span>
               <span className="rounded border border-white/20 bg-white px-2 py-1 text-red-600">Mastercard</span>
            </div>
          </div>

        </div>

        {/* BOTTOM FOOTER */}
        <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-brand-200 font-medium uppercase tracking-widest">
          <p>© {currentYear} DOCAUSTORE FISHING - ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6">
            <span>Thiết kế bởi Team Dev Doca</span>
            <span className="text-sand-400">Chất lượng hàng đầu</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
