import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Newspaper } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import NewsCard from './NewsCard';

const LatestNews = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        // Gọi API lấy 3 bài báo mới nhất
        const res = await axiosClient.get('/news?limit=3');
        const data = res.data?.data || [];
        
        setNewsList(data.slice(0, 3)); 
      } catch (error) {
        console.error("Lỗi lấy tin tức:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  // Ẩn nếu không có tin tức nào
  if (!loading && newsList.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-2xl font-black text-gray-800 uppercase relative inline-flex items-center gap-2">
            <Newspaper className="text-[#5a8c76]" size={28} />
            Góc chia sẻ
            <span className="absolute bottom-0 left-0 w-1/2 h-1 bg-[#5a8c76] rounded-full mt-2"></span>
          </h2>
          <Link 
            to="/news" 
            className="flex items-center text-sm font-semibold text-[#5a8c76] hover:text-yellow-500 transition-colors group"
          >
            Xem tất cả
            <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-80 animate-pulse border border-gray-100 shadow-sm"></div>
            ))
          ) : (
            newsList.map(news => <NewsCard key={news._id} news={news} />)
          )}
        </div>
      </div>
    </section>
  );
};

export default LatestNews;