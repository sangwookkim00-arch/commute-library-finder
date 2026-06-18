import test from 'node:test';
import assert from 'node:assert/strict';
import routeHandler from '../api/route.js';
import stationsHandler from '../api/stations.js';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value = '') {
      this.body = value;
    },
    json() {
      return JSON.parse(this.body);
    },
  };
}

test('Vercel stations API handler returns station options', async () => {
  const response = createMockResponse();

  await stationsHandler({ method: 'GET', url: '/api/stations', headers: { host: 'localhost' } }, response);

  const payload = response.json();
  assert.equal(response.statusCode, 200);
  assert.equal(payload.stations.some((station) => station.name === '강남'), true);
});

test('Vercel route API handler returns route districts', async () => {
  const response = createMockResponse();

  await routeHandler({
    method: 'GET',
    url: '/api/route?start=%EA%B0%95%EB%82%A8&end=%EA%B8%B8%EC%9D%8C',
    headers: { host: 'localhost' },
  }, response);

  const payload = response.json();
  assert.equal(response.statusCode, 200);
  assert.deepEqual(payload.route.districts, ['강남구', '서초구', '성동구', '중구', '종로구', '성북구']);
});
