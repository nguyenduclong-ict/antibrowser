# Hướng dẫn Phát triển & Vận hành (Development Guide)

Tài liệu này hướng dẫn chi tiết cách cài đặt môi trường, vận hành chế độ phát triển (Development) và đóng gói (Build) ứng dụng **antibrowsers**.

---

## 1. Cài đặt Môi trường (Prerequisites)

* **Node.js**: Phiên bản `>= 18.0.0` (khuyên dùng Node.js LTS).
* **Rust**: Cài đặt Rust qua [rustup](https://rustup.rs/) (cần thiết để biên dịch lõi Tauri v2).
* **Git**: Dùng để quản lý mã nguồn.
* **Windows Build Tools**: Trên Windows, cần cài đặt C++ Build Tools thông qua Visual Studio Installer để biên dịch mã Rust.

---

## 2. Vận hành Chế độ Phát triển (Development Mode)

Quá trình chạy dev được chia làm 2 phần: chạy Node.js Sidecar độc lập (nếu muốn debug backend) hoặc chạy toàn bộ hệ thống tích hợp qua Tauri.

### A. Chạy tích hợp toàn bộ ứng dụng (Khuyên dùng)
Tại thư mục gốc của dự án `antibrowsers`, chạy lệnh:
```bash
npm install
npm run dev
```

Lệnh này sẽ tự động:
1. Chạy dev server của Vite cho Frontend React (ở port `1420`).
2. Biên dịch mã Rust của Tauri.
3. Tải và giải nén Node.js Portable di động vào thư mục tài nguyên của Rust.
4. Tự động khởi chạy Node.js Sidecar dưới background.
5. Mở cửa sổ ứng dụng native Tauri.

### B. Cơ chế Hot Restart Sidecar
Nếu bạn chỉnh sửa code của Node.js Sidecar (`sidecar/nodejs/src/`):
* Thay vì tắt và mở lại toàn bộ Tauri app (tốn thời gian biên dịch Rust), giao diện Dashboard có sẵn nút **"Restart Sidecar 🔄"**.
* Khi bấm, Frontend sẽ gọi một Tauri Rust Command `restart_sidecar`. Tauri Rust sẽ lập tức kill tiến trình Node.js Sidecar cũ, chạy script build tự động esbuild của sidecar, và spawn một tiến trình Sidecar mới. Hệ thống sẽ tự động tái kết nối real-time sau 1-2 giây!

---

## 3. Quy trình Đóng gói Ứng dụng (Production Build)

Khi ứng dụng đã sẵn sàng chạy thương mại, thực hiện đóng gói thành file cài đặt độc lập:

```bash
npm run build
```

Lệnh này sẽ thực thi:
1. Đóng gói Frontend React thành các file HTML/JS tĩnh trong thư mục `dist/`.
2. Truy cập vào `sidecar/nodejs`, chạy esbuild để nén toàn bộ mã nguồn TypeScript của sidecar và toàn bộ `node_modules` liên quan thành một file bundle duy nhất cực kỳ gọn nhẹ là `server.cjs` tại `src-tauri/resources/sidecar/nodejs/server.cjs`.
3. Biên dịch mã nguồn Rust ở chế độ Release, đóng gói kèm theo tệp `server.cjs` và Node.js Portable di động thành một file cài đặt `.msi` (trên Windows) hoặc `.dmg` (trên macOS) hoàn chỉnh.

---

## 4. Cơ chế Dọn dẹp Tiến trình khi Thoát ứng dụng (Process Cleanup)

Để tránh việc khi người dùng tắt ứng dụng Tauri mà các tiến trình Node.js Sidecar hoặc Chromium của các profile đang chạy vẫn bị "treo" ngầm trong Task Manager:
* Phía Rust Core (`src-tauri/src/lib.rs`) lắng nghe sự kiện thoát ứng dụng:
  ```rust
  app.run(move |_app_handle, event| {
      if let tauri::RunEvent::ExitRequested { .. } = event {
          println!("[Tauri Exit] App exit. Cleaning up sidecars...");
          sidecar::kill_all_sidecars(state_exit.clone());
      }
  });
  ```
* Hàm `kill_all_sidecars` sẽ gửi tín hiệu kết thúc (SIGKILL/SIGTERM) tới toàn bộ tiến trình con Node.js Sidecar đang nắm giữ.
* Khi Node.js Sidecar nhận tín hiệu kết thúc, sự kiện dọn dẹp nội bộ sẽ tự động duyệt qua danh sách `activeContexts` đang mở và gọi `context.close()` để đóng sạch sẽ toàn bộ các cửa sổ trình duyệt Chromium Stealth đang hiển thị trước khi tiến trình chính bị tiêu diệt hoàn toàn.
