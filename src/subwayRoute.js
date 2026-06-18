import { STATION_DISTRICTS, STATION_LINES } from './generated/seoulStationData.js';

const SEOUL_DISTRICT_PATTERN = /^[가-힣]+구$/;

const LINE_SEQUENCES = [
  ['서울', '시청', '종각', '종로3가', '종로5가', '동대문', '신설동', '제기동', '청량리', '동묘앞'],
  [
    '시청', '을지로입구', '을지로3가', '을지로4가', '동대문역사문화공원', '신당', '상왕십리',
    '왕십리', '한양대', '뚝섬', '성수', '건대입구', '구의', '강변', '잠실나루', '잠실',
    '잠실새내', '종합운동장', '삼성', '선릉', '역삼', '강남', '교대', '서초', '방배',
    '사당', '낙성대', '서울대입구', '봉천', '신림', '신대방', '구로디지털단지', '대림',
    '신도림', '문래', '영등포구청', '당산', '합정', '홍대입구', '신촌', '이대', '아현',
    '충정로', '시청',
  ],
  ['성수', '용답', '신답', '용두', '신설동'],
  ['신도림', '도림천', '양천구청', '신정네거리', '까치산'],
  [
    '지축', '구파발', '연신내', '불광', '녹번', '홍제', '무악재', '독립문', '경복궁',
    '안국', '종로3가', '을지로3가', '충무로', '동대입구', '약수', '금호', '옥수',
    '압구정', '신사', '잠원', '고속터미널', '교대', '남부터미널', '양재', '매봉',
    '도곡', '대치', '학여울', '대청', '일원', '수서', '가락시장', '경찰병원', '오금',
  ],
  [
    '불암산', '상계', '노원', '창동', '쌍문', '수유', '미아', '미아사거리', '길음',
    '성신여대입구', '한성대입구', '혜화', '동대문', '동대문역사문화공원', '충무로',
    '명동', '회현', '서울', '숙대입구', '삼각지', '신용산', '이촌', '동작',
    '총신대입구', '사당', '남태령',
  ],
  [
    '방화', '개화산', '김포공항', '송정', '마곡', '발산', '우장산', '화곡', '까치산',
    '신정', '목동', '오목교', '양평', '영등포구청', '영등포시장', '신길', '여의도',
    '여의나루', '마포', '공덕', '애오개', '충정로', '서대문', '광화문', '종로3가',
    '을지로4가', '동대문역사문화공원', '청구', '신금호', '행당', '왕십리', '마장',
    '답십리', '장한평', '군자', '아차산', '광나루', '천호', '강동',
  ],
  ['강동', '길동', '굽은다리', '명일', '고덕', '상일동', '강일', '미사', '하남풍산', '하남시청', '하남검단산'],
  ['강동', '둔촌동', '올림픽공원', '방이', '오금', '개롱', '거여', '마천'],
  ['응암', '역촌', '불광', '독바위', '연신내', '구산', '응암'],
  [
    '응암', '새절', '증산', '디지털미디어시티', '월드컵경기장', '마포구청', '망원',
    '합정', '상수', '광흥창', '대흥', '공덕', '효창공원앞', '삼각지', '녹사평',
    '이태원', '한강진', '버티고개', '약수', '청구', '신당', '동묘앞', '창신',
    '보문', '안암', '고려대', '월곡', '상월곡', '돌곶이', '석계', '태릉입구',
    '화랑대', '봉화산', '신내',
  ],
  [
    '장암', '도봉산', '수락산', '마들', '노원', '중계', '하계', '공릉', '태릉입구',
    '먹골', '중화', '상봉', '면목', '사가정', '용마산', '중곡', '군자', '어린이대공원',
    '건대입구', '뚝섬유원지', '청담', '강남구청', '학동', '논현', '반포', '고속터미널',
    '내방', '총신대입구', '남성', '숭실대입구', '상도', '장승배기', '신대방삼거리',
    '보라매', '신풍', '대림', '남구로', '가산디지털단지', '철산', '광명사거리',
    '천왕', '온수',
  ],
  [
    '암사', '암사역사공원역', '천호', '강동구청', '몽촌토성', '잠실', '석촌', '송파',
    '가락시장', '문정', '장지', '복정', '남위례', '산성', '남한산성입구', '단대오거리',
    '신흥', '수진', '모란',
  ],
];

export function normalizeStationName(name = '') {
  return name.replace(/\s+/g, ' ').replace(/\(.+?\)/g, '').trim();
}

function addEdge(graph, a, b) {
  if (!a || !b || a === b) return;
  if (!graph.has(a)) graph.set(a, new Set());
  if (!graph.has(b)) graph.set(b, new Set());
  graph.get(a).add(b);
  graph.get(b).add(a);
}

function buildGraph() {
  const graph = new Map();

  for (const sequence of LINE_SEQUENCES) {
    for (let index = 0; index < sequence.length - 1; index += 1) {
      addEdge(graph, sequence[index], sequence[index + 1]);
    }
  }

  return graph;
}

const SUBWAY_GRAPH = buildGraph();

function resolveStation(input) {
  const normalized = normalizeStationName(input);
  if (!normalized || !STATION_LINES[normalized]) {
    throw new Error(`지원하지 않는 역입니다: ${input}`);
  }
  return normalized;
}

function toStationResult(name) {
  return {
    name,
    district: STATION_DISTRICTS[name] ?? '',
    lines: STATION_LINES[name] ?? [],
  };
}

export function getStationOptions() {
  return Object.keys(STATION_LINES)
    .filter((name) => SEOUL_DISTRICT_PATTERN.test(STATION_DISTRICTS[name] ?? ''))
    .sort((a, b) => a.localeCompare(b, 'ko'))
    .map(toStationResult);
}

function collectRouteDistricts(stationNames) {
  const seen = new Set();

  return stationNames
    .map((name) => STATION_DISTRICTS[name])
    .filter((district) => SEOUL_DISTRICT_PATTERN.test(district ?? ''))
    .filter((district) => {
      if (seen.has(district)) return false;
      seen.add(district);
      return true;
    });
}

export function findSubwayRoute(startInput, endInput) {
  const start = resolveStation(startInput);
  const end = resolveStation(endInput);

  if (start === end) {
    return {
      start: toStationResult(start),
      end: toStationResult(end),
      stations: [toStationResult(start)],
      districts: collectRouteDistricts([start]),
    };
  }

  const queue = [start];
  const previous = new Map([[start, null]]);

  while (queue.length) {
    const current = queue.shift();
    if (current === end) break;

    for (const next of SUBWAY_GRAPH.get(current) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      queue.push(next);
    }
  }

  if (!previous.has(end)) {
    throw new Error(`경로를 찾지 못했습니다: ${startInput} → ${endInput}`);
  }

  const stationNames = [];
  for (let current = end; current; current = previous.get(current)) {
    stationNames.unshift(current);
  }

  return {
    start: toStationResult(start),
    end: toStationResult(end),
    stations: stationNames.map(toStationResult),
    districts: collectRouteDistricts(stationNames),
  };
}
