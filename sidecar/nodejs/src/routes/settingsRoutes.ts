import { Hono } from 'hono';
import * as settingsController from '../controllers/settingsController.js';

const settingsRouter = new Hono();

settingsRouter.get('/', settingsController.getSettings);
settingsRouter.put('/', settingsController.updateSettings);

export { settingsRouter };
