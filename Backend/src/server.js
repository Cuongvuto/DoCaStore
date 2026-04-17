import 'dotenv/config';
import express from 'express';
import http from 'http'; // Chuyển sang dùng import
import socketUtil from './utils/socket.js'; // Chuyển sang dùng import
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

  socket.on('registerUser', (userId) => {
    socketUtil.addUser(userId, socket.id);
    console.log(`📝 Đã ghi sổ: User ${userId} xài bộ đàm ${socket.id}`);
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

// 4. CHẠY SERVER THAY VÌ APP
server.listen(PORT, ()=>{
    console.log(`🚀 Server đang chạy trên CỔNG ${PORT}`);
});