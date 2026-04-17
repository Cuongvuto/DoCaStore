import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  // Thuộc về User nào
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Thông tin người nhận (Có thể mua hộ người khác nên cần tên và SĐT riêng)
  receiverName: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  
  // Chi tiết địa chỉ 4 cấp
  street: { type: String, required: true },    // Số nhà, tên đường
  ward: { type: String, required: true },      // Phường/Xã
  district: { type: String, required: true },  // Quận/Huyện
  city: { type: String, required: true },      // Tỉnh/Thành phố
  
  // Đánh dấu đây có phải là địa chỉ mặc định không
  isDefault: { type: Boolean, default: false }

}, { timestamps: true });

const Address = mongoose.model('Address', addressSchema);

export default Address;