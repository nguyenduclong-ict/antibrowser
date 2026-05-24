import { SidecarBridge } from './SidecarBridge';

export interface BrowserProfile {
  id: string;
  name: string;
  createdAt: number;
  platform: 'windows' | 'macos';
  proxyType: 'none' | 'http' | 'socks5';
  proxyHost: string;
  proxyPort: number;
  proxyUsername?: string;
  proxyPassword?: string;
  seed: string;
  cpuCores: number;
  deviceMemory: number;
  viewportWidth: number;
  viewportHeight: number;
  timezone: 'auto' | string;
  locale: 'auto' | string;
  webrtc: 'auto' | 'default' | string;
  storageQuota?: number;
  humanize: boolean;
  humanPreset: 'default' | 'careful';
  extensionPaths?: string[];
  status?: 'Stopped' | 'Running' | 'Starting';
}

export interface ProxyCheckRequest {
  proxyType: 'http' | 'socks5';
  proxyHost: string;
  proxyPort: number;
  proxyUsername?: string;
  proxyPassword?: string;
}

export interface ProxyCheckResult {
  status: 'live' | 'dead';
  ip?: string;
  error?: string;
}

export class NodeSidecarBridge extends SidecarBridge {
  // Gửi request test health check
  async getHealth(): Promise<{ status: string; sidecar: string }> {
    const { data } = await this.api.get('/api/health');
    return data;
  }

  // Lấy toàn bộ danh sách profiles
  async getProfiles(): Promise<BrowserProfile[]> {
    const { data } = await this.api.get<BrowserProfile[]>('/api/profiles');
    return data;
  }

  // Tạo mới profile
  async createProfile(profileData: Omit<BrowserProfile, 'id' | 'createdAt'> & { id?: string }): Promise<BrowserProfile> {
    const { data } = await this.api.post<BrowserProfile>('/api/profiles', profileData);
    return data;
  }

  // Cập nhật profile
  async updateProfile(id: string, profileData: Partial<BrowserProfile>): Promise<BrowserProfile> {
    const { data } = await this.api.put<BrowserProfile>(`/api/profiles/${id}`, profileData);
    return data;
  }

  // Xóa profile
  async deleteProfile(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await this.api.delete<{ success: boolean; message: string }>(`/api/profiles/${id}`);
    return data;
  }

  // Khởi chạy profile trình duyệt
  async launchProfile(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await this.api.post<{ success: boolean; message: string }>(`/api/profiles/${id}/launch`);
    return data;
  }

  // Buộc dừng profile trình duyệt
  async stopProfile(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await this.api.post<{ success: boolean; message: string }>(`/api/profiles/${id}/stop`);
    return data;
  }

  // Kiểm tra proxy trực tuyến
  async checkProxy(proxyData: ProxyCheckRequest): Promise<ProxyCheckResult> {
    try {
      const { data } = await this.api.post<ProxyCheckResult>('/api/profiles/check-proxy', proxyData);
      return data;
    } catch (err: any) {
      if (err.response && err.response.data) {
        return err.response.data as ProxyCheckResult;
      }
      return { status: 'dead', error: err.message };
    }
  }

  // Gửi ping qua socket.io
  pingSocket(payload: { message: string }) {
    this.emit('ping-event', payload);
  }
}
