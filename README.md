# 🚀 Gửi Email Hàng Loạt Bằng Tài Khoản Google (Gmail API) & ReactJS

Ứng dụng web viết bằng **ReactJS (Vite)** cho phép:
1. **Đăng nhập bằng tài khoản Google (Gmail)** và sử dụng chính địa chỉ Gmail đó để gửi thư hàng loạt đến các email khác trong danh sách.
2. **Dán trực tiếp bảng từ Excel (Ctrl + V)**: Tự động trích xuất các cột `{Họ và tên}`, `{email}`, `{Số điện thoại}`, `{mssv}` từ style table HTML Office `mso-...` hoặc dữ liệu tab/CSV.
3. **Soạn mẫu thư gửi theo mẫu sẵn**: Tự động thay thế biến cá nhân hóa, xem trước thư thực tế và chống treo máy.

---

## ⚡ Hướng Dẫn Khởi Chạy Ứng Dụng

Mở cửa sổ dòng lệnh (Terminal / PowerShell) tại thư mục `d:\Project\sendEmail` và chạy:

```bash
npm run dev
```

Trình duyệt sẽ tự động mở trang web tại địa chỉ: **`http://localhost:3000`**

---

## 🔑 Hướng Dẫn Thiết Lập Đăng Nhập Google (Chỉ 2 Phút)

Để đăng nhập bằng Google và cấp quyền gửi Gmail, bạn cần có **Google Client ID**:

### 1. Phân biệt Client ID và Client Secret:
- ❌ **Client Secret**: Bắt đầu bằng `GOCSPX-...` (Đây là mã bí mật, không điền vào ô Client ID).
- ✅ **Client ID**: Kết thúc bằng `...apps.googleusercontent.com` (Đây là mã cần dùng).

### 2. Các bước cấu hình trên Google Cloud Console:
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Vào **APIs & Services** > **Library** > Tìm **Gmail API** và bấm **Enable (Bật)**.
3. Vào **OAuth consent screen**:
   - Thêm địa chỉ Gmail bạn định đăng nhập vào mục **Test users**.
4. Vào **Credentials** > **Create Credentials** (hoặc mở Web Client đã có):
   - Chọn loại: **Web application**.
   - Tại mục **Authorized JavaScript origins (Nguồn gốc JavaScript được phép)**: Bấm **Add URI** và thêm:
     ```text
     http://localhost:3000
     ```
5. Sao chép **Client ID** (dạng `...apps.googleusercontent.com`) và dán vào ô Bước 1 trên trang web > Bấm **"Đăng nhập bằng Google"**.

---

## 🌟 Sau Khi Đăng Nhập Thành Công:
- Hệ thống sẽ hiển thị avatar, tên và email của bạn (ví dụ: `huynha@gmail.com`).
- Toàn bộ email gửi đi sẽ được gửi **chính từ địa chỉ Gmail này** và xuất hiện trong mục **Thư đã gửi (Sent)** của Gmail.
