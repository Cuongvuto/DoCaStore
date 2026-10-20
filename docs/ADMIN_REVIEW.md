# Rà soát và cải tiến admin DoCaStore

> Đây là báo cáo đợt giao diện ngày 21/09/2026. Các mục cần cải thiện bên dưới đã được xử lý tiếp trong đợt 22/09/2026; xem trạng thái mới, kiểm thử và yêu cầu triển khai tại [COMMERCE_HARDENING.md](./COMMERCE_HARDENING.md).

Ngày: 21/09/2026. Giữ nền tối theo yêu cầu của chủ dự án.

## Phạm vi đã thực hiện

### Giao diện

- Làm lại khung admin: nhóm chức năng, menu theo quyền, thu gọn desktop, hộp thoại menu mobile, tên vai trò, đường dẫn về cửa hàng. Ô tìm kiếm lọc chức năng quản trị, không còn ô nhập không hoạt động.
- Dùng chung màu nền, màu nhấn xanh lá nhạt, bảng, nút, bộ lọc, phân trang, trạng thái tải/rỗng/lỗi và hộp thoại có xác nhận. Hộp thoại mới dùng phần tử `dialog` để hỗ trợ bàn phím và quản lý focus.
- Làm lại dashboard, trang sản phẩm, đơn hàng và người dùng. Các màn hình nội dung/hỗ trợ được đồng bộ màu sắc; chưa viết lại toàn bộ form của các màn hình này.
- Dashboard chỉ hiển thị dữ liệu và liên kết thuộc vai trò hiện tại. Bỏ biểu đồ mẫu, tỷ lệ tăng giảm 3% cố định, mục tiêu doanh thu cố định và nút mục tiêu không hoạt động.
- Sản phẩm: tìm kiếm theo tên; lọc danh mục/tồn kho; sắp xếp; thêm thương hiệu; giữ/bỏ/thêm ảnh khi sửa; chặn gửi form lặp; xác nhận xóa.
- Đơn hàng: tìm mã đầy đủ, 6 ký tự cuối, mã PayOS, người nhận hoặc điện thoại; lọc trạng thái đơn, thanh toán và ngày; xem địa chỉ đầy đủ, giá mua và tổng sau ưu đãi; xác nhận trước khi đổi trạng thái.
- Người dùng: tìm tên/email; lọc vai trò/xác thực; phân trang server; xác nhận đổi quyền/xóa; chặn thao tác tài khoản được bảo vệ; chặn gửi form lặp.
- Bộ lọc ba danh sách chính lưu trong URL. Tải dữ liệu không làm mất ô tìm kiếm; hủy request cũ và trì hoãn tìm kiếm khi đang gõ.
- Chat: chuyển giữa danh sách và hội thoại trên mobile; chỉ nhập trả lời khi được phân công hoặc là Super Admin và phiên đang hoạt động; kiểm tra kết nối; chờ xác nhận gửi; hủy tải lịch sử cũ khi chuyển ticket.
- Tin tức: phân biệt tải danh sách, lỗi và trạng thái rỗng; thêm thử lại khi tải lỗi.
- Xóa sáu component dashboard cũ không còn được sử dụng.

### Backend

- Dashboard trả số liệu theo vai trò: nhân viên sản phẩm xem tồn kho; nhân viên hỗ trợ xem số ticket; nhóm đơn hàng xem số liệu kinh doanh; admin xem tổng hợp. API biểu đồ chỉ cho `admin`, `superadmin`, `order_admin`.
- Sản phẩm bán chạy được tính từ số lượng trên đơn `completed`, thay vì phụ thuộc bộ đếm `sold` có thể chưa được đồng bộ.
- Biểu đồ: 7 ngày, 8 tuần bắt đầu thứ Hai, 12 tháng; giữ năm khi chuyển năm; dùng giờ Việt Nam; kỳ không có giao dịch trả giá trị 0.
- Doanh thu là tổng giá trị đơn hiện có trạng thái `completed`. Biểu đồ nhóm theo **ngày đặt đơn**, không phải ngày thu tiền hay ngày giao. Giao diện ghi rõ quy ước này.
- Danh sách đơn hàng/người dùng giới hạn 50 dòng/request, kiểm tra query, dùng cùng điều kiện lọc khi đếm tổng và lấy trang. Khoảng ngày tính hết ngày cuối theo UTC+7.
- Danh sách người dùng chỉ chọn các trường cần hiển thị. Các endpoint đọc tài khoản khác cũng loại mật khẩu, OTP và token đặt lại mật khẩu.
- Cập nhật sản phẩm chỉ nhận các trường được phép; giá là số nguyên VND dương; tồn kho là số nguyên không âm; danh mục phải tồn tại. Ảnh giữ lại phải thuộc sản phẩm hiện tại, tổng tối đa 5 ảnh.
- Danh mục: kiểm tra cha tồn tại, chặn vòng lặp cha-con, chặn xóa danh mục còn sản phẩm, trả thông báo trùng slug và chạy validators khi cập nhật.

## Thay đổi API cần biết

- `GET /api/user`: mặc định trang 1, 10 tài khoản; hỗ trợ `page`, `limit`, `search`, `role`, `verified`.
- `GET /api/orders`: mặc định trang 1, 10 đơn; hỗ trợ `page`, `limit`, `search`, `status`, `paymentStatus`, `from`, `to`.
- `GET /api/product`: thêm `categoryId`, `stock=in|low|out`. Các client cũ không truyền `page` vẫn giữ cách lấy danh sách cũ.
- `PUT /api/product/:id`: frontend mới gửi `existingImages` dạng chuỗi JSON trong multipart để chỉ rõ ảnh cũ cần giữ. Client cũ chỉ gửi ảnh mới vẫn thay toàn bộ ảnh như trước.
- `GET /api/dashboard/overview`: cấu trúc mới gồm `permissions`, `stats`, `recentOrders`, `lowStock`, `bestSellingProducts`. Triển khai backend và frontend cùng phiên bản.
- Không thay đổi biến môi trường. Biểu đồ dùng `$dateTrunc`, cần MongoDB 5.0 trở lên.

## Kiểm thử

- 25 test backend: 4 test phân quyền có sẵn và 21 test mới về bộ lọc, ngày/tuần/tháng, phạm vi dữ liệu dashboard, ảnh sản phẩm, giá/tồn kho, trường dữ liệu tài khoản, vòng lặp và xóa danh mục.
- Các test controller dùng model giả lập; chưa chạy integration với MongoDB thật.
- Đã chạy lint frontend, production build và kiểm tra định dạng diff; kết quả cuối xem phản hồi bàn giao.
- Browser runtime không có trình duyệt khả dụng trong phiên này. Chưa xác nhận trực quan desktop/mobile hoặc E2E với Google, PayOS, Cloudinary và Socket thật.

## Những phần cần cải thiện tiếp sau đợt admin

### Ưu tiên cao: tính nhất quán đơn hàng

Luồng thay đổi trạng thái, hủy đơn, giữ/hoàn kho và webhook vẫn giữ nghiệp vụ cũ. Hộp xác nhận trên giao diện không thay thế kiểm tra backend.

- Chưa có quy tắc chuyển trạng thái và lịch sử người thao tác; vẫn có thể chuyển ngược trạng thái.
- Hủy đơn từ admin chưa dùng chung nghiệp vụ hoàn kho với khách hàng/cron; chưa đảm bảo nguyên tử khi nhiều tác vụ đồng thời.
- Tạo đơn thất bại, thông báo thanh toán trùng/đến muộn và đối chiếu số tiền cần được xử lý thống nhất.
- Schema đơn còn thiếu dữ liệu mã giảm giá mà luồng hoàn lượt sử dụng cần.
- Nên tách thành service giao dịch, có transaction và cơ chế xử lý lặp an toàn, rồi kiểm thử đồng thời trên database phù hợp.

### Các module nội dung và hỗ trợ

- Banner: cần allowlist payload, xác thực link, lỗi 404/validation rõ ràng và dọn ảnh upload không sử dụng.
- Coupon/thông báo: cần validation đối tượng nhận, hạn sử dụng và giới hạn gửi; trạng thái đang lưu và danh sách lớn cần chuẩn hóa như ba màn hình chính.
- Ticket: backend đang đọc toàn bộ hội thoại và truy vấn tin nhắn theo từng ticket; nên phân trang và tổng hợp dữ liệu. Thao tác nhận ticket cần cập nhật có điều kiện để tránh hai nhân viên nhận đồng thời.
- Upload: giới hạn 5 MB hiện được kiểm tra ở form sản phẩm mới. Cần bổ sung giới hạn phía server, trả lỗi upload dạng JSON và thu hồi ảnh Cloudinary khi request thất bại.
- Phần nhật ký quản trị, khôi phục/xóa mềm và cảnh báo thay đổi đồng thời chưa được triển khai.

## Kịch bản kiểm tra thủ công trước khi sử dụng

1. Đăng nhập lần lượt từng vai trò; kiểm tra menu và truy cập API trực tiếp, nhất là doanh thu với nhân viên sản phẩm/hỗ trợ.
2. Với database trống hoặc API lỗi: dashboard/list hiển thị rỗng hoặc lỗi có thử lại, không treo loading.
3. Sản phẩm: tìm kiếm, phân trang, tồn kho 0; sửa giữ một ảnh, bỏ ảnh, thêm ảnh mới; thử dữ liệu giá/tồn kho sai.
4. Đơn hàng: tìm 6 ký tự cuối/mã PayOS, lọc cùng ngày; kiểm tra địa chỉ đầy đủ và phân biệt trạng thái giao hàng/thanh toán.
5. Người dùng: tìm email, đổi vai trò có xác nhận; thử tự xóa/tự đổi quyền và chỉnh Super Admin từ tài khoản admin.
6. Danh mục: thử chuyển cha vào con và xóa danh mục còn sản phẩm.
7. Trên màn hình 375 px, 768 px và desktop: kiểm tra bảng cuộn ngang, menu, form, phím Tab/Escape và trở về danh sách chat.
8. Kiểm tra gửi tin, nhận ticket, mất kết nối và chuyển nhanh giữa hai hội thoại.
