import { Hono } from 'hono';
import * as settingsController from '../controllers/settingsController.js';

const settingsRouter = new Hono();

settingsRouter.get('/', settingsController.getSettings);
settingsRouter.put('/', settingsController.updateSettings);

// Chromium binary endpoints
settingsRouter.get('/chromium-status', settingsController.getChromiumStatus);
settingsRouter.post('/download-chromium', settingsController.downloadChromium);
settingsRouter.post('/clear-chromium-cache', settingsController.clearChromiumCache);

export { settingsRouter };
