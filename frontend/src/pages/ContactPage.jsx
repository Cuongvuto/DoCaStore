import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, CreditCard, Mail, MapPin, Phone, User } from 'lucide-react';
import { FaFacebook, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import './StoreInfo.css';
import OceanHero from '../components/OceanHero';
import { storeMapEmbedUrl as mapUrl, storeMapsUrl as directionsUrl } from '../config/storeLocation';

const socials = [
  { Icon: FaFacebook, name: 'Facebook', url: 'https://www.facebook.com/cuong.vu.110757' },
  { Icon: FaInstagram, name: 'Instagram', url: 'https://www.instagram.com/cuongvuxxz/' },
  { Icon: FaXTwitter, name: 'X / Twitter', url: 'https://x.com/Cuongvu66874918' },
];

export default function ContactPage() {
  return <div className="store-info-page">
    <OceanHero className="store-info-contact-hero">
      <div className="store-info-container">
        <nav className="store-info-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Liên hệ</span></nav>
        <p className="store-info-eyebrow">KẾT NỐI VỚI DOCASTORE</p>
        <h1>Cần đồ nghề phù hợp?<br /><span>Cùng chúng tôi trao đổi.</span></h1>
        <p className="store-info-lead">Tư vấn sản phẩm, hỗ trợ đơn hàng hoặc ghé thăm cửa hàng — chọn cách liên hệ thuận tiện nhất cho bạn.</p>
      </div>
    </OceanHero>

    <div className="store-info-container store-info-section">
      <section className="store-info-three-columns store-info-contact-methods" aria-label="Thông tin liên hệ">
        <article className="store-info-card"><span className="store-info-icon"><Phone size={24} aria-hidden="true" /></span><h2>Gọi trực tiếp</h2><a className="store-info-contact-value" href="tel:0523012949">0523.012.949</a><p>Trao đổi nhanh về sản phẩm và thông tin đơn hàng.</p><a className="store-info-text-link" href="tel:0523012949">Gọi cửa hàng <ArrowUpRight size={16} aria-hidden="true" /></a></article>
        <article className="store-info-card"><span className="store-info-icon"><Mail size={24} aria-hidden="true" /></span><h2>Gửi email</h2><a className="store-info-contact-value store-info-email" href="mailto:anhdeptraic@gmail.com">anhdeptraic@gmail.com</a><p>Gửi nội dung cần hỗ trợ và mã đơn hàng nếu có.</p><a className="store-info-text-link" href="mailto:anhdeptraic@gmail.com">Mở ứng dụng email <ArrowUpRight size={16} aria-hidden="true" /></a></article>
        <article className="store-info-card"><span className="store-info-icon"><MapPin size={24} aria-hidden="true" /></span><h2>Ghé cửa hàng</h2><p className="store-info-contact-value">Hinode Royal Park</p><p>Hoài Đức, Hà Nội. Bạn có thể gọi trước để trao đổi và hẹn ghé.</p><a className="store-info-text-link" href={directionsUrl} target="_blank" rel="noopener noreferrer">Mở Google Maps <ArrowUpRight size={16} aria-hidden="true" /></a></article>
      </section>

      <div className="store-info-contact-layout">
        <section className="store-info-map" aria-labelledby="contact-location">
          <div className="store-info-map-heading"><div><p className="store-info-eyebrow">TÌM ĐƯỜNG ĐẾN CỬA HÀNG</p><h2 id="contact-location">Hẹn gặp bạn tại DocaStore</h2><p>Hinode Royal Park, Hoài Đức, Hà Nội</p></div><MapPin size={30} aria-hidden="true" /></div>
          <iframe title="Vị trí DocaStore tại Hinode Royal Park" src={mapUrl} width="100%" height="380" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <a className="store-info-map-link" href={directionsUrl} target="_blank" rel="noopener noreferrer">Xem bản đồ lớn và tìm đường <ArrowUpRight size={17} aria-hidden="true" /></a>
        </section>

        <aside className="store-info-contact-sidebar" aria-label="Thông tin cửa hàng và kết nối">
          <section className="store-info-shop-details"><p className="store-info-eyebrow">THÔNG TIN CỬA HÀNG</p><h2>DocaStore</h2><dl><div><dt><User size={17} aria-hidden="true" /> Người phụ trách</dt><dd>Vũ Duy Cương</dd></div><div><dt><CreditCard size={17} aria-hidden="true" /> Tài khoản MBank</dt><dd>0523012949</dd></div></dl><p className="store-info-payment-note">Với đơn đặt trên website, vui lòng thanh toán theo hướng dẫn của đơn hàng để hệ thống đối soát đúng.</p></section>
          <section className="store-info-social"><h2>Kết nối cùng chúng tôi</h2><p>Theo dõi và trao đổi qua các kênh mạng xã hội.</p><div>{socials.map(item => <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer"><item.Icon size={20} aria-hidden="true" /><span>{item.name}</span><ArrowUpRight size={16} aria-hidden="true" /></a>)}</div></section>
        </aside>
      </div>
      <div className="store-info-closing"><div><h2>Bạn đang tìm đồ câu?</h2><p>Xem danh mục sản phẩm để chuẩn bị cho chuyến đi tiếp theo.</p></div><Link className="store-info-button store-info-button-navy" to="/products">Khám phá sản phẩm <ChevronRight size={18} aria-hidden="true" /></Link></div>
    </div>
  </div>;
}
