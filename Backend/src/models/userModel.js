import mongoose, { mongo } from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin', 'superadmin', 'product_admin', 'order_admin', 'support_admin'], default: 'customer' },
  //xac thuc 
  isVerified: { type: Boolean, default: false },
  verifyOtp: { type: String }, 
  otpExpires: { type: Date },  

  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },

  tier: { 
    type: String, 
    enum: ['newbie', 'normal', 'silver', 'gold', 'vip'], 
    default: 'newbie' 
  },
  totalOrders: { 
    type: Number, 
    default: 0 // Tổng số đơn hàng ĐÃ HOÀN THÀNH
  },
  totalSpent: { 
    type: Number, 
    default: 0 // Tổng tiền ĐÃ CHI TIÊU thành công
  },
  membership: {
    isPremium: { type: Boolean, default: false },
    expireAt: { type: Date, default: null } // Ngày hết hạn hội viên
  }


}, { timestamps: true });

const User = mongoose.model("user",userSchema);
export default User;