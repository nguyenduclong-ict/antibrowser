import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { profileRouter } from './routes/profileRoutes.js';
import { initSocketIO } from './sockets/socketManager.js';
import { ensureStore } from './services/profileStore.js';

export async function createSidecarServer() {
  // Đảm bảo database JSON được khởi tạo
  ensureStore();

  const app = new Hono();
  
  // Nạp cors middleware
  app.use('*', cors());

  // REST API: Health Check
  app.get('/api/health', (c) => c.json({ status: 'ok', sidecar: 'nodejs' }));

  // Đăng ký toàn bộ api của profile vào `/api/profiles`
  app.route('/api/profiles', profileRouter);

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
