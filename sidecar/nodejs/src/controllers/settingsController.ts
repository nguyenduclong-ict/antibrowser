import { Context } from 'hono';
import * as settingsStore from '../services/settingsStore.js';
import * as chromiumService from '../services/chromiumService.js';

export async function getSettings(c: Context) {
  try {
    const settings = await settingsStore.getSettings();
    return c.json(settings);
  } catch (err: any) {
    return c.json({ error: 'Failed to load settings', details: err.message }, 500);
  }
}

export async function updateSettings(c: Context) {
  try {
    const body = await c.req.json();
    const updated = await settingsStore.updateSettings(body);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: 'Failed to update settings', details: err.message }, 400);
  }
}

export async function getChromiumStatus(c: Context) {
  try {
    const status = await chromiumService.getChromiumStatus();
    return c.json(status);
  } catch (err: any) {
    return c.json({ error: 'Failed to get Chromium status', details: err.message }, 500);
  }
}

export async function downloadChromium(c: Context) {
  try {
    // Chạy tải Chromium trong background để tránh nghẽn HTTP request
    chromiumService.downloadChromium().catch((err) => {
      console.error('[SettingsController] Background Chromium download error:', err);
    });
    return c.json({ success: true, message: 'Đã bắt đầu tải Chromium Stealth trong background.' });
  } catch (err: any) {
    return c.json({ error: 'Failed to trigger Chromium download', details: err.message }, 500);
  }
}

export async function clearChromiumCache(c: Context) {
  try {
    await chromiumService.clearChromiumCache();
    return c.json({ success: true, message: 'Đã xóa cache Chromium thành công.' });
  } catch (err: any) {
    return c.json({ error: 'Failed to clear Chromium cache', details: err.message }, 500);
  }
}
