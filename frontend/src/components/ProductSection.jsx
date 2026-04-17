import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ProductCard from './ProductCard'; 

const ProductSection = ({ title, identifier, limit = 5 }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Lưu ý: Đảm bảo đường dẫn này khớp 100% với Backend của bạn (/product/category hay /products/category)
        const res = await axiosClient.get(`/product/category/${identifier}?limit=${limit}`);
        
        let data = res.data?.data || [];
        
        if (data.length > limit) {
           data = data.slice(0, limit);
        }
        
        setProducts(data);
        console.log(`[DEBUG] Data của danh mục "${title}" (ID: ${identifier}):`, data); // Hiển thị ở F12
      } catch (error) {
        console.error(`[LỖI] Không tải được danh mục ${title}:`, error);
      } finally {
        setLoading(false);
      }
    };

    if (identifier) fetchProducts();
  }, [identifier, limit]);

  // Tạm tắt dòng dưới đây để nếu danh mục bị rỗng, nó vẫn hiện Tiêu đề để bạn biết web không bị lỗi
  // if (!loading && products.length === 0) return null;

  return (
    <section className="py-10 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TIÊU ĐỀ & NÚT XEM TẤT CẢ */}
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-black text-gray-800 uppercase relative inline-block">
            {title}
            <span className="absolute bottom-0 left-0 w-1/2 h-1 bg-[#5a8c76] rounded-full mt-2"></span>
          </h2>
          
          <Link 
            to={`/category/${identifier}`}
            className="flex items-center text-sm font-semibold text-[#5a8c76] hover:text-yellow-500 transition-colors group"
          >
            Xem tất cả
            <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* LƯỚI SẢN PHẨM */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {loading ? (
            [...Array(limit)].map((_, index) => (
              <div key={index} className="bg-gray-100 rounded-xl h-[350px] animate-pulse"></div>
            ))
          ) : (
            products.length > 0 ? (
              products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))
            ) : (
              // Báo lỗi ra màn hình nếu không có sản phẩm nào
              <div className="col-span-full py-10 text-center text-red-500 italic border-2 border-dashed border-red-200 rounded-xl">
                ⚠️ Chưa có sản phẩm nào cho danh mục <b>{identifier}</b>. <br/> Hãy check lại xem truyền đúng "slug" hoặc "ID" chưa nhé!
              </div>
            )
          )}
        </div>

      </div>
    </section>
  );
};

export default ProductSection;