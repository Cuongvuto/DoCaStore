import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient'; 
import PageBanner from '../components/PageBanner'; 

const NewsPage = () => {
  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 1. Khai báo state cho phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Tối đa 9 bài mỗi trang

  // Gọi API lấy danh sách bài viết
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axiosClient.get('/news');
        // Backend trả về { success: true, data: [...] }
        setNewsList(response.data.data || []);
      } catch (error) {
        console.error("Lỗi tải tin tức:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  // 2. Tính toán dữ liệu hiển thị cho trang hiện tại
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = newsList.slice(indexOfFirstItem, indexOfLastItem);
  
  // Tính tổng số trang
  const totalPages = Math.ceil(newsList.length / itemsPerPage);

  // Hàm xử lý chuyển trang và cuộn lên top
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      
      {/* ======================================================== */}
      {/* COMPONENT BANNER TRÀN VIỀN */}
      {/* ======================================================== */}
      <PageBanner 
        title="TIN TỨC - KINH NGHIỆM" 
        breadcrumbs={[
          { name: 'Trang Chủ', link: '/' }, 
          { name: 'TIN TỨC - KINH NGHIỆM' }
        ]} 
      />

      {/* Khu vực chứa Grid bài viết */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-10 text-gray-500 font-bold flex justify-center items-center">
            <svg className="animate-spin h-5 w-5 mr-3 text-[#5a8c76]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang tải dữ liệu...
          </div>
        ) : newsList.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-medium">Chưa có bài viết nào sếp ạ.</div>
        ) : (
          <>
            {/* Grid bài viết - Sử dụng currentItems thay vì newsList */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentItems.map((item) => (
                <Link 
                  to={`/news/${item.slug}`} 
                  key={item._id} 
                  className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 hover:border-[#5a8c76]/50 transition-all duration-300 overflow-hidden group"
                >
                  {/* ẢNH THUMBNAIL */}
                  <div className="overflow-hidden">
                    <img 
                      src={item.thumbnail || "https://dummyimage.com/400x250/cccccc/000000.png&text=No+Image"} 
                      alt={item.title} 
                      className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = "https://dummyimage.com/400x250/cccccc/000000.png&text=No+Image"; 
                      }} 
                    />
                  </div>

                  {/* NỘI DUNG CARD */}
                  <div className="p-5">
                    {/* Tiêu đề */}
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-[#5a8c76] transition-colors mb-3 line-clamp-2">
                      {item.title}
                    </h3>
                    
                    {/* Mô tả ngắn */}
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {item.shortDescription}
                    </p>

                    {/* Ngày tháng */}
                    <p className="text-xs text-gray-400 mt-4 font-medium">
                      ⏰ {new Date(item.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* ======================================================== */}
            {/* 3. KHU VỰC NÚT PHÂN TRANG */}
            {/* ======================================================== */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                {/* Nút Trước */}
                <button 
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-[#5a8c76] hover:text-white hover:border-[#5a8c76]'
                  }`}
                >
                  Trước
                </button>

                {/* Các số trang */}
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => paginate(index + 1)}
                      className={`w-10 h-10 rounded font-bold transition-colors ${
                        currentPage === index + 1 
                        ? 'bg-[#5a8c76] text-white shadow-md' 
                        : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                {/* Nút Sau */}
                <button 
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    currentPage === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-[#5a8c76] hover:text-white hover:border-[#5a8c76]'
                  }`}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NewsPage;