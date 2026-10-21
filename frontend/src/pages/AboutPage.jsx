import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Fish, HeartHandshake, PackageCheck, ShieldCheck, Target } from 'lucide-react';
import './StoreInfo.css';
import OceanHero from '../components/OceanHero';

const values = [
  { Icon: Fish, title: 'Đồ nghề phù hợp', description: 'Từ cần câu, máy câu đến phụ kiện, giúp bạn lựa chọn trang bị phù hợp với cách câu và chuyến đi của mình.' },
  { Icon: HeartHandshake, title: 'Tư vấn gần gũi', description: 'Trao đổi rõ nhu cầu, kinh nghiệm và ngân sách để tìm lựa chọn phù hợp trước khi đặt hàng.' },
  { Icon: PackageCheck, title: 'Đồng hành sau mua', description: 'Hỗ trợ thông tin đơn hàng, hướng dẫn sử dụng và trao đổi về chính sách bảo hành, đổi trả.' },
];

export default function AboutPage() {
  return <div className="store-info-page">
    <OceanHero>
      <div className="store-info-container">
        <nav className="store-info-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Giới thiệu</span></nav>
        <div className="store-info-hero-grid">
          <div>
            <p className="store-info-eyebrow"><Fish size={17} aria-hidden="true" /> CÂU CHUYỆN DOCASTORE</p>
            <h1>Cùng bạn chuẩn bị<br /><span>mỗi chuyến đi câu.</span></h1>
            <p className="store-info-lead">Từ niềm đam mê câu cá đến một nơi tìm đồ nghề, trao đổi kinh nghiệm và chuẩn bị cho những hành trình bên mặt nước.</p>
            <div className="store-info-actions"><Link className="store-info-button store-info-button-gold" to="/products">Khám phá đồ câu <ArrowRight size={18} aria-hidden="true" /></Link><Link className="store-info-hero-link" to="/contact">Kết nối với cửa hàng <ChevronRight size={16} aria-hidden="true" /></Link></div>
          </div>
          <figure className="store-info-brand-image">
            <img src="/952c547c-0612-45bc-8f20-e3ebb52a7b73.jpg" alt="Biểu trưng cá và cần câu của DocaStore" width="1024" height="559" decoding="async" />
            <figcaption>DOCASTORE <span>Đồ câu & phụ kiện</span></figcaption>
          </figure>
        </div>
      </div>
    </OceanHero>

    <section className="store-info-container store-info-section store-info-story" aria-labelledby="about-story">
      <div><p className="store-info-eyebrow">TỪ MỘT NIỀM ĐAM MÊ</p><h2 id="about-story">Hiểu đồ nghề.<br />Chia sẻ niềm vui câu cá.</h2></div>
      <div className="store-info-copy"><p>Được sáng lập bởi <strong>Vũ Duy Cương</strong>, DocaStore bắt đầu từ niềm yêu thích bộ môn câu cá và mong muốn tạo một điểm đến gần gũi cho cộng đồng cần thủ.</p><p>Chúng tôi hiểu rằng mỗi chuyến câu có những yêu cầu riêng. Một chiếc cần vừa tay, một bộ máy phù hợp hay phụ kiện được chuẩn bị kỹ có thể giúp bạn tận hưởng chuyến đi trọn vẹn hơn.</p><p>Vì vậy, DocaStore hướng tới việc giúp bạn tìm hiểu sản phẩm, lựa chọn đồ nghề và có thông tin rõ ràng trước khi mua.</p></div>
    </section>

    <section className="store-info-container store-info-values" aria-labelledby="about-values">
      <div className="store-info-section-heading"><p className="store-info-eyebrow">ĐIỀU CHÚNG TÔI HƯỚNG TỚI</p><h2 id="about-values">Một người bạn đồng hành của cần thủ</h2></div>
      <div className="store-info-three-columns">{values.map(item => <article className="store-info-card" key={item.title}><span className="store-info-icon"><item.Icon size={24} aria-hidden="true" /></span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
    </section>

    <section className="store-info-container store-info-section" aria-label="Tầm nhìn và sứ mệnh">
      <div className="store-info-purpose">
        <article><Target size={28} aria-hidden="true" /><h2>Tầm nhìn</h2><p>Trở thành địa chỉ đồ câu đáng tin cậy, nơi người mới bắt đầu và cần thủ có kinh nghiệm đều tìm được trang bị phù hợp.</p></article>
        <article><ShieldCheck size={28} aria-hidden="true" /><h2>Sứ mệnh</h2><p>Kết nối niềm đam mê câu cá với sản phẩm và thông tin hữu ích; cùng xây dựng một cộng đồng chia sẻ kinh nghiệm và tôn trọng thiên nhiên.</p></article>
      </div>
      <div className="store-info-closing"><div><h2>Chuyến câu tiếp theo bắt đầu từ đây</h2><p>Khám phá sản phẩm hoặc trao đổi trực tiếp với DocaStore.</p></div><Link className="store-info-button store-info-button-navy" to="/products">Xem sản phẩm <ArrowRight size={18} aria-hidden="true" /></Link></div>
    </section>
  </div>;
}
