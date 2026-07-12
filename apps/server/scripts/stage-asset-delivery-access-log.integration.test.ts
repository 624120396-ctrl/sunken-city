import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import morgan from 'morgan';
import { stageAssetDeliveryAuditMetadata, shouldSkipStageAssetDeliveryAccessLog } from '../src/modules/rooms/stage/stage-asset-delivery.ts';

async function withAccessLogApp(run: (baseUrl: string, logs: string[]) => Promise<void>) {
  const logs: string[] = [];
  const app = express();
  app.use(morgan('combined', { stream: { write: (line) => logs.push(line) }, skip: shouldSkipStageAssetDeliveryAccessLog }));
  app.all('/api/stage-assets/delivery/*', (_req, res) => res.status(403).end());
  app.get('/api/health-log-test', (_req, res) => res.status(200).json({ ok: true }));
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('server address unavailable');
    await run(`http://127.0.0.1:${address.port}`, logs);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function rawRequest(baseUrl: string, path: string) {
  const url = new URL(baseUrl);
  return new Promise<void>((resolve, reject) => {
    const request = http.request({ hostname: url.hostname, port: url.port, path, method: 'GET' }, (response) => { response.resume(); response.on('end', resolve); });
    request.on('error', reject);
    request.end();
  });
}

test('morgan skips every delivery URL variant without logging bearer query metadata while ordinary APIs remain logged', async () => {
  await withAccessLogApp(async (baseUrl, logs) => {
    const deliveryUrls = [
      '/api/stage-assets/delivery/asset-valid?v=1&e=999&u=user-1&sig=super-secret',
      '/api/stage-assets/delivery/asset-tampered?signature=altered&exp=999',
      '/api/stage-assets/delivery/asset-expired?e=1&sig=expired',
      '/api/stage-assets/delivery/asset-unsigned?u=user-1',
      '/api/stage-assets/delivery/asset-wrong-host?sig=host-secret',
      '/api/stage-assets/delivery/asset-wrong-origin?sig=origin-secret',
    ];
    for (const url of deliveryUrls) await fetch(`${baseUrl}${url}`);
    await rawRequest(baseUrl, '/api/stage-assets/delivery/../server.env?sig=traversal-secret&e=1&u=user-1');
    await fetch(`${baseUrl}/api/health-log-test?ordinary=yes`);
    const joined = logs.join('');
    assert.doesNotMatch(joined, /sig=|signature=|exp=|\?v=|ordinary=no/);
    assert.match(joined, /\/api\/health-log-test\?ordinary=yes/);
    assert.equal(logs.some((line) => line.includes('/api/stage-assets/delivery/')), false);
    const metadata = stageAssetDeliveryAuditMetadata({ assetId: 'asset-1', status: 403 });
    assert.equal(JSON.stringify(metadata).includes('asset-1'), false);
    assert.deepEqual(Object.keys(metadata).sort(), ['assetIdDigest', 'status']);
  });
});
