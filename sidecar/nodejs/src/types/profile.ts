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
  
  // Vân tay nâng cao
  canvasNoise?: boolean;
  webglNoise?: boolean;
  audioNoise?: boolean;
  clientRectsNoise?: boolean;
  geolocationMode?: 'auto' | 'custom' | 'block';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}
