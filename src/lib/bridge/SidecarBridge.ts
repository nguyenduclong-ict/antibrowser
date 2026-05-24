import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';

export class SidecarBridge {
  readonly port: number;
  readonly api: AxiosInstance;
  readonly socket: Socket;

  constructor(port: number) {
    this.port = port;
    
    // Khởi tạo instance Axios
    this.api = axios.create({
      baseURL: `http://127.0.0.1:${port}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Khởi tạo connection Socket.io realtime
    this.socket = io(`http://127.0.0.1:${port}`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log(`[Bridge] Kết nối socket thành công tới cổng ${port}! ID: ${this.socket.id}`);
    });

    this.socket.on('connect_error', (err) => {
      console.error(`[Bridge] Kết nối socket thất bại tới cổng ${port}:`, err);
    });
  }

  // Lắng nghe các event từ socket
  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  // Hủy lắng nghe event từ socket
  off(event: string, callback: (...args: any[]) => void) {
    this.socket.off(event, callback);
  }

  // Emit event lên socket
  emit(event: string, ...args: any[]) {
    this.socket.emit(event, ...args);
  }

  // Dọn dẹp connection khi hủy bridge
  destroy() {
    console.log(`[Bridge] Đang dọn dẹp kết nối tới cổng ${this.port}...`);
    this.socket.disconnect();
  }
}
