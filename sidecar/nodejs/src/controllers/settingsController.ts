import { Context } from 'hono';
import * as settingsStore from '../services/settingsStore.js';

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
