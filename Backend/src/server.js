import 'dotenv/config';
import { claimConversation, openConversation } from './services/supportService.js';
import express from 'express';
import http from 'http'; 
import socketUtil from './utils/socket.js'; 
import userRoutes from './routes/userRoutes.js';
import { connectDB } from './config/db.js';
import categoryRoutes from './routes/categoryRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import productRoutes from './routes/productRoutes.js'
import { mountOrderRoutes } from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js'; 
import messageRoutes from './routes/messageRoutes.js'; // Added message routes
import { askBot } from './controller/chatController.js'; // AI chat handler
import cors from 'cors';
import { startCronJobs } from './utils/cronjob.js'; 

const PORT = process.env.PORT || 5001;
const app = express();

// 1. BỌC EXPRESS BẰNG HTTP SERVER ĐỂ CHẠY SOCKET
const server = http.createServer(app);

// 2. KHỞI TẠO SOCKET.IO
const io = socketUtil.init(server);

// Tạo bộ nhớ lưu phiên chat
const activeSessions = new Map();

// Hàm tự động kết thúc phiên dự phòng (nếu 10 phút không ai nói gì/quên bấm nút)
const endSession = async (customerIdStr, io, conversationIdStr) => {
  try {
    const Message = (await import('./models/messageModel.js')).default;
    const Conversation = (await import('./models/conversationModel.js')).default;
    
    let conv;
    if (conversationIdStr) {
        conv = await Conversation.findOneAndUpdate(
            { _id: conversationIdStr, status: 'active' },
            { status: 'resolved' }, 
            { new: true }
        ).populate('customerId', 'name email avatar')
         .populate('assignedAdminId', 'name');
    }

    if (!conv) return;
    // Gửi tin báo kết thúc
    const sysMsg = await Message.create({
      conversationId: conversationIdStr,
      customerId: customerIdStr,
      sender: 'system',
      text: "Phiên hỗ trợ đã tự động kết thúc do khách hàng không phản hồi quá 10 phút.",
      action: 'end_support'
    });

    io.to('admin_room').emit('receive_message', sysMsg);
    io.to(`room_user_${customerIdStr}`).emit('receive_message', sysMsg);
    
    if (conv) {
        io.to('admin_room').emit('ticket_updated', conv); 
        io.to(`room_user_${customerIdStr}`).emit('ticket_updated', conv);
    }
    
    activeSessions.delete(customerIdStr);
    console.log(`⏰ Đã tự động kết thúc phiên chat của khách hàng ${customerIdStr}`);
  } catch (err) {
    console.error("Lỗi khi auto-đóng phiên chat:", err);
  }
};

// ==========================================
// LẮNG NGHE BỘ ĐÀM
// ==========================================
// Hàm tạo mã Ticket ngẫu nhiên

io.on('connection', (socket) => {
  const authenticatedUserId = socket.user.id;
  const authenticatedRole = socket.user.role;
  const supportRoles = ['superadmin', 'admin', 'support_admin'];
  const isSupportStaff = supportRoles.includes(authenticatedRole);

  socketUtil.addUser(authenticatedUserId, socket.id);
  socket.join(`room_user_${authenticatedUserId}`);
  if (isSupportStaff) socket.join('admin_room');

  // Tương thích với client cũ nhưng không tin userId do client gửi lên.
  socket.on('registerUser', (_ignoredUserId, callback) => {
    if (typeof callback === 'function') callback({ success: true });
  });

  // 1. NHẮN TIN BÌNH THƯỜNG
  socket.on('send_message', async (data, callback) => {
    try {
      const Message = (await import('./models/messageModel.js')).default;
      const Conversation = (await import('./models/conversationModel.js')).default;
      const text = typeof data?.text === 'string' ? data.text.trim() : '';
      if (!text || text.length > 2000) {
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Tin nhắn phải có từ 1 đến 2000 ký tự.' });
        }
        return;
      }

      let conversationId = data.conversationId;
      let customerId = authenticatedUserId;
      const sender = isSupportStaff ? 'admin' : 'customer';

      if (sender === 'customer') {
        const { conversation: conv, created } = await openConversation(authenticatedUserId);
        if (created) {
            const autoMsg = await Message.create({
              conversationId: conv._id,
              customerId: authenticatedUserId,
              sender: 'system',
              text: "Kính chào Quý Khách! Vui lòng đợi trong giây lát để kết nối với tổng đài viên.",
              action: 'normal'
            });
            io.to('admin_room').emit('receive_message', autoMsg);
            io.to(`room_user_${authenticatedUserId}`).emit('receive_message', autoMsg);
            io.to('admin_room').emit('new_ticket_created', conv);
        }

        conversationId = conv._id;
        await Conversation.findByIdAndUpdate(conv._id, { updatedAt: Date.now() });
      } else {
        const conv = await Conversation.findById(conversationId);
        if (!conv || conv.status !== 'active') {
          if (typeof callback === 'function') callback({ success: false, message: 'Không tìm thấy ticket.' });
          return;
        }
        if (
          authenticatedRole !== 'superadmin'
          && conv.assignedAdminId?.toString() !== authenticatedUserId.toString()
        ) {
          if (typeof callback === 'function') callback({ success: false, message: 'Bạn cần nhận ticket trước khi trả lời.' });
          return;
        }
        customerId = conv.customerId.toString();
      }

      const newMessage = await Message.create({
        conversationId,
        customerId,
        adminId: sender === 'admin' ? authenticatedUserId : null,
        sender,
        text,
        isRead: false
      });

      if (sender === 'admin') {
        if (activeSessions.has(customerId)) {
            clearTimeout(activeSessions.get(customerId));
        }
        const timerId = setTimeout(() => {
            endSession(customerId, io, conversationId);
        }, 10 * 60 * 1000);
        activeSessions.set(customerId, timerId);
      } else if (activeSessions.has(customerId)) {
            clearTimeout(activeSessions.get(customerId));
            activeSessions.delete(customerId);
        }

      io.to('admin_room').emit('receive_message', newMessage);
      io.to(`room_user_${customerId}`).emit('receive_message', newMessage);
      if (sender === 'customer') {
        io.to('admin_room').emit('new_message_notification', { conversationId });
      }

      if (typeof callback === 'function') callback({ success: true, conversationId });
    } catch (err) {
      console.error("Lỗi gửi tin:", err);
      if (typeof callback === 'function') callback({ success: false, message: "Lỗi server" });
    }
  });

// 2. ADMIN BẤM "THAM GIA HỖ TRỢ"
  socket.on('claim_session', async (data, callback) => {
    try {
      if (!isSupportStaff) {
        if (callback) callback({ success: false, message: 'Bạn không có quyền nhận ticket.' });
        return;
      }
      const Conversation = (await import('./models/conversationModel.js')).default;
      const Message = (await import('./models/messageModel.js')).default;
      const User = (await import('./models/userModel.js')).default;

      const conv = await claimConversation(data.conversationId, authenticatedUserId);
      const admin = await User.findById(authenticatedUserId).select('name');
      const customerId = conv.customerId.toString();

      const populatedConv = await Conversation.findById(conv._id)
        .populate('customerId', 'name email avatar')
        .populate('assignedAdminId', 'name');

      const sysMsg = await Message.create({
        conversationId: data.conversationId,
        customerId,
        adminId: authenticatedUserId,
        sender: 'system',
        text: `Hỗ trợ viên ${admin?.name || 'DocaStore'} xin chào quý khách, quý khách cần gì ạ?`,
        action: 'join_support'
      });

      io.to('admin_room').emit('receive_message', sysMsg);
      io.to(`room_user_${customerId}`).emit('receive_message', sysMsg);
      
      // SỬA Ở ĐÂY: Phải gửi cập nhật ticket cho CẢ Admin VÀ Khách hàng
      io.to('admin_room').emit('ticket_updated', populatedConv); 
      io.to(`room_user_${customerId}`).emit('ticket_updated', populatedConv);

      if (callback) callback({ success: true });
    } catch (err) {
      console.error("Lỗi claim_session:", err);
      if (typeof callback === 'function') callback({ success: false, message: err.status ? err.message : 'Không thể nhận ticket.' });
    }
  });

  // 3. BẤM NÚT KẾT THÚC PHIÊN CHỦ ĐỘNG
  socket.on('end_session', async (data, callback) => {
    try {
      const Conversation = (await import('./models/conversationModel.js')).default;
      const Message = (await import('./models/messageModel.js')).default;

      const existingConversation = await Conversation.findById(data.conversationId);
      if (!existingConversation) {
        if (callback) callback({ success: false, message: 'Không tìm thấy ticket.' });
        return;
      }

      const isOwner = existingConversation.customerId.toString() === authenticatedUserId.toString();
      const canCloseAsStaff = isSupportStaff && (
        authenticatedRole === 'superadmin'
        || existingConversation.assignedAdminId?.toString() === authenticatedUserId.toString()
      );
      if (!isOwner && !canCloseAsStaff) {
        if (callback) callback({ success: false, message: 'Bạn không có quyền kết thúc ticket này.' });
        return;
      }

      const customerId = existingConversation.customerId.toString();
      const conv = await Conversation.findOneAndUpdate(
        { _id: data.conversationId, status: { $in: ['pending', 'active'] } },
        { status: 'resolved' },
        { new: true }
      ).populate('customerId', 'name email avatar')
       .populate('assignedAdminId', 'name');

      if (!conv) { if (typeof callback === 'function') callback({ success: true }); return; }
      const sysMsg = await Message.create({
        conversationId: data.conversationId,
        customerId,
        sender: 'system',
        text: "Phiên hỗ trợ đã kết thúc.",
        action: 'end_support'
      });

      io.to('admin_room').emit('receive_message', sysMsg);
      io.to(`room_user_${customerId}`).emit('receive_message', sysMsg);
      
      // SỬA Ở ĐÂY: Báo cho Khách hàng biết là phiên đã bị kết thúc
      io.to('admin_room').emit('ticket_updated', conv); 
      io.to(`room_user_${customerId}`).emit('ticket_updated', conv);

      if (activeSessions.has(customerId)) {
          clearTimeout(activeSessions.get(customerId));
          activeSessions.delete(customerId);
      }
      if (callback) callback({ success: true });

    } catch (err) {
      console.error("Lỗi end_session:", err);
      if (callback) callback({ success: false, message: 'Lỗi server.' });
    }
  });

  socket.on('disconnect', () => {
    socketUtil.removeUser(socket.id);
  });
});

const CLIENT_URLS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin: CLIENT_URLS,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));
await connectDB();
startCronJobs();

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/api/user",userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/cart",cartRoutes);
app.use("/api/product", productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/banners', bannerRoutes);
mountOrderRoutes(app);
app.use('/api/notifications', notificationRoutes);
app.use('/api/news', newsRoutes);
app.post('/api/chat', askBot); // AI chat endpoint (Gemini)
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/messages', messageRoutes); // Registered message routes

// 4. CHẠY SERVER THAY VÌ APP
server.listen(PORT, ()=>{
    console.log(`🚀 Server đang chạy trên CỔNG ${PORT}`);
});
