import { Hono } from 'hono';
import * as proxyController from '../controllers/proxyController.js';

const proxyRouter = new Hono();

// CRUD Proxies
proxyRouter.get('/', proxyController.getProxies);
proxyRouter.post('/', proxyController.createProxy);
proxyRouter.put('/:id', proxyController.updateProxy);
proxyRouter.delete('/:id', proxyController.deleteProxy);

// Proxy Check Actions
proxyRouter.post('/test', proxyController.testProxy);
proxyRouter.post('/:id/check', proxyController.checkProxyById);
proxyRouter.post('/check-bulk', proxyController.checkProxiesBulk);

export { proxyRouter };
