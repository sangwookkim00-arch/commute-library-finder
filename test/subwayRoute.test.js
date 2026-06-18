import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findSubwayRoute,
  getStationOptions,
  normalizeStationName,
} from '../src/subwayRoute.js';

test('normalizes station names by removing parenthetical aliases', () => {
  assert.equal(normalizeStationName('수유(강북구청)'), '수유');
  assert.equal(normalizeStationName('미아사거리 '), '미아사거리');
});

test('lists Seoul station options for line 1 to 8 routing', () => {
  const stations = getStationOptions();
  const names = stations.map((station) => station.name);

  assert.equal(names.includes('강남'), true);
  assert.equal(names.includes('길음'), true);
  assert.equal(stations.find((station) => station.name === '강남').district, '강남구');
});

test('finds route districts from Gangnam to Gireum', () => {
  const route = findSubwayRoute('강남', '길음');

  assert.equal(route.start.name, '강남');
  assert.equal(route.end.name, '길음');
  assert.deepEqual(route.districts, [
    '강남구',
    '서초구',
    '성동구',
    '중구',
    '종로구',
    '성북구',
  ]);
  assert.equal(route.stations.some((station) => station.name === '동대문역사문화공원'), true);
});

test('throws when a route station is unknown', () => {
  assert.throws(() => findSubwayRoute('강남', '없는역'), /지원하지 않는 역/);
});
