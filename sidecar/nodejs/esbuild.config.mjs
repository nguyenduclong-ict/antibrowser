import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '..', '..', 'src-tauri', 'resources', 'sidecar', 'nodejs');

try {
  // 1. Tạo thư mục đích nếu chưa tồn tại
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 2. Chạy esbuild bundle mã nguồn, đánh dấu các gói nặng là external
  await build({
    entryPoints: [path.join(__dirname, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    minify: true,
    sourcemap: false,
    outfile: path.join(targetDir, 'server.cjs'),
    external: [
      'bufferutil', 
      'utf-8-validate', 
      'playwright-core', 
      'cloakbrowser'
    ],
  });
  console.log('[Esbuild Sidecar] Build bundle server.cjs thành công!');

  // 3. Sao chép package.json sang thư mục đích
  fs.copyFileSync(
    path.join(__dirname, 'package.json'),
    path.join(targetDir, 'package.json')
  );
  console.log('[Esbuild Sidecar] Đã copy package.json sang thư mục resource sidecar.');

  // 4. Tự động cài đặt dependencies external vào thư mục resource sidecar
  console.log('[Esbuild Sidecar] Đang cài đặt dependencies external vào resource sidecar...');
  execSync('npm install --omit=dev', { cwd: targetDir, stdio: 'inherit' });
  console.log('[Esbuild Sidecar] Đã cài đặt dependencies external thành công!');

  console.log('[Esbuild Sidecar] Toàn bộ quá trình build sidecar đã hoàn tất tốt đẹp!');
} catch (err) {
  console.error('[Esbuild Sidecar] Build sidecar thất bại:', err);
  process.exit(1);
}
