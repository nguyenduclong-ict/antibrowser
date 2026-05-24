import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { ProxyEntry } from '../types/proxy.js';

const APPDATA_DIR = path.join(os.homedir(), '.tauri-antidetect-browser');
const PROXIES_FILE = path.join(APPDATA_DIR, 'proxies.json');

/**
 * Đảm bảo file database proxies.json tồn tại
 */
export function ensureStore(): void {
  try {
    if (!fs.existsSync(APPDATA_DIR)) {
      fs.mkdirSync(APPDATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(PROXIES_FILE)) {
      fs.writeFileSync(PROXIES_FILE, JSON.stringify([], null, 2), 'utf-8');
      console.log(`[proxyStore] Created proxies.json file at: ${PROXIES_FILE}`);
    }
  } catch (err) {
    console.error('[proxyStore] Error ensuring store directories:', err);
  }
}

/**
 * Đọc toàn bộ danh sách proxies
 */
export async function getProxies(): Promise<ProxyEntry[]> {
  ensureStore();
  try {
    const content = fs.readFileSync(PROXIES_FILE, 'utf-8');
    return JSON.parse(content) as ProxyEntry[];
  } catch (err) {
    console.error('[proxyStore] Error reading proxies.json:', err);
    return [];
  }
}

/**
 * Lấy 1 proxy cụ thể theo id
 */
export async function getProxy(id: string): Promise<ProxyEntry | null> {
  const proxies = await getProxies();
  const found = proxies.find((p) => p.id === id);
  return found || null;
}

/**
 * Ghi toàn bộ danh sách proxies
 */
export async function saveProxies(proxies: ProxyEntry[]): Promise<void> {
  ensureStore();
  try {
    fs.writeFileSync(PROXIES_FILE, JSON.stringify(proxies, null, 2), 'utf-8');
  } catch (err) {
    console.error('[proxyStore] Error saving proxies.json:', err);
  }
}

/**
 * Tạo mới 1 proxy
 */
export async function createProxy(proxyData: Omit<ProxyEntry, 'id' | 'status'> & { id?: string; status?: 'unknown' | 'live' | 'dead' }): Promise<ProxyEntry> {
  const proxies = await getProxies();
  
  const id = proxyData.id || crypto.randomUUID();
  const status = proxyData.status || 'unknown';

  const newProxy: ProxyEntry = {
    ...proxyData,
    id,
    status,
  };

  proxies.push(newProxy);
  await saveProxies(proxies);
  console.log(`[proxyStore] Proxy created successfully: ${newProxy.name} (ID: ${newProxy.id})`);
  return newProxy;
}

/**
 * Cập nhật 1 proxy
 */
export async function updateProxy(id: string, proxyData: Partial<ProxyEntry>): Promise<ProxyEntry | null> {
  const proxies = await getProxies();
  const index = proxies.findIndex((p) => p.id === id);
  
  if (index === -1) {
    return null;
  }

  const updatedProxy: ProxyEntry = {
    ...proxies[index]!,
    ...proxyData,
    id, // Khóa ID không đổi
  };

  proxies[index] = updatedProxy;
  await saveProxies(proxies);
  console.log(`[proxyStore] Proxy updated successfully: ${updatedProxy.name} (ID: ${id})`);
  return updatedProxy;
}

/**
 * Xóa 1 proxy
 */
export async function deleteProxy(id: string): Promise<boolean> {
  const proxies = await getProxies();
  const filtered = proxies.filter((p) => p.id !== id);
  
  if (proxies.length === filtered.length) {
    return false; // Không tìm thấy để xóa
  }

  await saveProxies(filtered);
  console.log(`[proxyStore] Proxy configuration deleted: ${id}`);
  return true;
}
