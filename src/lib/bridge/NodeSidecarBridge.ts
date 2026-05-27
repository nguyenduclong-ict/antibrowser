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
  canvasNoise?: boolean;
  webglNoise?: boolean;
  audioNoise?: boolean;
  clientRectsNoise?: boolean;
  geolocationMode?: 'auto' | 'custom' | 'block';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
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
  country?: string;
  error?: string;
}

export interface ProxyEntry {
  id: string;
  name: string;
  proxyType: 'http' | 'socks5';
  proxyHost: string;
  proxyPort: number;
  proxyUsername?: string;
  proxyPassword?: string;
  status: 'unknown' | 'live' | 'dead';
  lastCheckedAt?: number;
  exitIp?: string;
  country?: string;
  ping?: number;
}

export interface ExtensionEntry {
  id: string;
  name: string;
  version: string;
  localPath: string;
  status: 'active' | 'inactive';
  createdAt: number;
}

export interface SystemSettings {
  language: 'vi' | 'en';
  theme: 'dark' | 'light';
  defaultCacheDir: string;
}

export interface ChromiumStatus {
  version: string;
  platform: string;
  binaryPath: string;
  installed: boolean;
  cacheDir: string;
  downloadUrl: string;
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

  // Kiểm tra proxy trực tuyến (không lưu)
  async checkProxy(proxyData: ProxyCheckRequest): Promise<ProxyCheckResult> {
    try {
      const { data } = await this.api.post<ProxyCheckResult>('/api/proxies/test', proxyData);
      return data;
    } catch (err: any) {
      if (err.response && err.response.data) {
        return err.response.data as ProxyCheckResult;
      }
      return { status: 'dead', error: err.message };
    }
  }

  // Lấy danh sách Proxy đã lưu
  async getProxies(): Promise<ProxyEntry[]> {
    const { data } = await this.api.get<ProxyEntry[]>('/api/proxies');
    return data;
  }

  // Thêm mới Proxy
  async createProxy(proxyData: Omit<ProxyEntry, 'id' | 'status'> & { id?: string; status?: 'unknown' | 'live' | 'dead' }): Promise<ProxyEntry> {
    const { data } = await this.api.post<ProxyEntry>('/api/proxies', proxyData);
    return data;
  }

  // Cập nhật Proxy
  async updateProxy(id: string, proxyData: Partial<ProxyEntry>): Promise<ProxyEntry> {
    const { data } = await this.api.put<ProxyEntry>(`/api/proxies/${id}`, proxyData);
    return data;
  }

  // Xóa Proxy
  async deleteProxy(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await this.api.delete<{ success: boolean; message: string }>(`/api/proxies/${id}`);
    return data;
  }

  // Kiểm tra kết nối 1 proxy cụ thể qua ID
  async checkProxyById(id: string): Promise<ProxyEntry> {
    const { data } = await this.api.post<ProxyEntry>(`/api/proxies/${id}/check`);
    return data;
  }

  // Kiểm tra kết nối hàng loạt proxy theo danh sách IDs
  async checkProxiesBulk(ids: string[]): Promise<ProxyEntry[]> {
    const { data } = await this.api.post<ProxyEntry[]>('/api/proxies/check-bulk', { ids });
    return data;
  }

  // Lấy danh sách Extensions đã cài đặt
  async getExtensions(): Promise<ExtensionEntry[]> {
    const { data } = await this.api.get<ExtensionEntry[]>('/api/extensions');
    return data;
  }

  // Tải lên và cài đặt tiện ích mở rộng (File zip)
  async uploadExtension(file: File): Promise<ExtensionEntry> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.api.post<ExtensionEntry>('/api/extensions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }

  // Xóa tiện ích mở rộng
  async deleteExtension(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await this.api.delete<{ success: boolean; message: string }>(`/api/extensions/${id}`);
    return data;
  }

  // Lấy cài đặt hệ thống
  async getSettings(): Promise<SystemSettings> {
    const { data } = await this.api.get<SystemSettings>('/api/settings');
    return data;
  }

  // Cập nhật cài đặt hệ thống
  async updateSettings(settingsData: Partial<SystemSettings>): Promise<SystemSettings> {
    const { data } = await this.api.put<SystemSettings>('/api/settings', settingsData);
    return data;
  }

  // Gửi ping qua socket.io
  pingSocket(payload: { message: string }) {
    this.emit('ping-event', payload);
  }

  // Lấy thông tin trạng thái Chromium Stealth
  async getChromiumStatus(): Promise<ChromiumStatus> {
    const { data } = await this.api.get<ChromiumStatus>('/api/settings/chromium-status');
    return data;
  }

  // Yêu cầu tải nhân Chromium
  async downloadChromium(): Promise<{ success: boolean; message: string }> {
    const { data } = await this.api.post<{ success: boolean; message: string }>('/api/settings/download-chromium');
    return data;
  }

  // Xóa cache Chromium đã cài đặt
  async clearChromiumCache(): Promise<{ success: boolean; message: string }> {
    const { data } = await this.api.post<{ success: boolean; message: string }>('/api/settings/clear-chromium-cache');
    return data;
  }
}
