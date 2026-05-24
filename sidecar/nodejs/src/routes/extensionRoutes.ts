import { Hono } from 'hono';
import * as extensionController from '../controllers/extensionController.js';

const extensionRouter = new Hono();

extensionRouter.get('/', extensionController.getExtensions);
extensionRouter.post('/upload', extensionController.uploadExtension);
extensionRouter.delete('/:id', extensionController.deleteExtension);

export { extensionRouter };
