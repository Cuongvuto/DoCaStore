import Notification from '../models/notificationModel.js';
import crypto from 'node:crypto';
import User from '../models/userModel.js';
import { audienceQuery, failure } from './commercePolicy.js';
import { textField, safeLink, targetFields } from '../utils/contentValidation.js';
import socketUtil from '../utils/socket.js';

export async function deliverNotification(body, actorId, requestKey) {
  if (requestKey !== undefined && (typeof requestKey !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(requestKey))) throw failure(400, 'Mã yêu cầu không hợp lệ.');
  const requestHash = crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');
  if (actorId && requestKey) {
    const previous = await Notification.findOne({ createdBy: actorId, requestKey });
    if (previous) {
      if (previous.requestHash !== requestHash) throw failure(409, 'Yêu cầu trước đã gửi với nội dung khác. Hãy đóng biểu mẫu và tạo thông báo mới.');
      return previous;
    }
  }
  const data = { ...targetFields(body, true), title: textField(body.title, 'Tiêu đề', 150), message: textField(body.message, 'Nội dung', 2000), linkUrl: safeLink(body.linkUrl), type: body.type || 'system', userId: null, targetUsers: [] };
  if (!['order', 'promotion', 'system'].includes(data.type)) throw failure(400, 'Loại thông báo không hợp lệ.');
  if (data.targetAudience === 'specific') {
    if (typeof body.userId !== 'string' || !/^[a-f\d]{24}$/i.test(body.userId) || !await User.exists({ _id: body.userId })) throw failure(400, 'Người nhận không tồn tại.');
    data.userId = body.userId;
  }
  if (data.targetAudience === 'group') {
    const users = await User.find(audienceQuery(data.groupType)).select('_id').limit(10001);
    if (!users.length || users.length > 10000) throw failure(400, 'Nhóm phải có từ 1 đến 10.000 người nhận.');
    data.targetUsers = users.map(u => u._id);
  }
  if (actorId) {
    const now = new Date();
    const allowed = await User.findOneAndUpdate({ _id: actorId, $or: [{ nextNotificationAt: { $exists: false } }, { nextNotificationAt: { $lte: now } }] }, { $set: { nextNotificationAt: new Date(now.getTime() + 30000) } });
    if (!allowed) throw failure(429, 'Vui lòng đợi 30 giây giữa các lần gửi thông báo.');
  }
  const notification = await Notification.create({ ...data, createdBy: actorId, requestKey, requestHash });
  try {
    const io = socketUtil.getIo();
    // Do not reveal group membership in realtime payloads.
    const { targetUsers: _targets, ...publicData } = notification.toObject();
    const payload = { message: data.title, noti: publicData };
    if (data.targetAudience === 'all') io.emit('NEW_NOTIFICATION', payload);
    else io.to((data.userId ? [data.userId] : data.targetUsers).map(id => 'room_user_' + id)).emit('NEW_NOTIFICATION', payload);
  } catch (error) { console.error('Notification socket:', error.message); }
  return notification;
}
