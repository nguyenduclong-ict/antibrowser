import { context } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '..', '..', 'src-tauri', 'resources', 'sidecar', 'nodejs');

try {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy package.json trước để đảm bảo thư mục đích có package.json
  fs.copyFileSync(
    path.join(__dirname, 'package.json'),
    path.join(targetDir, 'package.json')
  );

  const ctx = await context({
    entryPoints: [path.join(__dirname, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    minify: false, // Không cần minify khi dev để build nhanh hơn
    sourcemap: true, // Thêm sourcemap để hỗ trợ debug
    outfile: path.join(targetDir, 'server.cjs'),
    external: [
      'bufferutil', 
      'utf-8-validate', 
      'playwright-core', 
      'cloakbrowser', 
      'socks-proxy-agent', 
      'mmdb-lib',
      'axios',
      'https-proxy-agent'
    ],
  });

  await ctx.watch();
  console.log('[Esbuild Watcher] Đang theo dõi và tự động rebuild mã nguồn sidecar...');
} catch (err) {
  console.error('[Esbuild Watcher] Khởi động thất bại:', err);
  process.exit(1);
}
