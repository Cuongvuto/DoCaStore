import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// 1. Middleware kiểm tra xem người dùng đã đăng nhập chưa (Có Token hợp lệ không)
export const verifyToken = (req, res, next) => {
  try {
    // Lấy Token từ phần Header của Request 
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Từ chối truy cập! Bạn chưa đăng nhập hoặc không có Token.' 
      });
    }

    // Tách lấy phần Token nằm sau chữ "Bearer "
    const token = authHeader.split(' ')[1];

    // Giải mã Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Gắn thông tin user vừa giải mã được vào request
    req.user = decoded;

    // Cho phép đi tiếp vào Controller
    next(); 

  } catch (error) {
    console.error("❌ Lỗi xác thực Token:", error.message);
    return res.status(403).json({ 
      success: false, 
      message: 'Token không hợp lệ hoặc đã hết hạn! Vui lòng đăng nhập lại.' 
    });
  }
};

// 2. Middleware kiểm tra quyền Admin (Bắt buộc phải chạy sau verifyToken)
export const isAdmin = (req, res, next) => {
  
  if (req.user && req.user.role === 'admin') {
    next(); 
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Từ chối truy cập! Yêu cầu quyền Quản trị viên (Admin).' 
    });
  }
};