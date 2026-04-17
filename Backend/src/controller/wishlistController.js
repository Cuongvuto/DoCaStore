import mongoose from 'mongoose';
import Wishlist from '../models/wishlistModel.js';

// Thêm hoặc Xóa sản phẩm khỏi danh sách yêu thích (Nút thả tim)
export const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'ID Sản phẩm không hợp lệ!'
      });
    }

    // Tìm giỏ hàng yêu thích của User này
    let wishlist = await Wishlist.findOne({ userId });

    // Nếu chưa có, tạo mới
    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [productId] });
      await wishlist.save();
      return res.status(200).json({
        success: true,
        message: 'Đã thêm vào danh sách yêu thích!',
        data: wishlist
      });
    }

    // Nếu đã có, kiểm tra xem sản phẩm đã nằm trong Wishlist chưa
    const productIndex = wishlist.products.indexOf(productId);

    if (productIndex === -1) {
      // Chưa có -> Thêm vào
      wishlist.products.push(productId);
      await wishlist.save();
      return res.status(200).json({
        success: true,
        message: 'Đã thêm vào danh sách yêu thích!',
        data: wishlist
      });
    } else {
      // Đã có -> Xóa đi (Bỏ tim)
      wishlist.products.splice(productIndex, 1);
      await wishlist.save();
      return res.status(200).json({
        success: true,
        message: 'Đã xóa khỏi danh sách yêu thích!',
        data: wishlist
      });
    }

  } catch (error) {
    console.error("❌ Lỗi toggleWishlist:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi Server!',
      error: error.message
    });
  }
};

// Lấy danh sách sản phẩm yêu thích của người dùng đang đăng nhập
export const getUserWishlist = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const wishlist = await Wishlist.findOne({ userId }).populate('products');

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách yêu thích thành công!',
      data: wishlist ? wishlist.products : [] // Nếu chưa có wishlist, trả về mảng rỗng
    });

  } catch (error) {
    console.error("❌ Lỗi getUserWishlist:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi Server!',
      error: error.message
    });
  }
};