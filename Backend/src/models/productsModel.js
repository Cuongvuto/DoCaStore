import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  // Tên sản phẩm
  name: { type: String, required: true, trim: true },
  
  // Liên kết với bảng Category (Danh mục)
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, 
  
  // Giá bán
  price: { type: Number, required: true },
  
  //  Mô tả chi tiết sản phẩm
  description: { type: String, trim: true },
  
  // Thông số sản phẩm
  specs: { type: String, trim: true }, 

  //  Đường dẫn ảnh sản phẩm
  imageUrl: { type: String },
  // images: Mảng chứa danh sách các link ảnh chi tiết (Ảnh bổ sung)
  images: [{ type: String }],

  // Nhãn hiệu (Ví dụ: Shimano, Daiwa...)
  brand: { type: String },
  
  // Thông số kỹ thuật chuyên sâu cho đồ câu
  specs: {
    length: String,   // Chiều dài cần (vd: 2m4, 3m)
    material: String  // Chất liệu (vd: Carbon)
  },

  isTrending: { type: Boolean, default: false },

  sold: { type: Number, default: 0 },
  
  // Số lượng tồn kho
  stock: { type: Number, default: 0 },


  ratings: { type: Number, default: 0 },

  numReviews: { type: Number, default: 0 }

}, { timestamps: true }); // auto createdAt và updatedAt

const Product = mongoose.model('Product', productSchema);

export default Product;