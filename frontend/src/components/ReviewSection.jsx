import { useState, useEffect } from 'react';
import { Star, Send, User, Calendar } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { toast } from 'sonner';

const ReviewSection = ({ productId, onReviewAdded }) => {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setReviewsLoading(true);
      setReviewsError(false);
      try {
        const res = await axiosClient.get(`/reviews/product/${productId}`, { signal: controller.signal });
        if (!controller.signal.aborted) setReviews(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch {
        if (!controller.signal.aborted) setReviewsError(true);
      } finally {
        if (!controller.signal.aborted) setReviewsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [productId, retry]);

  // 2. Xử lý gửi đánh giá mới
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!comment.trim()) return toast.error('Vui lòng nhập nội dung đánh giá.');

    setLoading(true);
    try {
      await axiosClient.post('/reviews/add', {
        productId,
        rating,
        comment
      });
      
      toast.success('Đã gửi đánh giá. Cảm ơn bạn!');
      setComment('');
      setRating(5);
      setRetry(value => value + 1);
      onReviewAdded?.();
    } catch (error) {
      toast.error(error.response?.status === 401 ? 'Vui lòng đăng nhập để gửi đánh giá.' : error.response?.data?.message || 'Chưa gửi được đánh giá. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 space-y-10">
      {/* --- PHẦN 1: FORM VIẾT ĐÁNH GIÁ --- */}
      <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Viết đánh giá</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Chọn sao */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn mức đánh giá">
            <span className="text-sm text-gray-600 mr-2">Chất lượng:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} trên 5 sao`}
                aria-pressed={rating === star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="rounded-md p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={28}
                  className={`${
                    (hover || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  } transition-colors`}
                />
              </button>
            ))}
            <span className="ml-2 font-bold text-yellow-600">{rating}/5</span>
          </div>

          {/* Ô nhập text */}
          <div className="relative">
            <label htmlFor="product-review-comment" className="mb-2 block text-sm font-medium text-gray-700">Nội dung đánh giá</label>
            <textarea
              id="product-review-comment"
              name="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              maxLength={2000}
              placeholder="Chia sẻ trải nghiệm sử dụng sản phẩm…"
              className="min-h-[120px] w-full rounded-xl border border-gray-200 p-4 pb-14 text-sm focus:border-brand-700"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label={loading ? 'Đang gửi đánh giá' : 'Gửi đánh giá'}
              className="absolute bottom-5 right-3 rounded-lg bg-brand-700 p-2 text-white shadow-md transition-colors hover:bg-brand-800 disabled:cursor-wait disabled:opacity-50"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>

      {/* --- PHẦN 2: DANH SÁCH COMMENT --- */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          Khách hàng nói gì ({reviews.length})
        </h3>
        
        {reviewsLoading ? <p className="text-brand-700" role="status">Đang tải đánh giá…</p> : reviewsError ? (
          <div role="alert" className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-brand-700">Chưa tải được đánh giá. <button type="button" className="font-semibold underline" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>
        ) : reviews.length === 0 ? (
          <p className="text-gray-600">Chưa có đánh giá nào cho sản phẩm này.</p>
        ) : (
          reviews.map((rev) => (
            <div key={rev._id} className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
              {/* Avatar khách */}
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-700">
                {rev.userId?.avatar ? (
                    <img src={rev.userId.avatar} alt={`Ảnh đại diện của ${rev.userId?.name || 'khách hàng'}`} width={48} height={48} loading="lazy" decoding="async" className="w-full h-full rounded-full object-cover" />
                ) : (
                    <User size={24} />
                )}
              </div>

              {/* Nội dung comment */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-gray-800">{rev.userId?.name || "Khách ẩn danh"}</h4>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Calendar size={12} aria-hidden="true" /> {new Intl.DateTimeFormat('vi-VN').format(new Date(rev.createdAt))}
                  </span>
                </div>

                {/* Hiện số sao khách đã đánh giá */}
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={14} 
                      className={i < rev.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} 
                    />
                  ))}
                </div>

                <p className="break-words text-sm leading-relaxed text-gray-600">
                  {rev.comment}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
