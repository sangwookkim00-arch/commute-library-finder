import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer, parseDistrictsParam, resolveStaticRequestPath } from '../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

test('resolves root and design preview routes to index files', () => {
  assert.equal(resolveStaticRequestPath('/'), '/index.html');
  assert.equal(resolveStaticRequestPath('/react'), '/react/index.html');
  assert.equal(resolveStaticRequestPath('/react/'), '/react/index.html');
  assert.equal(resolveStaticRequestPath('/tailwind'), '/tailwind/index.html');
  assert.equal(resolveStaticRequestPath('/tailwind/'), '/tailwind/index.html');
  assert.equal(resolveStaticRequestPath('/hybrid'), '/hybrid/index.html');
  assert.equal(resolveStaticRequestPath('/hybrid/'), '/hybrid/index.html');
  assert.equal(resolveStaticRequestPath('/reference'), '/reference/index.html');
  assert.equal(resolveStaticRequestPath('/reference/'), '/reference/index.html');
});

test('preserves direct static asset paths', () => {
  assert.equal(resolveStaticRequestPath('/app.js'), '/app.js');
  assert.equal(resolveStaticRequestPath('/react/styles.css'), '/react/styles.css');
  assert.equal(resolveStaticRequestPath('/tailwind/index.html'), '/tailwind/index.html');
});

test('hybrid mobile design preview assets exist', () => {
  assert.equal(existsSync(join(projectRoot, 'public', 'hybrid', 'index.html')), true);
  assert.equal(existsSync(join(projectRoot, 'public', 'hybrid', 'app.js')), true);
  assert.equal(existsSync(join(projectRoot, 'public', 'hybrid', 'styles.css')), true);
});

test('reference-inspired mobile design preview assets exist', () => {
  const html = readFileSync(join(projectRoot, 'public', 'reference', 'index.html'), 'utf8');

  assert.equal(existsSync(join(projectRoot, 'public', 'reference', 'index.html')), true);
  assert.equal(existsSync(join(projectRoot, 'public', 'reference', 'app.js')), true);
  assert.equal(existsSync(join(projectRoot, 'public', 'reference', 'styles.css')), true);
  assert.equal(html.includes('1-8'), true);
  assert.equal(html.includes('출퇴근 도서관 책찾기'), true);
  assert.equal(html.includes('책 제목 또는 ISBN13'), true);
});

test('root page uses the reference mobile design assets', () => {
  const html = readFileSync(join(projectRoot, 'public', 'index.html'), 'utf8');

  assert.equal(html.includes('/reference/styles.css'), true);
  assert.equal(html.includes('/reference/app.js'), true);
  assert.equal(html.includes('startStation'), true);
  assert.equal(html.includes('endStation'), true);
  assert.equal(html.includes('내 경로 도서관만'), true);
});

test('parses selected route districts from query parameter', () => {
  assert.deepEqual(parseDistrictsParam('강남구,서초구,강남구'), ['강남구', '서초구']);
  assert.deepEqual(parseDistrictsParam(''), []);
});

test('serves station options and route districts', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const stationsResponse = await fetch(`http://localhost:${port}/api/stations`);
    const stationsPayload = await stationsResponse.json();
    assert.equal(stationsResponse.ok, true);
    assert.equal(stationsPayload.stations.some((station) => station.name === '강남'), true);

    const routeResponse = await fetch(`http://localhost:${port}/api/route?start=강남&end=길음`);
    const routePayload = await routeResponse.json();
    assert.equal(routeResponse.ok, true);
    assert.equal(routePayload.route.districts.includes('강남구'), true);
    assert.equal(routePayload.route.districts.includes('성북구'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
