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
  console.log('[Sidecar Node.js] Starting sidecar...');
  
  const tauriPort = parseTauriPort();
  if (!tauriPort) {
    console.error('[Sidecar Node.js] Missing parameter --tauri-port=XXXX. Exiting.');
    process.exit(1);
  }
  
  console.log(`[Sidecar Node.js] Received tauri port: ${tauriPort}`);

  try {
    // 1. Khởi động server
    const { port } = await createSidecarServer();
    
    // 2. Gửi request PUT đến tauri để thông báo đã ready
    const readyUrl = `http://127.0.0.1:${tauriPort}/api/sidecar/ready`;
    console.log(`[Sidecar Node.js] Registering ready at: ${readyUrl}`);
    
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
      console.log('[Sidecar Node.js] Registered successfully with Tauri!');
    } else {
      console.error(`[Sidecar Node.js] Registration failed with Tauri. HTTP Status: ${response.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('[Sidecar Node.js] Error during startup:', err);
    process.exit(1);
  }
}

main();
