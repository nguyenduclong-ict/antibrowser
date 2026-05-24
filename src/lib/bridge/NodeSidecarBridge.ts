import { SidecarBridge } from './SidecarBridge';

export interface User {
  id: number;
  name: string;
}

export class NodeSidecarBridge extends SidecarBridge {
  // Gửi request test health check
  async getHealth(): Promise<{ status: string; sidecar: string }> {
    const { data } = await this.api.get('/api/health');
    return data;
  }

  // Gửi request lấy danh sách users
  async getListUsers(): Promise<User[]> {
    const { data } = await this.api.get<User[]>('/api/list-users');
    return data;
  }

  // Tiện ích gửi tín hiệu ping realtime qua socket
  pingSocket(payload: { message: string }) {
    this.emit('ping-event', payload);
  }
}
