import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

interface ProxyConfig {
  proxyType: 'http' | 'socks5';
  proxyHost: string;
  proxyPort: number;
  proxyUsername?: string;
  proxyPassword?: string;
}

interface ProxyCheckResult {
  status: 'live' | 'dead';
  ip?: string;
  country?: string;
  error?: string;
}

export async function checkProxyConnection(config: ProxyConfig): Promise<ProxyCheckResult> {
  const { proxyType, proxyHost, proxyPort, proxyUsername, proxyPassword } = config;
  
  console.log(`[ProxyService] Checking connection: ${proxyType}://${proxyHost}:${proxyPort}...`);
  
  try {
    // Xây dựng URL Proxy thích hợp (hỗ trợ auth nếu có)
    const authPart = proxyUsername && proxyPassword 
      ? `${encodeURIComponent(proxyUsername)}:${encodeURIComponent(proxyPassword)}@` 
      : '';
    
    // Đảm bảo protocol chính xác cho agent
    const proxyUrl = `${proxyType}://${authPart}${proxyHost}:${proxyPort}`;
    
    let agent;
    if (proxyType === 'socks5') {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = new HttpsProxyAgent(proxyUrl);
    }

    // Thực hiện request qua proxy agent tới ip-api (dùng http để tránh lỗi https trên một số proxy và miễn phí)
    const response = await axios.get('http://ip-api.com/json/', {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 8000,
    });

    if (response.status === 200 && response.data && response.data.status === 'success') {
      const ip = response.data.query;
      const country = response.data.countryCode || response.data.country || 'Unknown';
      console.log(`[ProxyService] Connection active! Exit IP: ${ip}, Country: ${country}`);
      return { status: 'live', ip, country };
    } else {
      const errMsg = response.data?.message || `Status: ${response.status}`;
      throw new Error(`Proxy response error: ${errMsg}`);
    }
  } catch (err: any) {
    console.error('[ProxyService] Connection failed:', err.message);
    return { status: 'dead', error: err.message };
  }
}
