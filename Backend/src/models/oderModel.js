import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  checkoutKey: String,
  pricing: { originalPrice: Number, totalDiscount: Number, finalPrice: Number, messages: [String] },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: String,
  stockReserved: Boolean,
  couponReserved: Boolean,
  completedAt: Date,
  paidAt: Date,
  linkCancelledAt: Date,
  paymentExpiresAt: Date,
  paymentLinkState: { type: String, enum: ['creating', 'ready', 'failed'], default: 'ready' },
  paymentLink: { checkoutUrl: String, qrCode: String, amount: Number, orderCode: Number },
  paymentReference: String,
  paymentReview: { type: String, enum: ['none', 'refund_required', 'amount_mismatch', 'duplicate_payment', 'inventory_unconfirmed'], default: 'none' },
  paymentEvents: [{ reference: String, amount: Number, at: Date }],
  statusHistory: [{ from: String, to: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, actorRole: String, reason: String, at: Date }],
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
      name: String,
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

orderSchema.index({ userId: 1, checkoutKey: 1 }, { unique: true, partialFilterExpression: { checkoutKey: { $type: 'string' } } });
orderSchema.index({ status: 1, paymentMethod: 1, paymentStatus: 1, createdAt: 1 });
orderSchema.index({ completedAt: 1 });
orderSchema.index({ paidAt: 1 });
const Order = mongoose.model('Order', orderSchema);

export default Order;
