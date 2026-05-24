import { type BrowserContext } from 'playwright-core';
import path from 'node:path';
import { BrowserProfile } from '../types/profile.js';
import { getProfileDataDir } from './profileStore.js';
import { getIO } from '../sockets/socketManager.js';

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
  const { id, name, seed, platform, cpuCores, deviceMemory, viewportWidth, viewportHeight, storageQuota, webrtc, timezone, locale, humanize, humanPreset, extensionPaths } = profile;
  
  if (activeContexts.has(id)) {
    throw new Error('Profile is already running');
  }

  const io = getIO();
  
  // Phát sự kiện tạm thời "Starting" về phía client
  io.emit('profile:status-changed', { id, status: 'Starting' });

  try {
    const userDataDir = getProfileDataDir(id);

    // 1. Thiết lập cấu hình Proxy
    let proxyConfig = undefined;
    if (profile.proxyType !== 'none') {
      proxyConfig = {
        server: `${profile.proxyType}://${profile.proxyHost}:${profile.proxyPort}`,
        username: profile.proxyUsername || undefined,
        password: profile.proxyPassword || undefined,
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
    ];

    if (storageQuota) {
      fingerprintArgs.push(`--fingerprint-storage-quota=${storageQuota}`);
    }

    // Giả lập WebRTC IP
    if (webrtc === 'auto') {
      fingerprintArgs.push('--fingerprint-webrtc-ip=auto');
    } else if (webrtc !== 'default') {
      fingerprintArgs.push(`--fingerprint-webrtc-ip=${webrtc}`);
    }

    console.log(`[BrowserService] Launching profile "${name}" with seed ${seed}...`);

    // 3. Dynamic import cloakbrowser qua đường dẫn tuyệt đối để bypass CJS resolve exports
    const cloakPath = path.join(__dirname, 'node_modules', 'cloakbrowser', 'dist', 'index.js');
    const { launchPersistentContext } = await eval(`import("${cloakPath.replace(/\\/g, '/')}")`);
    
    const context = await launchPersistentContext({
      userDataDir,
      headless: false, // Luôn hiển thị giao diện Chromium Stealth
      proxy: proxyConfig,
      timezone: timezone !== 'auto' ? timezone : undefined,
      locale: locale !== 'auto' ? locale : undefined,
      geoip: timezone === 'auto' || locale === 'auto', // Tự động tra cứu GeoIP từ Proxy IP
      humanize,
      humanPreset,
      args: fingerprintArgs,
      extensionPaths: extensionPaths?.length ? extensionPaths : undefined,
    });

    // Lưu thực thể context để quản lý
    activeContexts.set(id, context);

    // Đồng bộ trạng thái "Running" về Frontend
    io.emit('profile:status-changed', { id, status: 'Running' });
    console.log(`[BrowserService] Profile "${name}" is now running.`);

    // Lắng nghe sự kiện người dùng tự đóng trình duyệt thủ công ngoài OS
    context.on('close', () => {
      activeContexts.delete(id);
      io.emit('profile:status-changed', { id, status: 'Stopped' });
      console.log(`[BrowserService] Profile "${name}" has stopped (browser closed).`);
    });

    return true;
  } catch (err: any) {
    console.error(`[BrowserService] Failed to launch profile ${id}:`, err);
    io.emit('profile:status-changed', { id, status: 'Stopped' });
    throw err;
  }
}

/**
 * Buộc đóng trình duyệt đang hoạt động
 */
export async function stopBrowser(id: string): Promise<boolean> {
  const context = activeContexts.get(id);
  if (!context) {
    throw new Error('Profile is not running');
  }

  try {
    console.log(`[BrowserService] Force closing browser for profile ID: ${id}...`);
    await context.close();
    activeContexts.delete(id);
    
    // Đồng bộ trạng thái "Stopped" về Frontend
    getIO().emit('profile:status-changed', { id, status: 'Stopped' });
    return true;
  } catch (err) {
    console.error(`[BrowserService] Error stopping profile ${id}:`, err);
    throw err;
  }
}
