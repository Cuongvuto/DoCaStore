import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
  // Tên chiến dịch (VD: "Siêu Sale Giữa Tháng")
  title: { type: String, trim: true },
  
  // Link ảnh (Lưu URL từ Cloudinary hoặc S3)
  imageUrl: { type: String, required: true },
  
  // Bấm vào ảnh thì dẫn khách đi đâu (VD: "/category/can-cau-may")
  linkUrl: { type: String },
  
  // Trạng thái bật/tắt ảnh trên trang chủ
  isActive: { type: Boolean, default: true },
  
  // Vị trí hiển thị (Nếu trang web có nhiều chỗ đặt quảng cáo)
  position: { 
    type: String, 
    enum: ['home_main', 'home_sidebar', 'category_top'], 
    default: 'home_main' 
  },

  // Thứ tự sắp xếp (Ảnh nào số nhỏ hơn thì hiện trước)
  sortOrder: { type: Number, default: 0 }

}, { timestamps: true });

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;