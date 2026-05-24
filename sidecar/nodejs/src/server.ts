import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Server as SocketIOServer } from 'socket.io';
import { cors } from 'hono/cors';

export async function createSidecarServer() {
  const app = new Hono();

  // Đăng ký CORS middleware cho Hono
  app.use('*', cors());

  // Đăng ký REST routes
  app.get('/api/health', (c) => c.json({ status: 'ok', sidecar: 'nodejs' }));
  
  app.get('/api/list-users', (c) => {
    return c.json([
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' },
      { id: 3, name: 'Bob Johnson' }
    ]);
  });

  // 1. Khởi động Hono server (sử dụng cổng 0 để tự động gán cổng trống)
  const server = serve({
    fetch: app.fetch,
    port: 0,
  });

  // 2. Khởi tạo Socket.io liên kết với HTTP server được tạo bởi serve()
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Cho phép mọi nguồn (vì chạy localhost)
    },
  });

  // Socket.io event handling
  io.on('connection', (socket) => {
    console.log(`[Sidecar Node.js] Client connected: ${socket.id}`);

    // Gửi event chào mừng
    socket.emit('welcome', { message: 'Welcome to the Node.js Sidecar!' });

    socket.on('ping-event', (data) => {
      console.log(`[Sidecar Node.js] Received ping:`, data);
      socket.emit('pong-event', { reply: 'pong', time: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
      console.log(`[Sidecar Node.js] Client disconnected: ${socket.id}`);
    });
  });

  // 3. Đợi server start và trả về port động
  return new Promise<{ port: number; httpServer: any }>((resolve, reject) => {
    server.on('listening', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        console.log(`[Sidecar Node.js] Server is running at http://127.0.0.1:${port}`);
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
