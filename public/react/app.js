import React, { useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';

const districts = ['강남구', '서초구', '동작구', '용산구', '중구', '종로구', '성북구', '강북구'];

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || '요청에 실패했습니다.');
  return payload;
}

function BookCard({ book, selected, onSelect }) {
  return React.createElement(
    'button',
    {
      type: 'button',
      className: `book-card${selected ? ' selected' : ''}`,
      onClick: () => onSelect(book),
    },
    book.bookImageURL
      ? React.createElement('img', { className: 'cover', src: book.bookImageURL, alt: `${book.bookname} 표지` })
      : React.createElement('div', { className: 'cover', 'aria-hidden': 'true' }),
    React.createElement(
      'div',
      null,
      React.createElement('p', { className: 'book-title' }, book.bookname),
      React.createElement('p', { className: 'meta' }, `${book.authors || '저자 정보 없음'} · ${book.publisher || '출판사 정보 없음'} · ${book.publicationYear || '연도 정보 없음'} · ISBN ${book.isbn13}`),
    ),
  );
}

function LibraryCard({ library }) {
  return React.createElement(
    'article',
    { className: 'library-card' },
    React.createElement('span', { className: 'badge' }, `${library.district} · 대출 가능`),
    React.createElement('h3', { className: 'library-title' }, library.libName),
    React.createElement(
      'p',
      { className: 'library-meta' },
      [library.address, library.tel ? `전화 ${library.tel}` : '', library.closed ? `휴관 ${library.closed}` : '']
        .filter(Boolean)
        .join(' · '),
    ),
    library.homepage
      ? React.createElement('a', { className: 'link-button', href: library.homepage, target: '_blank', rel: 'noreferrer' }, '도서관 홈페이지')
      : null,
  );
}

function App() {
  const [keyword, setKeyword] = useState('');
  const [books, setBooks] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [selectedIsbn, setSelectedIsbn] = useState('');
  const [status, setStatus] = useState('오늘 빌릴 책을 검색해 주세요.');
  const [loading, setLoading] = useState(false);

  async function searchBooks(event) {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) {
      setStatus('책 제목이나 ISBN13을 입력해 주세요.');
      return;
    }

    setLoading(true);
    setBooks([]);
    setLibraries([]);
    setSelectedIsbn('');
    setStatus('책 후보를 찾고 있습니다.');

    try {
      const payload = await fetchJson(`/api/books?keyword=${encodeURIComponent(trimmed)}`);
      setBooks(payload.books);
      setStatus(payload.books.length ? '원하는 책을 선택하면 도서관을 확인합니다.' : '책 후보가 없습니다. ISBN13으로 다시 검색해 보세요.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectBook(book) {
    setSelectedIsbn(book.isbn13);
    setLibraries([]);
    setStatus(`"${book.bookname}" 대출 가능 도서관을 찾고 있습니다.`);

    try {
      const payload = await fetchJson(`/api/availability?isbn13=${encodeURIComponent(book.isbn13)}`);
      setLibraries(payload.libraries);
      setStatus(payload.libraries.length ? `대출 가능한 도서관 ${payload.libraries.length}곳을 찾았습니다.` : payload.message || '대출 가능한 도서관이 없습니다.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return React.createElement(
    'main',
    { className: 'phone-shell' },
    React.createElement(
      'header',
      { className: 'topbar' },
      React.createElement(
        'div',
        { className: 'brand' },
        React.createElement('div', { className: 'brand-mark' }, '4'),
        React.createElement(
          'div',
          null,
          React.createElement('h1', { className: 'brand-title' }, '출퇴근 도서관'),
          React.createElement('p', { className: 'brand-subtitle' }, '강남-길음 라인 책찾기'),
        ),
      ),
      React.createElement('span', { className: 'mode-pill' }, 'React 시안'),
    ),
    React.createElement(
      'section',
      { className: 'hero-panel' },
      React.createElement('div', { className: 'route-line' }, React.createElement('span', null, '강남'), React.createElement('span', { className: 'rail' }), React.createElement('span', { className: 'dot' }), React.createElement('span', null, '길음')),
      React.createElement('h2', { className: 'headline' }, '오늘 빌릴 책을 빠르게 찾아요'),
      React.createElement(
        'form',
        { className: 'search-box', onSubmit: searchBooks },
        React.createElement('input', {
          value: keyword,
          onChange: (event) => setKeyword(event.target.value),
          placeholder: '책 제목 또는 ISBN13',
          type: 'search',
        }),
        React.createElement('button', { type: 'submit', disabled: loading, 'aria-label': '검색' }, loading ? '…' : '⌕'),
      ),
      React.createElement('div', { className: 'district-strip' }, districts.map((district) => React.createElement('span', { key: district }, district))),
    ),
    React.createElement('p', { className: 'status' }, status),
    React.createElement('div', { className: 'section-title' }, React.createElement('h2', null, '책 후보'), React.createElement('span', null, `${books.length}권`)),
    React.createElement('section', { className: 'list' }, books.length ? books.map((book) => React.createElement(BookCard, { key: book.isbn13, book, selected: selectedIsbn === book.isbn13, onSelect: selectBook })) : React.createElement('div', { className: 'empty' }, '검색하면 책 후보가 여기에 표시됩니다.')),
    React.createElement('div', { className: 'section-title' }, React.createElement('h2', null, '대출 가능 도서관'), React.createElement('span', null, `${libraries.length}곳`)),
    React.createElement('section', { className: 'list' }, libraries.length ? libraries.map((library) => React.createElement(LibraryCard, { key: library.libCode, library })) : React.createElement('div', { className: 'empty' }, '책을 선택하면 도서관 목록이 표시됩니다.')),
  );
}

createRoot(document.querySelector('#root')).render(React.createElement(App));
