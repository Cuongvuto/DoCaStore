import Pagination from '../components/Pagination';
import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Loader2, Search, Filter } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ProductCard from '../components/ProductCard';
import useDebouncedValue from '../hooks/useDebouncedValue';

const ProductPageContent = ({ initialSearch = '' }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const productsPerPage = 15;

  // State mới cho Tìm kiếm và Sắp xếp
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortOrder, setSortOrder] = useState('default');
  const debouncedSearch = useDebouncedValue(searchTerm, 350);

  // Lấy dữ liệu từ API
  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get('/product', {
          params: {
            page: currentPage,
            limit: productsPerPage,
            search: debouncedSearch || undefined,
            sort: sortOrder === 'default' ? undefined : sortOrder
          },
          signal: controller.signal
        });
        setProducts(response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalCount(response.data.totalCount || 0);
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          console.error("Lỗi tải sản phẩm:", error);
          setProducts([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchProducts();
    return () => controller.abort();
  }, [currentPage, debouncedSearch, sortOrder]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4 bg-gray-50">
        <Loader2 className="animate-spin text-brand-700" size={40} />
        <p className="text-gray-500 font-medium italic">Đang tải đồ nghề cho sếp...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      
      {/* --- BANNER TRANG (Có hỗ trợ ảnh nền) --- */}
      <div 
        className="relative bg-brand-700 py-16 mb-8 shadow-inner bg-cover bg-center"
        // Sếp đổi tên 'banner-bg.jpg' thành tên ảnh thật của sếp trong thư mục public nhé!
        style={{ backgroundImage: "url('/banner-bg.jpg')" }} 
      >
        {/* Lớp phủ mờ (overlay) để chữ trắng dễ đọc hơn trên nền ảnh */}
        <div className="absolute inset-0 bg-black/50"></div> 
        
        <div className="relative max-w-7xl mx-auto px-4 text-center z-10">
          <h1 className="text-4xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg">
            Tất cả sản phẩm
          </h1>
          <div className="h-1.5 w-24 bg-yellow-400 mx-auto mt-5 rounded-full shadow-md"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* --- THANH TÌM KIẾM VÀ SẮP XẾP --- */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
          
          {/* Ô Tìm Kiếm */}
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Sếp muốn tìm món gì..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700/40 focus:border-brand-700 transition-all text-sm font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

          {/* Ô Sắp Xếp */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter size={20} className="text-gray-400 hidden md:block" />
            <select 
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-auto px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700/40 focus:border-brand-700 text-gray-700 cursor-pointer text-sm font-medium transition-all"
            >
              <option value="default">Mới nhất / Mặc định</option>
              <option value="price_asc">Giá: Thấp đến Cao</option>
              <option value="price_desc">Giá: Cao đến Thấp</option>
            </select>
          </div>
          
        </div>

        {/* --- HIỂN THỊ DANH SÁCH SẢN PHẨM --- */}
        {totalCount > 0 ? (
          <p className="text-gray-500 mb-4 text-sm font-medium">
            Tìm thấy <strong className="text-brand-700">{totalCount}</strong> sản phẩm phù hợp
          </p>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
              <Search size={48} className="text-gray-200 mb-4" />
              <p className="text-lg font-medium">Không tìm thấy món đồ nghề nào như sếp yêu cầu!</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Xóa tìm kiếm
              </button>
            </div>
          )}
        </div>

        {/* --- THANH PHÂN TRANG --- */}
        <Pagination currentPage={currentPage} totalPages={totalPages} onChange={handlePageChange} label="Phân trang sản phẩm" />
      </div>
    </div>
  );
};

export default function ProductPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  return <ProductPageContent key={location.key} initialSearch={search} />;
}
