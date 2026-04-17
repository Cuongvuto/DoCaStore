import mongoose from 'mongoose';

const notificationReadSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  notificationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Notification', 
    required: true 
  }
}, { timestamps: true });

// Tự động xóa rác sau 30 ngày (Khớp với bảng Notification của sếp)
notificationReadSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
// Đảm bảo không bị lưu trùng lặp 1 user đọc 1 thông báo nhiều lần
notificationReadSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

export default mongoose.model('NotificationRead', notificationReadSchema);