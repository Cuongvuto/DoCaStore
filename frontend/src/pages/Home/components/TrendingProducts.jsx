import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import ProductCard from "../../../components/ProductCard";

const TrendingProducts = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dùng useRef để điều khiển thanh trượt
  const sliderRef = useRef(null);

  useEffect(() => {
    const fetchTrendingProducts = async () => {
      try {
        const res = await axiosClient.get("/product/trending");
        setProducts(res.data?.data || res.data || []);
      } catch (error) {
        console.error("Lỗi lấy sản phẩm trending:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrendingProducts();
  }, []);

  // 🟢 HÀM XỬ LÝ TRƯỢT 1 SẢN PHẨM & VÒNG LẶP
  const scroll = (direction) => {
    if (sliderRef.current) {
      const container = sliderRef.current;
      
      // Lấy chiều rộng của 1 thẻ sản phẩm + khoảng cách gap (gap-5 = 20px)
      const itemWidth = container.children[0].offsetWidth + 20; 
      
      if (direction === "left") {
        // Nếu đang ở đầu mà bấm lùi -> Cuộn vèo xuống cuối luôn (vòng lặp)
        if (container.scrollLeft <= 0) {
          container.scrollTo({ left: container.scrollWidth, behavior: "smooth" });
        } else {
          // Trượt lùi 1 sản phẩm
          container.scrollBy({ left: -itemWidth, behavior: "smooth" });
        }
      } else {
        // Kiểm tra xem đã cuộn đến sát mép bên phải chưa (sai số 10px cho chắc)
        const isEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
        
        if (isEnd) {
          // Trượt đến cuối rồi -> Cuộn vèo về lại số 1 (vòng lặp)
          container.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Trượt tiến 1 sản phẩm (Mất 1 hiện 6)
          container.scrollBy({ left: itemWidth, behavior: "smooth" });
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-gray-500 animate-pulse">
        Đang tải sản phẩm nổi bật...
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <section className="py-16 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      {/* Tiêu đề */}
      <div className="flex justify-between items-end mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 uppercase inline-block pb-2 border-b-4 border-[#5a8c76]">
          🔥 Sản Phẩm Nổi Bật
        </h2>
        
        {/* Nút điều khiển đưa lên góc phải cho sang trọng (Giống Shopee) */}
        <div className="hidden md:flex gap-2">
          <button 
            onClick={() => scroll("left")} 
            className="p-2 rounded-full border border-gray-300 text-gray-500 hover:bg-[#5a8c76] hover:text-white hover:border-[#5a8c76] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => scroll("right")} 
            className="p-2 rounded-full border border-gray-300 text-gray-500 hover:bg-[#5a8c76] hover:text-white hover:border-[#5a8c76] transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Khu vực Slider */}
      <div className="relative group -mx-2 px-2">
        
        {/* Khung trượt chứa sản phẩm */}
        <div 
          ref={sliderRef} 
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 pt-2 [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <div 
              key={product._id} 
              /* 🟢 CÔNG THỨC TOÁN HỌC ÉP KÍCH THƯỚC:
                - Mobile: calc(50% - 10px) -> Hiện 2 cái
                - Tablet (md): calc(33.333% - 13.33px) -> Hiện 3 cái
                - Desktop (lg): calc(20% - 16px) -> Hiện CHÍNH XÁC 5 CÁI NHƯ SẾP MUỐN
              */
              className="snap-start flex-shrink-0 w-[calc(50%-10px)] md:w-[calc(33.333%-13.33px)] lg:w-[calc(20%-16px)]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

      </div>

      {/* Nút Xem Tất Cả */}
      <div className="text-center mt-4">
        <Link 
          to="/products" 
          className="inline-block border-2 border-[#5a8c76] text-[#5a8c76] hover:bg-[#5a8c76] hover:text-white font-semibold py-2.5 px-8 rounded-lg transition-all duration-300 hover:shadow-lg"
        >
          Xem Tất Cả Sản Phẩm
        </Link>
      </div>
    </section>
  );
};

export default TrendingProducts;