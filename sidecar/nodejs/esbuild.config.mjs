import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  await build({
    entryPoints: [path.join(__dirname, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    minify: true,
    sourcemap: false,
    outfile: path.join(__dirname, '..', '..', 'src-tauri', 'resources', 'sidecar', 'nodejs', 'server.cjs'),
    external: ['bufferutil', 'utf-8-validate'],
  });
  console.log('[Esbuild Sidecar] Build sidecar thành công!');
} catch (err) {
  console.error('[Esbuild Sidecar] Build sidecar thất bại:', err);
  process.exit(1);
}


