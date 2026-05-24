import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function initSocketIO(httpServer: any): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log(`[SocketManager] Client connected: ${socket.id}`);
    socket.emit('welcome', { message: 'Welcome to antibrowsers sidecar!' });

    socket.on('ping-event', (data) => {
      console.log(`[SocketManager] Received ping from client:`, data);
      socket.emit('pong-event', { reply: 'pong', time: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
      console.log(`[SocketManager] Client disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.io instance has not been initialized. Call initSocketIO first.');
  }
  return ioInstance;
}
