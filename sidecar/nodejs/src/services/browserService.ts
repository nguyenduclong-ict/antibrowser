import { type BrowserContext } from "playwright-core";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { BrowserProfile } from "../types/profile.js";
import { getProfileDataDir } from "./profileStore.js";
import { getIO } from "../sockets/socketManager.js";

// Quản lý các browser contexts đang chạy trong bộ nhớ tạm
const activeContexts = new Map<string, BrowserContext>();

/**
 * Kiểm tra xem profile có đang chạy hay không
 */
export function isBrowserRunning(id: string): boolean {
  return activeContexts.has(id);
}

/**
 * Khởi chạy trình duyệt Stealth cho Profile
 */
export async function launchBrowser(profile: BrowserProfile): Promise<boolean> {
  const {
    id,
    name,
    seed,
    platform,
    cpuCores,
    deviceMemory,
    viewportWidth,
    viewportHeight,
    storageQuota,
    webrtc,
    timezone,
    locale,
    humanize,
    humanPreset,
    extensionPaths,
  } = profile;

  if (activeContexts.has(id)) {
    throw new Error("Profile is already running");
  }

  const io = getIO();

  // Phát sự kiện tạm thời "Starting" về phía client
  io.emit("profile:status-changed", { id, status: "Starting" });

  try {
    const userDataDir = getProfileDataDir(id);

    // 1. Thiết lập cấu hình Proxy dưới dạng chuỗi chuẩn của CloakBrowser
    let proxyConfig: any = undefined;
    if (profile.proxyType !== "none") {
      proxyConfig = {
        server: `${profile.proxyType}://${profile.proxyHost}:${profile.proxyPort}`,
        username: profile.proxyUsername,
        password: profile.proxyPassword,
      };
    }

    // 2. Thiết lập cờ cấu hình giả lập vân tay cấp độ C++
    const fingerprintArgs = [
      `--fingerprint=${seed}`,
      `--fingerprint-platform=${platform}`,
      `--fingerprint-hardware-concurrency=${cpuCores}`,
      `--fingerprint-device-memory=${deviceMemory}`,
      `--fingerprint-screen-width=${viewportWidth}`,
      `--fingerprint-screen-height=${viewportHeight}`,
      "--test-type",
      "--disable-search-engine-choice-screen",
      "--disable-features=AcceptCHFrame,CriticalClientHint",
    ];

    if (storageQuota) {
      fingerprintArgs.push(`--fingerprint-storage-quota=${storageQuota}`);
    }

    if (locale !== "auto" && locale) {
      fingerprintArgs.push(`--lang=${locale}`);
    }

    // Giả lập WebRTC IP
    if (webrtc === "auto") {
      fingerprintArgs.push("--fingerprint-webrtc-ip=auto");
    } else if (webrtc !== "default") {
      fingerprintArgs.push(`--fingerprint-webrtc-ip=${webrtc}`);
    }

    // Thiết lập giả lập nhiễu vân tay
    if (profile.canvasNoise) {
      fingerprintArgs.push("--fingerprint-canvas-noise=1");
    }
    if (profile.webglNoise) {
      fingerprintArgs.push("--fingerprint-webgl-noise=1");
    }
    if (profile.audioNoise) {
      fingerprintArgs.push("--fingerprint-audio-noise=1");
    }
    if (profile.clientRectsNoise) {
      fingerprintArgs.push("--fingerprint-client-rects-noise=1");
    }

    // Cấu hình tọa độ địa lý Geolocation
    let geolocationConfig = undefined;
    if (
      profile.geolocationMode === "custom" &&
      profile.latitude !== undefined &&
      profile.longitude !== undefined
    ) {
      geolocationConfig = {
        latitude: Number(profile.latitude),
        longitude: Number(profile.longitude),
        accuracy:
          profile.accuracy !== undefined ? Number(profile.accuracy) : 10,
      };
      fingerprintArgs.push(
        `--fingerprint-geolocation-latitude=${profile.latitude}`,
      );
      fingerprintArgs.push(
        `--fingerprint-geolocation-longitude=${profile.longitude}`,
      );
    } else if (profile.geolocationMode === "block") {
      fingerprintArgs.push("--fingerprint-geolocation=block");
    }

    console.log(
      `[BrowserService] Launching profile "${name}" with seed ${seed}...`,
    );

    // 3. Dynamic import cloakbrowser qua đường dẫn tuyệt đối để bypass CJS resolve exports
    const cloakPath = path.join(
      __dirname,
      "node_modules",
      "cloakbrowser",
      "dist",
      "index.js",
    );
    const { launchPersistentContext } = await (0, eval)(
      `import("${pathToFileURL(cloakPath).href}")`,
    );

    // Tải danh sách thư mục extensions thực tế dựa trên ID hoặc đường dẫn lưu trong profile
    const extPaths: string[] = [];
    if (extensionPaths && extensionPaths.length > 0) {
      const { getExtension } = await import("./extensionStore.js");
      for (const extItem of extensionPaths) {
        const ext = await getExtension(extItem);
        if (ext && ext.status === "active") {
          extPaths.push(ext.localPath);
        } else if (path.isAbsolute(extItem) && fs.existsSync(extItem)) {
          extPaths.push(extItem);
        }
      }
    }

    const context = await launchPersistentContext({
      userDataDir,
      headless: false, // Luôn hiển thị giao diện Chromium Stealth
      proxy: proxyConfig,
      timezone: timezone !== "auto" ? timezone : undefined,
      locale: locale !== "auto" ? locale : undefined,
      geoip: timezone === "auto" || locale === "auto", // Tự động tra cứu GeoIP từ Proxy IP
      geolocation: geolocationConfig,
      permissions: geolocationConfig ? ["geolocation"] : undefined,
      humanize,
      humanPreset,
      args: fingerprintArgs,
      extensionPaths: extPaths.length ? extPaths : undefined,
    });

    // Lưu thực thể context để quản lý
    activeContexts.set(id, context);

    // Đồng bộ trạng thái "Running" về Frontend
    io.emit("profile:status-changed", { id, status: "Running" });
    console.log(`[BrowserService] Profile "${name}" is now running.`);

    // Lắng nghe sự kiện người dùng tự đóng trình duyệt thủ công ngoài OS
    context.on("close", () => {
      activeContexts.delete(id);
      io.emit("profile:status-changed", { id, status: "Stopped" });
      console.log(
        `[BrowserService] Profile "${name}" has stopped (browser closed).`,
      );
    });

    return true;
  } catch (err: any) {
    console.error(`[BrowserService] Failed to launch profile ${id}:`, err);
    io.emit("profile:status-changed", { id, status: "Stopped" });
    throw err;
  }
}

/**
 * Buộc đóng trình duyệt đang hoạt động
 */
export async function stopBrowser(id: string): Promise<boolean> {
  const context = activeContexts.get(id);
  if (!context) {
    throw new Error("Profile is not running");
  }

  try {
    console.log(
      `[BrowserService] Force closing browser for profile ID: ${id}...`,
    );
    await context.close();
    activeContexts.delete(id);

    // Đồng bộ trạng thái "Stopped" về Frontend
    getIO().emit("profile:status-changed", { id, status: "Stopped" });
    return true;
  } catch (err) {
    console.error(`[BrowserService] Error stopping profile ${id}:`, err);
    throw err;
  }
}
