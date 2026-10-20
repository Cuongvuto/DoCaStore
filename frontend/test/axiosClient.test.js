import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { createServer as createViteServer } from 'vite';

test('API client sends banner files as multipart and ordinary requests as JSON', async t => {
  const vite = await createViteServer({
    configFile: false,
    server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const requests = [];
  const server = createHttpServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ method: req.method, headers: req.headers, body: Buffer.concat(chunks) });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"success":true}');
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'test-token' } });
  t.after(() => {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
  });
  const { default: client } = await vite.ssrLoadModule('/src/api/axiosClient.js');
  const config = { baseURL: `http://127.0.0.1:${server.address().port}`, proxy: false };
  const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  for (const method of ['post', 'put']) {
    const body = new FormData();
    body.append('title', 'Banner mới');
    body.append('isActive', 'true');
    body.append('image', new Blob([bytes], { type: 'image/png' }), 'banner.png');
    await client[method]('/banners', body, config);
    const sent = requests.at(-1);
    assert.equal(sent.method, method.toUpperCase());
    assert.equal(sent.headers.authorization, 'Bearer test-token');
    assert.match(sent.headers['content-type'], /^multipart\/form-data; boundary=/);
    const parsed = await new Response(sent.body, { headers: { 'Content-Type': sent.headers['content-type'] } }).formData();
    assert.equal(parsed.get('title'), 'Banner mới');
    assert.equal(parsed.get('isActive'), 'true');
    assert.equal(parsed.get('image').name, 'banner.png');
    assert.deepEqual(new Uint8Array(await parsed.get('image').arrayBuffer()), bytes);
  }
  await client.post('/notifications/admin', { title: 'Thông báo' }, config);
  assert.match(requests.at(-1).headers['content-type'], /^application\/json/);
  assert.deepEqual(JSON.parse(requests.at(-1).body), { title: 'Thông báo' });
});
