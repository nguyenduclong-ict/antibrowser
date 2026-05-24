import { chromium } from 'playwright-core';

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
  error?: string;
}

export async function checkProxyConnection(config: ProxyConfig): Promise<ProxyCheckResult> {
  const { proxyType, proxyHost, proxyPort, proxyUsername, proxyPassword } = config;
  
  console.log(`[ProxyService] Checking connection: ${proxyType}://${proxyHost}:${proxyPort}...`);
  
  let browser = null;
  try {
    // Khởi chạy trình duyệt headless để kiểm tra
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      proxy: {
        server: `${proxyType}://${proxyHost}:${proxyPort}`,
        username: proxyUsername || undefined,
        password: proxyPassword || undefined,
      }
    });

    const page = await context.newPage();
    
    // Gọi API ipify thông qua Proxy để kiểm tra exit IP thực tế
    const response = await page.goto('https://api.ipify.org?format=json', { timeout: 8000 });
    if (!response || !response.ok()) {
      throw new Error('Proxy unreachable or returned non-200 status');
    }

    const text = await response.text();
    const data = JSON.parse(text);
    
    await browser.close();
    console.log(`[ProxyService] Connection active! Exit IP: ${data.ip}`);
    return { status: 'live', ip: data.ip };
  } catch (err: any) {
    console.error('[ProxyService] Connection failed:', err.message);
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    return { status: 'dead', error: err.message };
  }
}
