import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDistrictFromAddress,
  isTargetDistrict,
  keepLoanAvailable,
  normalizeBookDocs,
  looksLikeIsbn13,
  extractKyoboIsbnCandidates,
  mergeBooksByIsbn,
} from '../src/libraryApi.js';

test('detects target districts from Seoul addresses', () => {
  assert.equal(getDistrictFromAddress('서울특별시 강남구 자곡로 116'), '강남구');
  assert.equal(getDistrictFromAddress('서울특별시 성북구 아리랑로 82'), '성북구');
  assert.equal(isTargetDistrict('서울특별시 성북구 아리랑로 82'), true);
  assert.equal(isTargetDistrict('서울특별시 마포구 월드컵로 212'), false);
});

test('normalizes Data4Library book docs', () => {
  const docs = [
    {
      doc: {
        bookname: '아들러 아저씨네 심리 성형외과',
        authors: '예영',
        publisher: '주니어김영사',
        publication_year: '2022',
        isbn13: '9788934943013',
      },
    },
  ];

  assert.deepEqual(normalizeBookDocs(docs), [
    {
      bookname: '아들러 아저씨네 심리 성형외과',
      authors: '예영',
      publisher: '주니어김영사',
      publicationYear: '2022',
      isbn13: '9788934943013',
      bookImageURL: '',
    },
  ]);
});

test('keeps only target-district loan-available library records', () => {
  const rows = [
    {
      lib: {
        libName: '강남 가능 도서관',
        address: '서울특별시 강남구 자곡로 116',
      },
      availability: { hasBook: 'Y', loanAvailable: 'Y' },
    },
    {
      lib: {
        libName: '강남 대출중 도서관',
        address: '서울특별시 강남구 자곡로 116',
      },
      availability: { hasBook: 'Y', loanAvailable: 'N' },
    },
    {
      lib: {
        libName: '마포 가능 도서관',
        address: '서울특별시 마포구 월드컵로 212',
      },
      availability: { hasBook: 'Y', loanAvailable: 'Y' },
    },
  ];

  const kept = keepLoanAvailable(rows);

  assert.equal(kept.length, 1);
  assert.equal(kept[0].libName, '강남 가능 도서관');
  assert.equal(kept[0].district, '강남구');
});

test('keeps loan-available libraries only in selected route districts', () => {
  const rows = [
    {
      lib: {
        libName: '성북 가능 도서관',
        address: '서울특별시 성북구 아리랑로 82',
      },
      availability: { hasBook: 'Y', loanAvailable: 'Y' },
    },
    {
      lib: {
        libName: '강북 가능 도서관',
        address: '서울특별시 강북구 삼양로 313',
      },
      availability: { hasBook: 'Y', loanAvailable: 'Y' },
    },
  ];

  const kept = keepLoanAvailable(rows, ['성북구']);

  assert.equal(kept.length, 1);
  assert.equal(kept[0].libName, '성북 가능 도서관');
  assert.equal(kept[0].district, '성북구');
});

test('detects ISBN13 queries with or without hyphens', () => {
  assert.equal(looksLikeIsbn13('9788934943013'), true);
  assert.equal(looksLikeIsbn13('978-893-4943013'), true);
  assert.equal(looksLikeIsbn13('아들러 아저씨네'), false);
});

test('extracts ISBN13 candidates from Kyobo search HTML by matching title words', () => {
  const html = `
    <div data-bid="9791168091917" data-name="자본주의 편의점 3: 소비와 마케팅"></div>
    <div data-bid="9788957365793" data-name="EBS 다큐프라임 자본주의"></div>
    <div data-bid="9791161571188" data-name="불편한 편의점"></div>
    <div data-bid="9791168091504" data-name="자본주의 편의점 1: 돈과 신용"></div>
  `;

  assert.deepEqual(extractKyoboIsbnCandidates(html, '자본주의 편의점'), [
    '9791168091917',
    '9791168091504',
  ]);
});

test('merges enriched ISBN details ahead of noisy Data4Library keyword results', () => {
  const noisyBooks = normalizeBookDocs([
    {
      doc: {
        bookname: '불편한 편의점 :김호연 장편소설',
        authors: '김호연',
        publisher: '나무옆의자',
        publication_year: '2021',
        isbn13: '9791161571188',
      },
    },
  ]);

  const enrichedBooks = normalizeBookDocs([
    {
      doc: {
        bookname: '자본주의 편의점',
        authors: '정지은, 이효선',
        publisher: '가나문화콘텐츠',
        publication_year: '2024',
        isbn13: '9791168091504',
      },
    },
  ]);

  const merged = mergeBooksByIsbn(enrichedBooks, noisyBooks);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].isbn13, '9791168091504');
  assert.equal(merged[1].isbn13, '9791161571188');
});
