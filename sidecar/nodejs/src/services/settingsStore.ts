import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface SystemSettings {
  language: 'vi' | 'en';
  theme: 'dark' | 'light';
  defaultCacheDir: string;
}

const APPDATA_DIR = path.join(os.homedir(), '.tauri-antidetect-browser');
const SETTINGS_FILE = path.join(APPDATA_DIR, 'settings.json');

const DEFAULT_SETTINGS: SystemSettings = {
  language: 'vi',
  theme: 'dark',
  defaultCacheDir: path.join(APPDATA_DIR, 'profiles_data'),
};

/**
 * Đảm bảo file database settings.json tồn tại
 */
export function ensureStore(): void {
  try {
    if (!fs.existsSync(APPDATA_DIR)) {
      fs.mkdirSync(APPDATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      console.log(`[settingsStore] Created settings.json file at: ${SETTINGS_FILE}`);
    }
  } catch (err) {
    console.error('[settingsStore] Error ensuring settings store:', err);
  }
}

/**
 * Đọc cấu hình settings
 */
export async function getSettings(): Promise<SystemSettings> {
  ensureStore();
  try {
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content) as SystemSettings;
  } catch (err) {
    console.error('[settingsStore] Error reading settings.json:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Lưu lại cấu hình settings
 */
export async function saveSettings(settings: SystemSettings): Promise<void> {
  ensureStore();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[settingsStore] Error saving settings.json:', err);
  }
}

/**
 * Cập nhật cấu hình settings
 */
export async function updateSettings(settingsData: Partial<SystemSettings>): Promise<SystemSettings> {
  const current = await getSettings();
  const updated: SystemSettings = {
    ...current,
    ...settingsData,
  };
  await saveSettings(updated);
  console.log('[settingsStore] Settings updated successfully.');
  return updated;
}
