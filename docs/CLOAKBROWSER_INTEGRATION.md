# Tích hợp & Vận hành Nhân CloakBrowser

Tài liệu này mô tả chi tiết cách thức Node.js Sidecar tích hợp thư viện **`cloakbrowser`** và cách cấu hình các tham số vân tay cấp độ C++ trên nhân Chromium.

---

## 1. Cài đặt các Thư viện Nền (Dependencies)

Để hỗ trợ đầy đủ các tính năng antidetect (bản xứ múi giờ/ngôn ngữ tự động và chạy proxy Socks5 mượt mà), Node.js Sidecar bắt buộc phải cài đặt 4 gói npm sau:
* **`cloakbrowser`**: Thư viện lõi điều khiển trình duyệt stealth.
* **`playwright-core`**: Playwright API tương tác với Chromium.
* **`mmdb-lib`**: Thư viện phân tích MaxMind GeoIP database để tự động bản xứ múi giờ và ngôn ngữ từ IP Proxy.
* **`socks-proxy-agent`**: Agent hỗ trợ điều hướng luồng kết nối SOCKS5 proxy an toàn.

---

## 2. Bản đồ Ánh xạ Tham số vào CloakBrowser

Khi chạy `launchPersistentContext` từ `cloakbrowser`, chúng ta sẽ build đối tượng `LaunchPersistentContextOptions` chính xác theo thiết kế sau:

### A. Tham số cấu hình mức cao (Top-level Options)
* **`userDataDir`**: Thư mục lưu cache tĩnh cục bộ (ví dụ: `%APPDATA%/.tauri-antidetect-browser/profiles_data/UUID_PROFILE`).
* **`headless`**: Luôn là `false` để mở cửa sổ duyệt web vật lý cho người dùng tự tương tác.
* **`proxy`**: Nếu có cấu hình proxy, ánh xạ thành đối tượng:
  ```json
  {
    "server": "http://192.168.1.10:8080",
    "username": "user",
    "password": "pass"
  }
  ```
* **`timezone`**: Truyền múi giờ cụ thể (ví dụ `America/New_York`) nếu không chọn `'auto'`.
* **`locale`**: Truyền locale cụ thể (ví dụ `en-US`) nếu không chọn `'auto'`.
* **`geoip`**: Đặt thành `true` nếu `timezone` hoặc `locale` là `'auto'`. Khi được bật, `cloakbrowser` sẽ tự động tải database `GeoLite2-City.mmdb` (~70MB) về `~/.cloakbrowser/geoip/` và tự động bản xứ hóa.
* **`humanize`**: Bật/tắt giả lập hành vi con người (di chuyển chuột cong Bézier, gõ phím trễ ngẫu nhiên tự sửa lỗi...).
* **`humanPreset`**: `'default'` hoặc `'careful'`.

### B. Cờ điều chỉnh vân tay Chromium (args)
Các cờ vân tay cấp độ C++ được truyền trực tiếp qua mảng `args`:
* **`--fingerprint=SEED_CODE`**: Master Seed gán bộ vân tay tĩnh cho profile.
* **`--fingerprint-platform=OS_NAME`**: Giả lập OS (`windows` hoặc `macos`).
* **`--fingerprint-hardware-concurrency=CPU_CORES`**: Giả lập số CPU.
* **`--fingerprint-device-memory=RAM_GB`**: Giả lập RAM.
* **`--fingerprint-screen-width=WIDTH`**: Giả lập độ rộng màn hình.
* **`--fingerprint-screen-height=HEIGHT`**: Giả lập độ cao màn hình.
* **`--fingerprint-storage-quota=MB`**: Giả lập hạn ngạch bộ nhớ cache tránh bị phát hiện incognito.
* **`--fingerprint-webrtc-ip=IP_OR_AUTO`**: Gán `'auto'` để tự lấy IP Proxy, hoặc gán IP cụ thể để tránh rò rỉ WebRTC IP.

---

## 3. GPU Hardware Passthrough & Bypassing

* **Tránh SwiftShader**: Playwright mặc định chạy Chromium ở chế độ không dùng card đồ họa thật mà dùng driver render phần mềm SwiftShader (tạo chuỗi WebGL rất dị biệt khiến bot phát hiện tức thì). 
* **Bypass Blocklist**: CloakBrowser trên Windows tự động bổ sung cờ `--ignore-gpu-blocklist` để kích hoạt card đồ họa (GPU) thật của máy tính truyền thẳng thông số vật lý (hoặc được spoof đồng nhất theo Seed) qua WebGL, đảm bảo vân tay GPU tự nhiên 100%.
