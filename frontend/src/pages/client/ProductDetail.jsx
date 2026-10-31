import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Package, ChevronRight, ImageOff, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import ReviewSection from '../../components/ReviewSection';
import { useCart } from '../../context/CartContext';
import { money } from '../../components/purchase/purchaseFormat';

function ProductImage({ src, name, primary = false }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-brand-700"><ImageOff size={32} aria-hidden="true" /><span className="text-sm">Chưa có ảnh</span></div>;
  return <img src={src} alt={name} width={primary ? 640 : 96} height={primary ? 640 : 96}
    loading={primary ? 'eager' : 'lazy'} fetchPriority={primary ? 'high' : undefined} decoding="async"
    onError={() => setBroken(true)} className={primary ? 'h-full w-full object-contain p-4' : 'h-full w-full object-cover'} />;
}

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
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const addLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axiosClient.get(`/product/${id}`, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setProduct(res.data?.data || null);
          setActiveImage(0);
          setQuantity(1);
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setProduct(null);
          setError(failure.response?.status === 404 ? 'Sản phẩm này không còn được bán.' : 'Chưa tải được sản phẩm. Vui lòng thử lại.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id, retry]);

  const refreshProduct = async () => {
    try {
      const res = await axiosClient.get(`/product/${id}`);
      setProduct(current => current?._id === id ? res.data?.data || current : current);
    } catch { /* The submitted review is still visible; keep the last product snapshot. */ }
  };

  const handleAddToCart = async (isBuyNow = false) => {
    if (!product || addLock.current || quantity < 1 || quantity > stock) return;
    addLock.current = true;
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
        toast.error('Vui lòng đăng nhập để mua hàng.');
      } else {
        toast.error(error.response?.data?.message || 'Chưa thể thêm vào giỏ hàng. Vui lòng thử lại.');
      }
    } finally {
      setAdding(false);
      addLock.current = false;
    }
  };

  if (loading || (product && product._id !== id)) return <div className="mx-auto max-w-7xl px-4 py-8" role="status" aria-label="Đang tải sản phẩm"><div className="grid gap-12 lg:grid-cols-2"><div className="aspect-square animate-pulse rounded-3xl bg-brand-100" /><div className="space-y-6 py-4"><div className="h-9 w-3/4 animate-pulse rounded bg-brand-100" /><div className="h-7 w-1/3 animate-pulse rounded bg-brand-100" /><div className="h-32 animate-pulse rounded bg-brand-100" /></div></div><span className="sr-only">Đang tải sản phẩm…</span></div>;
  if (!product) return <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center" role="alert"><ImageOff size={40} className="text-brand-700" aria-hidden="true" /><h1 className="text-2xl font-bold text-brand-700">Không thể hiển thị sản phẩm</h1><p className="text-brand-700">{error || 'Sản phẩm không tồn tại.'}</p><div className="flex flex-wrap justify-center gap-3"><button type="button" className="rounded-lg bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800" onClick={() => setRetry(value => value + 1)}>Thử lại</button><Link to="/products" className="rounded-lg border border-brand-700 px-5 py-3 font-semibold text-brand-700 hover:bg-brand-50">Xem sản phẩm khác</Link></div></div>;

  const allImages = product.images?.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const stock = Math.max(0, Number(product.stock) || 0);
  const selectedImage = allImages[activeImage] || allImages[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-white">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 overflow-x-auto text-sm text-brand-700" aria-label="Đường dẫn">
        <Link to="/" className="shrink-0 hover:underline">Trang chủ</Link><ChevronRight size={14} aria-hidden="true" />
        <Link to="/products" className="shrink-0 hover:underline">Sản phẩm</Link><ChevronRight size={14} aria-hidden="true" />
        <span className="min-w-0 truncate font-semibold" aria-current="page">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* --- CỘT TRÁI: HÌNH ẢNH --- */}
        <div className="flex flex-col gap-4">
          <div className="aspect-square overflow-hidden rounded-3xl border border-brand-200 bg-brand-50" aria-live="polite">
            <ProductImage key={selectedImage || 'empty'} src={selectedImage} name={product.name} primary />
          </div>
          <div className="flex flex-wrap gap-3 justify-start">
            {allImages.map((img, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`Xem ảnh ${index + 1} của ${product.name}`}
                aria-pressed={activeImage === index}
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-brand-50 transition-[border-color,transform] duration-200 ${
                  activeImage === index ? 'border-brand-700 scale-105 shadow-md' : 'border-transparent hover:border-gray-200'
                }`}
              >
                <ProductImage src={img} name={`Ảnh ${index + 1} của ${product.name}`} />
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
            <span className={`text-sm font-bold ${stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {stock > 0 ? '● Còn hàng' : '● Hết hàng'}
            </span>
          </div>

          <div className="mb-8">
            <strong className="text-4xl font-black text-brand-700">{money(product.price)}</strong>
          </div>

          {/* Chọn số lượng */}
          <div className="mb-10 flex w-fit flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-2" role="group" aria-label="Chọn số lượng">
            <div className="flex items-center rounded-xl border border-brand-200 bg-white shadow-sm">
              <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={stock === 0 || quantity <= 1 || adding} aria-label="Giảm số lượng" className="flex h-12 w-12 items-center justify-center rounded-l-xl text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"><Minus size={18} aria-hidden="true" /></button>
              <span className="w-12 text-center text-lg font-bold tabular-nums" aria-live="polite">{quantity}</span>
              <button type="button" onClick={() => setQuantity(q => Math.min(stock, q + 1))} disabled={stock === 0 || quantity >= stock || adding} aria-label="Tăng số lượng" className="flex h-12 w-12 items-center justify-center rounded-r-xl text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={18} aria-hidden="true" /></button>
            </div>
            <span className="pr-2 text-sm font-medium text-brand-700">Kho: {stock}</span>
          </div>

          {/* Nút bấm hành động */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <button type="button" onClick={() => handleAddToCart(false)} disabled={adding || stock === 0 || quantity > stock} className="flex items-center justify-center gap-3 rounded-2xl border-2 border-brand-700 py-4 font-bold text-brand-700 transition-colors duration-200 hover:bg-brand-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
              <ShoppingCart size={20} aria-hidden="true" /> {adding ? 'Đang thêm…' : 'Thêm vào giỏ'}
            </button>
            <button type="button" onClick={() => handleAddToCart(true)} disabled={adding || stock === 0 || quantity > stock} className="flex items-center justify-center rounded-2xl bg-sand-400 py-4 font-bold text-brand-700 transition-colors duration-200 hover:bg-sand-300 disabled:cursor-not-allowed disabled:opacity-50">
              {adding ? 'Đang xử lý…' : 'Mua ngay'}
            </button>
          </div>

          <div className="mb-8 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-brand-700">
              <Package size={22} aria-hidden="true" /> Thông số kỹ thuật
            </h2>
            <div className="whitespace-pre-line break-words rounded-xl border border-brand-200 bg-white p-4 text-sm leading-relaxed text-brand-700">
              {product.specs || 'Sản phẩm chưa có thông số kỹ thuật. Vui lòng liên hệ cửa hàng để biết thêm.'}
            </div>
          </div>
        </div>
      </div>

      {/* --- PHẦN TABS --- */}
      <div className="border-t border-gray-100 pt-16">
        <div className="mb-12 flex flex-wrap justify-center gap-6 border-b border-gray-100 sm:gap-12" role="tablist" aria-label="Thông tin sản phẩm">
          {['detail', 'reviews'].map((tab) => (
            <button 
              key={tab}
              type="button"
              id={`product-tab-${tab}`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`product-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onKeyDown={(event) => {
                const tabs = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
                const current = tabs.indexOf(event.currentTarget);
                const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length
                  : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length
                    : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                if (next < 0) return;
                event.preventDefault();
                tabs[next].focus();
                setActiveTab(next === 0 ? 'detail' : 'reviews');
              }}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-4 text-base font-bold transition-colors sm:text-lg ${
                activeTab === tab ? 'text-brand-700' : 'text-brand-700/70 hover:text-brand-700'
              }`}
            >
              {tab === 'detail' ? 'Mô tả chi tiết' : `Đánh giá (${product.numReviews || 0})`}
              {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-brand-700" aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="max-w-5xl mx-auto" id={`product-panel-${activeTab}`} role="tabpanel" aria-labelledby={`product-tab-${activeTab}`}>
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
              <ReviewSection productId={product._id} onReviewAdded={refreshProduct} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
