# Kiểm thử bảo mật tài khoản — 22/10/2026

## Phạm vi và kết quả tự động

Đã bổ sung giới hạn API xác thực, thu hồi JWT khi reset mật khẩu/đổi quyền,
kiểm tra lại phiên socket và đăng xuất frontend khi server thu hồi phiên.
Chưa commit/push/deploy đợt này. Các test thủ công bên dưới **chưa chạy**.

- Backend: **95/95 test đạt**, không fail/skip, trên Node 22.23.3, Windows (sau khi thêm đổi mật khẩu tại hồ sơ).
- Trong đó có 26 test tích hợp bảo mật mới tại `Backend/test/authSecurity.integration.test.js`.
- Test dùng HTTP và Socket.IO thật trên localhost, MongoMemoryReplSet 7.0.14 tạm;
  SMTP/Google giả lập. Không đọc `.env`, không kết nối Atlas hoặc gửi email thật.
- ESLint phần NotificationContext: đạt. Frontend `npm run build`: đạt (27,66 giây).
- Log local: `private-deploy-review/auth-security-full-tests.log` (được Git ignore).
- Lần kiểm tra bổ sung: `private-deploy-review/profile-password-tests.log`, `profile-password-build.log`; frontend build và ESLint các file hồ sơ/Auth sửa thêm đều đạt.
- Cảnh báo Mongoose `new` deprecated và log từ ca cố tình từ chối vẫn còn; không có test thất bại.

Chạy lại từ terminal tại thư mục gốc dự án, sau khi đã cài dependency **cả Backend và frontend**:

```powershell
cd Backend
$env:MONGOMS_RUNTIME_DOWNLOAD = 'false'
$env:ENABLE_MAINTENANCE_JOBS = 'false'
node --test --test-reporter=spec
```

Máy hiện tại có sẵn MongoDB test binary 7.0.14. Máy mới cần chuẩn bị binary đó
hoặc cho mongodb-memory-server tải binary trước; không thay bằng URI database thật.
Test socket tái sử dụng `socket.io-client` đã có trong frontend, không thêm package.

## Quy tắc đang áp dụng

| API | Theo IP | Theo email |
| --- | --- | --- |
| POST `/api/user/login` | 50 request / 15 phút | 10 request / 15 phút |
| POST `/api/user/verify-email` | 30 request / 10 phút | 5 request / 10 phút |
| POST `/api/user/register`, `/resend-otp`, `/forgot-password` | Dùng chung 20 request / 15 phút | Dùng chung 5 request / 15 phút và tối đa 1 request / 60 giây |
| POST `/api/user/google-login` | 30 request / 15 phút | Không áp dụng |
| PUT `/api/user/reset-password/:token` | 20 request / 15 phút | Không áp dụng |
| PUT `/api/user/change-password` (cần đăng nhập) | 30 request / 15 phút | Theo ID tài khoản: 5 request / 15 phút, không dùng email trong body |

- Đếm **request**, kể cả thành công, nhập sai, email không tồn tại hoặc gửi mail thất bại.
  Vì vậy test ở giữa một cửa sổ đã dùng sẽ bị chặn sớm hơn số lần trong bảng.
- Cửa sổ bắt đầu từ request đầu tiên của từng khóa. Request bị chặn không kéo dài cửa sổ đó.
  `Retry-After` và JSON `retryAfter` cho biết số giây chờ; giới hạn khác có thể vẫn còn hiệu lực.
- Email được trim và chuyển chữ thường. Giới hạn email dùng chung giữa các IP;
  giới hạn IP vẫn chặn khi đổi nhiều email. IPv6 được nhóm theo /64.
- Bộ đếm lưu trong collection `authratelimits`, khóa SHA-256 thay vì email/IP nguyên văn.
  Chia sẻ giữa các tiến trình dùng cùng DB, không mất khi restart. TTL tự dọn;
  cửa sổ hết hạn được reset nguyên tử ngay cả khi TTL chưa xóa document.
- Store giới hạn lỗi: trả 503, không bỏ qua kiểm soát để tiếp tục đăng nhập.
- Đây là giới hạn request, không phải khóa vĩnh viễn tài khoản. Có đánh đổi: người cố tình
  gửi nhiều request có thể làm tài khoản phải chờ; chưa có CAPTCHA hoặc hệ thống phát hiện bot.

## Chuẩn bị kiểm tra thủ công

1. Chạy **code mới** ở local với database dành cho kiểm thử. Kiểm tra URI trước khi khởi động:
   chạy trên localhost không đồng nghĩa database cũng ở local. Không dùng tài khoản quan trọng.
2. Có một tài khoản Super Admin A, một nhân viên hỗ trợ B (`support_admin`),
   một khách hàng C đã xác thực và một email D chưa xác thực mà bạn nhận được email.
3. Mở hai profile trình duyệt hoặc một cửa sổ thường + một cửa sổ ẩn danh để tách tài khoản.
4. Bật DevTools → Network, chọn Fetch/XHR và Preserve log để xem HTTP status.
5. Muốn bắt đầu bộ đếm sạch: dùng bộ dữ liệu test riêng hoặc đợi cửa sổ hết hạn.
   Restart backend **không** xóa giới hạn. Không xóa collection đang dùng trên hosting để né giới hạn.

## Test case thủ công

| ID | Bước thực hiện | Kết quả mong đợi |
| --- | --- | --- |
| AUTH-01 | Đăng nhập C bằng mật khẩu đúng, mở hồ sơ và giỏ hàng. | Đăng nhập thành công, API được bảo vệ vẫn hoạt động. |
| AUTH-02 | Với email C có bộ đếm sạch, nhập sai mật khẩu 10 lần. Lần 11 nhập đúng. | Lần 11 trả 429, có thông báo số giây chờ; không cấp token. Hết thời gian phù hợp, đăng nhập đúng thành công. |
| AUTH-03 | Sau AUTH-02, gửi bằng Postman email C có chữ hoa và khoảng trắng ở hai đầu. | Vẫn 429; không tạo một hạn mức mới cho cùng email. Dùng Postman vì HTML email input có thể chặn khoảng trắng. |
| AUTH-04 | Bị 429 ở AUTH-02, restart backend rồi thử lại trước khi hết thời gian chờ. | Vẫn 429. Một tài khoản khác vẫn đăng nhập được nếu giới hạn IP chưa hết. |
| AUTH-05 | D đã có OTP. Nhập sai OTP 5 lần; lần 6 nhập OTP đúng. | Lần 6 trả 429, D chưa được xác thực. Sau khi hạn mức hết, xin OTP mới và xác minh đúng thành công. |
| AUTH-06 | Gửi OTP một lần, ngay sau đó gọi lại `/resend-otp` bằng Postman để bỏ qua countdown giao diện. | API trả 429. Không có email thứ hai từ request bị chặn. |
| AUTH-07 | Trong 60 giây của AUTH-06, gọi `/register` hoặc `/forgot-password` với cùng email D. | Vẫn 429 vì ba endpoint dùng chung hạn mức; không dùng đổi endpoint để gửi thêm mail. |
| AUTH-08 | Khi ngân sách 15 phút còn sạch, gửi lại OTP 5 lần, mỗi lần cách ít nhất 61 giây; thử lần 6 trong 15 phút. | Lần 6 trả 429. Nếu vừa đăng ký/gửi mail trước đó thì các request đó cũng đã được tính vào hạn mức. |
| AUTH-09 | Đăng nhập C ở cửa sổ thường; giữ tab mở. Ở cửa sổ ẩn danh, quên mật khẩu và hoàn tất reset qua email. | Cửa sổ cũ bị đăng xuất khi nhận thu hồi socket; token cũ gọi API trả 401. Mật khẩu cũ thất bại, mật khẩu mới đăng nhập được. |
| AUTH-10 | Mở lại liên kết reset đã dùng trong AUTH-09, thử đặt mật khẩu khác. | Bị từ chối, không đổi mật khẩu lần nữa; mật khẩu mới ở AUTH-09 vẫn dùng được. |
| AUTH-11 | Đăng nhập B, mở chat hỗ trợ ở hai tab. A đổi quyền B từ `support_admin` thành `customer`. | Cả hai tab B bị thu hồi phiên; B không thể gửi tin/nhận ticket với quyền hỗ trợ cũ. Đăng nhập lại chỉ có quyền customer; API admin trả 403. |
| AUTH-12 | A lưu lại đúng role hiện tại của B, không thay đổi giá trị. | Phiên B không bị thu hồi chỉ vì lưu cùng role. |
| AUTH-13 | A xóa một tài khoản test đang đăng nhập ở cửa sổ khác. | Socket bị ngắt; token cũ trả 401; không đăng nhập lại được bằng tài khoản đã xóa. |
| AUTH-14 | Dùng customer gọi API đổi role qua Postman; dùng admin thường thử cấp `superadmin`. | 403 và role không thay đổi. Các giới hạn phân quyền cũ vẫn giữ nguyên. |
| AUTH-15 | Đăng nhập Google với tài khoản test sau khi cấu hình đúng Client ID/origin. Sau reset mật khẩu của cùng tài khoản, đăng nhập Google lại. | Google vẫn hoạt động; phiên Google mới mang phiên bản hiện tại và gọi `/user/me` thành công. Đây là smoke test Google thật, chưa được test tự động thay thế. |
| AUTH-16 | Mở kết nối chat hợp lệ, sau đó ngắt Internet và kết nối lại khi token vẫn còn hiệu lực. | Không đăng xuất chỉ vì lỗi mạng; socket có thể kết nối lại. Nếu token đã bị thu hồi thì kết nối bị từ chối. |
| AUTH-17 | Vào Hồ sơ → Đổi mật khẩu (hoặc nút dưới Thông tin tài khoản), nhập đúng mật khẩu hiện tại và hai ô mật khẩu mới trùng nhau. | Thành công, về trang đăng nhập. Mật khẩu cũ không đăng nhập được; mật khẩu mới dùng được. Token cũ trả 401, các tab cũ bị thu hồi. |
| AUTH-18 | Nhập sai mật khẩu hiện tại, còn hai ô mới hợp lệ. | Hiển thị lỗi mật khẩu hiện tại; dữ liệu và phiên đăng nhập không thay đổi. |
| AUTH-19 | Thử mật khẩu mới dưới 8 ký tự, hai ô mới khác nhau hoặc trùng mật khẩu hiện tại. | Form từ chối. Gửi trực tiếp qua Postman vẫn bị backend từ chối, không thể bỏ qua validation bằng cách sửa giao diện. |
| AUTH-20 | Nhấn nút mắt ở từng ô; thử trên màn hình điện thoại; nhấn Hủy. | Chỉ đổi cách hiển thị ô tương ứng; form không tràn ngang; Hủy về tổng quan, không gửi yêu cầu đổi mật khẩu. |
| AUTH-21 | Nhập sai mật khẩu hiện tại 5 lần qua API đổi mật khẩu; lần 6 nhập đúng. | 429 với thời gian chờ; email/userId giả trong body không tạo hạn mức khác. |
| AUTH-22 | Trong form chọn Đặt lại mật khẩu qua email. | Mở thẳng màn quên mật khẩu. Tài khoản chỉ dùng Google có thể dùng email đã xác thực để thiết lập mật khẩu thay vì đoán mật khẩu hiện tại. |

Mật khẩu mới của form đổi mật khẩu: ít nhất 8 ký tự, tối đa 72 byte UTF-8 để không bị bcrypt
cắt ngầm; chuỗi tiếng Việt dài có thể đạt giới hạn byte trước 72 ký tự. Đổi mật khẩu yêu cầu
mật khẩu hiện tại, chỉ tác động tài khoản trong JWT, xóa link reset đang chờ và tăng `tokenVersion`
nguyên tử. Hai request đổi đồng thời chỉ một request được ghi thành công.

### Cách chứng minh token cũ thật sự bị từ chối (AUTH-09 / AUTH-11)

Trong DevTools Console của tab **local đang đăng nhập**, trước khi reset/đổi quyền:

```javascript
var oldSessionForTest = localStorage.getItem('token'); void 0;
```

Sau khi reset/đổi quyền, ở chính tab đó, không tải lại tab trước khi chạy:

```javascript
fetch('http://localhost:5001/api/user/me', {
  headers: { Authorization: `Bearer ${oldSessionForTest}` }
}).then(response => console.log('HTTP status:', response.status));
```

Kỳ vọng **401**. Đổi port nếu backend local chạy cổng khác. Không in/copy token vào báo cáo;
chỉ lưu status và thông báo. Nếu trang đã reload làm mất biến, dùng token test đã lưu riêng trong Postman.

### Ca khó đã có test tự động

- 25 request đồng thời tăng cùng bộ đếm: không vượt số lượt được phép.
- Hai server dùng cùng DB không có hai ngân sách độc lập.
- Hai request reset cùng token: chỉ một thành công, `tokenVersion` tăng đúng một lần.
- Token trước đợt cập nhật không có `tokenVersion`: tương thích khi tài khoản vẫn version 0,
  bị từ chối sau lần thu hồi đầu tiên. Không phải backfill mọi user hoặc đổi JWT_SECRET.
- Socket có token hết hạn, token bị thu hồi hoặc user bị xóa bị ngắt.
- Sự kiện socket sau thu hồi không đi vào handler nghiệp vụ.
- Sửa role ngoài API quản trị: kiểm tra nền phát hiện và ngắt socket (production tối đa khoảng 30 giây;
  test dùng interval ngắn). Role thay đổi thông qua API trên cùng tiến trình được ngắt ngay.
- Làm giả `X-Forwarded-For` khi chạy trực tiếp local không thay đổi hạn mức IP.
- Store giới hạn lỗi trả 503; không gọi tiếp xử lý đăng nhập.

## Khi đưa lên Render

1. Có thay đổi **backend và frontend**. Deploy cả hai; chỉ deploy Vercel không kích hoạt bảo vệ backend.
2. Giữ `JWT_SECRET` hiện tại. Tài khoản thêm `tokenVersion` mặc định 0; không cần xóa DB.
3. Backend có biến mới `TRUST_PROXY_HOPS`:
   - Local truy cập trực tiếp: `0` (mặc định).
   - Hosting qua một reverse proxy đáng tin cậy: `1`. Đối chiếu tuyến proxy thực tế trên Render
     trước khi đặt; không đặt `true` hoặc tùy tiện tăng số hop. Nếu có thêm Cloudflare/proxy khác,
     phải kiểm tra lại tuyến. Xem [Express behind proxies](https://expressjs.com/en/guide/behind-proxies/).
   - Kiểm tra IP qua hai mạng khác nhau và thử header giả: ngân sách IP không bị dùng chung sai
     hoặc bị vượt qua bằng header do client tự gửi. Chưa xác minh cấu hình proxy của hosting trong đợt này.
4. Mongoose tạo collection/index TTL `authratelimits` khi backend khởi động với cấu hình hiện tại;
   xác nhận index `expiresAt` có `expireAfterSeconds: 0`. Nếu môi trường tắt autoIndex, tạo index bằng
   quy trình quản trị DB của bạn. Test tự động đã xác minh schema/index trong DB tạm.
5. Bộ đếm hỗ trợ nhiều tiến trình nhờ MongoDB. Socket revoke tức thời hiện áp dụng trong cùng
   tiến trình; instance khác kiểm tra từng packet và kiểm tra nền 30 giây. Chưa có adapter/bus
   thu hồi socket liên instance. Quy mô hiện tại dùng một backend là phù hợp.
6. Request đã qua kiểm quyền và đang chạy trước thời điểm thu hồi có thể hoàn tất. Đợt này không
   thêm transaction để hủy mọi thao tác đang chạy, không thay thế kiểm thử toàn bộ hệ thống.

## Mẫu ghi kết quả để đưa vào báo cáo đồ án

| Test ID | Ngày chạy / phiên bản | Kết quả thực tế | Pass/Fail | Bằng chứng |
| --- | --- | --- | --- | --- |
| AUTH-01 | | | | |
| AUTH-09 | | | | |
| AUTH-11 | | | | |

Ảnh bằng chứng nên chụp trạng thái HTTP, thông báo và role sau đăng nhập lại;
không chụp Authorization header, JWT, OTP, mật khẩu hoặc liên kết reset còn hiệu lực.

## Nghiệm thu frontend

Build có cảnh báo thời gian xử lý plugin CSS/HTML, không có lỗi build.

Chưa xác minh UI trong trình duyệt hoặc Google/SMTP thật ở đợt này. Frontend đã được thêm
listener cho `AUTH_REVOKED`, lỗi xác thực khi kết nối và ngắt socket từ server; lỗi mạng
thông thường không tự đăng xuất. Cần hoàn tất AUTH-09, AUTH-11 và AUTH-16 để nghiệm thu UI.
