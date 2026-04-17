import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import PageBanner from '../components/PageBanner';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard'; 

const WishlistPage = () => {
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Lấy mảng wishlist (chứa các ID) từ context
  const { wishlist } = useWishlist();

  const fetchFullWishlist = async () => {
    const token = localStorage.getItem('token');
      if (!token) {
      setFavoriteItems([]);
      setIsLoading(false);
      return; // Chưa đăng nhập không gọi API
  }
    try {
      setIsLoading(true);
      const res = await axiosClient.get('/wishlist');
      setFavoriteItems(res.data.data || []);
    } catch (error) {
      console.error("Lỗi tải danh sách yêu thích:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFullWishlist();
  }, []);

  // Chỉ hiển thị những sản phẩm mà ID của nó vẫn còn nằm trong mảng wishlist của Context.
  // Khi  bấm bỏ tim ở ProductCard -> ProductCard xóa ID khỏi context -> Giao diện tự động lọc mất sản phẩm
  const displayedItems = favoriteItems.filter(item => wishlist.includes(item._id));

  return (
    <div className="w-full bg-gray-50 min-h-screen pb-20">
      <PageBanner 
        title="SẢN PHẨM YÊU THÍCH" 
        breadcrumbs={[
          { name: 'Trang Chủ', link: '/' }, 
          { name: 'Yêu thích' }
        ]} 
      />

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
           <div className="flex flex-col justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-[#5a8c76] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500 font-medium">Đang tải danh sách yêu thích...</p>
           </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-[#5a8c76] mb-4 uppercase">Danh sách trống</h2>
            <p className="text-gray-500 mb-8 font-medium">Sếp chưa lưu sản phẩm nào vào danh sách yêu thích.</p>
            <Link 
              to="/products" 
              className="bg-[#5a8c76] text-white px-8 py-3 rounded-full hover:bg-yellow-400 hover:text-[#5a8c76] font-bold transition-all shadow-md active:scale-95 uppercase tracking-wide"
            >
              Khám phá ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
            {/* Truyền thẳng data vào ProductCard để nó tự lo liệu phần hiển thị */}
            {displayedItems.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;