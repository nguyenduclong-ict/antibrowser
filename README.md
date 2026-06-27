# antibrowsers - Trình Duyệt Kháng Vân Tay (Antidetect Browser) Chuyên Nghiệp

![antibrowsers Dashboard](screenshot.png)

**antibrowsers** là giải pháp quản lý tài khoản và trình duyệt kháng vân tay (antidetect), giúp bạn tạo ra các môi trường duyệt web cô lập hoàn toàn để nuôi tài khoản mạng xã hội (Facebook, Google, TikTok...), làm MMO, Dropshipping, hoặc chạy E-commerce (eBay, Amazon, Etsy...) một cách an toàn mà không lo bị quét liên đới.

---

## 🚀 Các Tính Năng Chính

* **Cô Lập Profile**: Mỗi hồ sơ (Profile) sở hữu Cookie, Lịch sử, Bộ nhớ đệm riêng biệt, hoàn toàn độc lập với nhau.
* **Giả Lập Vân Tay**: Thay đổi linh hoạt các thông số phần cứng như CPU, RAM, độ phân giải màn hình và tạo nhiễu đồ họa (Canvas, WebGL, Audio) để chống theo dõi vân tay thiết bị.
* **Tích Hợp Proxy**: Hỗ trợ HTTP/SOCKS5. Tự động bản địa hóa Múi giờ, Ngôn ngữ trình duyệt, và tọa độ GPS trùng khớp với IP của Proxy.
* **Chrome Extension**: Dễ dàng cài đặt thêm các tiện ích mở rộng bằng cách tải lên tệp tin `.zip`.
* **Tự Động Quản Lý Nhân**: Tự động tải xuống nhân Chromium Stealth bảo mật ngay trong lần chạy đầu tiên.

---

## 📦 Hướng Dẫn Tải & Tự Đóng Gói (Build File .exe)

Nếu bạn muốn tự tải mã nguồn và đóng gói ứng dụng thành file cài đặt `.exe` hoặc `.msi` để sử dụng, hãy làm theo hướng dẫn dưới đây.

### 1. Chuẩn bị môi trường
Máy tính của bạn cần cài đặt sẵn các công cụ sau:
* **Node.js** (Phiên bản LTS khuyên dùng v18 trở lên).
* **Rust & Cargo** (Xem hướng dẫn cài đặt tại [rustup.rs](https://rustup.rs/)).
* **C++ Build Tools** (Yêu cầu của Tauri để biên dịch ứng dụng trên Windows).

### 2. Các bước thực hiện build
1. Tải toàn bộ mã nguồn của dự án này về máy tính và giải nén.
2. Mở cửa sổ dòng lệnh (Terminal/Command Prompt) tại thư mục chứa mã nguồn.
3. Chạy lệnh cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```
4. Chạy lệnh đóng gói ứng dụng ra file cài đặt Windows:
   ```bash
   npm run build:exe
   ```
5. Sau khi quá trình build hoàn tất, bạn sẽ nhận được file cài đặt (`.exe` hoặc `.msi`) tại thư mục:
   `src-tauri/target/release/bundle/`

---

## 🛠️ Hướng Dẫn Sử Dụng Nhanh

1. **Khởi chạy**: Nhấp đúp vào file cài đặt đã build được ở trên để cài đặt vào máy, sau đó mở ứng dụng.
2. **Tải nhân trình duyệt**: Ở lần đầu tiên khởi chạy hoặc mở profile, ứng dụng sẽ tự động tải xuống nhân Chromium Stealth (khoảng 120MB). Hãy giữ mạng ổn định cho đến khi hoàn tất.
3. **Tạo Profile**: Nhấp **Tạo Profile Mới**, đặt tên và thiết lập Proxy (định dạng `IP:Cổng` hoặc `IP:Cổng:User:Pass`). Nhấn **Kiểm tra kết nối** rồi nhấn **Lưu**.
4. **Mở Trình Duyệt**: Nhấn nút **Mở** (biểu tượng Play màu xanh) bên cạnh profile để bắt đầu lướt web an toàn. Khi dùng xong chỉ cần đóng cửa sổ trình duyệt, cookie sẽ tự lưu lại.

---

## ❓ Câu Hỏi Thường Gặp (FAQ)

* **Dữ liệu của tôi được lưu trữ ở đâu?**
  * Tất cả cookies, mật khẩu và cấu hình profile đều được lưu cục bộ trên ổ cứng máy tính cá nhân của bạn. antibrowsers không gửi dữ liệu này đi bất cứ đâu, bảo mật tuyệt đối.
* **Tại sao nút "Mở" trình duyệt không phản hồi?**
  * Hãy chắc chắn rằng tiến trình tải nhân trình duyệt đã hoàn tất 100% (bạn có thể kiểm tra trong phần Cài Đặt Hệ Thống). Ngoài ra, hãy thử tắt Proxy hoặc kiểm tra xem Proxy của bạn còn hoạt động hay không.
