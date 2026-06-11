import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findAvailableLibraries, searchBooks } from './libraryApi.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = normalize(join(__dirname, '..', 'public'));
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: message });
}

async function handleApi(request, response, url) {
  try {
    if (url.pathname === '/api/books') {
      const keyword = url.searchParams.get('keyword') ?? '';
      if (!keyword.trim()) return sendError(response, 400, '책 제목을 입력해주세요.');
      const books = await searchBooks(keyword);
      return sendJson(response, 200, { books });
    }

    if (url.pathname === '/api/availability') {
      const isbn13 = url.searchParams.get('isbn13') ?? '';
      if (!isbn13.trim()) return sendError(response, 400, 'ISBN13이 필요합니다.');
      const libraries = await findAvailableLibraries(isbn13);
      return sendJson(response, 200, {
        libraries,
        message: libraries.length
          ? ''
          : '8개 구 안에서 현재 대출 가능한 도서관이 없습니다.',
      });
    }

    return sendError(response, 404, 'API 경로를 찾을 수 없습니다.');
  } catch (error) {
    return sendError(response, 502, error.message || '도서관 데이터를 가져오지 못했습니다.');
  }
}

async function serveStatic(response, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(publicDir, requestedPath));

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

export function createServer() {
  return createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(response, decodeURIComponent(url.pathname));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer().listen(port, () => {
    console.log(`Commute Library Finder running at http://localhost:${port}`);
  });
}
