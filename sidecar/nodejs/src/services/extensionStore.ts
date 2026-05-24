import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { ExtensionEntry } from '../types/extension.js';

const APPDATA_DIR = path.join(os.homedir(), '.tauri-antidetect-browser');
const EXTENSIONS_FILE = path.join(APPDATA_DIR, 'extensions.json');
export const EXTENSIONS_DATA_DIR = path.join(APPDATA_DIR, 'extensions');

/**
 * Đảm bảo các thư mục lưu trữ và file database extensions.json tồn tại
 */
export function ensureStore(): void {
  try {
    if (!fs.existsSync(APPDATA_DIR)) {
      fs.mkdirSync(APPDATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(EXTENSIONS_DATA_DIR)) {
      fs.mkdirSync(EXTENSIONS_DATA_DIR, { recursive: true });
      console.log(`[extensionStore] Created extensions folder at: ${EXTENSIONS_DATA_DIR}`);
    }
    if (!fs.existsSync(EXTENSIONS_FILE)) {
      fs.writeFileSync(EXTENSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
      console.log(`[extensionStore] Created extensions.json file at: ${EXTENSIONS_FILE}`);
    }
  } catch (err) {
    console.error('[extensionStore] Error ensuring store directories:', err);
  }
}

/**
 * Đọc danh sách extensions
 */
export async function getExtensions(): Promise<ExtensionEntry[]> {
  ensureStore();
  try {
    const content = fs.readFileSync(EXTENSIONS_FILE, 'utf-8');
    return JSON.parse(content) as ExtensionEntry[];
  } catch (err) {
    console.error('[extensionStore] Error reading extensions.json:', err);
    return [];
  }
}

/**
 * Lấy 1 extension cụ thể theo id
 */
export async function getExtension(id: string): Promise<ExtensionEntry | null> {
  const extensions = await getExtensions();
  const found = extensions.find((e) => e.id === id);
  return found || null;
}

/**
 * Ghi toàn bộ danh sách extensions
 */
export async function saveExtensions(extensions: ExtensionEntry[]): Promise<void> {
  ensureStore();
  try {
    fs.writeFileSync(EXTENSIONS_FILE, JSON.stringify(extensions, null, 2), 'utf-8');
  } catch (err) {
    console.error('[extensionStore] Error saving extensions.json:', err);
  }
}

/**
 * Thêm mới tiện ích vào database
 */
export async function createExtension(extensionData: Omit<ExtensionEntry, 'id' | 'createdAt'> & { id?: string }): Promise<ExtensionEntry> {
  const extensions = await getExtensions();
  
  const id = extensionData.id || crypto.randomUUID();
  const createdAt = Date.now();

  const newExtension: ExtensionEntry = {
    ...extensionData,
    id,
    createdAt,
  };

  extensions.push(newExtension);
  await saveExtensions(extensions);
  console.log(`[extensionStore] Extension added: ${newExtension.name} v${newExtension.version} (ID: ${newExtension.id})`);
  return newExtension;
}

/**
 * Xóa tiện ích khỏi database và xóa thư mục mã nguồn tương ứng
 */
export async function deleteExtension(id: string): Promise<boolean> {
  const extensions = await getExtensions();
  const found = extensions.find((e) => e.id === id);
  if (!found) return false;

  const filtered = extensions.filter((e) => e.id !== id);
  await saveExtensions(filtered);

  // Xóa thư mục chứa extension giải nén
  const extDir = found.localPath;
  try {
    if (fs.existsSync(extDir)) {
      fs.rmSync(extDir, { recursive: true, force: true });
      console.log(`[extensionStore] Deleted local folder for extension: ${id}`);
    }
  } catch (err) {
    console.error(`[extensionStore] Error deleting local folder at ${extDir}:`, err);
  }

  console.log(`[extensionStore] Extension deleted: ${id}`);
  return true;
}
