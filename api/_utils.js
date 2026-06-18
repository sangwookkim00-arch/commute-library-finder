export function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

export function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: message });
}

export function getRequestUrl(request) {
  return new URL(request.url ?? '/', `http://${request.headers?.host ?? 'localhost'}`);
}

export function parseDistrictsParam(value = '') {
  const seen = new Set();
  return value
    .split(',')
    .map((district) => district.trim())
    .filter(Boolean)
    .filter((district) => {
      if (seen.has(district)) return false;
      seen.add(district);
      return true;
    });
}
