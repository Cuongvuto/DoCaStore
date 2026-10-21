import Pagination from '../components/Pagination';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient'; 
import { ChevronRight } from 'lucide-react';
import OceanHero from '../components/OceanHero';
import './StoreInfo.css';

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
    <div className="store-info-page w-full min-h-screen">
      
      {/* ======================================================== */}
      {/* COMPONENT BANNER TRÀN VIỀN */}
      {/* ======================================================== */}
      <OceanHero>
        <div className="store-info-container">
          <nav className="store-info-breadcrumb" aria-label="Đường dẫn">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">Tin tức & kinh nghiệm</span>
          </nav>
          <p className="store-info-eyebrow">GÓC CHIA SẺ DOCASTORE</p>
          <h1>Tin tức & kinh nghiệm<br /><span>Cho mỗi chuyến câu thêm trọn vẹn.</span></h1>
          <p className="store-info-lead">Khám phá đồ nghề, chia sẻ kinh nghiệm câu cá và cập nhật những câu chuyện mới từ DocaStore.</p>
        </div>
      </OceanHero>

      {/* Khu vực chứa Grid bài viết */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-10 text-gray-500 font-bold flex justify-center items-center">
            <svg className="animate-spin h-5 w-5 mr-3 text-brand-700" viewBox="0 0 24 24">
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
                  className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 hover:border-brand-700/50 transition-all duration-300 overflow-hidden group"
                >
                  {/* ẢNH THUMBNAIL */}
                  <div className="overflow-hidden">
                    <img 
                      src={item.thumbnail || "https://dummyimage.com/400x250/cccccc/000000.png&text=No+Image"} 
                      alt={item.title} 
                      className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = "https://dummyimage.com/400x250/cccccc/000000.png&text=No+Image"; 
                      }} 
                    />
                  </div>

                  {/* NỘI DUNG CARD */}
                  <div className="p-5">
                    {/* Tiêu đề */}
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-brand-700 transition-colors mb-3 line-clamp-2">
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
            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={paginate} label="Phân trang tin tức" />
          </>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
