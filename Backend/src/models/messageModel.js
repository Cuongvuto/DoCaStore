import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },

  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },

  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },

  sender: { type: String, enum: ['customer', 'admin','system'], required: true },

  text: { type: String, required: true },

  isAutoReply: { type: Boolean, default: false },

  action: { type: String, enum: ['normal', 'join_support', 'end_support'], default: 'normal' },

  hiddenFromCustomer: { type: Boolean, default: false },

  isRead: { type: Boolean, default: false }

  
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
