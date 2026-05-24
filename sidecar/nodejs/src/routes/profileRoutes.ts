import { Hono } from 'hono';
import * as profileController from '../controllers/profileController.js';

const profileRouter = new Hono();

// CRUD Profiles
profileRouter.get('/', profileController.getProfiles);
profileRouter.post('/', profileController.createProfile);
profileRouter.put('/:id', profileController.updateProfile);
profileRouter.delete('/:id', profileController.deleteProfile);

// Profile Actions (Launch / Stop)
profileRouter.post('/:id/launch', profileController.launchProfile);
profileRouter.post('/:id/stop', profileController.stopProfile);

// Realtime Proxy Connection Checker
profileRouter.post('/check-proxy', profileController.checkProxy);

export { profileRouter };
