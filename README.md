# 🎣 DoCaStore - Nền Tảng Thương Mại Điện Tử Cửa Hàng Đồ Câu

**Triển khai lại Vercel + Render:** xem [hướng dẫn và điều kiện nghiệm thu](docs/DEPLOY_READINESS.md) trước khi push nhánh tự động deploy. Đơn lịch sử thiếu thông tin giữ kho cần được đối chiếu; không chạy cập nhật dữ liệu hàng loạt theo suy đoán.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

DoCaStore là một hệ thống web-app thương mại điện tử chuyên biệt được phát triển dành cho cửa hàng bán đồ câu cá. Dự án tích hợp các công nghệ hiện đại nhằm tối ưu hóa toàn bộ quy trình từ giới thiệu sản phẩm, giỏ hàng, thanh toán tự động đến chăm sóc khách hàng và quản trị doanh thu.

---

## 📑 Bảng Nội Dung
- [🌟 Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
- [🛠 Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [📂 Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [🚀 Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
- [⚙️ Cấu Hình Biến Môi Trường (.env)](#️-cấu-hình-biến-môi-trường-env)
- [💡 Hướng Dẫn Sử Dụng (Quy trình mua hàng)](#-hướng-dẫn-sử-dụng-quy-trình-mua-hàng)
- [👨‍💻 Tác Giả](#-tác-giả)

---

## 🌟 Tính Năng Nổi Bật

### 🛒 Dành cho Khách Hàng (Customer)
- **Quản lý Giỏ Hàng & Đặt Hàng:** Thêm, sửa, xóa sản phẩm trong giỏ dễ dàng.
- **Thanh toán tự động bằng VietQR:** Tự động sinh mã QR động chứa sẵn số tiền và nội dung đơn hàng. Khách hàng chỉ cần quét mã qua app ngân hàng.
- **Hệ thống Email Thông Báo:** Tự động gửi email xác nhận tạo tài khoản và email hóa đơn thanh toán thông qua **NodeMailer**.
- **Chat Trực Tuyến (Customer Chat Widget):** Trò chuyện trực tiếp với shop ngay trên website (Hỗ trợ theo thời gian thực).
- **Tin Tức & Đánh Giá:** Đọc các bài viết chia sẻ kinh nghiệm câu cá và tham gia đánh giá, bình luận (Review) trên từng sản phẩm đã mua.
- **SEO & Open Graph:** Tối ưu hóa thẻ meta OG giúp chia sẻ liên kết sản phẩm lên Facebook, Zalo, Discord hiển thị đầy đủ hình ảnh, tiêu đề đẹp mắt.

### 👑 Dành cho Quản Trị Viên (Admin)
- **Admin Dashboard:** Bảng điều khiển hiển thị báo cáo thống kê doanh thu, số lượng đơn hàng, sản phẩm bán chạy qua các biểu đồ trực quan.
- **Quản Lý Sản Phẩm & Danh Mục:** Dễ dàng thao tác CRUD (Thêm/Sửa/Xóa) hàng hóa, hình ảnh, giá cả.
- **Quản Lý Đơn Hàng:** Xem lịch sử, chi tiết giao dịch.
- **Quản Lý Chat Khách Hàng:** Giao diện hỗ trợ quản lý và phản hồi tin nhắn trực tiếp từ người mua.

### ⚙️ Tính năng Hệ Thống (Background)
- **Tự động xác thực Webhook:** Server Backend tự động lắng nghe Webhook từ đối tác VietQR. Khi có giao dịch thành công, hệ thống đối soát số tiền và tự cập nhật đơn hàng thành `PAID` không cần con người can thiệp.
- **Dọn Dẹp Đơn Hàng Tự Động (Cron Job):** Tự động quét và hủy các đơn hàng `PENDING` quá hạn thanh toán (Automated Expiration Cleanup) để tự động hoàn lại số lượng tồn kho.

---

## 🛠 Công Nghệ Sử Dụng

### Frontend
- **Framework:** ReactJS (Sử dụng Vite)
- **Styling:** TailwindCSS
- **State Management:** Context API / Redux
- **Routing:** React Router DOM
- **Khác:** Thẻ Open Graph meta tags phục vụ SEO, component hiển thị Chat Widget.

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB & Mongoose ORM
- **Authentication:** JWT (JSON Web Tokens), bcrypt
- **Services:** 
  - `nodemailer` (SMTP Email gửi hóa đơn/mã xác nhận)
  - `node-cron` (Lên lịch tự động xóa đơn)
  - `socket.io` / Polling (Hệ thống tin nhắn)
- **Payment API:** Tích hợp API VietQR (Tạo mã) & Xử lý Webhook Verification.

---

## 📂 Cấu Trúc Dự Án
Dự án được phân chia thư mục theo chuẩn Monorepo, độc lập giữa Backend và Frontend:
```text
DoCaStore_Project/
├── Backend/                 # Mã nguồn Express.js server
│   ├── src/
│   │   ├── controllers/     # Xử lý logic nghiệp vụ (Order, Cart, User...)
│   │   ├── models/          # Định nghĩa Mongoose Schema
│   │   ├── routes/          # Khai báo Express Routes
│   │   ├── middlewares/     # Xác thực Auth JWT, Error handling
│   │   └── utils/           # Các hàm tiện ích (NodeMailer, Webhook config)
│   └── package.json
├── frontend/                # Mã nguồn ReactJS client
│   ├── src/
│   │   ├── components/      # UI Components dùng chung (Header, ChatWidget,...)
│   │   ├── pages/           # View Pages (Auth, Home, Checkout, Dashboard...)
│   │   ├── layouts/         # Layouts cơ bản
│   │   └── utils/           # Hàm gọi API, helpers
│   └── package.json
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Yêu cầu hệ thống
- Node.js 22.x, tối thiểu 22.12.0 (theo `engines` của hai ứng dụng).
- MongoDB >= 5.0 với replica set hoặc MongoDB Atlas; checkout mới cần transaction.
- Tài khoản SMTP (như Gmail App Password) để gửi email.

### 2. Cài đặt Backend
```bash
cd Backend
npm ci --legacy-peer-deps

# Khởi chạy server ở chế độ development
npm run dev
```

### 3. Cài đặt Frontend
```bash
cd frontend
npm ci

# Khởi chạy ứng dụng React
npm run dev
```

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

### Backend `.env`
Bạn cần tạo file `.env` trong thư mục `Backend/` với các cấu hình tối thiểu sau:
```env
# Thiết lập Server
PORT=5001
MONGODB_CONNECTIONSTRING=mongodb://localhost:27017/docastore?replicaSet=rs0
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
# Chỉ bật sau khi đã kiểm tra DB/PayOS đúng môi trường
ENABLE_MAINTENANCE_JOBS=false

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# NodeMailer (Dịch vụ gửi email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# VietQR Payment
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FROM_EMAIL=your_verified_sender@example.com
FROM_NAME=DoCaStore
```

### Frontend `.env`
Tạo file `.env` trong thư mục `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
# Bật Google Login khi có OAuth Client ID và origin hợp lệ
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 💡 Hướng Dẫn Sử Dụng (Quy trình mua hàng)

1. **Đăng nhập / Đăng ký:** Tạo tài khoản và kiểm tra hộp thư email (inbox/spam) để lấy thông tin do NodeMailer gửi.
2. **Mua hàng:** Tìm kiếm đồ câu, xem thông tin và cho vào Giỏ hàng.
3. **Thanh toán VietQR:**
   - Tại trang Thanh toán (Checkout), điền thông tin và chọn phương thức "Thanh toán VietQR".
   - Hệ thống tự động sinh một mã QR động.
   - Khách hàng dùng ứng dụng ngân hàng quét mã QR (số tiền và mã đơn hàng đã được điền sẵn, không cần nhập tay).
4. **Xác nhận tự động (Webhook):**
   - Khi chuyển tiền thành công, Bank/VietQR đẩy Webhook về Server DoCaStore.
   - Server lập tức cập nhật đơn hàng sang `Đã Thanh Toán` và gửi Email hóa đơn cho khách.
   - *(Bảo vệ tồn kho: Nếu sau 15-30 phút không quét mã, hệ thống tự động dọn dẹp và hủy đơn).*

---

## 👨‍💻 Tác Giả
**Vũ Duy Cương**

