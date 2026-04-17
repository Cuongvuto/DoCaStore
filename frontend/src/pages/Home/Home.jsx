import React from "react";
import { ShieldCheck, Truck, Clock } from "lucide-react";
import Banner from "./components/Banner";
import TrendingProducts from "./components/TrendingProducts"; 
import ProductSection from "../../components/ProductSection";
import LatestNews from "../../components/LatestNews";

const Home = () => {
  return (
    <div className="w-full bg-gray-50">
      {/* 1. Hero Banner */}
      <Banner />

      {/* 2. Dịch vụ cam kết */}
      <section className="bg-white py-10 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  <div className="flex flex-col items-center p-4">
                      <ShieldCheck size={40} className="text-[#5a8c76] mb-3" />
                      <h3 className="font-bold text-gray-800 text-lg">Hàng Chính Hãng 100%</h3>
                      <p className="text-gray-500 text-sm mt-1">Đảm bảo chất lượng từ Shimano, Daiwa</p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                      <Truck size={40} className="text-[#5a8c76] mb-3" />
                      <h3 className="font-bold text-gray-800 text-lg">Giao Hàng Toàn Quốc</h3>
                      <p className="text-gray-500 text-sm mt-1">Nhận hàng kiểm tra rồi mới thanh toán</p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                      <Clock size={40} className="text-[#5a8c76] mb-3" />
                      <h3 className="font-bold text-gray-800 text-lg">Hỗ Trợ 24/7</h3>
                      <p className="text-gray-500 text-sm mt-1">Tư vấn kỹ thuật câu và chọn đồ miễn phí</p>
                  </div>
              </div>
          </div>
      </section>

      {/* 3. SẢN PHẨM NỔI BẬT */}
      <TrendingProducts />
      
      {/* 4. CÁC KHỐI SẢN PHẨM THEO DANH MỤC THẬT TỪ DATABASE */}
      
      <ProductSection 
        title="Cần máy đứng" 
        identifier="can-may-dung" 
        limit={5} 
      />
      
      <ProductSection 
        title="Cần máy ngang" 
        identifier="can-may-ngang" 
        limit={5} 
      />

      <ProductSection 
        title="Phao" 
        identifier="phao" 
        limit={5} 
      />

      {/* 5. GÓC CHIA SẺ (TIN TỨC) */}
      <LatestNews />

    </div>
  );
};

export default Home;