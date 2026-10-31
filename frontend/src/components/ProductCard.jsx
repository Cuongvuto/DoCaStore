import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext'; 
import axiosClient from '../api/axiosClient';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'sonner';
import { money } from './purchase/purchaseFormat';

const ProductCard = ({ product }) => {
  const { updateCartCount } = useCart();
  const { wishlist, setWishlist } = useWishlist(); 
  const inWishlist = wishlist.includes(product._id);
  const [imageBroken, setImageBroken] = useState(false);
  const [adding, setAdding] = useState(false);
  const addLock = useRef(false);

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
    if (addLock.current) return;
    addLock.current = true;
    setAdding(true);
    
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
    } finally {
      addLock.current = false;
      setAdding(false);
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    try {
      const response = await axiosClient.post('/wishlist/toggle', { productId: product._id });
      if (inWishlist) {
        setWishlist(current => current.filter(id => id !== product._id));
      } else {
        setWishlist(current => current.includes(product._id) ? current : [...current, product._id]);
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
    : (product.imageUrl || product.image || '');

  return (
    <div className="group bg-white rounded-xl hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 flex flex-col h-full relative p-3">
      
      {/* NÚT YÊU THÍCH */}
      <button 
        onClick={handleToggleWishlist}
        className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white hover:scale-110 transition-all shadow-sm"
        aria-label={inWishlist ? `Bỏ ${product.name} khỏi yêu thích` : `Thêm ${product.name} vào yêu thích`}
        aria-pressed={inWishlist}
      >
        <Star size={18} className={`transition-colors duration-300 ${inWishlist ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-none'}`} />
      </button>

      <Link to={`/product/${product._id}`} className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-brand-100 bg-brand-50/50 p-1 sm:p-2">
        {imageUrl && !imageBroken ? <img
          src={imageUrl} 
          alt={product.name} 
          width={500}
          height={500}
          loading="lazy"
          decoding="async"
          // object-contain: Bí quyết để ảnh hiển thị full 100% không bị cắt góc
          className={`w-full h-full object-contain transition-transform duration-500 ${
            isOutOfStock ? 'opacity-70 grayscale-[30%]' : 'group-hover:scale-105'
          }`}
          onError={() => setImageBroken(true)}
        /> : <span className="flex flex-col items-center gap-2 text-sm text-brand-700"><ImageOff size={30} aria-hidden="true" />Chưa có ảnh</span>}
      </Link>
      
      {/* THÔNG TIN SẢN PHẨM - Căn giữa giống web mẫu */}
      <div className="pt-4 pb-2 flex flex-col flex-grow justify-between text-center gap-2">
        
        <div className="flex flex-col items-center">
          {/* Tên sản phẩm */}
          <Link to={`/product/${product._id}`}>
            <h3 className="text-gray-800 font-bold text-[14px] hover:text-brand-700 line-clamp-2 transition-colors leading-relaxed px-2">
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
              <span className="text-[12px] font-medium text-brand-700">
                Kho: <span className="font-bold">{stock}</span>
              </span>
            )}
          </div>
        </div>
        
        {/* GIÁ & NÚT THÊM GIỎ HÀNG */}
        <div className="mt-auto flex flex-col items-stretch gap-2 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <span className={`whitespace-nowrap text-left text-sm font-black tabular-nums sm:text-base ${isOutOfStock ? 'text-gray-400 line-through' : 'text-brand-700'}`}>
            {money(product.price)}
          </span>
          
          <button 
            onClick={handleAddToCart}
            disabled={isOutOfStock || adding}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            className={`self-end rounded-full p-2.5 shadow-sm transition-[background-color,color,transform] sm:self-auto ${
              isOutOfStock 
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                : 'bg-brand-700 text-white hover:bg-yellow-400 hover:text-brand-700 hover:-translate-y-1'
            }`}
          >
            <ShoppingCart size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
