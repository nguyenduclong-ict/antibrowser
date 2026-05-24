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
  initSocketIO(server);

  // 3. Trả về Promise chứa port động
  return new Promise<{ port: number; httpServer: any }>((resolve, reject) => {
    server.on('listening', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        console.log(`[Server] Hono Sidecar running at http://127.0.0.1:${port}`);
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
