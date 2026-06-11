export const TARGET_DISTRICTS = [
  '강남구',
  '서초구',
  '동작구',
  '용산구',
  '중구',
  '종로구',
  '성북구',
  '강북구',
];

const DEFAULT_BASE_URL = 'https://k-skill-proxy.nomadamas.org';
const SEOUL_REGION_CODE = '11';
const KYOBO_SEARCH_BASE_URL = 'https://search.kyobobook.co.kr/search';
const MAX_ENRICHED_ISBNS = 6;

export function getDistrictFromAddress(address = '') {
  return TARGET_DISTRICTS.find((district) => address.includes(district)) || '';
}

export function isTargetDistrict(address = '') {
  return Boolean(getDistrictFromAddress(address));
}

export function normalizeBookDocs(docs = []) {
  return docs
    .map((entry) => entry?.doc ?? entry)
    .filter((doc) => doc?.isbn13)
    .map((doc) => ({
      bookname: doc.bookname ?? '',
      authors: doc.authors ?? '',
      publisher: doc.publisher ?? '',
      publicationYear: doc.publication_year ?? doc.publicationYear ?? '',
      isbn13: doc.isbn13 ?? '',
      bookImageURL: doc.bookImageURL ?? '',
    }));
}

export function looksLikeIsbn13(value = '') {
  return value.replaceAll('-', '').trim().match(/^97[89]\d{10}$/) !== null;
}

function normalizeTitle(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function getTitleTokens(value = '') {
  return normalizeTitle(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function titleMatchesKeyword(title, keyword) {
  const titleText = normalizeTitle(title);
  const titleCompact = titleText.replaceAll(' ', '');
  const keywordText = normalizeTitle(keyword);
  const keywordCompact = keywordText.replaceAll(' ', '');
  const tokens = getTitleTokens(keyword);

  if (!tokens.length) return false;
  if (titleCompact.includes(keywordCompact)) return true;
  return tokens.every((token) => titleText.includes(token));
}

function normalizeBookDetail(detail = []) {
  return detail
    .map((entry) => entry?.book ?? entry)
    .filter((book) => book?.isbn13)
    .map((book) => ({
      bookname: book.bookname ?? '',
      authors: book.authors ?? '',
      publisher: book.publisher ?? '',
      publicationYear: book.publication_year ?? book.publicationYear ?? '',
      isbn13: book.isbn13 ?? '',
      bookImageURL: book.bookImageURL ?? '',
    }));
}

export function extractKyoboIsbnCandidates(html = '', keyword = '') {
  const candidates = [];
  const seen = new Set();
  const pattern = /data-bid="(97[89]\d{10})"[^>]*data-name="([^"]+)"/g;

  for (const match of html.matchAll(pattern)) {
    const [, isbn13, title] = match;
    if (!seen.has(isbn13) && titleMatchesKeyword(title, keyword)) {
      seen.add(isbn13);
      candidates.push(isbn13);
    }
  }

  return candidates.slice(0, MAX_ENRICHED_ISBNS);
}

export function mergeBooksByIsbn(...bookGroups) {
  const seen = new Set();
  const merged = [];

  for (const books of bookGroups) {
    for (const book of books) {
      if (!book?.isbn13 || seen.has(book.isbn13)) continue;
      seen.add(book.isbn13);
      merged.push(book);
    }
  }

  return merged;
}

export function keepLoanAvailable(rows = []) {
  return rows
    .filter((row) => {
      const availability = row.availability ?? {};
      const address = row.lib?.address ?? '';
      return (
        availability.hasBook === 'Y' &&
        availability.loanAvailable === 'Y' &&
        isTargetDistrict(address)
      );
    })
    .map((row) => {
      const lib = row.lib;
      return {
        libName: lib.libName ?? '',
        district: getDistrictFromAddress(lib.address ?? ''),
        address: lib.address ?? '',
        tel: lib.tel ?? '',
        homepage: lib.homepage ?? '',
        closed: lib.closed ?? '',
        operatingTime: lib.operatingTime ?? '',
        libCode: lib.libCode ?? '',
      };
    });
}

function getBaseUrl() {
  const configured = process.env.KSKILL_PROXY_BASE_URL || DEFAULT_BASE_URL;
  return configured.replace(/\/$/, '');
}

async function fetchJson(path, params) {
  const url = new URL(`${getBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Data4Library proxy failed: ${response.status}`);
  }
  return response.json();
}

async function fetchKyoboIsbnCandidates(keyword) {
  const url = new URL(KYOBO_SEARCH_BASE_URL);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('gbCode', 'TOT');
  url.searchParams.set('target', 'total');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) return [];

  const html = await response.text();
  return extractKyoboIsbnCandidates(html, keyword);
}

async function fetchBookDetailsByIsbns(isbn13s) {
  const details = await Promise.all(
    isbn13s.map(async (isbn13) => {
      try {
        const payload = await fetchJson('/v1/data4library/book-detail', {
          isbn13,
          loaninfoYN: 'Y',
        });
        return normalizeBookDetail(payload?.response?.detail ?? []);
      } catch {
        return [];
      }
    }),
  );

  return details.flat();
}

export async function searchBooks(keyword) {
  const trimmed = keyword?.trim();
  if (!trimmed) {
    throw new Error('검색어를 입력해주세요.');
  }

  if (looksLikeIsbn13(trimmed)) {
    const isbn13 = trimmed.replaceAll('-', '');
    const payload = await fetchJson('/v1/data4library/book-detail', {
      isbn13,
      loaninfoYN: 'Y',
    });
    return normalizeBookDetail(payload?.response?.detail ?? []);
  }

  const payload = await fetchJson('/v1/data4library/book-search', {
    keyword: trimmed,
    pageNo: 1,
    pageSize: 10,
  });

  const keywordBooks = normalizeBookDocs(payload?.response?.docs ?? []);
  const enrichedIsbns = await fetchKyoboIsbnCandidates(trimmed);
  const enrichedBooks = await fetchBookDetailsByIsbns(enrichedIsbns);

  return mergeBooksByIsbn(enrichedBooks, keywordBooks).slice(0, 10);
}

async function findHoldingLibraries(isbn13) {
  const payload = await fetchJson('/v1/data4library/libraries-by-book', {
    isbn: isbn13,
    region: SEOUL_REGION_CODE,
    pageNo: 1,
    pageSize: 300,
  });

  return (payload?.response?.libs ?? [])
    .map((entry) => entry?.lib ?? entry)
    .filter((lib) => lib?.libCode && isTargetDistrict(lib.address ?? ''));
}

async function checkLibraryAvailability(lib, isbn13) {
  const payload = await fetchJson('/v1/data4library/book-exists', {
    libraryCode: lib.libCode,
    isbn13,
  });

  return {
    lib,
    availability: payload?.response?.result ?? {},
  };
}

export async function findAvailableLibraries(isbn13) {
  const trimmed = isbn13?.trim();
  if (!trimmed) {
    throw new Error('ISBN13이 필요합니다.');
  }

  const libraries = await findHoldingLibraries(trimmed);
  const checks = await Promise.all(
    libraries.map((library) => checkLibraryAvailability(library, trimmed)),
  );

  return keepLoanAvailable(checks).sort((a, b) => {
    const districtCompare = TARGET_DISTRICTS.indexOf(a.district) - TARGET_DISTRICTS.indexOf(b.district);
    if (districtCompare !== 0) return districtCompare;
    return a.libName.localeCompare(b.libName, 'ko');
  });
}
