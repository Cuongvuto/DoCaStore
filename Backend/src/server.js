import 'dotenv/config';
import express from 'express';
import http from 'http'; 
import socketUtil from './utils/socket.js'; 
import userRoutes from './routes/userRoutes.js';
import { connectDB } from './config/db.js';
import dotenv from 'dotenv';
import categoryRoutes from './routes/categoryRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js';
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

dotenv.config();

const PORT = process.env.PORT || 5001;
const app = express();

// 1. BỌC EXPRESS BẰNG HTTP SERVER ĐỂ CHẠY SOCKET
const server = http.createServer(app);

// 2. KHỞI TẠO SOCKET.IO
const io = socketUtil.init(server);

// Tạo bộ nhớ lưu phiên chat
const activeSessions = new Map();

// Hàm tự động kết thúc phiên dự phòng (nếu 10 phút không ai nói gì/quên bấm nút)
const endSession = async (customerIdStr, io) => {
  try {
    const Message = (await import('./models/messageModel.js')).default;
    
    // Gửi tin báo kết thúc
    const sysMsg = await Message.create({
      customerId: customerIdStr,
      sender: 'system',
      text: "Phiên hỗ trợ đã tự động kết thúc.",
      action: 'end_support'
    });

    io.to('admin_room').emit('receive_message', sysMsg);
    io.to(`room_user_${customerIdStr}`).emit('receive_message', sysMsg);
    
    // Ẩn tin nhắn với khách hàng
    await Message.updateMany(
      { customerId: customerIdStr, hiddenFromCustomer: { $ne: true } },
      { $set: { hiddenFromCustomer: true } }
    );
    
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
const generateTicketId = () => {
  return '#TK-' + Math.floor(100000 + Math.random() * 900000); // VD: #TK-123456
};

io.on('connection', (socket) => {
  console.log('🟢 Có thiết bị vừa kết nối:', socket.id);

  socket.on('registerUser', async (userId) => {
    socketUtil.addUser(userId, socket.id);
    socket.join(`room_user_${userId}`);
    try {
      const User = (await import('./models/userModel.js')).default;
      const user = await User.findById(userId);
      if (user && user.role !== 'customer') socket.join('admin_room');
    } catch (e) {
      console.error("Lỗi khi join admin_room:", e);
    }
  });

  // 1. NHẮN TIN BÌNH THƯỜNG
  socket.on('send_message', async (data, callback) => {
    try {
      const Message = (await import('./models/messageModel.js')).default;
      const Conversation = (await import('./models/conversationModel.js')).default;
      
      let conversationId = data.conversationId;

      // NẾU LÀ KHÁCH HÀNG NHẮN: Kiểm tra xem có phiên nào đang mở không
      if (data.sender === 'customer') {
        let conv = await Conversation.findOne({ 
          customerId: data.customerId, 
          status: { $in: ['pending', 'active'] } 
        });

        // Nếu chưa có phiên nào, TẠO PHIÊN MỚI
        if (!conv) {
          conv = await Conversation.create({
            ticketId: generateTicketId(),
            customerId: data.customerId,
            status: 'pending'
          });

          // Tự động sinh tin nhắn Bot chào mừng
          setTimeout(async () => {
            const autoMsg = await Message.create({
              conversationId: conv._id,
              customerId: data.customerId,
              sender: 'system',
              text: "Kính chào Quý Khách! Vui lòng đợi trong giây lát để kết nối với tổng đài viên.",
              action: 'normal'
            });
            io.to('admin_room').emit('receive_message', autoMsg);
            io.to(`room_user_${data.customerId}`).emit('receive_message', autoMsg);
            // Báo cho Admin biết có Ticket mới
            io.to('admin_room').emit('new_ticket_created', conv);
          }, 1000);
        }
        
        conversationId = conv._id;
        
        // Cập nhật thời gian update để Ticket nổi lên đầu danh sách Admin
        await Conversation.findByIdAndUpdate(conv._id, { updatedAt: Date.now() });
      }

      // LƯU TIN NHẮN (Gắn cứng vào conversationId)
      const newMessage = await Message.create({
        conversationId: conversationId,
        customerId: data.customerId,
        adminId: data.adminId || null,
        sender: data.sender,
        text: data.text,
        isRead: false
      });

      io.to('admin_room').emit('receive_message', newMessage);
      io.to(`room_user_${data.customerId}`).emit('receive_message', newMessage);

      if (typeof callback === 'function') callback({ success: true, conversationId });
    } catch (err) {
      console.error("Lỗi gửi tin:", err);
      if (typeof callback === 'function') callback({ success: false, message: "Lỗi server" });
    }
  });

// 2. ADMIN BẤM "THAM GIA HỖ TRỢ"
  socket.on('claim_session', async (data, callback) => {
    try {
      const Conversation = (await import('./models/conversationModel.js')).default;
      const Message = (await import('./models/messageModel.js')).default;

      const conv = await Conversation.findById(data.conversationId);
      if (conv.assignedAdminId && conv.assignedAdminId.toString() !== data.adminId) {
        if (callback) callback({ success: false, message: "Ticket này đã có Admin khác hỗ trợ." });
        return;
      }

      conv.assignedAdminId = data.adminId;
      conv.status = 'active';
      await conv.save();

      const populatedConv = await Conversation.findById(conv._id)
        .populate('customerId', 'name email avatar')
        .populate('assignedAdminId', 'name');

      const sysMsg = await Message.create({
        conversationId: data.conversationId,
        customerId: data.customerId,
        adminId: data.adminId,
        sender: 'system',
        text: `Hỗ trợ viên ${data.adminName} xin chào quý khách, quý khách cần gì ạ?`,
        action: 'join_support'
      });

      io.to('admin_room').emit('receive_message', sysMsg);
      io.to(`room_user_${data.customerId}`).emit('receive_message', sysMsg);
      
      // SỬA Ở ĐÂY: Phải gửi cập nhật ticket cho CẢ Admin VÀ Khách hàng
      io.to('admin_room').emit('ticket_updated', populatedConv); 
      io.to(`room_user_${data.customerId}`).emit('ticket_updated', populatedConv); 

      if (callback) callback({ success: true });
    } catch (err) {
      console.error("Lỗi claim_session:", err);
    }
  });

  // 3. BẤM NÚT KẾT THÚC PHIÊN CHỦ ĐỘNG
  socket.on('end_session', async (data) => {
    try {
      const Conversation = (await import('./models/conversationModel.js')).default;
      const Message = (await import('./models/messageModel.js')).default;
      
      const conv = await Conversation.findByIdAndUpdate(
          data.conversationId, 
          { status: 'resolved' }, 
          { new: true }
      ).populate('customerId', 'name email avatar')
       .populate('assignedAdminId', 'name');

      const sysMsg = await Message.create({
        conversationId: data.conversationId,
        customerId: data.customerId,
        sender: 'system',
        text: "Phiên hỗ trợ đã kết thúc.",
        action: 'end_support'
      });

      io.to('admin_room').emit('receive_message', sysMsg);
      io.to(`room_user_${data.customerId}`).emit('receive_message', sysMsg);
      
      // SỬA Ở ĐÂY: Báo cho Khách hàng biết là phiên đã bị kết thúc
      io.to('admin_room').emit('ticket_updated', conv); 
      io.to(`room_user_${data.customerId}`).emit('ticket_updated', conv); 

    } catch (err) {
      console.error("Lỗi end_session:", err);
    }
  });

  socket.on('disconnect', () => {
    socketUtil.removeUser(socket.id);
  });
});

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
connectDB();
startCronJobs();

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/api/user",userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/cart",cartRoutes);
app.use("/api/product", productRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/news', newsRoutes);
app.post('/api/chat', askBot); // AI chat endpoint (Gemini)
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/messages', messageRoutes); // Registered message routes

// 4. CHẠY SERVER THAY VÌ APP
server.listen(PORT, ()=>{
    console.log(`🚀 Server đang chạy trên CỔNG ${PORT}`);
});