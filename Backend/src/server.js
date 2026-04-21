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
import { askBot } from './controller/chatController.js';
import cors from 'cors';
import { startCronJobs } from './utils/cronjob.js'; 

dotenv.config();

const PORT = process.env.PORT || 5001;
const app = express();

// 1. BỌC EXPRESS BẰNG HTTP SERVER ĐỂ CHẠY SOCKET
const server = http.createServer(app);

// 2. KHỞI TẠO SOCKET.IO
const io = socketUtil.init(server);

// 3. LẮNG NGHE BỘ ĐÀM
io.on('connection', (socket) => {
  console.log('🟢 Có thiết bị vừa kết nối:', socket.id);

  socket.on('registerUser', async (userId) => {
    socketUtil.addUser(userId, socket.id);
    console.log(`📝 Đã ghi sổ: User ${userId} xài bộ đàm ${socket.id}`);
    
    // Tự động cho socket vào phòng riêng của user
    socket.join(`room_user_${userId}`);
    
    // Kiểm tra xem có phải admin không, nếu có thì cho vào admin_room
    try {
      const User = (await import('./models/userModel.js')).default;
      const user = await User.findById(userId);
      if (user && user.role !== 'customer') {
        socket.join('admin_room');
        console.log(`🏠 Admin ${userId} joined admin_room`);
      }
    } catch (e) {
      console.error("Lỗi khi join admin_room:", e);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      // data: { customerId, sender, text }
      const Message = (await import('./models/messageModel.js')).default;
      const newMessage = await Message.create({
        customerId: data.customerId,
        sender: data.sender,
        text: data.text,
        isRead: false
      });

      // Phát cho cả 2 phòng để đồng bộ UI
      const customerRoom = `room_user_${data.customerId}`;
      io.to('admin_room').emit('receive_message', newMessage);
      io.to(customerRoom).emit('receive_message', newMessage);

      // Nếu người gửi là customer, phát thêm event thông báo badge cho admin
      if (data.sender === 'customer') {
        io.to('admin_room').emit('new_message_notification', newMessage);
      }
    } catch (err) {
      console.error("Socket send_message error:", err);
    }
  });

  socket.on('disconnect', () => {
    socketUtil.removeUser(socket.id);
    console.log('🔴 Đã thu hồi bộ đàm:', socket.id);
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
app.use('/api/chat', askBot);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/messages', messageRoutes); // Registered message routes

// 4. CHẠY SERVER THAY VÌ APP
server.listen(PORT, ()=>{
    console.log(`🚀 Server đang chạy trên CỔNG ${PORT}`);
});