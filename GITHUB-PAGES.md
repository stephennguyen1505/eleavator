# Kích hoạt đăng bài trên GitHub Pages

Website: https://stephennguyen1505.github.io/eleavator/

GitHub Actions chạy agent thay cho máy chủ riêng. Bài tự đăng không qua duyệt; năm mốc giờ Việt Nam là 09:00, 11:00, 15:00, 19:00 và 20:00. Lịch Actions dùng UTC tương ứng 02:00, 04:00, 08:00, 12:00 và 13:00.

## Việc cần thực hiện một lần

1. Mở https://github.com/stephennguyen1505/eleavator/settings/secrets/actions → **New repository secret**. Name: **BLOG_AI_API_KEY**. Secret: khóa API OpenAI có hạn mức sử dụng và quyền gọi model `gpt-4.1-mini`. Lưu bằng **Add secret**. Không dán khóa vào mã nguồn hoặc chat. Secret trong môi trường cloud không tự chuyển sang GitHub Actions: phải thêm vào repository này.
2. Mở https://github.com/stephennguyen1505/eleavator/settings/pages → **Build and deployment → Source → GitHub Actions**. Không cần thuê hosting hay đổi tên miền. Nguồn website vẫn là nội dung repository; workflow chỉ triển khai thư mục `dist`.
3. Mở https://github.com/stephennguyen1505/eleavator/actions → chọn **Daily AI blog and GitHub Pages** → **Run workflow** → branch **main** → **Run workflow**. Nếu GitHub hỏi bật Actions cho repository, chọn bật.
4. Đợi cả hai job **build** và **deploy** thành công. Mở https://stephennguyen1505.github.io/eleavator/blog/index.html để kiểm tra. Nếu chưa tới 09:00 giờ Việt Nam, chưa có bài đến hạn; trang blog vẫn có thể trống.

Từ đó lịch tự chạy trên GitHub, không cần giữ máy tính hay phiên chat mở. Không có bước duyệt bài.

## Khi gặp lỗi

- `Chưa kích hoạt: thiếu BLOG_AI_API_KEY`: thêm secret đúng tên vào **GitHub repository**, không phải chỉ môi trường cloud.
- HTTP 401: kiểm tra khóa; HTTP 429: kiểm tra hạn mức/thanh toán/rate limit trong tài khoản OpenAI. Không đăng khóa trong log.
- Không lưu được `blog-state`: trong **Settings → Actions → General → Workflow permissions**, cho phép **Read and write permissions** nếu chính sách repository yêu cầu. Nếu tổ chức chặn, cần quản trị viên mở quyền. Không bật quyền tạo/duyệt pull request vì workflow không dùng.
- Job Pages lỗi: kiểm tra Source là GitHub Actions và quyền Pages/Actions của repository. Nếu có yêu cầu reviewer cho environment `github-pages`, muốn hoàn toàn tự động thì quản trị viên cần điều chỉnh quy tắc environment phù hợp.

## Lịch sử, chi phí và giới hạn

Agent lưu trạng thái lên nhánh `blog-state` để không tạo trùng sau khi runner bị hủy hoặc bắt đầu phiên mới. Nhánh này chỉ chứa trạng thái và nội dung bài sinh ra (JSON/HTML), không chứa mã nguồn ứng dụng hoặc khóa API; có thể đọc được nếu repository công khai. Không xóa nhánh nếu muốn giữ lịch sử. Nhánh `main` không bị bot tự commit nội dung mỗi lượt chạy.

Chỉ `dist/` được đưa lên Pages, không có khóa, cấu hình nội bộ hoặc lịch sử JSON. Mỗi lượt sẽ khôi phục lịch sử, tạo các bài còn thiếu của ngày hiện tại, lưu trạng thái và triển khai HTML. Chạy lại cùng khung giờ không gọi AI tạo lại bài đã lưu. Lỗi API gây workflow đỏ; có thể chạy lại sau khi khắc phục. Sau lỗi một phần, trạng thái các bài đã tạo được lưu để tiếp tục.

GitHub Actions có thể chạy trễ so với cron, đặc biệt đầu giờ; đây là các giờ mục tiêu, không bảo đảm xuất bản chính xác từng phút. GitHub có thể tắt lịch của repository công khai sau 60 ngày không có hoạt động. Theo dõi tab Actions và bật lại nếu có thông báo. Phí OpenAI tính theo tài khoản của bạn; hạn mức GitHub Actions phụ thuộc loại repository/gói tài khoản.

Workflow trên push chỉ build/triển khai nội dung sẵn có; không gọi AI. Lịch hoặc **Run workflow** mới gọi AI và tạo bài. Khi hết 30 chủ đề ban đầu, AI tự đề xuất tiếp. Việc kiểm tra thông tin bằng AI không thay thế dữ liệu sản phẩm đã xác minh; cấu hình `agent/config.json` có thể bổ sung thông tin thực tế.

## Tạm dừng

Trong tab Actions, chọn workflow → menu ba chấm → **Disable workflow** để dừng cả lịch. Hoặc đổi `autoPublish` thành `false` trong `agent/config.json` nếu muốn tạo bản nháp và không xuất bài mới.
