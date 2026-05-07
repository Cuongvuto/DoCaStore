# Hướng Dẫn Chi Tiết Chức Năng Thanh Toán VietQR (PayOS)

Tài liệu này giải thích cặn kẽ luồng hoạt động của chức năng thanh toán chuyển khoản qua mã VietQR sử dụng cổng thanh toán PayOS trong dự án **DoCaStore**, cùng với danh sách các file mã nguồn liên quan.

---

## 1. Tổng Quan Luồng Hoạt Động (Payment Flow)

1. **Người dùng đặt hàng:** Tại trang Checkout, người dùng chọn phương thức thanh toán "Chuyển khoản / QR Pay" (cụ thể là VietQR) và bấm Đặt hàng.
2. **Backend xử lý:** Hệ thống lưu đơn hàng nháp vào Database. Sau đó, mã hóa dữ liệu đơn hàng thành chữ ký (signature) và gửi HTTP request đến API của PayOS để tạo link/mã QR thanh toán.
3. **Hiển thị QR Code:** PayOS trả về chuỗi mã QR. Backend trả về cho Frontend hiển thị mã QR lên màn hình thanh toán.
4. **Lắng nghe kết quả (Socket):** Frontend mở kết nối Socket.IO tới Backend để chờ thông báo.
5. **Khách hàng quét mã:** Khách hàng dùng app ngân hàng quét mã QR và chuyển khoản.
6. **Webhook PayOS:** Khi nhận được tiền, PayOS tự động gọi đến API Webhook trên Backend của hệ thống.
7. **Cập nhật & Thông báo:** Backend nhận Webhook, xác thực chữ ký an toàn, cập nhật trạng thái đơn hàng thành "Đã thanh toán", và phát (emit) sự kiện qua Socket.IO để báo cho Frontend.
8. **Hoàn tất:** Frontend nhận được thông báo từ Socket, tự động chuyển hướng người dùng đến trang "Đặt hàng thành công".
9. **Dọn dẹp tự động:** Nếu khách hàng không thanh toán sau 15 phút, một Cronjob chạy ngầm sẽ tự động hủy đơn và hoàn lại số lượng tồn kho.

---

## 2. Các File Code Liên Quan

### 🖥️ Frontend (ReactJS)
*   **`frontend/src/pages/Checkout.jsx`**
    *   *Nhiệm vụ:* Thu thập thông tin giao hàng, giỏ hàng, áp dụng mã giảm giá và gửi request tạo đơn hàng (`POST /orders`). Xử lý chuyển hướng người dùng sang trang `PaymentPage` kèm theo dữ liệu `qrCode` và `amount`.
*   **`frontend/src/pages/PaymentPage.jsx`**
    *   *Nhiệm vụ:* Nhận chuỗi `qrCode` và sử dụng thư viện `qrcode.react` để vẽ mã QR. Đồng thời, khởi tạo kết nối `Socket.IO` lắng nghe sự kiện `payment_success` để tự động chuyển hướng sang trang thành công mà không cần người dùng tải lại trang. Hỗ trợ nút "Hủy giao dịch".

### ⚙️ Backend (Node.js / Express)
*   **`Backend/src/controller/orderController.js`**
    *   *Nhiệm vụ:* Nơi chứa toàn bộ logic xử lý chính của đơn hàng và thanh toán.
    *   `createOrder`: Tạo đơn hàng lưu vào Database, tạo chữ ký HMAC SHA256 (`generatePayOSSignature`), gọi API của PayOS (`fetch('https://api-merchant.payos.vn/v2/payment-requests')`) để lấy dữ liệu mã QR trả về cho frontend.
    *   `payosWebhook`: Endpoint nhận tín hiệu từ PayOS khi có người chuyển khoản thành công. Kiểm tra chữ ký bảo mật, cập nhật DB và gọi `socketUtil` để báo lại cho Frontend.
    *   `cancelOrder`: Xử lý hủy đơn hàng và gọi API PayOS để hủy mã QR tương ứng trên hệ thống PayOS.
*   **`Backend/src/utils/cronjob.js`**
    *   *Nhiệm vụ:* Chứa hàm `startCronJobs()` chạy định kỳ mỗi 5 phút bằng thư viện `node-cron`. Nhiệm vụ của nó là tìm các đơn hàng VietQR chưa thanh toán quá 15 phút để hủy tự động, trả lại số lượng tồn kho và hoàn lại mã giảm giá cho khách.
*   **`Backend/src/utils/socket.js`**
    *   *Nhiệm vụ:* Cấu hình Web Socket để tạo kênh giao tiếp thời gian thực giữa server và client.
*   **`Backend/src/models/oderModel.js`**
    *   *Nhiệm vụ:* Model lưu trữ dữ liệu đơn hàng trong MongoDB, có chứa các trường quan trọng như `paymentMethod`, `payosOrderCode`, `paymentStatus`.

---

## 3. Giải Thích Chi Tiết Từng Tính Năng Quan Trọng

### 3.1. Chữ ký bảo mật (Signature) khi giao tiếp với PayOS
Để đảm bảo dữ liệu không bị thay đổi trên đường truyền, Backend sử dụng hàm `generatePayOSSignature` trong `orderController.js`.
*   Nó sắp xếp các trường dữ liệu theo thứ tự Alphabet, nối chúng lại thành một chuỗi (ví dụ: `amount=...&cancelUrl=...&description=...&orderCode=...&returnUrl=...`).
*   Sử dụng thuật toán `HMAC SHA256` kết hợp với khóa bí mật `PAYOS_CHECKSUM_KEY` (lưu trong `.env`) để băm chuỗi này thành một chữ ký (signature). Chữ ký này được gửi kèm lên PayOS để chứng minh request hợp lệ.

### 3.2. Vẽ QR Code ở Frontend
Ở `Checkout.jsx`, sau khi Backend tạo đơn thành công sẽ trả về biến `qrCode` (là một chuỗi ký tự chứa thông tin thanh toán chuẩn EMVCo).
`Checkout.jsx` truyền chuỗi này sang `PaymentPage.jsx` thông qua `react-router-dom` (biến `state`). Tại `PaymentPage.jsx`, component `<QRCodeCanvas value={qrCode} />` được sử dụng để trực tiếp render ra hình ảnh mã QR vuông cho khách quét.

### 3.3. Webhook bảo mật
Khi có giao dịch chuyển khoản thành công, server PayOS tự động "gọi điện" (HTTP POST request) tới server của chúng ta qua hàm `payosWebhook` (`orderController.js`).
1.  Hệ thống nhận `data` và `signature` từ PayOS.
2.  Tiến hành băm dữ liệu `data` bằng `PAYOS_CHECKSUM_KEY` tương tự bước tạo.
3.  So sánh kết quả băm với `signature` mà PayOS gửi. Nếu khớp => Webhook chuẩn từ PayOS, không phải hacker giả mạo.
4.  Cập nhật đơn hàng thành `paid` và `processing`.

### 3.4. Cập nhật giao diện thời gian thực (Real-time Socket.IO)
Trong quá trình khách hàng dùng điện thoại quét mã thanh toán, màn hình website vẫn đang mở `PaymentPage.jsx`.
1.  `PaymentPage.jsx` kết nối Socket tới server và "đăng ký" bằng `userId` của khách hàng.
2.  Khi `payosWebhook` xác nhận tiền vào, backend sẽ dùng `io.to(userSocketId).emit('payment_success', ...)` gửi thông điệp cho đúng user đó.
3.  `PaymentPage.jsx` nhận được thông điệp, hiển thị hiệu ứng thành công (toast "Thanh toán thành công!") và chuyển hướng mượt mà sang `/order-success` mà khách hàng không cần bấm F5 hay bất cứ nút gì.

### 3.5. Cronjob Dọn Dẹp (Auto Cancel)
Nếu khách chọn VietQR nhưng thoát trang không thanh toán, mã QR sẽ treo. Ở `cronjob.js`, hệ thống dùng `node-cron` chạy ngầm mỗi 5 phút:
*   Truy vấn các đơn có `paymentMethod: 'VietQR'`, `status: 'pending'` và `createdAt` quá 15 phút.
*   Update `status = 'cancelled'`.
*   Cộng lại số lượng sản phẩm (`stock`) vào bảng `Product`.
*   Hoàn lại lượt sử dụng mã giảm giá `Coupon` cho khách hàng để họ có thể dùng vào lần đặt hàng sau.
