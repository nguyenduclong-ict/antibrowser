# Đặc tả API & WebSocket (API Documentation)

Tài liệu này mô tả chi tiết các REST API endpoints và Socket.io events được triển khai 100% bên trong Hono Server của **Node.js Sidecar**.

---

## 1. REST API Endpoints (Hono Server)

Tất cả các API được chạy ở localhost (`http://127.0.0.1:PORT_SIDECAR/api`).

### A. Health & System
* **`GET /api/health`**
  * **Mô tả**: Kiểm tra trạng thái hoạt động của Sidecar.
  * **Phản hồi (200 OK)**:
    ```json
    { "status": "ok", "sidecar": "nodejs" }
    ```

### B. Quản lý Profile (Profiles CRUD)
* **`GET /api/profiles`**
  * **Mô tả**: Lấy danh sách toàn bộ profile kèm trạng thái hoạt động thời gian thực (`Running` hoặc `Stopped`).
  * **Phản hồi (200 OK)**:
    ```json
    [
      {
        "id": "c1a67a0a-e374-4b56-9408-0f52781b9f1f",
        "name": "Facebook Account 01",
        "platform": "windows",
        "proxyType": "socks5",
        "proxyHost": "192.168.1.10",
        "proxyPort": 1080,
        "seed": "45672",
        "cpuCores": 4,
        "deviceMemory": 8,
        "viewportWidth": 1920,
        "viewportHeight": 947,
        "timezone": "auto",
        "locale": "auto",
        "webrtc": "auto",
        "storageQuota": 5000,
        "humanize": true,
        "humanPreset": "default",
        "status": "Stopped",
        "createdAt": 1779641544561
      }
    ]
    ```

* **`POST /api/profiles`**
  * **Mô tả**: Tạo một profile mới.
  * **Yêu cầu (Body JSON)**: Toàn bộ các thông số cấu hình profile. Nếu `id` không được gửi, hệ thống tự sinh UUID. Nếu `seed` không gửi, tự sinh từ `10000 - 99999`.
  * **Phản hồi (201 Created)**: Trả về đối tượng profile vừa tạo.

* **`PUT /api/profiles/:id`**
  * **Mô tả**: Cập nhật thông tin của một profile. Không được phép cập nhật nếu profile đang ở trạng thái `Running`.
  * **Yêu cầu (Body JSON)**: Các thông số cần cập nhật.
  * **Phản hồi (200 OK)**: Trả về đối tượng profile sau cập nhật.

* **`DELETE /api/profiles/:id`**
  * **Mô tả**: Xóa cấu hình profile khỏi JSON DB và xóa sạch thư mục cache dữ liệu trình duyệt tương ứng. Không được xóa khi profile đang `Running`.
  * **Phản hồi (200 OK)**:
    ```json
    { "success": true, "message": "Profile deleted successfully" }
    ```

### C. Điều khiển Trình duyệt (Browser Actions)
* **`POST /api/profiles/:id/launch`**
  * **Mô tả**: Thực thi khởi chạy trình duyệt antidetect stealth bằng CloakBrowser dựa trên cấu hình của profile.
  * **Phản hồi (200 OK)**:
    ```json
    { "success": true, "message": "Browser launched successfully" }
    ```
  * **Phản hồi lỗi (400/500)**: Nếu profile đã chạy hoặc gặp lỗi khởi chạy.

* **`POST /api/profiles/:id/stop`**
  * **Mô tả**: Buộc đóng trình duyệt đang chạy của profile tương ứng.
  * **Phản hồi (200 OK)**:
    ```json
    { "success": true, "message": "Browser stopped successfully" }
    ```

### D. Tiện ích (Utilities)
* **`POST /api/profiles/check-proxy`**
  * **Mô tả**: Kiểm tra trạng thái hoạt động và tốc độ phản hồi của Proxy thời gian thực.
  * **Yêu cầu (Body JSON)**:
    ```json
    {
      "proxyType": "socks5",
      "proxyHost": "192.168.1.10",
      "proxyPort": 1080,
      "proxyUsername": "user",
      "proxyPassword": "pass"
    }
    ```
  * **Phản hồi thành công (200 OK)**: Trả về IP quốc gia, múi giờ và vị trí của Proxy.
  * **Phản hồi lỗi (400/500)**: Nếu không kết nối được tới proxy (proxy chết).

---

## 2. WebSockets Realtime Events (Socket.io)

Socket.io được sử dụng để đồng bộ tức thời các sự kiện hệ thống và trạng thái tiến trình từ Node.js Sidecar lên React Frontend.

### A. Events từ Client (Frontend) gửi lên Server (Sidecar)
* **`ping-event`**
  * **Tham số**: `{ message: string }`
  * **Mô tả**: Kiểm tra độ trễ kết nối Socket.

### B. Events từ Server (Sidecar) phát xuống Client (Frontend)
* **`welcome`**
  * **Dữ liệu**: `{ message: string }`
  * **Mô tả**: Gửi lời chào khi client kết nối thành công.
* **`pong-event`**
  * **Dữ liệu**: `{ reply: "pong", time: string }`
  * **Mô tả**: Phản hồi sự kiện `ping-event`.
* **`profile:status-changed`**
  * **Dữ liệu**: `{ id: string, status: "Running" | "Stopped" }`
  * **Mô tả**: Phát tín hiệu đồng bộ ngay lập tức khi một profile thay đổi trạng thái (đặc biệt khi người dùng đóng trình duyệt thủ công ngoài OS, sự kiện này được phát tức khắc để UI đổi màu nút và trạng thái).
