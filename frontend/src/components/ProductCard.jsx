import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext'; 
import axiosClient from '../api/axiosClient';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'sonner';

const ProductCard = ({ product }) => {
  const { cartCount, updateCartCount } = useCart();
  const { wishlist, setWishlist } = useWishlist(); 
  const inWishlist = wishlist.includes(product._id);

  // Lấy số lượng
  const stock = product.quantity ?? product.countInStock ?? product.stock ?? 0;
  const isOutOfStock = stock <= 0;

  const handleAddToCart = async (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    
    if (isOutOfStock) {
      toast.error("Sản phẩm này hiện đã hết hàng!");
      return;
    }
    
    try {
      await axiosClient.post('/cart', { 
        product_id: product._id, 
        quantity: 1 
      });
      updateCartCount();
      toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
    } catch (error) {
      console.error("Lỗi khi thêm giỏ hàng:", error);
      if (error.response?.status === 401) {
        toast.error("Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng!");
      } else {
        toast.error("Có lỗi xảy ra. Không thể thêm vào giỏ hàng lúc này.");
      }
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    try {
      const response = await axiosClient.post('/wishlist/toggle', { productId: product._id });
      if (inWishlist) {
        setWishlist(wishlist.filter(id => id !== product._id));
      } else {
        setWishlist([...wishlist, product._id]);
      }
      toast.success(response?.data?.message || "Đã cập nhật danh sách yêu thích!");
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Bạn cần đăng nhập để sử dụng tính năng này!");
      } else {
         toast.error("Có lỗi xảy ra, vui lòng thử lại sau!");
      }
    }
  };

  const imageUrl = (Array.isArray(product.images) && product.images.length > 0)
    ? product.images[0] 
    : (product.imageUrl || product.image || 'https://placehold.co/500x500?text=No+Image');

  return (
    <div className="group bg-white rounded-xl hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 flex flex-col h-full relative p-3">
      
      {/* NÚT YÊU THÍCH */}
      <button 
        onClick={handleToggleWishlist}
        className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white hover:scale-110 transition-all shadow-sm"
      >
        <Star size={18} className={`transition-colors duration-300 ${inWishlist ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-none'}`} />
      </button>

      {/* ẢNH SẢN PHẨM - Đã fix theo thông số của sếp */}
      {/* h-[285px]: Ép chiều cao chuẩn theo web mẫu */}
      {/* flex items-center justify-center p-2: Để ảnh luôn nằm giữa và có khoảng thở (padding) */}
      <Link to={`/product/${product._id}`} className="block relative w-full h-[285px] flex items-center justify-center p-2 overflow-hidden rounded-lg">
        <img 
          src={imageUrl} 
          alt={product.name} 
          // object-contain: Bí quyết để ảnh hiển thị full 100% không bị cắt góc
          className={`w-full h-full object-contain transition-transform duration-500 ${
            isOutOfStock ? 'opacity-70 grayscale-[30%]' : 'group-hover:scale-105'
          }`}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/500x500?text=No+Image';
          }}
        />
      </Link>
      
      {/* THÔNG TIN SẢN PHẨM - Căn giữa giống web mẫu */}
      <div className="pt-4 pb-2 flex flex-col flex-grow justify-between text-center gap-2">
        
        <div className="flex flex-col items-center">
          {/* Tên sản phẩm */}
          <Link to={`/product/${product._id}`}>
            <h3 className="text-gray-800 font-bold text-[14px] hover:text-[#5a8c76] line-clamp-2 transition-colors leading-relaxed px-2">
              {product.name}
            </h3>
          </Link>
          
          {/* Trạng thái Hết hàng / Còn hàng */}
          <div className="mt-2 h-6"> 
            {isOutOfStock ? (
              <span className="text-[13px] font-black text-red-600 uppercase tracking-wide">
                Hết hàng
              </span>
            ) : (
              <span className="text-[12px] font-medium text-[#5a8c76]">
                Kho: <span className="font-bold">{stock}</span>
              </span>
            )}
          </div>
        </div>
        
        {/* GIÁ & NÚT THÊM GIỎ HÀNG */}
        <div className="flex items-center justify-between pt-3 mt-auto px-2">
          <span className={`font-black text-[16px] ${isOutOfStock ? 'text-gray-400 line-through' : 'text-[#5a8c76]'}`}>
            {product.price?.toLocaleString('vi-VN')} đ
          </span>
          
          <button 
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`p-2.5 rounded-full transition-all shadow-sm ${
              isOutOfStock 
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                : 'bg-[#5a8c76] text-white hover:bg-yellow-400 hover:text-[#5a8c76] hover:-translate-y-1'
            }`}
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;