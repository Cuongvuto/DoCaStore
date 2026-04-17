import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, Filter } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ProductCard from '../components/ProductCard';

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 15;

  // State mới cho Tìm kiếm và Sắp xếp
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('default');

  // Lấy dữ liệu từ API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get('/product');
        const data = response.data.data || response.data;
        setProducts(data);
      } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Đưa về trang 1 mỗi khi gõ tìm kiếm hoặc đổi kiểu sắp xếp
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder]);

  // --- LOGIC LỌC (TÌM KIẾM) & SẮP XẾP ---
  // 1. Lọc theo tên sản phẩm
  let processedProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Sắp xếp giá
  if (sortOrder === 'asc') {
    processedProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortOrder === 'desc') {
    processedProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  // --- LOGIC PHÂN TRANG (Dựa trên danh sách đã lọc & sắp xếp) ---
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = processedProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(processedProducts.length / productsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4 bg-gray-50">
        <Loader2 className="animate-spin text-[#5a8c76]" size={40} />
        <p className="text-gray-500 font-medium italic">Đang tải đồ nghề cho sếp...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      
      {/* --- BANNER TRANG (Có hỗ trợ ảnh nền) --- */}
      <div 
        className="relative bg-[#5a8c76] py-16 mb-8 shadow-inner bg-cover bg-center"
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a8c76]/40 focus:border-[#5a8c76] transition-all text-sm font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

          {/* Ô Sắp Xếp */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter size={20} className="text-gray-400 hidden md:block" />
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full md:w-auto px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a8c76]/40 focus:border-[#5a8c76] text-gray-700 cursor-pointer text-sm font-medium transition-all"
            >
              <option value="default">Mới nhất / Mặc định</option>
              <option value="asc">Giá: Thấp đến Cao</option>
              <option value="desc">Giá: Cao đến Thấp</option>
            </select>
          </div>
          
        </div>

        {/* --- HIỂN THỊ DANH SÁCH SẢN PHẨM --- */}
        {processedProducts.length > 0 ? (
          <p className="text-gray-500 mb-4 text-sm font-medium">
            Tìm thấy <strong className="text-[#5a8c76]">{processedProducts.length}</strong> sản phẩm phù hợp
          </p>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {currentProducts.length > 0 ? (
            currentProducts.map((product) => (
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
        {totalPages > 1 && (
          <div className="mt-16 flex justify-center items-center gap-3">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2.5 rounded-xl border transition-all ${
                currentPage === 1 
                ? 'text-gray-300 border-gray-100 cursor-not-allowed bg-white' 
                : 'text-[#5a8c76] border-[#5a8c76] bg-white hover:bg-[#5a8c76] hover:text-white shadow-sm'
              }`}
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, i) => {
                // Logic rút gọn số trang (Chỉ hiển thị vài trang gần nhất nếu quá nhiều)
                if (totalPages > 5 && Math.abs(currentPage - (i + 1)) > 1 && i !== 0 && i !== totalPages - 1) {
                  if (i === 1 || i === totalPages - 2) return <span key={i} className="px-1 text-gray-400 self-end">...</span>;
                  return null;
                }
                
                return (
                  <button
                    key={i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    className={`w-11 h-11 rounded-xl font-bold text-sm transition-all shadow-sm ${
                      currentPage === i + 1 
                      ? 'bg-[#5a8c76] text-white scale-110 shadow-green-200' 
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-[#5a8c76] hover:text-[#5a8c76]'
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>

            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2.5 rounded-xl border transition-all ${
                currentPage === totalPages 
                ? 'text-gray-300 border-gray-100 cursor-not-allowed bg-white' 
                : 'text-[#5a8c76] border-[#5a8c76] bg-white hover:bg-[#5a8c76] hover:text-white shadow-sm'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;