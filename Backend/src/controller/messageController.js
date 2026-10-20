import mongoose from 'mongoose';
import Message from '../models/messageModel.js';
import Conversation from '../models/conversationModel.js';
import User from '../models/userModel.js';
import { pagination, queryText, escapeRegex, enumFilter } from '../utils/adminQuery.js';
import { contentError } from '../utils/contentValidation.js';
import { failure } from '../services/commercePolicy.js';

const staff = req => ['superadmin', 'admin', 'support_admin'].includes(req.user.role);
const owner = (req, id) => String(req.user.id || req.user._id) === String(id);
export async function messagePage(conversationId, query) {
  const { limit } = pagination({ limit: query.limit || '50' });
  const filter = { conversationId };
  if (query.before) {
    if (typeof query.before !== 'string' || !mongoose.isValidObjectId(query.before)) throw failure(400, 'Mốc tin nhắn không hợp lệ.');
    filter._id = { $lt: query.before };
  }
  const rows = await Message.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit).reverse();
  return { messages, hasMore, nextBefore: hasMore ? String(messages[0]._id) : null };
}
export const getConversations = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = {};
    const status = enumFilter(req.query.status, ['pending', 'active', 'resolved']);
    if (status) filter.status = status;
    const search = queryText(req.query.search);
    if (search) {
      const regex = { $regex: escapeRegex(search), $options: 'i' };
      const customers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').limit(1000);
      filter.$or = [{ ticketId: regex }, { customerId: { $in: customers.map(u => u._id) } }];
    }
    const [rows, totalCount] = await Promise.all([
      Conversation.find(filter).populate('customerId', 'name email avatar').populate('assignedAdminId', 'name').sort({ updatedAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Conversation.countDocuments(filter)
    ]);
    const summary = await Message.aggregate([
      { $match: { conversationId: { $in: rows.map(c => c._id) } } }, { $sort: { _id: -1 } },
      { $group: { _id: '$conversationId', lastMessage: { $first: '$$ROOT' }, unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'customer'] }, { $eq: ['$isRead', false] }] }, 1, 0] } } } }
    ]);
    const summaries = new Map(summary.map(row => [String(row._id), row]));
    const conversations = rows.map(row => ({ ...row, customer: row.customerId, lastMessage: summaries.get(String(row._id))?.lastMessage || null, unreadCount: summaries.get(String(row._id))?.unreadCount || 0 }));
    return res.json({ success: true, conversations, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)), totalCount });
  } catch (error) { return contentError(res, error); }
};
export const getChatHistory = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) throw failure(404, 'Không tìm thấy phiên hỗ trợ.');
    if (!staff(req) && !owner(req, conversation.customerId)) throw failure(403, 'Bạn không có quyền xem hội thoại.');
    const data = await messagePage(conversation._id, req.query);
    await Message.updateMany({ _id: { $in: data.messages.map(m => m._id) }, sender: staff(req) ? 'customer' : { $ne: 'customer' }, isRead: false }, { $set: { isRead: true } });
    return res.json({ success: true, ...data });
  } catch (error) { return contentError(res, error); }
};
export const getCustomerTicket = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!staff(req) && !owner(req, customerId)) throw failure(403, 'Bạn không có quyền xem hội thoại.');
    const conversation = await Conversation.findOne({ customerId, status: { $in: ['pending', 'active'] } }).sort({ createdAt: -1 }) || await Conversation.findOne({ customerId }).sort({ createdAt: -1 });
    if (!conversation) return res.json({ success: true, messages: [], conversation: null, hasMore: false });
    const data = await messagePage(conversation._id, req.query);
    await Message.updateMany({ _id: { $in: data.messages.map(m => m._id) }, sender: { $ne: 'customer' }, isRead: false }, { $set: { isRead: true } });
    return res.json({ success: true, ...data, conversation });
  } catch (error) { return contentError(res, error); }
};
export const getCustomerAllTickets = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!staff(req) && !owner(req, customerId)) throw failure(403, 'Bạn không có quyền xem danh sách này.');
    const { page, limit, skip } = pagination(req.query);
    const conversations = await Conversation.find({ customerId }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit);
    const totalCount = await Conversation.countDocuments({ customerId });
    return res.json({ success: true, conversations, currentPage: page, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)) });
  } catch (error) { return contentError(res, error); }
};
