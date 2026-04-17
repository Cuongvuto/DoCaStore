import mongoose from 'mongoose';
import Review from '../models/reviewModel.js';
import Product from '../models/productsModel.js';
import User from '../models/userModel.js'; 
import News from '../models/newsModel.js';
/**
 * 🟢 1. THÊM ĐÁNH GIÁ MỚI
 */
export const addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id || req.user._id;

    // Kiểm tra ID sản phẩm hợp lệ
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'ID Sản phẩm không hợp lệ!' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });
    }

    // Kiểm tra trùng lặp
    const alreadyReviewed = await Review.findOne({ productId, userId });
    if (alreadyReviewed) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sếp đã đánh giá sản phẩm này rồi!' 
      });
    }

    const newReview = new Review({
      productId,
      userId,
      rating: Number(rating),
      comment
    });
    await newReview.save();

    // 🔥 LOGIC TÍNH TOÁN LẠI TRUNG BÌNH SAO
    const reviews = await Review.find({ productId });
    const numReviews = reviews.length;
    // Tính trung bình và ép kiểu số
    const averageRating = reviews.reduce((acc, item) => item.rating + acc, 0) / numReviews;

    // Cập nhật vào bảng Product
    await Product.findByIdAndUpdate(productId, {
      ratings: Number(averageRating.toFixed(1)), // Đảm bảo lưu dạng Number (VD: 4.5)
      numReviews: numReviews
    });

    return res.status(201).json({
      success: true,
      message: 'Gửi đánh giá thành công!',
      data: newReview
    });

  } catch (error) {
    console.error("❌ Lỗi addReview:", error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống!', error: error.message });
  }
};

/**
 * 🔵 2. LẤY DANH SÁCH ĐÁNH GIÁ CỦA 1 SẢN PHẨM
 */
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    // Kiểm tra ID trước khi truy vấn để tránh lỗi 500 ép kiểu
    if (!mongoose.Types.ObjectId.isValid(productId)) {
       return res.status(200).json({ success: true, data: [] });
    }

    const reviews = await Review.find({ productId: new mongoose.Types.ObjectId(productId) })
      .populate('userId', 'name avatar') // Lấy tên và ảnh đại diện khách
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reviews 
    });

  } catch (error) {
    console.error("❌ Lỗi Backend tại getProductReviews:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi lấy đánh giá!', 
      error: error.message 
    });
  }
};

/**
 * 🔴 3. XÓA ĐÁNH GIÁ
 */
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá!' });
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(id);

    // Tính toán lại sau khi xóa
    const remainingReviews = await Review.find({ productId });
    const numReviews = remainingReviews.length;
    const averageRating = numReviews > 0 
      ? remainingReviews.reduce((acc, item) => item.rating + acc, 0) / numReviews 
      : 0;

    await Product.findByIdAndUpdate(productId, {
      ratings: Number(averageRating.toFixed(1)),
      numReviews: numReviews
    });

    return res.status(200).json({ success: true, message: 'Đã xóa đánh giá!' });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server!', error: error.message });
  }
};

//// cac ham danh gia bai viet 
export const addNewsReview = async (req, res) => {
  try {
    const { newsId, rating, comment } = req.body;
    const userId = req.user.id || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(newsId)) {
      return res.status(400).json({ success: false, message: 'ID Bài viết không hợp lệ!' });
    }

    const newsArticle = await News.findById(newsId);
    if (!newsArticle) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết!' });
    }

    // Kiểm tra xem user này đã đánh giá bài báo này chưa
    const alreadyReviewed = await Review.findOne({ newsId, userId });
    if (alreadyReviewed) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sếp đã đánh giá bài viết này rồi!' 
      });
    }

    const newReview = new Review({
      newsId,
      userId,
      rating: Number(rating),
      comment
    });
    await newReview.save();

    // 🔥 LOGIC TÍNH TOÁN LẠI TRUNG BÌNH SAO CHO BÀI VIẾT
    const reviews = await Review.find({ newsId });
    const numReviews = reviews.length;
    const averageRating = reviews.reduce((acc, item) => item.rating + acc, 0) / numReviews;

    // Cập nhật vào bảng News
    await News.findByIdAndUpdate(newsId, {
      ratings: Number(averageRating.toFixed(1)),
      numReviews: numReviews
    });

    return res.status(201).json({
      success: true,
      message: 'Gửi đánh giá bài viết thành công!',
      data: newReview
    });

  } catch (error) {
    console.error("❌ Lỗi addNewsReview:", error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống!', error: error.message });
  }
};

/**
 * 🔵 5. LẤY DANH SÁCH ĐÁNH GIÁ CỦA 1 BÀI VIẾT
 */
export const getNewsReviews = async (req, res) => {
  try {
    const { newsId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(newsId)) {
       return res.status(200).json({ success: true, data: [] });
    }

    const reviews = await Review.find({ newsId: new mongoose.Types.ObjectId(newsId) })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reviews 
    });

  } catch (error) {
    console.error("❌ Lỗi Backend tại getNewsReviews:", error.message);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy đánh giá!', error: error.message });
  }
};

/**
 * 🔴 6. XÓA ĐÁNH GIÁ BÀI VIẾT
 */
export const deleteNewsReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá!' });
    }

    const newsId = review.newsId;
    await Review.findByIdAndDelete(id);

    // Tính toán lại sau khi xóa
    const remainingReviews = await Review.find({ newsId });
    const numReviews = remainingReviews.length;
    const averageRating = numReviews > 0 
      ? remainingReviews.reduce((acc, item) => item.rating + acc, 0) / numReviews 
      : 0;

    await News.findByIdAndUpdate(newsId, {
      ratings: Number(averageRating.toFixed(1)),
      numReviews: numReviews
    });

    return res.status(200).json({ success: true, message: 'Đã xóa đánh giá bài viết!' });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server!', error: error.message });
  }
};