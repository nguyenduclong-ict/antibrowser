import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { profileRouter } from './routes/profileRoutes.js';
import { proxyRouter } from './routes/proxyRoutes.js';
import { extensionRouter } from './routes/extensionRoutes.js';
import { settingsRouter } from './routes/settingsRoutes.js';
import { initSocketIO } from './sockets/socketManager.js';
import { ensureStore } from './services/profileStore.js';
import { ensureStore as ensureProxyStore } from './services/proxyStore.js';
import { ensureStore as ensureExtensionStore } from './services/extensionStore.js';
import { ensureStore as ensureSettingsStore } from './services/settingsStore.js';
import { initializeChromiumOnStartup } from './services/chromiumService.js';

export async function createSidecarServer() {
  // Đảm bảo các database JSON được khởi tạo
  ensureStore();
  ensureProxyStore();
  ensureExtensionStore();
  ensureSettingsStore();

  const app = new Hono();
  
  // Nạp cors middleware
  app.use('*', cors());

  // REST API: Health Check
  app.get('/api/health', (c) => c.json({ status: 'ok', sidecar: 'nodejs' }));

  // Đăng ký toàn bộ api của profile, proxy, extensions và settings
  app.route('/api/profiles', profileRouter);
  app.route('/api/proxies', proxyRouter);
  app.route('/api/extensions', extensionRouter);
  app.route('/api/settings', settingsRouter);

  // 1. Khởi động server HTTP của Hono (OS sẽ tự động gán cổng trống ngẫu nhiên)
  const server = serve({
    fetch: app.fetch,
    port: 0,
  });

  // 2. Liên kết Socket.io WebSockets với HTTP Server
  const io = initSocketIO(server);

  // Ghi đè console.log để bắt log tải Chromium của cloakbrowser và phát qua socket
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    try {
      const msg = args.join(' ');
      if (msg.includes('[cloakbrowser]')) {
        if (msg.includes('Download progress:')) {
          const pctMatch = msg.match(/Download progress:\s*(\d+)%/);
          const mbMatch = msg.match(/\((\d+)\/(\d+)\s*MB\)/);
          const progress = pctMatch ? parseInt(pctMatch[1], 10) : 0;
          const downloadedMB = mbMatch ? parseInt(mbMatch[1], 10) : undefined;
          const totalMB = mbMatch ? parseInt(mbMatch[2], 10) : undefined;
          
          io.emit('chromium:download-progress', { progress, downloadedMB, totalMB });
        } else if (msg.includes('Downloading from')) {
          io.emit('chromium:download-status', { status: 'Downloading', message: msg });
        } else if (msg.includes('Extracting to')) {
          io.emit('chromium:download-status', { status: 'Extracting', message: msg });
        } else if (msg.includes('Binary ready:')) {
          io.emit('chromium:download-status', { status: 'Installed', message: msg });
        }
      }
    } catch (e) {
      // Tránh crash đệ quy hoặc lỗi socket
    }
  };

  // 3. Trả về Promise chứa port động
  return new Promise<{ port: number; httpServer: any }>((resolve, reject) => {
    server.on('listening', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        console.log(`[Server] Hono Sidecar running at http://127.0.0.1:${port}`);
        
        // Tự động kiểm tra và tải Chromium khi startup
        initializeChromiumOnStartup().catch((err) => {
          console.error('[Server] Lỗi tự động tải Chromium lúc khởi động:', err);
        });

        resolve({ port, httpServer: server });
      } else {
        reject(new Error('Cannot get sidecar server address'));
      }
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}
