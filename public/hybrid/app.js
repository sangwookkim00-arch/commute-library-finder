const searchForm = document.querySelector('#searchForm');
const keywordInput = document.querySelector('#keyword');
const submitButton = document.querySelector('#submitButton');
const statusEl = document.querySelector('#status');
const bookListEl = document.querySelector('#bookList');
const libraryListEl = document.querySelector('#libraryList');
const bookCountEl = document.querySelector('#bookCount');
const libraryCountEl = document.querySelector('#libraryCount');

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || '요청에 실패했습니다.');
  return payload;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function createEmpty(message) {
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.textContent = message;
  return empty;
}

function resetLibraries(message = '책을 선택하면 도서관 목록이 표시됩니다.') {
  libraryCountEl.textContent = '0곳';
  libraryListEl.innerHTML = '';
  libraryListEl.append(createEmpty(message));
}

function renderBooks(books) {
  bookCountEl.textContent = `${books.length}권`;
  bookListEl.innerHTML = '';

  if (!books.length) {
    bookListEl.append(createEmpty('책 후보가 없습니다. ISBN13으로 다시 검색해 보세요.'));
    return;
  }

  for (const book of books) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'book-card';
    button.dataset.isbn13 = book.isbn13;

    const cover = document.createElement(book.bookImageURL ? 'img' : 'div');
    cover.className = 'cover';
    if (book.bookImageURL) {
      cover.src = book.bookImageURL;
      cover.alt = `${book.bookname} 표지`;
      cover.loading = 'lazy';
    }

    const body = document.createElement('div');
    body.className = 'book-body';

    const title = document.createElement('p');
    title.className = 'book-title';
    title.textContent = book.bookname;

    const meta = document.createElement('p');
    meta.className = 'book-meta';
    meta.textContent = `${book.authors || '저자 정보 없음'} · ${book.publisher || '출판사 정보 없음'} · ${book.publicationYear || '연도 정보 없음'} · ISBN ${book.isbn13}`;

    body.append(title, meta);
    button.append(cover, body);
    button.addEventListener('click', () => selectBook(button, book));
    bookListEl.append(button);
  }
}

function renderLibraries(libraries, message) {
  libraryCountEl.textContent = `${libraries.length}곳`;
  libraryListEl.innerHTML = '';

  if (!libraries.length) {
    libraryListEl.append(createEmpty(message || '8개 구 안에서 현재 대출 가능한 도서관이 없습니다.'));
    return;
  }

  for (const library of libraries) {
    const card = document.createElement('article');
    card.className = 'library-card';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = `${library.district} · 대출 가능`;

    const title = document.createElement('h3');
    title.className = 'library-title';
    title.textContent = library.libName;

    const meta = document.createElement('p');
    meta.className = 'library-meta';
    meta.textContent = [
      library.address,
      library.tel ? `전화 ${library.tel}` : '',
      library.closed ? `휴관 ${library.closed}` : '',
      library.operatingTime ? `운영 ${library.operatingTime}` : '',
    ].filter(Boolean).join(' · ');

    card.append(badge, title, meta);

    if (library.homepage) {
      const row = document.createElement('div');
      row.className = 'link-row';
      const link = document.createElement('a');
      link.className = 'link-button';
      link.href = library.homepage;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = '도서관 홈페이지';
      row.append(link);
      card.append(row);
    }

    libraryListEl.append(card);
  }
}

async function selectBook(button, book) {
  document.querySelectorAll('.book-card').forEach((card) => card.classList.remove('selected'));
  button.classList.add('selected');
  resetLibraries('도서관 대출 가능 여부를 확인하고 있습니다.');
  setStatus(`"${book.bookname}" 대출 가능 도서관을 찾고 있습니다.`);

  try {
    const payload = await fetchJson(`/api/availability?isbn13=${encodeURIComponent(book.isbn13)}`);
    renderLibraries(payload.libraries, payload.message);
    setStatus(payload.libraries.length ? `대출 가능한 도서관 ${payload.libraries.length}곳을 찾았습니다.` : '대출 가능한 도서관이 없습니다.');
  } catch (error) {
    renderLibraries([], error.message);
    setStatus('도서관 확인 중 오류가 발생했습니다.');
  }
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const keyword = keywordInput.value.trim();
  if (!keyword) {
    setStatus('책 제목이나 ISBN13을 입력해 주세요.');
    keywordInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = '검색 중';
  setStatus('책 후보를 검색하고 있습니다.');
  bookCountEl.textContent = '0권';
  bookListEl.innerHTML = '';
  bookListEl.append(createEmpty('검색 중입니다.'));
  resetLibraries();

  try {
    const payload = await fetchJson(`/api/books?keyword=${encodeURIComponent(keyword)}`);
    renderBooks(payload.books);
    setStatus(payload.books.length ? '원하는 책을 선택하면 도서관을 확인합니다.' : '검색된 책 후보가 없습니다.');
  } catch (error) {
    bookCountEl.textContent = '0권';
    bookListEl.innerHTML = '';
    bookListEl.append(createEmpty(error.message));
    setStatus('책 검색 중 오류가 발생했습니다.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '검색';
  }
});
