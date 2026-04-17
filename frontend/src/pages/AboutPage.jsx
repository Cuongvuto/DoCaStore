import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Target, Zap, HeartHandshake, Fish, Award, CheckCircle2 } from 'lucide-react';
import PageBanner from '../components/PageBanner';

const AboutPage = () => {
  return (
    <div className="w-full bg-gray-50 min-h-screen pb-20">
      <PageBanner 
        title="GIỚI THIỆU VỀ DOCASTORE" 
        breadcrumbs={[
          { name: 'Trang Chủ', link: '/' }, 
          { name: 'Giới thiệu' }
        ]} 
      />

      {/* PHẦN 1: CÂU CHUYỆN THƯƠNG HIỆU */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            {/* Ảnh minh họa - Sếp có thể thay bằng ảnh cửa hàng thực tế */}
            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative z-10">
              <img 
                src="/952c547c-0612-45bc-8f20-e3ebb52a7b73.jpg" 
                alt="DocaStore Câu Cá" 
                className="w-full h-[500px] object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            {/* Element trang trí */}
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-yellow-400 rounded-3xl -z-10"></div>
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#5a8c76]/20 rounded-full -z-10 blur-2xl"></div>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5a8c76]/10 text-[#5a8c76] font-bold text-sm uppercase tracking-widest">
              <Fish size={16} /> Về Chúng Tôi
            </div>
            <h2 className="text-3xl lg:text-5xl font-black text-[#1e293b] leading-tight tracking-tight">
              Đam mê ra khơi, <br />
              <span className="text-[#5a8c76]">Chinh phục</span> mọi thủy vực
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed text-justify">
              Được sáng lập bởi anh <strong>Vũ Duy Cương</strong> – một người đam mê bộ môn câu cá mãnh liệt, <strong>DocaStore</strong> ra đời không chỉ để bán hàng, mà để tạo ra một "sân chơi" đích thực cho anh em cần thủ. 
            </p>
            <p className="text-gray-600 text-lg leading-relaxed text-justify">
              Chúng tôi thấu hiểu cảm giác hồi hộp khi cá cắn câu và niềm vui vỡ òa khi dòng cá thành công. Vì vậy, từng chiếc cần, cuộn cước hay lưỡi câu tại DocaStore đều được tuyển chọn khắt khe nhất để đồng hành cùng sếp trong mọi chuyến đi săn thủy quái.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-200">
              <div>
                <p className="text-4xl font-black text-[#5a8c76] mb-1">5+</p>
                <p className="text-sm font-bold text-gray-500 uppercase">Năm kinh nghiệm</p>
              </div>
              <div>
                <p className="text-4xl font-black text-yellow-500 mb-1">10K+</p>
                <p className="text-sm font-bold text-gray-500 uppercase">Khách hàng tin chọn</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PHẦN 2: TẦM NHÌN & SỨ MỆNH */}
      <div className="bg-[#5a8c76] py-20 relative overflow-hidden">
        {/* Họa tiết nền */}
        <div className="absolute inset-0 opacity-10">
           <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="fish-scale" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 40c5.523 0 10-4.477 10-10 0-5.523 4.477-10 10-10s10 4.477 10 10c0 5.523 4.477 10 10 10h10v-10c-5.523 0-10-4.477-10-10 0-5.523-4.477-10-10-10S10 14.477 10 20C10 25.523 5.523 30 0 30v10z" fill="#ffffff" fillOpacity="1"/></pattern></defs><rect x="0" y="0" width="100%" height="100%" fill="url(#fish-scale)"/>
           </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-[#5a8c76] flex items-center justify-center mb-6 shadow-lg">
                <Target size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4">Tầm nhìn</h3>
              <p className="text-green-50 leading-relaxed text-lg">
                Trở thành hệ thống phân phối đồ câu và dã ngoại hàng đầu tại Việt Nam. Nơi anh em cần thủ có thể nhắm mắt chọn đồ mà không phải lo về chất lượng hay giá cả.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-[#5a8c76] flex items-center justify-center mb-6 shadow-lg">
                <HeartHandshake size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4">Sứ mệnh</h3>
              <p className="text-green-50 leading-relaxed text-lg">
                Cung cấp thiết bị câu cá chuẩn hãng, nâng tầm trải nghiệm câu cá giải trí. Xây dựng cộng đồng DocaStore vững mạnh, chia sẻ kinh nghiệm và kỹ năng ra khơi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PHẦN 3: TẠI SAO CHỌN CHÚNG TÔI */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-[#1e293b] uppercase tracking-tight mb-4">
            Vì sao chọn <span className="text-[#5a8c76]">DocaStore?</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Không chỉ là bán hàng, chúng tôi bán sự an tâm và trải nghiệm tuyệt vời nhất cho mỗi chuyến câu của bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: ShieldCheck,
              title: "Chính Hãng 100%",
              desc: "Cam kết bồi thường gấp 10 lần nếu phát hiện hàng giả, hàng nhái. Nguồn gốc xuất xứ rõ ràng.",
              color: "text-blue-600",
              bg: "bg-blue-50"
            },
            {
              icon: Award,
              title: "Bảo Hành Chu Đáo",
              desc: "Hỗ trợ sửa chữa, thay thế linh kiện chuyên nghiệp. Chế độ hậu mãi trọn đời cho anh em an tâm.",
              color: "text-yellow-600",
              bg: "bg-yellow-50"
            },
            {
              icon: Zap,
              title: "Giao Hàng Siêu Tốc",
              desc: "Đóng gói kỹ càng (trong ống nhựa PVC an toàn cho cần câu). Giao tận tay anh em trên toàn quốc.",
              color: "text-red-500",
              bg: "bg-red-50"
            }
          ].map((item, index) => (
            <div key={index} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group">
              <div className={`w-16 h-16 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <item.icon size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-3">{item.title}</h3>
              <p className="text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PHẦN 4: CALL TO ACTION */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-gray-900 to-[#1e293b] rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 text-white/5">
             <Fish size={200} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase mb-6 relative z-10">
            Sẵn sàng cho chuyến đi câu tiếp theo?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto relative z-10">
            Khám phá ngay bộ sưu tập cần câu, máy câu và phụ kiện mới nhất tại DocaStore để trang bị cho mình những "vũ khí" tối tân nhất.
          </p>
          <Link 
            to="/products" 
            className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-white hover:text-[#5a8c76] transition-all duration-300 shadow-lg hover:-translate-y-1 relative z-10"
          >
            Mua Sắm Ngay <Zap size={18} />
          </Link>
        </div>
      </div>

    </div>
  );
};

export default AboutPage;