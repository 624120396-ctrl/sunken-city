import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import stageAssetDeliveryRoutes from '../src/modules/rooms/stage/stage-asset-delivery.routes.ts';

async function withDeliveryApp(run: (baseUrl: string) => Promise<void>) {
  const previous = { baseUrl: process.env.STAGE_ASSET_DELIVERY_BASE_URL, origin: process.env.STAGE_ASSET_ALLOWED_ORIGIN, secret: process.env.STAGE_ASSET_DELIVERY_SECRET };
  process.env.STAGE_ASSET_DELIVERY_BASE_URL = 'https://stage-assets.test/delivery';
  process.env.STAGE_ASSET_ALLOWED_ORIGIN = 'https://allowed.test';
  process.env.STAGE_ASSET_DELIVERY_SECRET = 'test-secret';
  const app = express();
  app.set('trust proxy', true);
  // A mismatched real app-wide CLIENT_URL CORS policy runs first. preflightContinue
  // models the header mutation while allowing the delivery router to make the decision.
  app.use(cors({ origin: 'https://client.test', credentials: true, preflightContinue: true }));
  app.use('/api/stage-assets', stageAssetDeliveryRoutes);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('server address unavailable');
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    process.env.STAGE_ASSET_DELIVERY_BASE_URL = previous.baseUrl;
    process.env.STAGE_ASSET_ALLOWED_ORIGIN = previous.origin;
    process.env.STAGE_ASSET_DELIVERY_SECRET = previous.secret;
  }
}

async function request(baseUrl: string, method: 'GET' | 'HEAD' | 'OPTIONS', host: string, origin?: string) {
  return fetch(`${baseUrl}/api/stage-assets/delivery/asset-1`, { method, headers: { Host: host, 'X-Forwarded-Host': host, 'X-Forwarded-Proto': 'https', ...(origin ? { Origin: origin } : {}) } });
}

test('delivery CORS fails closed after an earlier global CORS middleware for OPTIONS, GET, and HEAD', async () => {
  await withDeliveryApp(async (baseUrl) => {
    const optionsWrongHost = await request(baseUrl, 'OPTIONS', 'coc.city', 'https://allowed.test');
    assert.equal(optionsWrongHost.status, 403);
    assert.equal(optionsWrongHost.headers.get('access-control-allow-origin'), null);
    assert.equal(optionsWrongHost.headers.get('access-control-allow-credentials'), null);

    const optionsEvilOrigin = await request(baseUrl, 'OPTIONS', 'stage-assets.test', 'https://evil.test');
    assert.equal(optionsEvilOrigin.status, 403);
    assert.equal(optionsEvilOrigin.headers.get('access-control-allow-origin'), null);
    assert.equal(optionsEvilOrigin.headers.get('access-control-allow-credentials'), null);

    const optionsAllowed = await request(baseUrl, 'OPTIONS', 'stage-assets.test', 'https://allowed.test');
    assert.equal(optionsAllowed.status, 204);
    assert.equal(optionsAllowed.headers.get('access-control-allow-origin'), 'https://allowed.test');
    assert.equal(optionsAllowed.headers.get('access-control-allow-credentials'), null);

    for (const method of ['GET', 'HEAD'] as const) {
      const allowed = await request(baseUrl, method, 'stage-assets.test', 'https://allowed.test');
      assert.equal(allowed.status, 403);
      assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://allowed.test');
      assert.equal(allowed.headers.get('access-control-allow-credentials'), null);
      const denied = await request(baseUrl, method, 'stage-assets.test', 'https://evil.test');
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.get('access-control-allow-origin'), null);
      assert.equal(denied.headers.get('access-control-allow-credentials'), null);
    }
  });
});
