import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user', 
    required: true 
  },
  products: [
    {
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product',
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true,
        min: 1 
      },
      priceAtPurchase: { 
        type: Number, 
        required: true 
      } 
    }
  ],
  totalPrice: { 
    type: Number, 
    required: true 
  },
  
  // GOM LẠI THÀNH SNAPSHOT HOÀN CHỈNH
  shippingAddress: {
    receiverName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    ward: { type: String, required: true },
    district: { type: String, required: true },
    city: { type: String, required: true },
  },

  // Thêm trường ghi chú cho khách dặn dò
  note: {
    type: String,
    default: ''
  },

  paymentMethod: {
    type: String,
    enum: ['COD', 'VNPay', 'Momo', 'VietQR'], 
    default: 'COD'
  },
  payosOrderCode: {
    type: Number, 
    unique: true, 
    sparse: true // Cho phép null trên các đơn COD
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'], 
    default: 'pending'
  },

  status: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'completed', 'cancelled'], 
    default: 'pending' 
  }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

export default Order;