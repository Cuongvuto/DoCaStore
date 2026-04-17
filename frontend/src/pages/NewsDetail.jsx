import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient'; 
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import PageBanner from '../components/PageBanner'; 

const NewsDetail = () => {
  const { slug } = useParams(); 
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]); 
  const [loading, setLoading] = useState(true);
  const isFetched = useRef(false);

  // ==========================================
  const [showReviewForm, setShowReviewForm] = useState(false); // Ẩn/hiện form
  const [userRating, setUserRating] = useState(0); // Số sao user click chọn
  const [userComment, setUserComment] = useState(""); // Nội dung bình luận
  const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái đang gửi API
  const fetchedSlug = useRef(null);
 useEffect(() => {
    const fetchDetailAndRelated = async () => {
      //  Chặn ngay từ đầu nếu slug này đã được tải rồi
      if (slug === fetchedSlug.current) return; 
      
      try {
        setLoading(true);

        // 1. LẤY CHI TIẾT BÀI VIẾT
        const res = await axiosClient.get(`/news/${slug}`);
        setArticle(res.data.data);
        
        //  Lưu lại slug này để React biết là đã tải xong bài này
        fetchedSlug.current = slug;

        // 2. LẤY BÀI VIẾT LIÊN QUAN
        try {
          const resAll = await axiosClient.get('/news');
          const allNews = resAll.data.data || resAll.data;
          const filteredNews = allNews.filter(item => item.slug !== slug);
          const shuffled = filteredNews.sort(() => 0.5 - Math.random());
          setRelatedArticles(shuffled.slice(0, 3));
        } catch (err) {
          console.error("Lỗi khi tải bài viết liên quan:", err);
        }

      } catch (error) {
        console.error("Lỗi khi tải bài viết:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchDetailAndRelated();

    
  }, [slug]);
  // ==========================================
  // ==========================================
  const handleSubmitReview = async () => {
    if (userRating === 0) {
      toast.warning("Sếp ơi, vui lòng chọn ít nhất 1 sao nhé!");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        newsId: article._id,
        rating: userRating,
        comment: userComment
      };

      await axiosClient.post('/reviews/news/add', payload); 
      
      toast.success("Cảm ơn sếp! Đánh giá đã được gửi thành công.");
      
      // Reset form sau khi gửi
      setShowReviewForm(false);
      setUserRating(0);
      setUserComment("");
      
    } catch (error) {
      console.error("Lỗi khi gửi đánh giá:", error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra, sếp kiểm tra lại xem đã đăng nhập chưa nhé!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[60vh] font-bold">Đang tải...</div>;
  if (!article) return <div className="text-center py-20 font-bold">Bài viết không tồn tại.</div>;

  return (
    // Bỏ py-10 ở đây để Banner có thể dính sát lên trên cùng
    <div className="bg-white min-h-screen pb-20 overflow-x-hidden">
      
      {/* ======================================================== */}
      {/* COMPONENT BANNER TRÀN VIỀN TÍCH HỢP Ở ĐÂY */}
      {/* ======================================================== */}
      <PageBanner 
        title={article.title} 
        breadcrumbs={[
          { name: 'Trang chủ', link: '/' }, 
          { name: 'Tin tức', link: '/news' },
          { name: article.title } // Ở bài chi tiết thì không cần link cho bài đang xem
        ]} 
      />

      {/* Thêm pt-10 vào thẻ article để đẩy nội dung xuống một chút so với Banner */}
      <article className="container mx-auto px-4 max-w-5xl pt-10">
        
        {/* Thông tin ngày đăng, lượt xem */}
        <div className="flex items-center justify-start gap-4 text-gray-500 text-sm mb-10 pb-6 border-b">
          <span className="bg-gray-100 px-3 py-1 rounded-full">⏰ {new Date(article.createdAt).toLocaleDateString('vi-VN')}</span>
          <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-bold">👁️ {article.views || 0} lượt xem</span>
        </div>

        {/* Nội dung chính */}
        <div 
          className="custom-quill-content text-gray-800"
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(article.content).replace(/&nbsp;/g, ' ') 
          }} 
        />
        
        {/* ======================================================== */}
        {/* 1. KHU VỰC THỐNG KÊ ĐÁNH GIÁ VÀ FORM CHỌN SAO */}
        {/* ======================================================== */}
        <div className="mt-12 border rounded-md p-6 bg-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Cột điểm trung bình */}
          <div className="flex flex-col items-center justify-center w-full md:w-1/4 border-b md:border-b-0 md:border-r pb-6 md:pb-0 md:pr-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-[#f39c12]">{article.ratings || 0}</span>
              <span className="text-4xl text-[#f39c12]">★</span>
            </div>
            <div className="text-sm text-gray-500 mt-2">{article.numReviews || 0} đánh giá</div>
          </div>

          {/* Cột thanh tiến trình */}
          <div className="flex-1 w-full flex flex-col gap-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const isTopStar = article.ratings >= star && article.ratings < star + 1;
              const reviewCount = isTopStar ? (article.numReviews || 0) : 0;
              const percent = article.numReviews > 0 ? (reviewCount / article.numReviews) * 100 : 0;

              return (
                <div key={star} className="flex items-center text-sm text-gray-600">
                  <span className="w-8 flex items-center justify-end font-bold mr-2">{star} ★</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#f39c12]" style={{ width: `${percent}%` }}></div>
                  </div>
                  <span className="w-20 text-right text-xs ml-2">{reviewCount} đánh giá</span>
                </div>
              );
            })}
          </div>

          {/* Cột Nút bấm hiện form */}
          <div className="w-full md:w-1/4 flex justify-center md:justify-end pl-0 md:pl-6">
            {!showReviewForm && (
              <button 
                onClick={() => setShowReviewForm(true)}
                className="bg-[#3498db] hover:bg-[#2980b9] transition-colors text-white px-6 py-2 rounded text-sm font-bold shadow-md w-full md:w-auto"
              >
                Gửi đánh giá của bạn
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 🔥 FORM ĐÁNH GIÁ (Chỉ hiện ra khi bấm nút) 🔥 */}
        {/* ======================================================== */}
        {showReviewForm && (
          <div className="mt-4 p-6 border rounded-md bg-gray-50 shadow-inner">
            <h3 className="font-bold mb-4 text-gray-800">Đánh giá bài viết này</h3>
            
            {/* Hàng chọn sao tương tác */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold mr-2">Chọn điểm:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star}
                  onClick={() => setUserRating(star)}
                  className={`cursor-pointer text-3xl transition-colors ${
                    star <= userRating ? 'text-[#f39c12]' : 'text-gray-300 hover:text-gray-400'
                  }`}
                >
                  ★
                </span>
              ))}
              <span className="ml-3 text-sm text-gray-500">
                {userRating > 0 ? `Đã chọn: ${userRating} sao` : "Chưa chọn sao"}
              </span>
            </div>

            {/* Ô nhập bình luận */}
            <textarea
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder="Nhập cảm nghĩ của sếp về bài viết này..."
              className="w-full border rounded-md p-3 text-sm focus:outline-none focus:border-[#3498db] mb-4"
              rows="3"
            ></textarea>

            {/* Các nút hành động */}
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded transition"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSubmitReview}
                disabled={isSubmitting}
                className={`px-6 py-2 text-sm font-bold text-white rounded transition ${
                  isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#3498db] hover:bg-[#2980b9]'
                }`}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. KHU VỰC NÚT CHIA SẺ MẠNG XÃ HỘI */}
        {/* ======================================================== */}
        <div className="flex flex-wrap items-center gap-3 py-6 mt-8 border-t border-b border-gray-200">
          <span className="font-bold text-gray-800 mr-2">Chia sẻ</span>
          <button className="bg-[#3b5998] hover:opacity-90 text-white px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition">
            <span className="font-serif">f</span> Facebook
          </button>
          <button className="bg-[#1da1f2] hover:opacity-90 text-white px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition">
             Twitter
          </button>
          <button className="bg-[#bd081c] hover:opacity-90 text-white px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition">
            <span className="font-serif">p</span> Pinterest
          </button>
          <button className="border border-[#008fe5] text-[#008fe5] hover:bg-blue-50 px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition">
            Zalo
          </button>
        </div>

        {/* ======================================================== */}
        {/* 3. KHU VỰC BÀI VIẾT LIÊN QUAN */}
        {/* ======================================================== */}
        {relatedArticles.length > 0 && (
          <div className="mt-10 mb-10">
            <h2 className="text-xl md:text-2xl font-black text-[#699a82] mb-6 uppercase">Bài viết liên quan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedArticles.map((item) => (
                <Link to={`/news/${item.slug}`} key={item._id || item.slug} className="flex items-start gap-4 group">
                  <div className="w-1/3 shrink-0 overflow-hidden rounded border border-gray-100">
                    <img 
                      src={item.thumbnail || 'https://via.placeholder.com/150'} 
                      alt={item.title} 
                      className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>
                  <div className="w-2/3 flex flex-col justify-start">
                    <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#699a82] line-clamp-2 mb-1 leading-snug transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {item.shortDescription || item.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </article>

      <style>{`
        .custom-quill-content { text-align: left !important; width: 100%; }
        .custom-quill-content p { font-size: 16px; line-height: 1.6; margin-bottom: 1rem; text-align: left !important; }

        /* BẢNG 2 CỘT */
        .custom-quill-content table {
          width: 100% !important;
          border-collapse: collapse;
          margin: 1.5rem 0;
          border: 1px solid #ddd;
          table-layout: fixed !important;
        }

        .custom-quill-content table tr {
          display: flex !important;
          border-bottom: 1px solid #ddd;
        }

        .custom-quill-content table td {
          border: none !important;
          padding: 12px !important;
          display: block !important;
        }

        .custom-quill-content table td:first-child {
          width: 120px !important;
          flex-shrink: 0;
          background-color: #fff;
          display: flex !important;
          align-items: center;
          justify-content: center;
          border-right: 1px solid #ddd !important;
        }

        .custom-quill-content table td:nth-child(2),
        .custom-quill-content table td:nth-child(3) {
          flex: 1;
          font-size: 14px;
          line-height: 1.5;
        }

        .custom-quill-content table td:nth-child(2) {
          font-weight: bold;
          text-transform: uppercase;
          padding-right: 0 !important; 
        }
        
        .custom-quill-content table td:nth-child(3) {
          padding-left: 5px !important; 
        }

        .custom-quill-content table td:nth-child(n+4) {
          display: none !important;
        }

        .custom-quill-content table img {
          max-width: 80px !important;
          height: auto !important;
          mix-blend-mode: multiply;
        }

        .custom-quill-content table th { display: none; }

        .custom-quill-content h2 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 2rem 0 1rem;
          border-left: 5px solid #5a8c76;
          padding-left: 10px;
        }

        @media (max-width: 768px) {
          .custom-quill-content table tr { flex-direction: column; }
          .custom-quill-content table td:first-child { width: 100% !important; border-right: none !important; border-bottom: 1px solid #ddd; }
        }
      `}</style>
    </div>
  );
};

export default NewsDetail;