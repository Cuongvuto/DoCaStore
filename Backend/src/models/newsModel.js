import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  thumbnail: { type: String, required: true }, // Ảnh nhỏ cho trang danh sách
  shortDescription: { type: String, required: true }, // Đoạn mồi nhử (1-2 dòng)
  content: { type: String, required: true }, // Lưu toàn bộ nội dung + ảnh phụ dưới dạng HTML
  views: { type: Number, default: 0 },
  ratings: {
    type: Number,
    default: 0, // Mặc định chưa có ai đánh giá thì là 0 sao
  },
  numReviews: {
    type: Number,
    default: 0, // Mặc định chưa có ai đánh giá thì là 0 lượt
  }
}, { timestamps: true });

export default mongoose.model('News', newsSchema);