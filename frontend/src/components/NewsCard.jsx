import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

const NewsCard = ({ news }) => {
  const imageUrl = news.thumbnail || news.image || 'https://placehold.co/600x400?text=No+Image';
  const date = new Date(news.createdAt).toLocaleDateString('vi-VN');
  const slugLink = `/news/${news.slug || news._id}`; // Ưu tiên dùng slug, nếu không có thì dùng id

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 flex flex-col h-full group">
      {/* ẢNH THUMBNAIL */}
      <Link to={slugLink} className="block overflow-hidden h-48 relative">
        <img 
          src={imageUrl} 
          alt={news.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </Link>
      
      {/* NỘI DUNG */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2 font-medium">
          <Calendar size={14} className="text-[#5a8c76]" />
          <span>{date}</span>
        </div>
        
        <Link to={slugLink}>
          <h3 className="font-bold text-gray-800 text-[16px] group-hover:text-[#5a8c76] line-clamp-2 leading-snug mb-2 transition-colors">
            {news.title}
          </h3>
        </Link>
        
        <p className="text-gray-500 text-sm line-clamp-3 mt-auto leading-relaxed">
          {/* Lọc bỏ các thẻ HTML nếu content đang lưu dạng Rich Text (CKEditor) */}
          {news.shortDescription || news.content?.replace(/<[^>]+>/g, '').substring(0, 150) + '...'}
        </p>
      </div>
    </div>
  );
};

export default NewsCard;