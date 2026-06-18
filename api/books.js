import { searchBooks } from '../src/libraryApi.js';
import { getRequestUrl, sendError, sendJson } from './_utils.js';

export default async function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    return sendError(response, 405, '허용되지 않는 요청입니다.');
  }

  try {
    const url = getRequestUrl(request);
    const keyword = url.searchParams.get('keyword') ?? '';
    if (!keyword.trim()) return sendError(response, 400, '책 제목을 입력해주세요.');

    return sendJson(response, 200, { books: await searchBooks(keyword) });
  } catch (error) {
    return sendError(response, 502, error.message || '책 데이터를 가져오지 못했습니다.');
  }
}
