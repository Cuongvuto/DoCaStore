import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Search, Filter } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ProductCard from '../components/ProductCard';

const CategoryPage = () => {
  const { slug } = useParams(); // Nhận slug (hoặc ID) từ URL
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 15;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('default');

  // --- GỌI API THEO HÀM MỚI ---
  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true);
        // Gọi thẳng vào API dành riêng cho Category vừa tạo ở Backend
        const response = await axiosClient.get(`/product/category/${slug}`);
        
        // Trích xuất dữ liệu từ response (response.data.data)
        const fetchedProducts = response.data?.data || [];
        setProducts(fetchedProducts);
        
      } catch (error) {
        console.error("Lỗi tải sản phẩm theo danh mục:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (slug) {
      fetchCategoryProducts();
    }
    
    // Reset lại state khi chuyển sang danh mục khác
    setCurrentPage(1);
    setSearchTerm('');
    setSortOrder('default');
  }, [slug]);

  // Đưa về trang 1 mỗi khi gõ tìm kiếm hoặc đổi kiểu sắp xếp
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder]);

  // --- LOGIC LỌC (TÌM KIẾM) & SẮP XẾP ---
  let processedProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (sortOrder === 'asc') {
    processedProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortOrder === 'desc') {
    processedProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  // --- LOGIC PHÂN TRANG ---
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = processedProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(processedProducts.length / productsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- LẤY TÊN DANH MỤC ĐỂ HIỂN THỊ BANNER ---
  const displayCategoryName = products.length > 0 && products[0].category_id?.name 
    ? products[0].category_id.name 
    : 'Danh Mục Sản Phẩm';

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
      
      {/* --- BANNER --- */}
      <div 
        className="relative bg-[#5a8c76] py-16 mb-8 shadow-inner bg-cover bg-center"
        style={{ backgroundImage: "url('/banner-bg.jpg')" }} 
      >
        <div className="absolute inset-0 bg-black/50"></div> 
        <div className="relative max-w-7xl mx-auto px-4 text-center z-10">
          <h1 className="text-4xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg">
            {displayCategoryName}
          </h1>
          <div className="h-1.5 w-24 bg-yellow-400 mx-auto mt-5 rounded-full shadow-md"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* --- THANH TÌM KIẾM & SẮP XẾP --- */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a8c76]/40 focus:border-[#5a8c76] transition-all text-sm font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

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

        {/* --- KẾT QUẢ SẢN PHẨM --- */}
        {processedProducts.length > 0 ? (
          <p className="text-gray-500 mb-4 text-sm font-medium">
            Tìm thấy <strong className="text-[#5a8c76]">{processedProducts.length}</strong> sản phẩm
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
              <p className="text-lg font-medium">Chưa có sản phẩm nào trong danh mục này!</p>
            </div>
          )}
        </div>

        {/* --- PHÂN TRANG --- */}
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
            
            <span className="font-medium text-gray-700">Trang {currentPage} / {totalPages}</span>
            
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

export default CategoryPage;