import { Context } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import * as extensionStore from '../services/extensionStore.js';
import { EXTENSIONS_DATA_DIR } from '../services/extensionStore.js';

export async function getExtensions(c: Context) {
  try {
    const list = await extensionStore.getExtensions();
    return c.json(list);
  } catch (err: any) {
    return c.json({ error: 'Failed to load extensions', details: err.message }, 500);
  }
}

export async function uploadExtension(c: Context) {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No zip file uploaded' }, 400);
    }

    // Đọc Buffer từ file upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Giải nén file zip vào thư mục extensions
    const extId = crypto.randomUUID();
    const extractPath = path.join(EXTENSIONS_DATA_DIR, extId);
    
    fs.mkdirSync(extractPath, { recursive: true });

    try {
      const zip = new AdmZip(buffer);
      zip.extractAllTo(extractPath, true);
    } catch (zipErr: any) {
      fs.rmSync(extractPath, { recursive: true, force: true });
      return c.json({ error: 'Failed to extract zip archive', details: zipErr.message }, 400);
    }

    // Kiểm tra và đọc manifest.json
    let manifestPath = path.join(extractPath, 'manifest.json');
    
    // Nếu zip giải nén ra 1 thư mục con chứa extension (ví dụ folder tên extension-master)
    if (!fs.existsSync(manifestPath)) {
      const files = fs.readdirSync(extractPath);
      if (files.length === 1 && fs.statSync(path.join(extractPath, files[0]!)).isDirectory()) {
        const nestedDir = path.join(extractPath, files[0]!);
        const nestedManifest = path.join(nestedDir, 'manifest.json');
        if (fs.existsSync(nestedManifest)) {
          // Di chuyển toàn bộ nội dung từ thư mục con ra thư mục cha
          const subFiles = fs.readdirSync(nestedDir);
          for (const subFile of subFiles) {
            fs.renameSync(path.join(nestedDir, subFile), path.join(extractPath, subFile));
          }
          fs.rmdirSync(nestedDir);
        }
      }
    }

    if (!fs.existsSync(manifestPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
      return c.json({ error: 'Invalid Extension: manifest.json is missing' }, 400);
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    let manifest: any;
    try {
      manifest = JSON.parse(manifestContent);
    } catch (e) {
      fs.rmSync(extractPath, { recursive: true, force: true });
      return c.json({ error: 'Failed to parse manifest.json' }, 400);
    }

    const name = manifest.name || 'Unknown Extension';
    const version = manifest.version || '1.0.0';

    const newExt = await extensionStore.createExtension({
      name,
      version,
      localPath: extractPath,
      status: 'active',
    });

    return c.json(newExt, 201);
  } catch (err: any) {
    console.error('[extensionController] Upload error:', err);
    return c.json({ error: 'Upload failed', details: err.message }, 500);
  }
}

export async function deleteExtension(c: Context) {
  const id = c.req.param('id');
  try {
    const success = await extensionStore.deleteExtension(id);
    if (!success) {
      return c.json({ error: 'Extension not found' }, 404);
    }
    return c.json({ success: true, message: 'Extension deleted successfully' });
  } catch (err: any) {
    return c.json({ error: 'Failed to delete extension', details: err.message }, 500);
  }
}
