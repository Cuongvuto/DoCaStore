import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  // Liên kết đến sản phẩm được đánh giá
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  
  // Liên kết đến bài  viết  được đánh giá
  newsId: { type: mongoose.Schema.Types.ObjectId, ref: 'News' },
    
  // Liên kết đến người dùng viết đánh giá
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  
  // Số sao đánh giá (từ 1 đến 5)
  rating: { type: Number, required: true, min: 1, max: 5 },
  
  // Nội dung bình luận
  comment: { type: String, trim: true }

}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;