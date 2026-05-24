import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { BrowserProfile } from '../types/profile.js';

const APPDATA_DIR = path.join(os.homedir(), '.tauri-antidetect-browser');
const PROFILES_FILE = path.join(APPDATA_DIR, 'profiles.json');
export const PROFILES_DATA_DIR = path.join(APPDATA_DIR, 'profiles_data');

/**
 * Đảm bảo thư mục lưu trữ và file database tồn tại
 */
export function ensureStore(): void {
  try {
    if (!fs.existsSync(APPDATA_DIR)) {
      fs.mkdirSync(APPDATA_DIR, { recursive: true });
      console.log(`[profileStore] Created app data directory at: ${APPDATA_DIR}`);
    }
    if (!fs.existsSync(PROFILES_DATA_DIR)) {
      fs.mkdirSync(PROFILES_DATA_DIR, { recursive: true });
      console.log(`[profileStore] Created profiles data directory at: ${PROFILES_DATA_DIR}`);
    }
    if (!fs.existsSync(PROFILES_FILE)) {
      fs.writeFileSync(PROFILES_FILE, JSON.stringify([], null, 2), 'utf-8');
      console.log(`[profileStore] Created profiles.json file at: ${PROFILES_FILE}`);
    }
  } catch (err) {
    console.error('[profileStore] Error ensuring store directories:', err);
  }
}

/**
 * Đọc toàn bộ danh sách profiles
 */
export async function getProfiles(): Promise<BrowserProfile[]> {
  ensureStore();
  try {
    const content = fs.readFileSync(PROFILES_FILE, 'utf-8');
    return JSON.parse(content) as BrowserProfile[];
  } catch (err) {
    console.error('[profileStore] Error reading profiles.json:', err);
    return [];
  }
}

/**
 * Lấy 1 profile cụ thể theo id
 */
export async function getProfile(id: string): Promise<BrowserProfile | null> {
  const profiles = await getProfiles();
  const found = profiles.find((p) => p.id === id);
  return found || null;
}

/**
 * Ghi toàn bộ danh sách profiles
 */
export async function saveProfiles(profiles: BrowserProfile[]): Promise<void> {
  ensureStore();
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
  } catch (err) {
    console.error('[profileStore] Error saving profiles.json:', err);
  }
}

/**
 * Tạo mới 1 profile
 */
export async function createProfile(profileData: Omit<BrowserProfile, 'id' | 'createdAt'> & { id?: string }): Promise<BrowserProfile> {
  const profiles = await getProfiles();
  
  const id = profileData.id || crypto.randomUUID();
  const createdAt = Date.now();
  const seed = profileData.seed || String(Math.floor(Math.random() * 90000) + 10000); // 10000 - 99999

  const newProfile: BrowserProfile = {
    ...profileData,
    id,
    createdAt,
    seed,
  };

  profiles.push(newProfile);
  await saveProfiles(profiles);
  console.log(`[profileStore] Profile created successfully: ${newProfile.name} (ID: ${newProfile.id})`);
  return newProfile;
}

/**
 * Cập nhật 1 profile
 */
export async function updateProfile(id: string, profileData: Partial<BrowserProfile>): Promise<BrowserProfile | null> {
  const profiles = await getProfiles();
  const index = profiles.findIndex((p) => p.id === id);
  
  if (index === -1) {
    return null;
  }

  const updatedProfile: BrowserProfile = {
    ...profiles[index]!,
    ...profileData,
    id, // Khóa ID không đổi
    createdAt: profiles[index]!.createdAt, // Giữ ngày tạo gốc
  };

  profiles[index] = updatedProfile;
  await saveProfiles(profiles);
  console.log(`[profileStore] Profile updated successfully: ${updatedProfile.name} (ID: ${id})`);
  return updatedProfile;
}

/**
 * Xóa 1 profile (bao gồm cấu hình và toàn bộ thư mục cache của nó)
 */
export async function deleteProfile(id: string): Promise<boolean> {
  const profiles = await getProfiles();
  const filtered = profiles.filter((p) => p.id !== id);
  
  if (profiles.length === filtered.length) {
    return false; // Không tìm thấy để xóa
  }

  await saveProfiles(filtered);

  // Xóa thư mục lưu trữ cache của profile đó
  const profileDir = path.join(PROFILES_DATA_DIR, id);
  try {
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
      console.log(`[profileStore] Deleted browser cache directory for profile: ${id}`);
    }
  } catch (err) {
    console.error(`[profileStore] Error deleting browser cache directory at ${profileDir}:`, err);
  }

  console.log(`[profileStore] Profile configuration deleted: ${id}`);
  return true;
}

/**
 * Trả về đường dẫn tuyệt đối của thư mục lưu dữ liệu của một profile
 */
export function getProfileDataDir(id: string): string {
  return path.join(PROFILES_DATA_DIR, id);
}
