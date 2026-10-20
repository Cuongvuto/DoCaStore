import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  // Mã hiển thị cho đẹp và dễ tìm (VD: TK-827364)
  ticketId: { type: String, required: true, unique: true }, 
  
  // Khách hàng tạo yêu cầu
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  
  // Admin tiếp nhận (null nếu chưa ai nhận)
  assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
  
  // Trạng thái của phiên hỗ trợ
  status: { type: String, enum: ['pending', 'active', 'resolved'], default: 'pending' },
  
}, { timestamps: true });

conversationSchema.index({ updatedAt: -1, _id: -1 });
conversationSchema.index({ customerId: 1, status: 1, createdAt: -1 });
const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
