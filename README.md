# 🛒 Fullstack E-Commerce Platform

Đây là dự án Website Thương mại điện tử toàn diện bao gồm cả Frontend và Backend, hỗ trợ nhiều tính năng chuẩn mực của thiết kế thương mại hiện đại, đi kèm với hệ thống thông báo thời gian thực và trang quản trị (Admin CMS) mạnh mẽ.

---

## 🌟 Các Tính Năng Nổi Bật (Key Features)

### Của Khách Hàng (Client)
- **Trải Nghiệm Mua Sắm:** Quy trình hoàn chỉnh từ xem sản phẩm, phân loại danh mục, thêm vào Giỏ hàng (Cart) và Yêu thích (Wishlist).
- **Thanh Toán (Checkout):** Luồng xử lý đơn hàng chi tiết, hỗ trợ áp dụng **Mã giảm giá (Coupons)**.
- **Tài Khoản & Cá Nhân Hóa:** Quản lý thông tin cá nhân, sửa địa chỉ giao hàng và tài khoản.
- **Tin Tức & Đánh Giá:** Khách hàng có thể đọc bài viết blog (News) và để lại đánh giá, nhận xét (Reviews) trên từng sản phẩm.
- **Thông Báo Real-time (Socket.io):** Thông báo tức thời khi trạng thái đơn đăng giao, đăng ký thành công, hay khuyến mãi mới mà không cần F5 trình duyệt.

### Của Quản Trị Viên (Admin CMS)
- **Quản Lý Bán Hàng Trọng Tâm:** Có module Quản lý Sản Phẩm (Products), Danh Mục (Categories), Người Dùng (Users) và Đơn hàng (Orders).
- **Công Cụ Marketing:** Cung cấp trình quản lý Mã Giảm Giá (Coupons), Quản lý Banner ảnh sự kiện, Hệ thống Bài viết (News/Blog).
- **Thông Báo Đẩy Toàn Cục:** Quản trị viên có khả năng đẩy (push) thông báo đến toàn bộ người dùng hoặc một người dùng cụ thể ngay lập tức.

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)

### **Frontend**
- **Core:** React 19, Vite.js
- **Styling:** Tailwind CSS, Radix UI, Class Variance Authority
- **Routing:** React Router Dom (v7)
- **State Management:** React Context API (Auth, Cart, Wishlist providers)
- **Forms & Validation:** React Hook Form + Zod
- **Animations:** Framer Motion
- **Khác:** Axios (Call API), Socket.io-client (Real-time), React-Quill-New (Trình soạn thảo văn bản).

### **Backend**
- **Core:** Node.js, Express.js (v5)
- **Database:** MongoDB (Sử dụng Mongoose ORM)
- **Bảo mật & Cấp Quyền:** JSON Web Token (JWT) + Bcryptjs
- **Real-time:** Socket.io (chạy chung Http object server)
- **Quản Lý Tệp (Upload File):** Cloudinary và Multer (Multer-storage-cloudinary)
- **Giao Tiếp Khác:** Nodemailer (Gửi Email)

---

## 📂 Tổ Chức Cấu Trúc Dự Án (Project Structure)

Dự án được chia thành hai thư mục lớn với cấu trúc Monorepo:

### `Backend/`
```text
Backend/
├── src/
│   ├── config/      # Khởi tạo Database (Mongoose) v.v...
│   ├── controller/  # Chứa Controller điều hướng logic chính của từng Entity
│   ├── middlewares/ # Kiểm tra Access Token, kiểm soát Quyền Admin
│   ├── models/      # Khai báo Schema cho MongoDB (User, Product, Cart...)
│   ├── routes/      # Định tuyến các API endpoint (GET, POST, PUT, DELETE)
│   ├── utils/       # Chứa các hàm dùng chung (như socket.js, gửi email)
│   └── server.js    # File chạy gốc, config Express và chạy Socket server
└── package.json     
```

### `frontend/`
```text
frontend/
├── src/
│   ├── api/         # Chứa logic config và gọi Axios lên Server
│   ├── assets/      # Ảnh cục bộ, icon vector..
│   ├── components/  # Chứa các React Components dùng lại nhiều lần (Button, Card...)
│   ├── context/     # React Context phục vụ State Global (CartContext, AuthContext)
│   ├── layouts/     # Vỏ bọc hiển thị (MainLayout cho Client, AdminLayout cho Admin)
│   ├── pages/       # Nơi chia màn hình (Home, Admin/*, Client/*, Auth)
│   ├── App.jsx      # Chứa cục gốc Routing dự án
│   └── main.jsx     # Gọi React Create Root
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## 🛠 Hướng Dẫn Cài Đặt Và Khởi Chạy (Installation)

### 1. Yêu cầu trước (Prerequisites)
- [Node.js](https://nodejs.org/en/) bản LTS (Khuyên dùng bản 18+ hoặc 20+)
- [MongoDB](https://www.mongodb.com/) (Hoặc cài đặt cluster trên MongoDB Atlas Cloud)
- Khởi tạo tài khoản [Cloudinary](https://cloudinary.com/) (Dùng cho ảnh)

### 2. Thiết lập Biến Môi Trường (Environment Variables)

**Ở thư mục `Backend/`,** tạo file `.env` với các nội dung sau:
```env
PORT=5001
MONGO_URI=mongodb_cua_ban_o_day
JWT_SECRET=doan_ma_bao_mat_cua_ban_o_day

# Thiết lập hệ thống gửi Email (Tham khảo Google App Passwords)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Thiết lập Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

*(Lưu ý phía `frontend` nếu bạn có dùng biến môi trường cũng cấu hình trong file `.env` root theo chuẩn của Vite là `VITE_API_URL`...)*

### 3. Cài Đặt Dependencies Và Chạy

Bạn mở 2 cửa sổ dòng lệnh Terminal để chạy riêng rẽ Frontend và Backend.

**Terminal 1: Chạy Backend**
```bash
cd Backend
npm install
npm run dev
```
> API và Socket Server sẽ chạy song song tại cổng: `http://localhost:5001`

**Terminal 2: Chạy Frontend**
```bash
cd frontend
npm install
npm run dev
```
> Trình duyệt hiển thị App React chạy qua Vite.
