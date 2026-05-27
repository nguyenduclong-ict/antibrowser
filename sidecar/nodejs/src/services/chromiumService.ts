import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { getIO } from "../sockets/socketManager.js";

export interface ChromiumStatus {
  version: string;
  platform: string;
  binaryPath: string;
  installed: boolean;
  cacheDir: string;
  downloadUrl: string;
}

let cloakModule: any = null;

/**
 * Dynamic import cloakbrowser để tránh lỗi phân giải export của CommonJS/ESM
 */
async function getCloakModule() {
  if (cloakModule) return cloakModule;

  const cloakPath = path.join(
    __dirname,
    "node_modules",
    "cloakbrowser",
    "dist",
    "index.js",
  );

  if (!fs.existsSync(cloakPath)) {
    throw new Error(`Không tìm thấy thư viện cloakbrowser tại đường dẫn: ${cloakPath}`);
  }

  cloakModule = await (0, eval)(
    `import("${pathToFileURL(cloakPath).href}")`
  );
  return cloakModule;
}

/**
 * Lấy thông tin trạng thái nhân Chromium hiện tại
 */
export async function getChromiumStatus(): Promise<ChromiumStatus> {
  const { binaryInfo } = await getCloakModule();
  const info = binaryInfo();
  return {
    version: info.version,
    platform: info.platform,
    binaryPath: info.binaryPath,
    installed: fs.existsSync(info.binaryPath),
    cacheDir: info.cacheDir,
    downloadUrl: info.downloadUrl,
  };
}

/**
 * Bắt đầu tải nhân Chromium Stealth
 */
export async function downloadChromium(): Promise<string> {
  let io;
  try {
    io = getIO();
  } catch (e) {
    // Socket chưa được init (chạy quá sớm)
  }

  try {
    const { ensureBinary } = await getCloakModule();
    if (io) {
      io.emit("chromium:download-status", { 
        status: "Downloading", 
        message: "Bắt đầu tải và chuẩn bị nhân Chromium Stealth..." 
      });
    }

    const binaryPath = await ensureBinary();

    if (io) {
      io.emit("chromium:download-status", { 
        status: "Installed", 
        message: `Tải thành công! Nhân trình duyệt đã sẵn sàng tại: ${binaryPath}` 
      });
    }
    return binaryPath;
  } catch (err: any) {
    console.error("[ChromiumService] Error downloading Chromium:", err);
    if (io) {
      io.emit("chromium:download-status", { 
        status: "Error", 
        message: `Lỗi tải Chromium: ${err.message}` 
      });
    }
    throw err;
  }
}

/**
 * Xóa cache Chromium đã cài đặt để buộc tải lại
 */
export async function clearChromiumCache(): Promise<void> {
  const { clearCache } = await getCloakModule();
  clearCache();
  
  try {
    const io = getIO();
    io.emit("chromium:download-status", { 
      status: "Idle", 
      message: "Đã xóa thành công cache Chromium." 
    });
  } catch (e) {
    // Socket.io chưa init
  }
}

/**
 * Tự động kiểm tra và tải Chromium khi Sidecar khởi động lần đầu
 */
export async function initializeChromiumOnStartup(): Promise<void> {
  try {
    console.log("[ChromiumService] Kiểm tra nhân Chromium Stealth lúc khởi động...");
    const status = await getChromiumStatus();
    
    if (!status.installed) {
      console.log("[ChromiumService] Phát hiện Chromium chưa được cài đặt. Tiến hành tải tự động trong background...");
      // Gọi bất đồng bộ (background) để không block tiến trình handshake
      downloadChromium().catch((err) => {
        console.error("[ChromiumService] Startup Chromium download failed:", err);
      });
    } else {
      console.log(`[ChromiumService] Nhân Chromium Stealth đã được cài đặt sẵn sàng tại: ${status.binaryPath}`);
    }
  } catch (err) {
    console.error("[ChromiumService] Lỗi kiểm tra Chromium lúc khởi động:", err);
  }
}
