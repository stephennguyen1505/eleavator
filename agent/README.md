# Agent tự động đăng blog Aurelia

**Cấu hình hiện tại: tự động đăng, không cần duyệt bài.**

- Năm khung giờ mỗi ngày: **09:00, 11:00, 15:00, 19:00, 20:00**, múi giờ `Asia/Ho_Chi_Minh`.
- Nội dung: thang máy gia đình, biệt thự villa, khách sạn.
- Mỗi khung giờ tạo một bài. Khi chạy trễ, bù các khung giờ còn thiếu trong hôm nay; không tạo bù ngày trước.
- Bài hợp lệ được tự động đưa vào `blog/` và `dist/blog/`. Không phải chạy lệnh duyệt hay build lại để xuất bài mới.
- Có 30 chủ đề ban đầu. Khi hết, AI đề xuất chủ đề mới và từ chối tiêu đề chủ đề trùng chính xác sau chuẩn hóa. Chưa có kiểm tra trùng ý bằng ngữ nghĩa.

## GitHub Pages

Đích đã xác định: https://stephennguyen1505.github.io/eleavator/. Dùng workflow `.github/workflows/blog-pages.yml` để chạy bằng GitHub Actions; không cần máy chủ riêng. Xem [hướng dẫn kích hoạt GitHub Pages](../GITHUB-PAGES.md) cho các bước thêm repository secret và chọn Source. Các lệnh máy chủ bên dưới vẫn có thể dùng để phát triển cục bộ.

## Trạng thái kích hoạt thực tế

Mã nguồn và cấu hình tự động đã được kiểm tra với API giả lập. **Chưa chạy dịch vụ hằng ngày hoặc đăng bài thật:** chưa có repository secret `BLOG_AI_API_KEY`. Lần build/deploy đầu tiên trên GitHub Actions đã thành công (run 41421413784); lượt push không tạo bài AI. GitHub Actions sẽ thay thế máy chủ chạy thường trực. Khởi chạy khi thiếu khóa sẽ báo lỗi và thoát, không báo hoạt động giả.

Yêu cầu khóa `BLOG_AI_API_KEY` và hướng dẫn khởi động đã lưu vào bản nháp cấu hình cloud. Đích HTTPS được bổ sung: `api.openai.com`. Người quản trị cần nhập khóa qua Environment settings, lưu và Publish môi trường để áp dụng cấu hình; thao tác này không triển khai website hay tạo dịch vụ thường trực. Không gửi khóa vào chat hoặc ghi vào repository.

## Chạy

Yêu cầu Node.js hiện đại (đã kiểm tra Node 24), không cần cài dependency.

Từ `/workspace/eleavator`:

```sh
# Chuẩn bị website tĩnh lần đầu
npm run build

# Kiểm tra kế hoạch, không gọi AI
node agent/run.mjs --dry-run

# Chạy một lượt hoàn chỉnh: tạo và tự đăng tất cả khung giờ đến hạn hôm nay
npm run agent:once

# Chạy thường trực, kiểm tra lịch mỗi phút
npm run agent:start

# Kiểm tra chức năng bằng API giả lập, không mất phí AI
npm run agent:test
```

Cấp `BLOG_AI_API_KEY` qua cơ chế secret của máy chủ. Agent gọi `https://api.openai.com/v1/chat/completions`, model mặc định `gpt-4.1-mini`. Cần quyền sử dụng model và tài khoản có hạn mức. Giữ proxy được cấp và xác minh TLS. Không in khóa vào log.

`node agent/run.mjs` là thao tác cấp thấp, chỉ tạo bài trong kho nội bộ; dùng `agent:once` hoặc `agent:start` để thực hiện toàn bộ quy trình xuất bản tự động.

## Máy chủ và hosting

Để hoạt động hằng ngày, chạy scheduler bằng trình quản lý dịch vụ có tự khởi động lại trên một máy chủ luôn bật. Không chạy đồng thời nhiều scheduler. Một tiến trình trong phiên cloud phát triển không bảo đảm tồn tại sau khi phiên kết thúc.

Lưu `agent/output/` trên ổ đĩa bền vững. JSON là dữ liệu chính; Markdown là bản đọc thuận tiện. Nếu gián đoạn sau khi lưu bài hoặc ghi HTML, lượt chạy sau tiếp tục xuất bài mà không tạo lại bài đã lưu. Nếu khóa `.run.lock` còn sau sự cố, chỉ xóa sau khi xác nhận không còn tiến trình agent đang chạy.

Nếu hosting và agent cùng máy chủ, đặt document root của máy chủ web là **`dist/`**. Không công khai toàn bộ repository hoặc `agent/output/`. Máy chủ phát triển `server.mjs` không phải cấu hình hosting production. Với hosting khác máy chủ, cần cấu hình bước đồng bộ/triển khai riêng; hiện chưa có đích hay thông tin xác thực để nối bước này. Xuất HTML cục bộ không đồng nghĩa website Internet đã cập nhật.

## Nội dung và cấu hình

Chỉnh `agent/config.json` để thay thương hiệu, đối tượng đọc, thông tin sản phẩm đã xác minh và danh sách chủ đề. Không dùng thông số concept trong website làm bằng chứng sản phẩm. Quy tắc biên tập yêu cầu không bịa giá, chứng nhận, dự án hoặc hướng dẫn tự sửa thiết bị an toàn; đây là chỉ dẫn cho AI, không phải bảo đảm xác minh sự thật.

Đặt `autoPublish: false` nếu muốn quay lại bản nháp. Những bài đã đăng được giữ nguyên. Ở chế độ thủ công, có thể đọc/sửa `article` trong JSON rồi chạy:

```sh
node agent/publish.mjs --approve <id>
node agent/publish.mjs --export
npm run build
```

## Kiểm chứng

Chín kiểm tra gồm lịch Việt Nam, giới hạn năm khung giờ, đổi ngày, không lặp chủ đề, xử lý lỗi API, từ chối bài bị cắt, thiếu khóa, lọc bản nháp, escape HTML, tự xuất năm bài không qua duyệt, khôi phục xuất bản sau lỗi và đề xuất thêm chủ đề. Tất cả dùng API giả lập. API thật, vận hành qua ngày và website công khai chưa được kiểm chứng.
