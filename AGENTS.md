# AI Agent Guide - Dự án antibrowsers

File này cung cấp chỉ dẫn nhanh về trạng thái và cấu trúc tài liệu của hệ thống **antibrowsers** (Trình quản lý Trình duyệt Antidetect).

---

## 🗺️ Bản đồ tài liệu chính (Documentation Map)

Mục lục trung tâm chứa danh sách toàn bộ các tài liệu kỹ thuật chi tiết của hệ thống:

👉 **[docs/INDEX.md](docs/INDEX.md)**

Danh sách tài liệu bao gồm:
- `ARCHITECTURE.md`: Mô tả kiến trúc 3 lớp của dự án.
- `API_DOCUMENTATION.md`: Đặc tả REST APIs & WebSockets của Node.js Sidecar.
- `CLOAKBROWSER_INTEGRATION.md`: Hướng dẫn gọi và điều khiển nhân trình duyệt stealth.
- `PROFILE_DATA_STRUCTURE.md`: Đặc tả cấu trúc dữ liệu JSON database & cô lập dữ liệu profile.
- `DEVELOPMENT_GUIDE.md`: Hướng dẫn môi trường lập trình dev & đóng gói build.

---

## 🚀 Trạng thái Phát triển & Kiến trúc lõi
* Dự án được xây dựng 100% dựa trên **`tauri-sidecar-template`**.
* **100% logic nghiệp vụ chạy ở Node.js Sidecar** (Hono + Socket.io + CloakBrowser SDK).
* Lõi Tauri (Rust) cực kỳ mỏng, chỉ khởi chạy và dọn dẹp tiến trình.
