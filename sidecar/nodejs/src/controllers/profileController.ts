import { Context } from 'hono';
import * as profileStore from '../services/profileStore.js';
import * as browserService from '../services/browserService.js';
import { checkProxyConnection } from '../services/proxyService.js';
import { getIO } from '../sockets/socketManager.js';

/**
 * Lấy danh sách profiles kèm trạng thái Running / Stopped
 */
export async function getProfiles(c: Context) {
  try {
    const profiles = await profileStore.getProfiles();
    const mapped = profiles.map((p) => ({
      ...p,
      status: browserService.isBrowserRunning(p.id) ? 'Running' : 'Stopped',
    }));
    return c.json(mapped);
  } catch (err: any) {
    return c.json({ error: 'Failed to load profiles', details: err.message }, 500);
  }
}

/**
 * Tạo mới profile
 */
export async function createProfile(c: Context) {
  try {
    const body = await c.req.json();
    const newProfile = await profileStore.createProfile(body);
    return c.json({ ...newProfile, status: 'Stopped' }, 201);
  } catch (err: any) {
    return c.json({ error: 'Invalid profile data', details: err.message }, 400);
  }
}

/**
 * Cập nhật profile
 */
export async function updateProfile(c: Context) {
  const id = c.req.param('id');
  if (browserService.isBrowserRunning(id)) {
    return c.json({ error: 'Cannot update profile while it is running' }, 400);
  }
  
  try {
    const body = await c.req.json();
    const updated = await profileStore.updateProfile(id, body);
    if (!updated) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    return c.json({ ...updated, status: 'Stopped' });
  } catch (err: any) {
    return c.json({ error: 'Update failed', details: err.message }, 400);
  }
}

/**
 * Xóa profile
 */
export async function deleteProfile(c: Context) {
  const id = c.req.param('id');
  if (browserService.isBrowserRunning(id)) {
    return c.json({ error: 'Cannot delete profile while it is running' }, 400);
  }

  try {
    const success = await profileStore.deleteProfile(id);
    if (!success) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    return c.json({ success: true, message: 'Profile deleted successfully' });
  } catch (err: any) {
    return c.json({ error: 'Failed to delete profile', details: err.message }, 500);
  }
}

/**
 * Khởi chạy trình duyệt Stealth cho Profile
 */
export async function launchProfile(c: Context) {
  const id = c.req.param('id');
  if (browserService.isBrowserRunning(id)) {
    return c.json({ error: 'Profile is already running' }, 400);
  }

  try {
    const profile = await profileStore.getProfile(id);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Khởi chạy trình duyệt bất đồng bộ (browserService tự động quản lý trạng thái qua socket)
    await browserService.launchBrowser(profile);
    return c.json({ success: true, message: 'Browser launched successfully' });
  } catch (err: any) {
    console.error(`[ProfileController] Error launching profile ${id}:`, err);
    return c.json({ error: 'Launch failed', details: err.message }, 500);
  }
}

/**
 * Buộc dừng trình duyệt đang hoạt động
 */
export async function stopProfile(c: Context) {
  const id = c.req.param('id');
  if (!browserService.isBrowserRunning(id)) {
    return c.json({ error: 'Profile is not running' }, 400);
  }

  try {
    await browserService.stopBrowser(id);
    return c.json({ success: true, message: 'Browser stopped successfully' });
  } catch (err: any) {
    console.error(`[ProfileController] Error stopping profile ${id}:`, err);
    return c.json({ error: 'Stop failed', details: err.message }, 500);
  }
}

/**
 * Kiểm tra trạng thái proxy thời gian thực
 */
export async function checkProxy(c: Context) {
  try {
    const body = await c.req.json();
    const result = await checkProxyConnection(body);
    
    if (result.status === 'live') {
      return c.json({ status: 'live', ip: result.ip });
    } else {
      return c.json({ status: 'dead', error: result.error || 'Connection failed' }, 400);
    }
  } catch (err: any) {
    return c.json({ status: 'dead', error: err.message }, 400);
  }
}
