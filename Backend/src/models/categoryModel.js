import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  
  
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    default: null // Nếu là null => Nó là Danh mục Cha cao nhất
  },

  
  image: { type: String, default: '' }, // Ảnh hoặc icon danh mục
  description: { type: String, default: '' }, // Mô tả ngắn 
  isActive: { type: Boolean, default: true }, // Trạng thái Ẩn/Hiện
  sortOrder: { type: Number, default: 0 } // Số càng nhỏ càng xếp lên đầu (0, 1, 2...)
  
}, { timestamps: true });

// Tối ưu hóa việc tìm kiếm (Tạo index)
categorySchema.index({ parentId: 1 });
// categorySchema.index({ slug: 1 });

const Category = mongoose.model('Category', categorySchema);

export default Category;