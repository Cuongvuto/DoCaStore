import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ProductCard from './ProductCard'; 

const ProductSection = ({ title, identifier, limit = 5 }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await axiosClient.get(`/product/category/${encodeURIComponent(identifier)}`, { params: { limit }, signal: controller.signal });
        if (!controller.signal.aborted) setProducts(Array.isArray(res.data?.data) ? res.data.data.slice(0, limit) : []);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (identifier) void fetchProducts();
    return () => controller.abort();
  }, [identifier, limit, retry]);

  return (
    <section className="py-10 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TIÊU ĐỀ & NÚT XEM TẤT CẢ */}
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-black text-gray-800 uppercase relative inline-block">
            {title}
            <span className="absolute bottom-0 left-0 w-1/2 h-1 bg-brand-700 rounded-full mt-2"></span>
          </h2>
          
          <Link 
            to={`/category/${identifier}`}
            className="flex items-center text-sm font-semibold text-brand-700 hover:text-yellow-500 transition-colors group"
          >
            Xem tất cả
            <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* LƯỚI SẢN PHẨM */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6" aria-busy={loading}>
          {loading ? (
            <><span className="sr-only" role="status">Đang tải sản phẩm…</span>{[...Array(limit)].map((_, index) => (
              <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-brand-100" aria-hidden="true" />
            ))}</>
          ) : error ? (
            <div className="col-span-full rounded-xl border border-brand-200 bg-brand-50 p-6 text-center text-brand-700" role="alert">Chưa tải được sản phẩm trong danh mục này. <button type="button" onClick={() => setRetry(value => value + 1)} className="font-semibold underline">Thử lại</button></div>
          ) : (
            products.length > 0 ? (
              products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-brand-200 bg-brand-50 py-10 text-center text-brand-700">
                Chưa có sản phẩm trong danh mục này. <Link to="/products" className="font-semibold underline">Xem tất cả sản phẩm</Link>
              </div>
            )
          )}
        </div>

      </div>
    </section>
  );
};

export default ProductSection;
