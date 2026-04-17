import React, { useState, useEffect } from 'react';
import { Star, Send, User, Calendar } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { toast } from 'sonner';

const ReviewSection = ({ productId, onReviewAdded }) => {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Lấy danh sách đánh giá từ API
  const fetchReviews = async () => {
    try {
      const res = await axiosClient.get(`/reviews/product/${productId}`);
      setReviews(res.data.data);
    } catch (error) {
      console.error("Lỗi lấy review:", error);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  // 2. Xử lý gửi đánh giá mới
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return toast.error("Sếp ơi, nhập vài chữ cảm nhận đã!");

    setLoading(true);
    try {
      await axiosClient.post('/reviews/add', {
        productId,
        rating,
        comment
      });
      
      toast.success("Đánh giá thành công! Cảm ơn sếp.");
      setComment('');
      setRating(5);
      fetchReviews(); // Load lại danh sách
      if (onReviewAdded) onReviewAdded(); // Báo cho trang cha cập nhật số sao trung bình
    } catch (error) {
      const msg = error.response?.data?.message || "Lỗi khi gửi đánh giá";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 space-y-10">
      {/* --- PHẦN 1: FORM VIẾT ĐÁNH GIÁ --- */}
      <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Viết đánh giá của sếp</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Chọn sao */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Chất lượng:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-125"
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
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cần câu này bén không sếp? Chia sẻ trải nghiệm cho anh em biết nhé..."
              className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5a8c76] focus:border-transparent outline-none min-h-[100px] text-sm"
            />
            <button
              disabled={loading}
              className="absolute bottom-3 right-3 bg-[#5a8c76] text-white p-2 rounded-lg hover:bg-[#4a7562] disabled:bg-gray-400 transition-all shadow-md"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* --- PHẦN 2: DANH SÁCH COMMENT --- */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          Khách hàng nói gì ({reviews.length})
        </h3>
        
        {reviews.length === 0 ? (
          <p className="text-gray-400 italic">Chưa có ai đánh giá sản phẩm này. Sếp là người đầu tiên đi!</p>
        ) : (
          reviews.map((rev) => (
            <div key={rev._id} className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
              {/* Avatar khách */}
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-[#5a8c76]">
                {rev.userId?.avatar ? (
                    <img src={rev.userId.avatar} className="w-full h-full rounded-full object-cover" />
                ) : (
                    <User size={24} />
                )}
              </div>

              {/* Nội dung comment */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-gray-800">{rev.userId?.name || "Khách ẩn danh"}</h4>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
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

                <p className="text-gray-600 text-sm leading-relaxed">
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