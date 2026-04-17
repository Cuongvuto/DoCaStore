import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  items: [
    {
      product_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product',
        required: true // 🔴 Thêm: Không cho phép item rỗng
      },
      quantity: { 
        type: Number, 
        required: true,
        default: 1,
        min: [1, 'Số lượng sản phẩm tối thiểu phải là 1'] // 🔴 Chặn số lượng âm hoặc 0
      }
    }
  ]
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;