import Conversation from '../models/conversationModel.js';
import User from '../models/userModel.js';
import crypto from 'node:crypto';
import { transaction } from './orderService.js';
import { failure } from './commercePolicy.js';

export async function claimConversation(conversationId, adminId) {
  const conversation = await Conversation.findOneAndUpdate({ _id: conversationId, status: 'pending', assignedAdminId: null }, { $set: { assignedAdminId: adminId, status: 'active' } }, { new: true });
  if (!conversation) throw failure(409, 'Ticket đã được nhận hoặc đã kết thúc. Vui lòng tải lại.');
  return conversation;
}

export async function openConversation(customerId) {
  return transaction(async session => {
    if (!await User.findByIdAndUpdate(customerId, { $inc: { supportVersion: 1 } }, { session })) throw failure(404, 'Tài khoản không còn tồn tại.');
    const existing = await Conversation.findOne({ customerId, status: { $in: ['pending', 'active'] } }).session(session);
    if (existing) return { conversation: existing, created: false };
    const [conversation] = await Conversation.create([{ customerId, ticketId: '#TK-' + crypto.randomUUID().slice(0, 13).toUpperCase(), status: 'pending' }], { session });
    return { conversation, created: true };
  });
}
