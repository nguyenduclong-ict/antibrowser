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
