import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
  // Mỗi User chỉ có 1 danh sách yêu thích duy nhất (unique: true)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Danh sách các ID sản phẩm mà khách hàng thả tim
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]

}, { timestamps: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;