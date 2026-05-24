import { createSidecarServer } from './server.js';

function parseTauriPort(): number | null {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith('--tauri-port=')) {
      const portStr = arg.split('=')[1];
      const port = parseInt(portStr, 10);
      if (!isNaN(port)) {
        return port;
      }
    }
  }
  return null;
}

async function main() {
  console.log('[Sidecar Node.js] Khởi động sidecar...');
  
  const tauriPort = parseTauriPort();
  if (!tauriPort) {
    console.error('[Sidecar Node.js] Thiếu tham số --tauri-port=XXXX. Thoát.');
    process.exit(1);
  }
  
  console.log(`[Sidecar Node.js] Nhận cổng tauri: ${tauriPort}`);

  try {
    // 1. Khởi động server
    const { port } = await createSidecarServer();
    
    // 2. Gửi request PUT đến tauri để thông báo đã ready
    const readyUrl = `http://127.0.0.1:${tauriPort}/api/sidecar/ready`;
    console.log(`[Sidecar Node.js] Đăng ký ready tại: ${readyUrl}`);
    
    const response = await fetch(readyUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'nodejs',
        port: port,
      }),
    });
    
    if (response.ok) {
      console.log('[Sidecar Node.js] Đăng ký thành công với Tauri!');
    } else {
      console.error(`[Sidecar Node.js] Đăng ký thất bại với Tauri. HTTP Status: ${response.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('[Sidecar Node.js] Lỗi trong quá trình khởi chạy:', err);
    process.exit(1);
  }
}

main();
