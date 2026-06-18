import { findAvailableLibraries } from '../src/libraryApi.js';
import { getRequestUrl, parseDistrictsParam, sendError, sendJson } from './_utils.js';

export default async function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    return sendError(response, 405, '허용되지 않는 요청입니다.');
  }

  try {
    const url = getRequestUrl(request);
    const isbn13 = url.searchParams.get('isbn13') ?? '';
    if (!isbn13.trim()) return sendError(response, 400, 'ISBN13이 필요합니다.');

    const districts = parseDistrictsParam(url.searchParams.get('districts') ?? '');
    const libraries = await findAvailableLibraries(isbn13, districts);

    return sendJson(response, 200, {
      libraries,
      message: libraries.length
        ? ''
        : '선택한 경로의 구 안에서 현재 대출 가능한 도서관이 없습니다.',
    });
  } catch (error) {
    return sendError(response, 502, error.message || '도서관 데이터를 가져오지 못했습니다.');
  }
}
