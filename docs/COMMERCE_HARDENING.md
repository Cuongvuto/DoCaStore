# Hoàn thiện nghiệp vụ và quản trị — 22/09/2026

## Phạm vi

Đợt này xử lý các điểm đã nêu trong báo cáo admin: trạng thái đơn, giữ/hoàn kho, PayOS, coupon, upload, hỗ trợ, banner/thông báo và quy ước doanh thu. Các thay đổi vẫn ở local; chưa commit hoặc push.

## Đơn hàng, kho và coupon

- `orderService.js` dùng transaction MongoDB cho tạo đơn, trừ kho, giữ coupon, xóa giỏ hàng, hủy/hoàn kho và ghi nhận hoàn tất. Không gọi PayOS hoặc socket bên trong transaction có thể được MongoDB chạy lại.
- Trừ kho bằng điều kiện `stock >= quantity`; tranh mua món cuối hoặc lượt coupon cuối chỉ có một giao dịch thành công. Lỗi giữa chừng rollback toàn bộ.
- Checkout tuần tự theo tài khoản để không áp dụng ưu đãi đơn đầu đồng thời. Header `Idempotency-Key` giúp thử lại cùng yêu cầu mà không tạo thêm đơn; frontend khóa nút trong lúc gửi.
- Quy tắc chuyển trạng thái: `pending → processing → shipped → completed`; chỉ `pending` và `processing` có thể hủy. Khách chỉ hủy đơn `pending` của mình. Đơn hoàn tất/hủy không chuyển ngược.
- Đơn thanh toán online phải `paid` trước khi xử lý. COD được ghi nhận thu tiền khi hoàn tất; tổng mua của khách và số đã bán chỉ tăng một lần.
- Hủy từ admin, khách và cron dùng chung service. Yêu cầu admin nhập lý do; lưu lịch sử với thời điểm, ID và vai trò người thực hiện. Tiền đã nhận trên đơn hủy được đánh dấu cần hoàn tiền.
- Coupon được kiểm tra thống nhất ở validate, preview và checkout: hạn dùng, trạng thái, tổng lượt, mỗi tài khoản một lượt, đúng nhóm. Đơn lưu coupon ID/mã và dấu đã giữ lượt để hoàn đúng một lần.
- Giá VND được làm tròn số nguyên; ưu đãi đơn đầu và coupon cộng dồn nhưng tổng giảm không vượt giá trị đơn.
- Chỉ cho đặt mới bằng COD/VietQR vì MoMo/VNPay chưa có tích hợp xử lý tương ứng. Dữ liệu đơn cũ vẫn đọc được.

## Thanh toán

- Kiểm tra chữ ký HMAC với so sánh thời gian cố định, kiểm tra mã kết quả nằm trong `data` đã ký, mã đơn, VND, số tiền và mã giao dịch.
- Webhook trùng không cập nhật lại lịch sử hoặc kho. Thanh toán sai số tiền/nhiều giao dịch được lưu để đối soát; không tự coi giao dịch sai số tiền là đã thanh toán.
- Tiền tới sau khi hủy không mở lại đơn; giữ trạng thái hủy và đánh dấu `refund_required`.
- Tạo QR có timeout và hạn 15 phút. Nếu tạo mã lỗi, hủy đơn qua service và ghép sản phẩm trở lại giỏ, giữ các sản phẩm khách mới thêm. Nếu webhook thắng trong lúc xử lý lỗi, giữ kết quả thanh toán đã xác nhận.
- Request tạo mã bị gián đoạn còn ở trạng thái `creating` được cron thu hồi sau hạn. Cron đối chiếu PayOS trước khi hủy đơn đã tạo mã; khi không xác nhận được trạng thái từ cổng thanh toán, giữ tồn kho chờ đối chiếu ở lượt sau.
- Cron thử hủy lại link của đơn đã hủy và phát hiện giao dịch trả tiền muộn. Mỗi lượt giới hạn 100 đơn và không chồng các lượt trong cùng process.
- Trang thanh toán đọc lại đơn từ server khi tải lại trang, kiểm tra định kỳ khi mất socket. Trang kết quả hiển thị đúng trạng thái và sản phẩm; bỏ ngày giao/email xác nhận giả định.
- Admin có bộ lọc đối soát và cảnh báo. Chưa tự chuyển tiền hoàn lại: người vận hành kiểm tra và xử lý tại cổng/ngân hàng. Đây không phải module đổi trả/hoàn tiền tự động.

Tham chiếu giao thức: [chữ ký webhook PayOS](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/), [API tạo/tra cứu/hủy link](https://payos.vn/docs/api/).

## Nội dung, upload và hỗ trợ

- Banner chỉ nhận các trường được phép; kiểm tra liên kết HTTP(S)/nội bộ, thứ tự, trạng thái và vị trí; trả 404/400/409 phù hợp.
- Banner, coupon và thông báo dùng chung bảng/form/dialog, tìm kiếm và phân trang server, trạng thái tải/rỗng/lỗi, thử lại, chống gửi lặp và xác nhận thao tác. Bộ lọc lưu trên URL.
- Thông báo kiểm tra tiêu đề/nội dung/loại/nhóm/tài khoản nhận. Nhóm tối đa 10.000 người; admin cách nhau 30 giây giữa hai lần gửi. Cùng mã yêu cầu sẽ trả thông báo đã tạo; đổi nội dung trên yêu cầu cũ báo xung đột.
- Người dùng không thể đánh dấu đã đọc thông báo của người khác. Payload cho khách không gửi danh sách thành viên nhóm. Socket lỗi sau khi lưu không làm API báo thất bại giả.
- Upload giới hạn 5 MB/ảnh, tối đa 5 file, JPG/PNG/WebP ở server. Lỗi upload trả JSON. Ảnh của request lưu thất bại được đưa vào hàng đợi `UploadCleanup`, cron xóa Cloudinary và thử lại nếu lỗi.
- Hàng đợi cleanup chưa thay thế đối soát tài sản Cloudinary khi process chết đúng lúc upload chưa được ghi nhận hoặc DB không nhận được job. Không tự xóa các ảnh cũ không rõ nguồn gốc.
- Chat phân trang ticket và tin nhắn cũ; tổng hợp tin cuối/số chưa đọc theo một truy vấn cho cả trang, thay truy vấn theo từng ticket. Tìm tên/email khách giới hạn tối đa 1.000 tài khoản khớp; có thể tra chính xác bằng mã ticket.
- Nhận ticket cập nhật có điều kiện để chỉ một admin nhận được; không nhận lại ticket đã kết thúc. Mở chat đồng thời từ nhiều tab chỉ tạo một phiên mới.
- Chat admin và khách có nút tải tin cũ, giữ nội dung khi chưa xác nhận gửi và báo mất kết nối. Admin có trạng thái lỗi và thử tải lịch sử.

## Doanh thu

Biểu đồ mặc định nhóm đơn hoàn tất theo `completedAt`. Có thể chọn:

1. Ngày hoàn tất: đơn đã hoàn tất, theo thời điểm giao hoàn tất.
2. Ngày thu tiền: đơn đã thanh toán, loại đơn hủy, theo `paidAt`. Đây là số thu của đơn đang được giữ, không phải sổ lưu chuyển tiền mặt bao gồm mọi giao dịch/hoàn tiền.
3. Ngày đặt: các đơn hiện đã hoàn tất, nhóm theo ngày tạo đơn.

Tất cả theo UTC+7, tuần bắt đầu thứ Hai. Không tự gán ngày thu/hoàn tất cho đơn lịch sử không có dữ liệu; chúng vẫn xuất hiện ở chế độ ngày đặt nếu phù hợp. Tổng quan toàn thời gian vẫn là tổng đơn hoàn tất.

## Chạy và triển khai

- Triển khai FE và BE cùng phiên bản vì danh sách banner/coupon/thông báo đã chuyển sang phân trang, coupon toggle cần body `{ isActive: true|false }`.
- **MongoDB phải là replica set hoặc Atlas**, không dùng standalone cho giao dịch mới. Không có đường lui ghi nhiều bảng ngoài transaction. Biểu đồ cần MongoDB 5.0+; bộ kiểm thử đang dùng MongoDB 7.0.14.
- Backend vẫn dùng các biến môi trường hiện có. Không sửa `.env` và không chạy thao tác trên database của dự án trong quá trình kiểm thử.
- Nếu dùng replica set local đã cấu hình, connection string có dạng `mongodb://127.0.0.1:27017/doca?replicaSet=rs0`; tên replica set phải khớp cấu hình MongoDB thực tế.
- Đảm bảo tạo được index mới của Order (user + checkoutKey), Notification (createdBy + requestKey), Conversation và Message trước khi mở traffic.
- **Đơn cũ:** luồng trước có thể lưu draft trước khi giữ kho, nên không thể suy ra `stockReserved` từ trạng thái. Hủy đơn thiếu trường này bị chặn với 409. Cần đối chiếu từng đơn hoạt động và tồn kho thực tế trước khi xác nhận dấu giữ kho/lượt coupon. Không chạy migration mặc định đặt tất cả thành đã giữ kho.
- Mã coupon đã bị schema cũ làm mất không thể phục hồi chắc chắn từ order. Đơn cũ thiếu `completedAt`/`paidAt` cũng không thể điền chính xác bằng `updatedAt`.

## Kiểm thử và giới hạn xác nhận

Chạy trong `Backend`:

```powershell
npm test
```

Test tích hợp tự tạo MongoDB replica set tạm, không đọc `.env`, không kết nối database đang dùng. Lần đầu cần tải binary MongoDB; cache nằm ngoài repo. Sau test sẽ dừng database tạm. Nếu cài dependency từ đầu gặp peer conflict Cloudinary hiện có, dùng `npm install --legacy-peer-deps`.

Chạy trong `frontend`:

```powershell
npm run lint
npm run build
```

Các tình huống gồm tranh kho/coupon, rollback, checkout lặp, ba nguồn hủy đồng thời, lỗi tạo QR khôi phục giỏ, webhook trùng/sai tiền/đến muộn, hoàn tất lặp, nhận/mở ticket đồng thời, phân trang tin nhắn, quyền đọc thông báo, gửi thông báo lặp và đơn cũ thiếu dấu giữ kho.

Kết quả ngày 22/09/2026: **49/49 test backend đạt**, gồm 17 test tích hợp trên MongoDB replica set tạm; lint frontend, production build, kiểm tra cú pháp backend và `git diff --check` đều đạt. Build còn thông báo cơ sở dữ liệu Browserslist cũ; test có cảnh báo API `new` của Mongoose và log socket chưa khởi tạo ở môi trường kiểm thử, không làm thất bại kiểm tra.

Đã kiểm thử nghiệp vụ với MongoDB thật chạy tạm; PayOS/Cloudinary/socket bên ngoài được giả lập hoặc kiểm tra ở mức code. Browser runtime không có trình duyệt khả dụng nên **chưa xác nhận trực quan và E2E desktop/mobile**. Cần chạy thử QR, upload Cloudinary và hai tài khoản chat trên môi trường phát triển trước khi đưa lên dùng thật.
