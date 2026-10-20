# Báo cáo cải tiến frontend và backend liên quan

**Dự án:** DocaStore

**Cập nhật chuẩn bị triển khai 19/10/2026:** xem [sửa lỗi ưu tiên, kiểm thử và điều kiện deploy lại](docs/DEPLOY_READINESS.md). Nội dung phía dưới ghi nhận đợt cải tiến trước đó.

**Ngày hoàn thành:** 31/07/2026

**Phạm vi:** Frontend React/Vite và các phần backend ảnh hưởng trực tiếp đến giao diện, xác thực, phân quyền, dữ liệu và realtime.

---

## 1. Mục tiêu

Đợt cải tiến tập trung vào các mục tiêu:

- Làm giao diện đồng nhất, hiện đại và responsive hơn.
- Giảm dung lượng tải ban đầu và các tác vụ dư thừa.
- Chuẩn hóa kiến trúc provider, routing, API và Socket.IO.
- Bảo đảm phân quyền không chỉ nằm ở giao diện mà được kiểm tra tại backend.
- Sửa các điểm không đồng nhất giữa frontend và backend.
- Làm sạch lint, dependency và bổ sung kiểm thử tối thiểu cho logic quan trọng.

---

## 2. Kết quả tổng quan

| Hạng mục | Trước cải tiến | Sau cải tiến |
|---|---:|---:|
| JavaScript entry chunk | Khoảng 1.444 KB | Khoảng 341 KB |
| Gzip entry chunk | Khoảng 420,8 KB | Khoảng 107 KB |
| ESLint | 41 lỗi, 11 cảnh báo | 0 lỗi, 0 cảnh báo |
| Route loading | Import đồng bộ phần lớn trang | Lazy loading theo từng route |
| Provider | Có provider và socket bị khởi tạo trùng | Một cây provider thống nhất |
| Socket authentication | Tin dữ liệu định danh do client gửi | Xác thực JWT khi handshake |
| Phân quyền backend | Quyền admin dùng khá rộng | Phân quyền theo từng nhóm nghiệp vụ |
| API đơn hàng | Tồn tại cả `/api/order` và `/api/orders` | Chuẩn hóa về `/api/orders` |
| Backend production audit | 11 cảnh báo dependency | 0 cảnh báo |
| Unit test backend | Chưa có | 4 test phân quyền, đều pass |

JavaScript của các màn hình lớn hiện được tách thành chunk riêng và chỉ tải khi người dùng mở màn hình đó. Vì vậy tổng kích thước toàn bộ ứng dụng vẫn bao gồm các chunk quản trị, nhưng chi phí tải ban đầu đã giảm đáng kể.

---

## 3. Thay đổi kiến trúc frontend

### 3.1. Provider

#### Code cũ

- Các context được lồng tại nhiều vị trí.
- Một số provider có thể bị khởi tạo lại hoặc tồn tại đồng thời.
- Cart, wishlist, notification và socket không được reset rõ ràng khi token thay đổi.

#### Code mới

- Tạo `frontend/src/context/AppProviders.jsx` làm điểm duy nhất để khai báo provider.
- `main.jsx` chỉ mount một cây provider.
- Các provider phụ thuộc đăng nhập được gắn `key` theo token.
- Khi đăng nhập, đăng xuất hoặc đổi tài khoản, cart, wishlist và notification được reset đúng phiên.
- Các value của context được memo hóa; các hàm cập nhật dùng `useCallback` để giảm render không cần thiết.

### 3.2. Routing và code splitting

#### Code cũ

- Các page được import trực tiếp vào `App.jsx`.
- Browser phải tải phần lớn trang khách hàng và trang quản trị ngay từ đầu.
- Kiểm tra quyền truy cập nằm rải rác trong page hoặc layout.

#### Code mới

- Toàn bộ page chính được tải bằng `React.lazy`.
- Dùng `Suspense` với trạng thái tải chung.
- Tạo `frontend/src/components/ProtectedRoute.jsx`.
- Tách rõ:
  - Route công khai.
  - Route yêu cầu đăng nhập.
  - Route khách hàng.
  - Route theo từng nhóm quản trị.
- Thêm trang 404 rõ ràng hơn.

Các chunk lớn như Dashboard, News Manager, Payment và AI Chatbot không còn nằm trong luồng tải ban đầu.

### 3.3. Auth state

#### Code cũ

- Frontend có thể sử dụng ngay user lưu trong `localStorage` mà chưa xác minh token.
- Khi token hết hạn, các context có thể giữ trạng thái cũ.
- Axios chỉ gắn token vào request.

#### Code mới

- `AuthContext` xác minh phiên lưu cũ bằng `/user/me`.
- `ProtectedRoute` chờ hoàn tất kiểm tra phiên trước khi render trang được bảo vệ.
- Axios interceptor xử lý response `401`:
  - Xóa token, user và role khỏi local storage.
  - Phát sự kiện đăng xuất chung.
  - Đồng bộ lại toàn bộ context.
- Giữ nguyên luồng Google Login đã có và cải tiến:
  - Google Identity SDK chỉ được tải khi mở trang đăng nhập.
  - Không còn tải script Google trên mọi trang.
  - Báo lỗi rõ ràng nếu thiếu `VITE_GOOGLE_CLIENT_ID`.

---

## 4. Phân quyền và bảo mật backend

### 4.1. Xác thực token

#### Code cũ

- Middleware giải mã JWT và tin trực tiếp role được lưu trong token.
- Nếu một nhân viên bị hạ quyền hoặc xóa tài khoản, token cũ vẫn có thể giữ quyền đến khi hết hạn.

#### Code mới

- Sau khi giải mã JWT, middleware truy vấn lại user trong database.
- Kiểm tra:
  - User còn tồn tại.
  - Tài khoản đã xác thực.
  - Role hiện tại trong database.
- Role trong request được lấy từ database, không lấy hoàn toàn từ token cũ.
- Socket.IO cũng thực hiện cùng cơ chế khi handshake.

### 4.2. Role policy

Tạo `Backend/src/config/roles.js` để tập trung:

- Danh sách toàn bộ role.
- Danh sách role nhân viên.
- Role được phép quản lý user.
- Quy tắc cấp role.
- Quy tắc quản lý tài khoản Super Admin.

Các nhóm quyền hiện tại:

- `superadmin`
- `admin`
- `product_admin`
- `order_admin`
- `support_admin`
- `customer`

### 4.3. Phân quyền theo nghiệp vụ

#### Code cũ

- Middleware `isAdmin` được dùng khá rộng.
- Nhân viên ở một bộ phận có khả năng truy cập API không thuộc nghiệp vụ của mình.

#### Code mới

- Quản lý sản phẩm, danh mục, banner và nội dung:
  - `superadmin`
  - `admin`
  - `product_admin`
- Quản lý đơn hàng và coupon:
  - `superadmin`
  - `admin`
  - `order_admin`
- Quản lý chat và thông báo:
  - `superadmin`
  - `admin`
  - `support_admin`
- Quản lý tài khoản:
  - `superadmin`
  - `admin`
- Admin thường không thể:
  - Tạo Super Admin.
  - Đổi quyền Super Admin.
  - Xóa Super Admin.
- Không tài khoản nào được tự xóa hoặc tự đổi role của chính mình.

### 4.4. Đăng ký và tạo nhân viên

#### Code cũ

- Luồng đăng ký công khai có nguy cơ nhận role từ body do client gửi.
- Màn hình quản trị dùng chung endpoint đăng ký công khai để tạo tài khoản.

#### Code mới

- Đăng ký công khai luôn tạo `customer`.
- Email được trim và chuyển về chữ thường.
- Mật khẩu yêu cầu tối thiểu 8 ký tự.
- Tạo nhân viên sử dụng endpoint riêng:
  - `POST /api/user/admin/staff`
- Endpoint tạo nhân viên yêu cầu quyền quản lý user.
- Tài khoản nhân viên được tạo ở trạng thái đã xác thực.

### 4.5. Google Login

- Kiểm tra `email_verified` từ Google.
- Chuẩn hóa email trước khi tìm hoặc tạo user.
- Không nâng role khi đăng nhập bằng Google.
- Tài khoản Google mới luôn được tạo với role `customer`.

### 4.6. Ownership

Đã bổ sung hoặc siết kiểm tra quyền sở hữu cho:

- Đơn hàng.
- Review sản phẩm.
- Review bài viết.
- Lịch sử chat.
- Ticket hỗ trợ.
- Địa chỉ giao hàng.

Địa chỉ không còn cập nhật trực tiếp toàn bộ `req.body`; backend chỉ nhận các field được cho phép, tránh mass assignment vào `userId` hoặc field hệ thống.

---

## 5. Socket.IO và realtime

### 5.1. Code cũ

- Client gửi `userId`, `sender`, `adminId` hoặc `customerId` lên socket.
- Server có thể tin các trường này để xác định người gửi.
- Một user chủ yếu được ánh xạ tới một socket.
- Trang Payment và Notification có thể tạo socket riêng.

### 5.2. Code mới

- Socket yêu cầu JWT ngay khi handshake.
- Server tự xác định:
  - User ID.
  - Role.
  - Người gửi là customer hay admin.
  - Room mà socket được phép tham gia.
- Dữ liệu định danh giả do client gửi không còn được tin cậy.
- Một user có thể có nhiều socket, phù hợp với nhiều tab hoặc thiết bị.
- Khách hàng chỉ vào room của chính mình.
- Chỉ nhóm hỗ trợ được vào `admin_room`.
- Support staff phải nhận ticket trước khi trả lời.
- Chỉ người sở hữu ticket, nhân viên được phân công hoặc Super Admin được kết thúc phiên.
- Nội dung tin nhắn được trim và giới hạn 2.000 ký tự.
- Payment và Notification dùng chung một socket từ context.
- Thông báo thanh toán được emit vào room user, hỗ trợ nhiều tab.

---

## 6. Chuẩn hóa API và dữ liệu

### 6.1. Sản phẩm

Backend `getAllProduct` và `getProductsByCategory` hiện hỗ trợ:

- `page`
- `limit`
- `search`
- `sort`
- `category`
- Metadata:
  - `totalCount`
  - `totalPages`
  - `currentPage`

Các giá trị phân trang được parse an toàn và giới hạn tối đa 50 item/request.

Frontend Product Page và Category Page:

- Không còn tải toàn bộ danh sách rồi lọc hoàn toàn ở client.
- Gửi search, sort và page lên server.
- Search được debounce.
- Request cũ được hủy khi từ khóa hoặc bộ lọc thay đổi.
- Giảm dữ liệu truyền và tránh kết quả request cũ ghi đè request mới.

### 6.2. Banner

#### Code cũ

- Trang chủ và trang quản trị có thể dùng chung endpoint banner.
- Khi endpoint quản trị được bảo vệ, trang chủ có nguy cơ không tải được banner.

#### Code mới

- `GET /api/banners/active`: công khai cho trang chủ.
- `GET /api/banners`: chỉ dành cho nhóm quản lý sản phẩm/nội dung.
- Banner mặc định dùng asset cục bộ thay vì phụ thuộc ảnh Unsplash.

### 6.3. Đơn hàng

#### Code cũ

- Backend đăng ký đồng thời:
  - `/api/order`
  - `/api/orders`
- Frontend khách hàng và quản trị sử dụng không đồng nhất.

#### Code mới

- Chỉ dùng `/api/orders`.
- Order Manager đã chuyển sang endpoint số nhiều.
- Các route xem đơn, cập nhật trạng thái, hủy và preview giá dùng cùng contract.

### 6.4. Review

- Sửa route delete review dùng đúng `:id`.
- Khách hàng chỉ xóa review của chính mình.
- Nhóm quản lý nội dung có thể xử lý review theo quyền.

### 6.5. PayOS webhook

- Tiếp tục xác minh HMAC SHA-256.
- So sánh chữ ký bằng `crypto.timingSafeEqual`.
- Không còn log toàn bộ chuỗi ký và signature nhạy cảm.
- Emit thành công thanh toán vào room của user thay vì một socket đơn lẻ.

---

## 7. Cải tiến hiệu năng frontend

### 7.1. Lazy loading

- Page được lazy load theo route.
- AI Chatbot chỉ tải sau thời điểm idle.
- News editor và dashboard nằm ở chunk riêng.

### 7.2. Context và render

- Dùng `useMemo` cho context value.
- Dùng `useCallback` cho các hàm được truyền xuống component.
- Loại bỏ effect dư thừa.
- Provider được reset theo phiên thay vì giữ dữ liệu tài khoản cũ.

### 7.3. Ảnh

Đã bổ sung tùy ngữ cảnh:

- `loading="lazy"`
- `decoding="async"`
- `fetchPriority="high"` cho ảnh chính sản phẩm
- Alt text có ý nghĩa
- Tỷ lệ ảnh sản phẩm nhất quán hơn

### 7.4. Dependency giao diện

Đã loại bỏ khỏi frontend:

- Material UI
- MUI Icons
- Emotion
- Framer Motion

Trang thanh toán được viết lại bằng Tailwind CSS, Lucide Icons và QRCode hiện có của dự án. Việc này giảm số hệ design system trộn lẫn trong cùng ứng dụng.

---

## 8. Giao diện và trải nghiệm người dùng

### 8.1. Design system

- Chuẩn hóa màu primary theo nhận diện xanh DocaStore.
- Đồng nhất màu header, trạng thái hover, active và focus.
- Thêm focus ring chung cho thao tác bàn phím.
- Thiết lập font và màu nền body thống nhất.
- Thêm hỗ trợ `prefers-reduced-motion`.
- Đặt `lang="vi"` cho tài liệu HTML.
- Bổ sung min-width hợp lý cho mobile.

### 8.2. Header

- Cải thiện menu desktop và mobile.
- Menu mobile tự đóng khi chọn link.
- Trạng thái active rõ ràng.
- Thêm aria-label cho nút tìm kiếm, giỏ hàng, wishlist, menu và tài khoản.
- Dropdown hỗ trợ `focus-within`, tốt hơn khi dùng bàn phím.

### 8.3. Banner

- Chiều cao responsive theo breakpoint.
- Nút điều hướng hiển thị hợp lý trên mobile.
- Có aria-label cho nút trước, sau và dot navigation.
- Fallback banner dùng file cục bộ.
- Link banner được lọc, chỉ cho phép đường dẫn nội bộ an toàn.

### 8.4. Product Card và Product Detail

- Tỷ lệ ảnh nhất quán.
- Nút wishlist có `aria-pressed`.
- Nút giỏ hàng có aria-label.
- Thumbnail sản phẩm có trạng thái được chọn.
- Ảnh chính được ưu tiên tải; ảnh phụ lazy load.
- Sửa dependency của effect tải chi tiết sản phẩm.

### 8.5. Payment Page

Trang thanh toán được viết lại:

- Không còn phụ thuộc Material UI.
- Đồng nhất màu sắc với website.
- Bố cục responsive.
- QR code, số tiền, nội dung chuyển khoản và đồng hồ chờ rõ ràng.
- Dùng socket chung để nhận thanh toán thành công.
- Hủy đơn qua `/orders/:id/cancel`.
- Có trạng thái loading, success và error rõ ràng.

### 8.6. Chat

- Widget chỉ hiển thị cho khách hàng phù hợp.
- Không hiển thị cho guest hoặc tài khoản quản trị.
- Responsive tốt hơn trên màn hình nhỏ.
- Bổ sung semantic dialog và aria-label.
- Không còn tính thời gian trực tiếp bằng `Date.now()` trong render.

### 8.7. Footer

- Email chuyển thành link `mailto`.
- Không còn dùng link `#` giả cho mạng xã hội.
- Logo thanh toán ngoài website được thay bằng badge CSS, giảm request ngoài.
- Google Maps tiếp tục lazy load.

---

## 9. Admin UI

### 9.1. Admin Layout

#### Code cũ

- Menu, redirect và trạng thái sidebar xử lý bằng nhiều effect.
- Menu chưa lọc đầy đủ theo từng role.
- Có mục cài đặt chưa có chức năng thực tế.

#### Code mới

- Menu được khai báo ngoài component.
- Menu được lọc theo role hiện tại.
- Route guard xử lý quyền truy cập; layout không tự redirect lặp lại.
- Loại bỏ mục cài đặt giả.
- Message và Notification chỉ xuất hiện với role phù hợp.
- Cải thiện sidebar mobile và aria-label.

### 9.2. User Manager

- Tạo user qua endpoint quản trị riêng.
- Admin thường không nhìn thấy tùy chọn cấp Super Admin.
- Không thể thao tác xóa chính mình.
- Không thể sửa hoặc xóa Super Admin nếu không có quyền.
- Backend vẫn kiểm tra lại toàn bộ quy tắc, không phụ thuộc UI.

### 9.3. Các manager khác

Đã làm sạch lỗi lint, catch dư thừa và dependency effect trong:

- Banner Manager
- Category Manager
- Coupon Manager
- News Manager
- Notification Manager
- Order Manager
- Product Manager
- User Manager

---

## 10. Chất lượng code

### 10.1. ESLint

Kết quả ban đầu:

- 41 lỗi.
- 11 cảnh báo.

Kết quả hiện tại:

- 0 lỗi.
- 0 cảnh báo.

Các nhóm lỗi đã xử lý:

- Biến hoặc import không sử dụng.
- Dependency thiếu trong hook.
- Hàm được tạo lại không cần thiết.
- Gọi set state không phù hợp trong effect.
- Catch parameter dư thừa hoặc bị thiếu.
- Component context bị rule Fast Refresh cảnh báo sai ngữ cảnh.
- Regex và dead state.

### 10.2. Test

Tạo `Backend/test/roles.test.js` sử dụng `node:test`.

Các trường hợp đã kiểm tra:

1. Customer là role duy nhất không thuộc nhóm nhân viên.
2. Admin được cấp role nghiệp vụ nhưng không được cấp Super Admin.
3. Chỉ Super Admin được cấp hoặc quản lý Super Admin.
4. Customer và role không xác định không được cấp quyền.

Kết quả: **4/4 test pass**.

### 10.3. Dependency

Backend:

- Nâng Cloudinary, Mongoose, Multer, Nodemailer, Node Cron và các dependency liên quan.
- Chuyển Nodemon sang `devDependencies`.
- Production audit: **0 vulnerabilities**.

Frontend:

- Vá Axios, DOMPurify, Socket.IO client và dependency liên quan.
- Giữ React Router và React Quill ở bản mới nhất tương thích đã kiểm tra build.
- Còn 4 cảnh báo audit upstream:
  - 2 cảnh báo thấp từ Quill HTML export.
  - 2 cảnh báo cao từ React Router RSC.

Hai tính năng bị cảnh báo không được ứng dụng này sử dụng:

- DocaStore là Vite client-side SPA, không dùng React Router RSC/Server Actions.
- Code không gọi chức năng Quill HTML export bị ảnh hưởng.
- Nội dung bài viết khi hiển thị được sanitize bằng DOMPurify.
- Link động được giới hạn về đường dẫn nội bộ an toàn.

Không sử dụng `npm audit fix --force` vì npm đề xuất downgrade sang các phiên bản có nhiều cảnh báo áp dụng trực tiếp hơn.

---

## 11. Các file mới

- `Backend/src/config/roles.js`
- `Backend/test/roles.test.js`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/context/AppProviders.jsx`
- `frontend/src/hooks/useDebouncedValue.js`
- `frontend/src/utils/navigation.js`

---

## 12. Các file thay đổi quan trọng

### Frontend

- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/api/axiosClient.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/CartContext.jsx`
- `frontend/src/context/WishlistContext.jsx`
- `frontend/src/context/NotificationContext.jsx`
- `frontend/src/layouts/MainLayout.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/components/Footer.jsx`
- `frontend/src/components/ProductCard.jsx`
- `frontend/src/components/CustomerChatWidget.jsx`
- `frontend/src/pages/PaymentPage.jsx`
- `frontend/src/pages/ProductPage.jsx`
- `frontend/src/pages/CategoryPage.jsx`
- `frontend/src/pages/admin/AdminLayout.jsx`
- `frontend/src/pages/admin/UserManager.jsx`
- `frontend/package.json`
- `frontend/package-lock.json`

### Backend

- `Backend/src/server.js`
- `Backend/src/utils/socket.js`
- `Backend/src/middlewares/authMiddleware.js`
- `Backend/src/controller/userController.js`
- `Backend/src/controller/productController.js`
- `Backend/src/controller/orderController.js`
- `Backend/src/controller/messageController.js`
- `Backend/src/controller/reviewController.js`
- `Backend/src/controller/addressController.js`
- Các route user, product, category, banner, order, coupon, news, notification, message và review.
- `Backend/package.json`
- `Backend/package-lock.json`

---

## 13. Kết quả xác nhận cuối

Các lệnh kiểm tra đã chạy thành công:

```text
Frontend:
- npm run lint
- npm run build

Backend:
- npm test
- node --check trên toàn bộ file JavaScript
- npm audit --omit=dev

Repository:
- git diff --check
```

Kết quả:

- Frontend lint: pass.
- Frontend production build: pass.
- Backend unit test: 4/4 pass.
- Backend syntax: pass toàn bộ 55 file được kiểm tra.
- Backend production audit: 0 vulnerabilities.
- Diff whitespace/conflict check: pass.

---

## 14. Phần chưa thể xác nhận trong phiên làm việc

Chưa chạy được kiểm thử E2E trực quan trên browser vì môi trường hiện tại không cung cấp browser runtime.

Các luồng cần kiểm tra thêm trên môi trường chạy thật:

- Responsive trên Chrome, Safari và thiết bị mobile.
- Đăng ký, OTP và Google Login.
- Phân quyền với tài khoản thật của từng role.
- CRUD sản phẩm, banner, bài viết và upload Cloudinary.
- Đặt hàng COD.
- Thanh toán PayOS và webhook thật.
- Chat giữa khách hàng và support trên nhiều tab.
- Dữ liệu thật từ MongoDB.

Để thực hiện vòng E2E cuối cần:

- Backend kết nối được MongoDB.
- Các biến môi trường Cloudinary, email, Google và PayOS hợp lệ.
- Tài khoản test cho từng role.
- Browser runtime hoặc môi trường staging có thể truy cập.

---

## 15. Kết luận

Code mới khác code cũ chủ yếu ở bốn điểm:

1. **Kiến trúc rõ ràng hơn:** provider, route, socket và auth có một nguồn quản lý thống nhất.
2. **Nhanh hơn:** tải theo route, giảm bundle ban đầu, giảm request và render dư.
3. **An toàn hơn:** backend xác minh user/role thật, kiểm tra ownership và không tin định danh do socket client gửi.
4. **Đồng nhất hơn:** giảm trộn design system, chuẩn hóa màu sắc, responsive, accessibility và trạng thái UI.

Phiên bản hiện tại đã đạt trạng thái lint sạch, build thành công, backend audit sạch và có test cho policy phân quyền. Bước tiếp theo phù hợp là chạy E2E trên môi trường staging với database và các dịch vụ tích hợp thật.
