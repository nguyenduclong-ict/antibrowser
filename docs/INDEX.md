# Bản đồ Tài liệu Dự án antibrowsers (Documentation Map)

Dưới đây là mục lục và mô tả tóm tắt toàn bộ các tài liệu kỹ thuật của dự án **antibrowsers** (Trình quản lý Trình duyệt Antidetect).

---

## Danh mục Tài liệu (Documents Index)

* Link: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
  * Description: "Đặc tả chi tiết kiến trúc giao tiếp 3 lớp của dự án: React Frontend <-> Node.js Sidecar <-> Tauri Rust Shell, mô tả luồng điều khiển và quản lý tiến trình."
  
* Link: [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
  * Description: "Đặc tả chi tiết các REST API endpoints và Socket.io realtime events của Node.js Sidecar (Hono Server) dùng để quản lý profile, kiểm tra proxy."
  
* Link: [docs/CLOAKBROWSER_INTEGRATION.md](docs/CLOAKBROWSER_INTEGRATION.md)
  * Description: "Đặc tả chi tiết cách tích hợp và cấu hình thư viện cloakbrowser cùng playwright-core, cấu hình GeoIP, Socks5, WebRTC, và cơ chế GPU/Stealth bypassing."
  
* Link: [docs/PROFILE_DATA_STRUCTURE.md](docs/PROFILE_DATA_STRUCTURE.md)
  * Description: "Đặc tả cấu trúc dữ liệu của một Browser Profile (các trường cấu hình vân tay, proxy...) và cách tổ chức file database profiles.json cùng thư mục cache cô lập profiles_data/."
  
* Link: [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)
  * Description: "Hướng dẫn chi tiết cách cài đặt môi trường, chạy chế độ dev (dev server), đóng gói dự án (build) và cơ chế dọn dẹp tiến trình khi tắt ứng dụng."
