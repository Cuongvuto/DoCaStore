import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  // Mã nhập vào (Ví dụ: "SALE15", "THANG4")
  code: { type: String, required: true, unique: true, trim: true },
  
  // Phần trăm giảm giá (Ví dụ: 10, 15)
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  
  // Ngày hết hạn của mã
  expiryDate: { type: Date, required: true },
  
  // Trạng thái (Bật/Tắt mã giảm giá mà không cần xóa khỏi DB)
  isActive: { type: Boolean, default: true },

  // Nhóm đối tượng (all / group)
  targetAudience: { type: String, enum: ['all', 'group'], default: 'all' },
  groupType: { type: String }, // 'newbie', 'vip', 'frequent', v.v.

  // (Tùy chọn) Giới hạn số lượt dùng của mã này
  usageLimit: { type: Number, default: 100 },

  usedCount: { type: Number, default: 0 },
  usedBy: [
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 }
  }
]

}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;