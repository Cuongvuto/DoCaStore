import Cart from '../models/cartModel.js';
import mongoose from 'mongoose';
import Order from '../models/oderModel.js';

// 1. LẤY CHI TIẾT GIỎ HÀNG 
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id; 

    let cart = await Cart.findOne({ user_id: userId }).populate({
      path: 'items.product_id',
      select: 'name price imageUrl stock' 
    });

    // Nếu user chưa từng có giỏ hàng, hoặc giỏ hàng trống
    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Giỏ hàng trống',
        data: { 
            items: [],
            subTotal: 0,           // Tạm tính
            discountAmount: 0,     // Tiền giảm
            finalPrice: 0,         // Tổng thanh toán
            discountMessages: []   // Lời nhắn
        }
      });
    }

    // --- BẮT ĐẦU TÍNH TỔNG TIỀN ---
    let subTotal = 0; // Đổi tên thành subTotal cho chuẩn "Tạm tính"

    // Lọc bỏ những "bóng ma"
    const validItems = cart.items.filter(item => item.product_id !== null);

    validItems.forEach(item => {
      subTotal += item.product_id.price * item.quantity;
    });

    if (validItems.length !== cart.items.length) {
        cart.items = validItems;
        await cart.save();
    }
    // --- KẾT THÚC TÍNH TỔNG TIỀN ---

    // ==========================================
    // 🚀 LOGIC KIỂM TRA & ÁP DỤNG GIẢM GIÁ 15% KHÁCH MỚI
    // ==========================================
    let discountAmount = 0;
    let discountMessages = [];

    // Tìm xem khách đã có đơn hàng nào thành công chưa
    const existingOrder = await Order.findOne({ 
      userId: userId, 
      status: { $ne: 'cancelled' } 
    });

    // Nếu chưa có đơn nào VÀ giỏ hàng có tiền
    if (!existingOrder && subTotal > 0) {
      discountAmount = subTotal * 0.15; // Tính 15%
      discountMessages.push("Giảm 15% ưu đãi đơn hàng đầu tiên");
    }

    // Chốt lại giá cuối
    let finalPrice = subTotal - discountAmount;
    if (finalPrice < 0) finalPrice = 0;

    return res.status(200).json({
      success: true,
      data: {
        _id: cart._id,
        user_id: cart.user_id,
        items: validItems,
        subTotal: subTotal,             // Tạm tính (giá gốc)
        discountAmount: discountAmount, // Số tiền được hệ thống tự giảm
        finalPrice: finalPrice,         // Tổng tiền cuối cùng phải trả
        discountMessages: discountMessages // Gửi mảng câu chữ về cho Frontend in ra
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// 2. THÊM SẢN PHẨM VÀO GIỎ HÀNG

export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!product_id || !quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ!' });
    }

    let cart = await Cart.findOne({ user_id: userId });

    // KỊCH BẢN 1: User chưa có giỏ hàng -> Tạo mới luôn
    if (!cart) {
      const newCart = new Cart({
        user_id: userId,
        items: [{ product_id, quantity }]
      });
      await newCart.save();
      return res.status(201).json({ success: true, message: 'Đã thêm vào giỏ hàng!', data: newCart });
    }

    // KỊCH BẢN 2: User đã có giỏ hàng -> Kiểm tra xem sản phẩm này đã nằm trong giỏ chưa
    const itemIndex = cart.items.findIndex(item => item.product_id.toString() === product_id);

    if (itemIndex > -1) {
      // 2.1 Nếu đã có rồi -> Cộng dồn số lượng lên
      cart.items[itemIndex].quantity += quantity;
    } else {
      // 2.2 Nếu chưa có -> Push sản phẩm mới vào mảng items
      cart.items.push({ product_id, quantity });
    }

    await cart.save();
    return res.status(200).json({ success: true, message: 'Đã cập nhật giỏ hàng!', data: cart });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// 3. CẬP NHẬT SỐ LƯỢNG 1 SẢN PHẨM TRONG GIỎ (Tăng/Giảm)

export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const product_id = req.params.id;
    const { quantity } = req.body;

    let cart = await Cart.findOne({ user_id: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Không tìm thấy giỏ hàng!' });

    const itemIndex = cart.items.findIndex(item => item.product_id.toString() === product_id);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại trong giỏ!' });
    }

    // Nếu người dùng giảm số lượng xuống 0 (hoặc âm) -> Xóa luôn sản phẩm đó khỏi giỏ
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1); 
    } else {
      // Cập nhật lại số lượng mới
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    return res.status(200).json({ success: true, message: 'Đã cập nhật số lượng!', data: cart });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// 4. XÓA 1 SẢN PHẨM KHỎI GIỎ HÀNG

export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const product_id = req.params.id; 

    let cart = await Cart.findOne({ user_id: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Không tìm thấy giỏ hàng!' });

    // Lọc bỏ sản phẩm có ID trùng với ID gửi lên
    cart.items = cart.items.filter(item => item.product_id.toString() !== product_id);

    await cart.save();
    return res.status(200).json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ!', data: cart });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};