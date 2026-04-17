import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Truck, ShieldCheck, CheckCircle, Package, ChevronRight } from 'lucide-react'; // Thêm Package icon
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import ReviewSection from '../../components/ReviewSection';
import { useCart } from '../../context/CartContext';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateCartCount } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('detail');
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const fetchProductData = async () => {
    try {
      const res = await axiosClient.get(`/product/${id}`);
      setProduct(res.data?.data || res.data);
    } catch (error) {
      toast.error("Không tìm thấy sản phẩm!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const handleAddToCart = async (isBuyNow = false) => {
    setAdding(true);
    try {
      await axiosClient.post('/cart', {
        product_id: product._id,
        quantity: quantity
      });
      updateCartCount();
      if (isBuyNow) {
        navigate('/checkout');
      } else {
        toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Sếp cần đăng nhập để mua hàng nhé!");
      } else {
        toast.error("Lỗi khi thêm vào giỏ hàng!");
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-medium text-[#5a8c76]">Đang tải siêu phẩm đồ câu...</div>;
  if (!product) return <div className="text-center py-20 text-gray-500">Sản phẩm không tồn tại!</div>;

  const allImages = product.images?.length > 0 ? product.images : [product.imageUrl];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-white">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8 overflow-x-auto whitespace-nowrap">
        <span>Trang chủ</span> <ChevronRight size={14} />
        <span>Sản phẩm</span> <ChevronRight size={14} />
        <span className="text-[#5a8c76] font-semibold">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* --- CỘT TRÁI: HÌNH ẢNH --- */}
        <div className="flex flex-col gap-4">
          <div className="aspect-square bg-[#f8f9fa] rounded-3xl border border-gray-100 overflow-hidden relative group shadow-inner">
            <img 
              src={allImages[activeImage]} 
              alt={product.name} 
              className="w-full h-full object-contain p-4 mix-blend-multiply transition-transform duration-700 group-hover:scale-110" 
            />
          </div>
          <div className="flex flex-wrap gap-3 justify-start">
            {allImages.map((img, index) => (
              <button
                key={index}
                onClick={() => setActiveImage(index)}
                className={`w-20 h-20 rounded-xl border-2 transition-all duration-300 overflow-hidden bg-gray-50 flex-shrink-0 ${
                  activeImage === index ? 'border-[#5a8c76] scale-105 shadow-md' : 'border-transparent hover:border-gray-200'
                }`}
              >
                <img src={img} className="w-full h-full object-cover" alt="thumbnail" />
              </button>
            ))}
          </div>
        </div>

        {/* --- CỘT PHẢI: THÔNG TIN MUA HÀNG --- */}
        <div className="flex flex-col pt-2">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4 leading-tight tracking-tight uppercase">
            {product.name}
          </h1>
          
          <div className="flex items-center gap-6 mb-8 py-4 border-y border-gray-50">
            <div className="flex items-center text-yellow-400 bg-yellow-50 px-3 py-1 rounded-full">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className={`${i < Math.round(product.ratings || 0) ? 'fill-current' : 'text-gray-300'}`} />
              ))}
              <span className="ml-2 text-yellow-700 font-bold">{product.ratings || 0}</span>
            </div>
            <span className="text-gray-400 text-sm font-medium">{product.numReviews || 0} Nhận xét</span>
            <div className="h-4 w-[1px] bg-gray-200" />
            <span className={`text-sm font-bold ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {product.stock > 0 ? '● Còn hàng' : '● Hết hàng'}
            </span>
          </div>

          <div className="mb-8">
            <span className="text-4xl font-black text-[#5a8c76]">
              {Number(product.price).toLocaleString('vi-VN')} <span className="text-xl">VNĐ</span>
            </span>
          </div>

          {/* 🟢 THAY ĐỔI Ở ĐÂY: ĐƯA THÔNG SỐ KỸ THUẬT LÊN CẠNH ẢNH */}
          <div className="bg-[#fcfdfc] p-6 rounded-2xl border border-[#e8f0ed] mb-8 animate-in fade-in duration-300">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-[#5a8c76]">
              <Package size={22} /> Thông số kĩ thuật cốt lõi
            </h3>
            {/* Sử dụng font-mono và whitespace-pre-line để giữ định dạng đẹp cho specs */}
            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed font-medium font-mono bg-white p-4 rounded-xl shadow-inner border border-gray-100">
              {product.specs || "Vui lòng liên hệ catalog để biết chi tiết kỹ thuật."}
            </div>
          </div>

          {/* Chọn số lượng */}
          <div className="flex items-center gap-6 mb-10 bg-gray-50 w-fit p-2 rounded-2xl border border-gray-100">
            <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-100">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 font-bold text-xl rounded-l-xl">-</button>
              <span className="w-12 text-center font-bold text-lg">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 font-bold text-xl rounded-r-xl">+</button>
            </div>
            <span className="text-xs text-gray-400 font-medium pr-4 italic">Kho: {product.stock}</span>
          </div>

          {/* Nút bấm hành động */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <button onClick={() => handleAddToCart(false)} disabled={adding || product.stock === 0} className="flex items-center justify-center gap-3 py-4 border-2 border-[#5a8c76] text-[#5a8c76] rounded-2xl font-black hover:bg-[#5a8c76] hover:text-white transition-all duration-300 disabled:opacity-50">
              <ShoppingCart size={20} /> THÊM VÀO GIỎ
            </button>
            <button onClick={() => handleAddToCart(true)} disabled={adding || product.stock === 0} className="flex items-center justify-center py-4 bg-[#5a8c76] text-white rounded-2xl font-black hover:bg-[#4a7562] shadow-xl shadow-green-100 transition-all duration-300 disabled:opacity-50">
              MUA NGAY
            </button>
          </div>

          {/* Cam kết */}
          <div className="grid grid-cols-3 gap-4 py-8 border-t border-gray-100 mt-auto">
            {[ { icon: Truck, text: 'Miễn phí ship', bg: 'bg-blue-50' }, { icon: ShieldCheck, text: 'Chính hãng', bg: 'bg-green-50' }, { icon: CheckCircle, text: 'Bảo hành 12th', bg: 'bg-orange-50' } ].map((item, i) => (
              <div key={i} className="flex flex-col items-center group cursor-default">
                <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center mb-2 group-hover:bg-[#5a8c76] group-hover:text-white transition-colors`}>
                  <item.icon size={20} />
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter text-center">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- PHẦN TABS --- */}
      <div className="border-t border-gray-100 pt-16">
        <div className="flex justify-center gap-12 mb-12 border-b border-gray-100">
          {['detail', 'reviews'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xl font-black pb-4 transition-all uppercase tracking-widest relative ${
                activeTab === tab ? 'text-[#5a8c76]' : 'text-gray-300 hover:text-gray-500'
              }`}
            >
              {tab === 'detail' ? 'Mô tả chi tiết' : `Đánh giá (${product.numReviews || 0})`}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5a8c76] rounded-full" />}
            </button>
          ))}
        </div>

        <div className="max-w-5xl mx-auto">
          {activeTab === 'detail' ? (
            // 🟢 THAY ĐỔI Ở ĐÂY: HIỂN THỊ MÔ TẢ DÀI (DESCRIPTION) TOÀN MÀN HÌNH
            <div className="animate-in fade-in duration-500">
              <h3 className="text-2xl font-bold mb-6 text-gray-800 uppercase tracking-tight">Đặc điểm nổi bật & Trải nghiệm</h3>
              {/* prose class của Tailwind giúp định dạng văn bản dài rất đẹp */}
              <div className="prose prose-slate max-w-none prose-lg text-gray-600 leading-relaxed whitespaces-pre-line font-medium">
                {product.description || "Chưa có bài viết mô tả chi tiết cho sản phẩm này."}
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <ReviewSection productId={product._id} onReviewAdded={fetchProductData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;