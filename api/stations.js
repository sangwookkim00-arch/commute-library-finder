import { getStationOptions } from '../src/subwayRoute.js';
import { sendError, sendJson } from './_utils.js';

export default async function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    return sendError(response, 405, '허용되지 않는 요청입니다.');
  }

  return sendJson(response, 200, { stations: getStationOptions() });
}
