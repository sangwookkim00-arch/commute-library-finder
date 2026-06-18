import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'src', 'generated', 'seoulStationData.js');
const downloadUrl = 'https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?&useCache=false';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function normalizeStationName(name = '') {
  return name.replace(/\s+/g, ' ').replace(/\(.+?\)/g, '').trim();
}

function getDistrict(address = '') {
  const match = address.match(/^서울특별시\s+([^\s]+)/);
  return match?.[1] ?? '';
}

async function downloadCsv() {
  const body = new URLSearchParams({
    infId: 'OA-12035',
    seq: '11',
    infSeq: '1',
  });

  const response = await fetch(downloadUrl, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Seoul station CSV download failed: ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return new TextDecoder('euc-kr').decode(bytes);
}

function buildStationData(csvText) {
  const [, ...rows] = parseCsv(csvText);
  const districts = {};
  const lines = {};

  for (const row of rows) {
    const [, , line, rawName, , roadAddress] = row;
    const name = normalizeStationName(rawName);
    const district = getDistrict(roadAddress);

    if (!name || !line) continue;
    if (district && !districts[name]) districts[name] = district;
    if (!lines[name]) lines[name] = [];
    if (!lines[name].includes(line)) lines[name].push(line);
  }

  const sortedDistricts = Object.fromEntries(
    Object.entries(districts).sort(([a], [b]) => a.localeCompare(b, 'ko')),
  );
  const sortedLines = Object.fromEntries(
    Object.entries(lines)
      .sort(([a], [b]) => a.localeCompare(b, 'ko'))
      .map(([station, stationLines]) => [station, stationLines.sort((a, b) => Number(a) - Number(b))]),
  );

  return { sortedDistricts, sortedLines };
}

async function main() {
  const csvText = await downloadCsv();
  const { sortedDistricts, sortedLines } = buildStationData(csvText);
  const content = `// Generated from Seoul Open Data Plaza OA-12035 station address CSV.
// Source: https://data.seoul.go.kr/dataList/OA-12035/A/1/datasetView.do
// Do not edit by hand. Run: node scripts/generate-seoul-station-data.js

export const STATION_DISTRICTS = ${JSON.stringify(sortedDistricts, null, 2)};

export const STATION_LINES = ${JSON.stringify(sortedLines, null, 2)};
`;

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, 'utf8');
}

await main();
