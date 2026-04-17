import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  
  // Tiêu đề và nội dung
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // Phân loại thông báo để Frontend đổi icon (VD: order -> icon hộp quà, promotion -> icon % giảm giá)
  type: { 
    type: String, 
    enum: ['order', 'promotion', 'system'], 
    default: 'system' 
  },
  
  // Trạng thái đã đọc hay chưa (để làm dấu chấm đỏ chưa đọc)
  isRead: { type: Boolean, default: false },

  linkUrl: { type: String },

  targetAudience: { 
    type: String, 
    enum: ['all', 'specific', 'group'], 
    default: 'all' 
  },
  groupType: { type: String }, // 'newbie', 'vip', 'frequent', 'inactive'
  targetUsers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]

}, { timestamps: true });
// Tự động xóa sau 30 ngày
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;