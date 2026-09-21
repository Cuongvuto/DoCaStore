import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { STAFF_ROLES } from '../config/roles.js';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Từ chối truy cập! Bạn chưa đăng nhập hoặc không có Token.' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id role isVerified');
    if (!user || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không còn hợp lệ hoặc chưa được xác thực.'
      });
    }
    req.user = { ...decoded, id: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false, 
      message: 'Token không hợp lệ hoặc đã hết hạn! Vui lòng đăng nhập lại.' 
    });
  }
};

export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Bạn cần đăng nhập để tiếp tục.'
    });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện thao tác này.'
    });
  }

  next();
};

// Giữ alias này cho các route tổng quan trong lúc chuyển đổi contract.
export const isAdmin = authorize(...STAFF_ROLES);
