import { Context } from 'hono';
import * as proxyStore from '../services/proxyStore.js';
import { checkProxyConnection } from '../services/proxyService.js';

export async function getProxies(c: Context) {
  try {
    const proxies = await proxyStore.getProxies();
    return c.json(proxies);
  } catch (err: any) {
    return c.json({ error: 'Failed to load proxies', details: err.message }, 500);
  }
}

export async function createProxy(c: Context) {
  try {
    const body = await c.req.json();
    const newProxy = await proxyStore.createProxy(body);
    return c.json(newProxy, 201);
  } catch (err: any) {
    return c.json({ error: 'Invalid proxy data', details: err.message }, 400);
  }
}

export async function updateProxy(c: Context) {
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const updated = await proxyStore.updateProxy(id, body);
    if (!updated) {
      return c.json({ error: 'Proxy not found' }, 404);
    }
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: 'Update failed', details: err.message }, 400);
  }
}

export async function deleteProxy(c: Context) {
  const id = c.req.param('id');
  try {
    const success = await proxyStore.deleteProxy(id);
    if (!success) {
      return c.json({ error: 'Proxy not found' }, 404);
    }
    return c.json({ success: true, message: 'Proxy deleted successfully' });
  } catch (err: any) {
    return c.json({ error: 'Failed to delete proxy', details: err.message }, 500);
  }
}

/**
 * Kiểm tra kết nối trực tiếp cho proxy truyền vào từ client (không lưu vào DB)
 */
export async function testProxy(c: Context) {
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

/**
 * Kiểm tra 1 proxy cụ thể đã lưu bằng ID và cập nhật kết quả check vào DB
 */
export async function checkProxyById(c: Context) {
  const id = c.req.param('id');
  try {
    const proxy = await proxyStore.getProxy(id);
    if (!proxy) {
      return c.json({ error: 'Proxy not found' }, 404);
    }

    const startTime = Date.now();
    const result = await checkProxyConnection({
      proxyType: proxy.proxyType,
      proxyHost: proxy.proxyHost,
      proxyPort: proxy.proxyPort,
      proxyUsername: proxy.proxyUsername,
      proxyPassword: proxy.proxyPassword,
    });
    const ping = Date.now() - startTime;

    const updateData: Partial<typeof proxy> = {
      status: result.status,
      exitIp: result.ip || undefined,
      country: result.country || undefined,
      lastCheckedAt: Date.now(),
      ping: result.status === 'live' ? ping : undefined,
    };

    const updated = await proxyStore.updateProxy(id, updateData);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: 'Check failed', details: err.message }, 500);
  }
}

/**
 * Kiểm tra hàng loạt proxy theo danh sách ID song song
 */
export async function checkProxiesBulk(c: Context) {
  try {
    const { ids } = await c.req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'Invalid proxy IDs list' }, 400);
    }

    const checkPromises = ids.map(async (id) => {
      const proxy = await proxyStore.getProxy(id);
      if (!proxy) return { id, error: 'Not found' };

      try {
        const startTime = Date.now();
        const result = await checkProxyConnection({
          proxyType: proxy.proxyType,
          proxyHost: proxy.proxyHost,
          proxyPort: proxy.proxyPort,
          proxyUsername: proxy.proxyUsername,
          proxyPassword: proxy.proxyPassword,
        });
        const ping = Date.now() - startTime;

        const updateData = {
          status: result.status,
          exitIp: result.ip || '',
          country: result.country || '',
          lastCheckedAt: Date.now(),
          ping: result.status === 'live' ? ping : undefined,
        };

        const updated = await proxyStore.updateProxy(id, updateData);
        return updated;
      } catch (err: any) {
        const updated = await proxyStore.updateProxy(id, { status: 'dead', lastCheckedAt: Date.now() });
        return updated || { id, status: 'dead', error: err.message };
      }
    });

    const results = await Promise.all(checkPromises);
    return c.json(results);
  } catch (err: any) {
    return c.json({ error: 'Bulk check failed', details: err.message }, 500);
  }
}
