import { findSubwayRoute } from '../src/subwayRoute.js';
import { getRequestUrl, sendError, sendJson } from './_utils.js';

export default async function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    return sendError(response, 405, '허용되지 않는 요청입니다.');
  }

  try {
    const url = getRequestUrl(request);
    const start = url.searchParams.get('start') ?? '';
    const end = url.searchParams.get('end') ?? '';

    if (!start.trim() || !end.trim()) {
      return sendError(response, 400, '출발역과 도착역을 선택해주세요.');
    }

    return sendJson(response, 200, { route: findSubwayRoute(start, end) });
  } catch (error) {
    return sendError(response, 400, error.message || '경로를 계산하지 못했습니다.');
  }
}
