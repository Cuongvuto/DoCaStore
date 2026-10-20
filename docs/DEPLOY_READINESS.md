# Chuẩn bị deploy lại — 19/10/2026

## Quyết định triển khai cập nhật — 20/10/2026

Người dùng xác nhận dữ liệu do mình tạo để thử, chọn **giữ database hiện tại**, bỏ qua việc xóa dữ liệu và **bỏ qua staging** để chuẩn bị deploy trực tiếp. Các bước staging phía dưới là phương án kiểm chứng đề xuất, chưa được thực hiện; không coi test/build local là đã nghiệm thu hosting. Đơn cũ thiếu dấu giữ kho vẫn bị chặn chuyển trạng thái, và các cờ đối soát thanh toán vẫn được giữ.

Cấu hình người dùng cung cấp:

- Hai dịch vụ deploy từ nhánh `main`. Workspace hiện phát triển trên `chore/local-improvements`; cần đưa đủ commit/file mới sang nhánh deploy.
- Render: Root `Backend`, Start `npm start`, bản đang chạy Node 20.19.5. Build hiện vẫn là `npm install --legacy-peer-deps`; khuyến nghị chuyển `npm ci --omit=dev --legacy-peer-deps` khi triển khai bản mới. Chưa xác nhận có biến `NODE_VERSION` trên Dashboard hay không; nếu có, kiểm tra để không ghi đè yêu cầu Node 22 trong repository.
- Vercel: Root `frontend`, preset Vite, Build/Output/Install Override tắt. Người dùng xác nhận đã đổi lựa chọn Node từ 24.x sang 22.x; chưa kiểm tra phiên bản trong log deployment mới.
- Người dùng đã chạy mongodump và báo exit 0, file `docastore-20261019-150012.archive.gz` có 333.606 byte. Chưa restore thử để kiểm chứng khả năng phục hồi. Bản export offline có 84 đơn; có 22 đơn thiếu bằng chứng giữ kho khi còn hoạt động và 11 đơn mang cờ `refund_required`. Không xác minh thanh toán thật qua PayOS trong phiên làm việc.

Việc chuẩn bị commit local không thay đổi deployment. Push `main` có thể kích hoạt autodeploy; cần thống nhất thời điểm chuyển cả hai dịch vụ. Khi bản mới khởi động, cron mặc định tắt nếu chưa đặt `ENABLE_MAINTENANCE_JOBS=true`; bật sau khi đối chiếu đúng môi trường, theo dõi đơn mới và giữ cách xử lý riêng cho đơn lịch sử.

## Trạng thái

Đợt sửa này xử lý lỗi trong source và chuẩn bị kiểm chứng trước khi triển khai lại Vercel + Render. Chưa push, chưa deploy, chưa đọc/ghi database production và chưa gọi Google, PayOS, SMTP hoặc Cloudinary thật để kiểm thử.

Mốc so sánh của lần rà soát trước: GitHub `main` tại `e1de47d644d4723857f77cffbdca78255b0164c1` (theo thông tin người dùng là bản đang deploy). Cần kiểm tra lại SHA thực tế trên cả hai nền tảng ngay trước khi triển khai. Nhiều thay đổi local và file mới đang chưa commit; không chỉ commit những file được sửa trong đợt này.

**Chưa xác nhận đủ điều kiện lên production.** Còn cần kiểm tra staging, cấu hình dịch vụ thực tế và dữ liệu đơn cũ. Không suy ra đã sẵn sàng chỉ từ việc build/test thành công.

## Những lỗi đã xử lý trong code

| Phần | Thay đổi | Bằng chứng |
| --- | --- | --- |
| Google Login | Tài khoản chưa xác thực được thay mật khẩu ngẫu nhiên, xóa OTP/reset token và giữ quyền customer khi Google xác minh email. Tài khoản đã xác thực giữ mật khẩu/quyền hiện có. | `Backend/src/controller/userController.js`, `Backend/test/authSafety.test.js` |
| Tranh chấp xác thực | Đăng ký lại chỉ cập nhật tài khoản vẫn chưa xác thực. Xác nhận OTP kiểm tra lại OTP/hạn dùng ngay tại lệnh ghi. Gửi mail thất bại không xóa tài khoản vừa được Google xác minh. | Cùng controller |
| Đặt lại mật khẩu | Kiểm tra đầu vào, chỉ áp dụng tài khoản đã xác thực; tiêu thụ đúng reset token còn hiệu lực cùng lúc đổi mật khẩu. Token bị thay/đã dùng không ghi đè mật khẩu mới. | `authSafety.test.js` |
| Tồn kho khi sửa sản phẩm | Form sửa mô tả không gửi lại tồn kho cũ. Khi sửa kho, frontend gửi `expectedStock`; backend cập nhật với điều kiện tồn kho còn khớp. Xung đột trả 409, không lưu một phần. | `productController.js`, `ProductManager.jsx`, `commerce.integration.test.js` |
| URL cũ | Cùng router phục vụ `/api/orders` và `/api/order`, giữ middleware phân quyền và kiểm chữ ký webhook. | `routes/orderRoutes.js`, kiểm thử HTTP local |
| Đơn cũ | Không hủy/chuyển trạng thái nếu chưa có bằng chứng giữ kho. Không hoàn lượt coupon chưa xác định. Thanh toán hợp lệ vẫn được ghi nhận, nhưng đơn chưa xác nhận giữ kho được gắn `inventory_unconfirmed`, không tự chuyển xử lý. | `services/orderService.js`, schema Order, màn quản trị |
| VND lịch sử | So sánh tiền webhook với `Math.round(totalPrice)` đúng cách bản đã deploy gửi số tiền cho PayOS; không sửa lại tổng tiền lịch sử. | `orderService.js`, kiểm thử đơn có tổng VND lẻ |
| Cron | Bỏ qua đơn thiếu dấu giữ kho trước khi gọi PayOS; đơn cũ không chặn 100 vị trí đầu của batch đơn mới. Cron chỉ bật khi `ENABLE_MAINTENANCE_JOBS=true`. | `utils/cronjob.js`, kiểm thử với PayOS giả lập |
| Môi trường | Khai báo Node `^22.12.0` trong package/lock và major 22 trong `.node-version`; sửa tên biến môi trường trong README. | Package/config của hai app |

## Đơn cũ: bắt buộc đối chiếu, không backfill theo suy đoán

Bản cũ có thể lưu đơn nháp trước khi tạo link thanh toán và trừ kho. Vì vậy trạng thái `pending`, `paid` hay `processing` không đủ chứng minh từng sản phẩm đã trừ kho. Nếu tiến trình dừng giữa chừng còn có thể trừ một phần sản phẩm. Không chạy `updateMany` gán `stockReserved=true` cho toàn bộ đơn cũ.

1. Sao lưu và lấy bản export collection orders tại thời điểm kiểm tra. Chỉ đưa bản export vào thư mục riêng `private-deploy-review/` (đã ignore ở root), không commit thông tin khách hàng.
2. Chạy công cụ **offline**, tại thư mục `Backend`:

   ```powershell
   node scripts/audit-legacy-orders.js ../private-deploy-review/orders.json
   ```

   Nhận JSON array (Compass/mongoexport `--jsonArray`) hoặc NDJSON, hỗ trợ `_id.$oid` và các trường số Extended JSON. Công cụ không đọc `.env`, không kết nối DB, không gọi API, không sửa file. Kết quả chỉ chứa mã đơn và vấn đề; mã thoát 2 khi còn blocker, 1 khi đầu vào lỗi, 0 khi không có blocker được phát hiện. Số blocker là số vấn đề, không phải số đơn. Kết quả không xác minh bản export đầy đủ/mới nhất và không thay thế kiểm thử deploy.

3. Với mỗi đơn đang hoạt động, đối chiếu từng sản phẩm, kho thực tế/lịch sử xuất nhập, trạng thái và số tiền trên PayOS, coupon nếu có. Ghi nhận người đối chiếu và bằng chứng.
4. Ưu tiên xử lý dứt điểm đơn cũ trên bản đang chạy trước khi chuyển. Nếu phải chuyển đơn đang hoạt động, cần kế hoạch sửa dữ liệu riêng theo kết quả đối chiếu và thử trên bản sao trước. Đợt này **không có migration tự động và không tự thay dữ liệu production**.
5. Chỉ dùng dấu `stockReserved=true` khi chứng minh toàn bộ lượng hàng của đơn đang được giữ. Nếu chưa giữ hoặc đã hoàn toàn bộ, phải đối chiếu trước khi dùng `false`; false chỉ cho hủy, không cho tiếp tục giao. Với trạng thái trừ/hoàn một phần, phải giải quyết chênh lệch từng sản phẩm trước. Không dùng cờ boolean để che mất sai lệch.
6. `couponReserved` cũng cần bằng chứng; bản cũ có thể không lưu `couponCode`, vì vậy thiếu mã không chứng minh chưa dùng coupon. Không tự giảm `usedCount` dựa riêng vào số lượt hiện tại.
7. QR/link cũ chưa lưu vào DB không được tự tạo lại. Màn thanh toán hiện cảnh báo liên hệ cửa hàng và ẩn QR khi chưa xác nhận kho; webhook vẫn nhận giao dịch muộn để đối soát. Không yêu cầu khách thanh toán thêm một đơn mới nếu chưa rõ giao dịch cũ.
8. Không dùng `createdAt`/`updatedAt` thay cho `completedAt` hoặc `paidAt`. Biểu đồ theo ngày hoàn tất/thu tiền có thể thiếu đơn lịch sử; tổng quan toàn thời gian và biểu đồ theo ngày đặt có quy ước riêng.

**Thay đổi hành vi có chủ đích:** đơn cũ đang hoạt động nhưng thiếu dấu giữ kho sẽ trả 409 khi xử lý trạng thái. Đây là cơ chế chặn ghi sai kho, không phải đã chuyển đổi dữ liệu thành công. Giải quyết danh sách này trước khi mở bán lại.

## Cấu hình triển khai cần đối chiếu

| Nền tảng | Thiết lập |
| --- | --- |
| Render | Root `Backend`; Node 22.x >= 22.12; build `npm ci --omit=dev --legacy-peer-deps`; start `npm start` |
| Vercel | Root `frontend`; Node 22.x >= 22.12; install `npm ci`; build `npm run build`; output `dist`; giữ rewrite trong `frontend/vercel.json` |
| MongoDB | Replica set/Atlas, MongoDB >= 5.0. Kiểm tra index Order sau khi deploy staging và trước mở bán. Không dùng standalone. |

`--legacy-peer-deps` ở backend là biện pháp tương thích tạm thời: lockfile dùng `cloudinary@2.x` trong khi `multer-storage-cloudinary@4` khai báo peer `cloudinary@^1.21.0`. Lệnh cài này bỏ kiểm tra peer; không chứng minh upload Cloudinary thật hoạt động. Cần smoke test upload trên tài khoản/thư mục staging. Không tự nâng/hạ package trong đợt này.

Node có thể bị thiết lập `NODE_VERSION`/Dashboard của dịch vụ chi phối; kiểm tra version thực trong log build. Tham chiếu: [Render Node version](https://render.com/docs/node-version), [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

Các tên biến khớp source:

- Backend: `MONGODB_CONNECTIONSTRING`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `FRONTEND_URL`, `PORT` (Render cung cấp), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `FROM_NAME`. `GEMINI_API_KEY` chỉ cần cho chatbot.
- Frontend: `VITE_API_BASE_URL` (URL Render + `/api`), `VITE_SOCKET_URL` (origin Render, không thêm `/api`), `VITE_GOOGLE_CLIENT_ID` nếu sử dụng Google Login. Đổi biến Vite cần build lại frontend.
- `CLIENT_URL` chấp nhận danh sách origin phân tách dấu phẩy. **Origin đầu tiên** được dùng để tạo đường dẫn trả về từ PayOS; đặt domain frontend đúng môi trường ở đầu, không có dấu `/` cuối. `FRONTEND_URL` dùng link email đặt lại mật khẩu.
- `ENABLE_MAINTENANCE_JOBS=false` ở staging ban đầu. Chỉ chuyển `true` trên môi trường có DB và bộ khóa thanh toán đã được đối chiếu; nếu bỏ quên, cron hết hạn đơn và cleanup ảnh sẽ không chạy. Kiểm tra log xác nhận. Cờ này chỉ kiểm soát cron, không chặn các API thanh toán do người dùng thao tác.
- Không đổi `JWT_SECRET` chỉ để deploy lại; đổi secret làm các phiên hiện tại không còn hợp lệ. Giữ secret thật ở platform environment; không đưa vào git, log hoặc file test.

## Nghiệm thu staging và chuyển phiên bản

1. Dùng MongoDB riêng và bộ khóa/tài khoản test riêng. Không dùng bản sao đơn production kèm khóa PayOS/SMTP/Cloudinary production để thử chức năng. Tạm dừng autodeploy trong lúc chuẩn bị commit nếu nó đang trỏ vào nhánh sắp push.
2. Fresh install bằng các lệnh phía trên, chạy `node --test` trong Backend và `npm test`, `npm run build` trong frontend bằng Node 22.x. MongoMemoryReplSet là DB tạm cho integration; lần đầu có thể cần tải binary MongoDB test. Không thay URI test bằng URI thật.
3. Kiểm tra register → OTP → login; Google với email mới/chưa xác thực/đã xác thực; forgot/reset. Mật khẩu của tài khoản đăng ký trước không đăng nhập được sau khi chủ email xác thực Google. Google OAuth phải khai báo đúng origin staging/production.
4. Checkout COD và VietQR giả lập/sandbox; thử lại request cùng idempotency key; tranh mua món cuối; hủy đồng thời; webhook sai chữ ký, trùng và tới muộn; tiền/tồn kho/coupon đúng sau mỗi ca.
5. Admin mở form sản phẩm rồi người mua đặt hàng: sửa mô tả vẫn giữ kho mới, sửa kho theo snapshot cũ phải trả 409. Màn admin cũ không gửi `expectedStock` cần refresh sau cutover.
6. Upload banner/sản phẩm thật lên tài khoản staging, thử ảnh quá dung lượng và lỗi mạng. Kiểm thử multipart local chưa thay thế kiểm thử Cloudinary thật.
7. Gọi cả `/api/order/payos-webhook` và `/api/orders/payos-webhook` với payload ký từ test provider; dữ liệu không hợp lệ bị từ chối. Đối chiếu URL webhook đã đăng ký ở PayOS; giữ alias cũ trong thời gian chuyển.
8. Rà soát bản export đơn cũ, hoàn tất phương án xử lý và backup trước thời điểm chuyển. Tránh nhận checkout mới trong khoảng FE/BE khác phiên bản; alias URL không bảo đảm toàn bộ contract banner/coupon/admin cũ tương thích.
9. Kiểm tra `git status --short` và file mới dưới `Backend/src/services`, tests, `docs`, components/hooks/styles của frontend. Kiểm tra diff không có secret/export DB. Commit đầy đủ thay đổi liên quan; deployment phải lấy cùng commit đã kiểm chứng.
10. Deploy backend và frontend trong cửa sổ chuyển đã thống nhất, kiểm tra log/health/login/checkout trước mở bán. Bật cron sau khi xác nhận đúng môi trường; theo dõi 409, webhook, hàng chờ cleanup và các đơn đối soát.

Rollback: giữ SHA/deployment trước và backup thời điểm chuyển. Nếu bản mới đã tạo đơn/trừ kho/nhận tiền, rollback code không khôi phục trạng thái dữ liệu và bản cũ không hiểu các invariant mới. Dừng ghi mới, đối chiếu đơn phát sinh rồi mới chọn rollback/forward fix; không phục hồi backup đè mất giao dịch vừa nhận.

## Giới hạn còn lại

- Chưa kiểm chứng tài khoản Vercel/Render/Atlas, cấu hình OAuth, webhook, SMTP/Cloudinary thật hoặc thao tác mua hàng bằng trình duyệt.
- Đã cài và kiểm chứng Node 22.23.3 trên Windows ngày 20/10/2026, bao gồm cài dependency từ lockfile trong thư mục riêng. Chưa kiểm chứng runtime Linux trên Render/Vercel hoặc thao tác end-to-end trong trình duyệt. Vẫn có cảnh báo dependency deprecated/Browserslist và Mongoose option `new` trong code hiện có.
- Sửa Google này phòng các lần liên kết tiếp theo. Không xác định được từ schema hiện tại những tài khoản trước đây đã được xác thực bằng luồng không an toàn; nếu có dấu hiệu bị ảnh hưởng, cần kế hoạch reset/thu hồi phiên riêng.
- Giới hạn thử OTP/login, thu hồi JWT sau đổi mật khẩu và rà soát lại quyền của socket đang mở vẫn là hạng mục bảo mật tiếp theo. Không coi đợt sửa này là chứng nhận toàn bộ hệ thống đã an toàn production.

## Kết quả kiểm thử local

Kết quả đã chạy ngày 19/10/2026 trên Node 20.19.5 với dependency hiện có:

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| Backend `node --test --test-reporter=spec` | **69/69 đạt**, 0 fail/skip; khoảng 17,5 giây | MongoMemoryReplSet 7.0.14 tạm, chặn tự tải binary bằng `MONGOMS_RUNTIME_DOWNLOAD=false`; provider giả lập |
| Frontend `node --test test/axiosClient.test.js` | **1/1 đạt** | HTTP local xác nhận POST/PUT multipart chứa đúng file và JSON thường; không upload Cloudinary thật |
| Frontend `node node_modules/vite/bin/vite.js build` | **Đạt** | Build local với dependency hiện có, không phải fresh install trên Vercel |
| ESLint `ProductManager.jsx`, `OrderManager.jsx`, `PaymentPage.jsx` | **Đạt** | Chỉ các màn sửa trong đợt này; không tuyên bố lint toàn repository |
| `node --check` server và CLI audit | **Đạt** | Kiểm tra cú pháp, không khởi động server với `.env` thật |

Kiểm thử quan trọng bao gồm Google pre-registration, đăng ký/OTP cạnh tranh, tiêu thụ reset token, hai admin sửa cùng tồn kho, checkout trừ kho khi form admin đã mở, đơn cũ nhận tiền làm tròn và webhook trùng, thiếu bằng chứng coupon, cron bỏ qua link cũ, và HTTP xác thực/chữ ký trên cả hai alias URL. Các test còn lại kiểm tra tranh mua, idempotency, rollback transaction, coupon và nghiệp vụ hiện có.

Test provider dùng mock; không gửi mail, upload hoặc chuyển tiền thật. Log có lỗi dự kiến từ các ca từ chối đầu vào/chữ ký và socket chưa khởi tạo trong test; các assertion tương ứng đều đạt.

## Kiểm chứng Node 22 — 20/10/2026

- Runtime: **Node 22.23.3**, **npm 10.9.9**, Windows. NVM vẫn giữ Node 20.19.5 để chuyển lại khi cần.
- Source, test, package/lock và cấu hình build được sao chép vào `private-deploy-review/node22-check-20261019-164243/`. Đã so sánh SHA-256 và danh sách file: bản kiểm tra khớp workspace tại thời điểm chạy. Tên thư mục là thời điểm bắt đầu chuẩn bị, không phải ngày hoàn tất kiểm thử.
- Không sao chép `.env`, không chạy server production, không kết nối Atlas. Dependency của hai thư mục ứng dụng gốc được giữ nguyên. Không thay phiên bản package hoặc lockfile trong đợt kiểm chứng này.

| Kiểm tra trong bản sao riêng | Kết quả |
| --- | --- |
| Backend `npm ci --legacy-peer-deps --no-audit --no-fund` | Thành công, cài 203 packages. Đặt `MONGOMS_DISABLE_POSTINSTALL=1` để không tự tải binary MongoDB lúc cài. |
| Frontend `npm ci --no-audit --no-fund` | Thành công, cài 317 packages. |
| Backend `node --test --test-reporter=spec` | **69/69 đạt**, không fail/skip; khoảng 16,9 giây. Dùng MongoMemoryReplSet 7.0.14 tạm và binary có sẵn, `MONGOMS_RUNTIME_DOWNLOAD=false`, `ENABLE_MAINTENANCE_JOBS=false`. |
| Frontend `npm test` | **1/1 đạt**, kiểm tra multipart upload và JSON qua HTTP local. |
| Frontend `npm run build` | **Đạt**, Vite 8.2.0; khoảng 2,94 giây. Không dùng biến môi trường production; output chỉ phục vụ kiểm chứng build, không dùng để đưa thẳng lên website thật. |
| ESLint `ProductManager.jsx`, `OrderManager.jsx`, `PaymentPage.jsx` | **Đạt**. |

Frontend được cài lại để có kết quả kết thúc xác định sau khi phiên cài ban đầu gián đoạn theo dõi. Log `backend-test.log`, `frontend-install.log`, `frontend-test.log`, `frontend-build.log` nằm trong thư mục kiểm tra đã ignore. `--no-audit` nghĩa là đợt này không kiểm tra lỗ hổng dependency bằng npm audit. Các cảnh báo deprecated không làm cài/build thất bại.

Kết luận: chưa thấy lỗi tương thích Node 22 trong phạm vi test/build trên Windows đã chạy. Chưa thay thế nghiệm thu staging, dịch vụ bên ngoài và dữ liệu cũ. Theo lựa chọn của người dùng, giữ nguyên database hiện tại và bỏ qua việc xóa đơn thử; các hạn chế xử lý đơn lịch sử thiếu dấu giữ kho vẫn còn.
