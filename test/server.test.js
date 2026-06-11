import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveStaticRequestPath } from '../src/server.js';

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

test('root page uses the hybrid mobile design assets', () => {
  const html = readFileSync(join(projectRoot, 'public', 'index.html'), 'utf8');

  assert.equal(html.includes('/hybrid/styles.css'), true);
  assert.equal(html.includes('/hybrid/app.js'), true);
  assert.equal(html.includes('오늘 빌릴 책, 가까운 도서관부터'), true);
});
