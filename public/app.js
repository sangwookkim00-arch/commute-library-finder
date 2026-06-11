const searchForm = document.querySelector('#searchForm');
const keywordInput = document.querySelector('#keyword');
const statusEl = document.querySelector('#status');
const bookListEl = document.querySelector('#bookList');
const libraryListEl = document.querySelector('#libraryList');
const submitButton = searchForm.querySelector('button');

function setStatus(message) {
  statusEl.textContent = message;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? '검색 중' : '검색';
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || '요청에 실패했습니다.');
  }
  return payload;
}

function renderEmpty(target, message) {
  target.className = target.id === 'bookList' ? 'book-list empty' : 'library-list empty';
  target.innerHTML = '';
  target.textContent = message;
}

function renderBooks(books) {
  bookListEl.className = 'book-list';
  bookListEl.innerHTML = '';

  if (!books.length) {
    renderEmpty(bookListEl, '검색된 책 후보가 없습니다. 제목으로 안 나오면 ISBN13을 입력해 주세요.');
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
    }

    const body = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'book-title';
    title.textContent = book.bookname;
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = `${book.authors || '저자 정보 없음'} · ${book.publisher || '출판사 정보 없음'} · ${book.publicationYear || '연도 정보 없음'} · ISBN ${book.isbn13}`;

    body.append(title, meta);
    button.append(cover, body);
    button.addEventListener('click', () => selectBook(button, book));
    bookListEl.append(button);
  }
}

function renderLibraries(libraries, message) {
  libraryListEl.className = 'library-list';
  libraryListEl.innerHTML = '';

  if (!libraries.length) {
    renderEmpty(libraryListEl, message || '8개 구 안에서 현재 대출 가능한 도서관이 없습니다.');
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

    const actions = document.createElement('div');
    actions.className = 'library-actions';
    if (library.homepage) {
      const link = document.createElement('a');
      link.className = 'link-button';
      link.href = library.homepage;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = '도서관 홈페이지';
      actions.append(link);
    }

    card.append(badge, title, meta, actions);
    libraryListEl.append(card);
  }
}

async function selectBook(button, book) {
  document.querySelectorAll('.book-card').forEach((el) => el.classList.remove('selected'));
  button.classList.add('selected');
  renderEmpty(libraryListEl, '도서관 대출 가능 여부를 확인하고 있습니다.');
  setStatus(`"${book.bookname}" 대출 가능 도서관을 찾는 중입니다.`);

  try {
    const payload = await fetchJson(`/api/availability?isbn13=${encodeURIComponent(book.isbn13)}`);
    renderLibraries(payload.libraries, payload.message);
    setStatus(payload.libraries.length ? `대출 가능한 도서관 ${payload.libraries.length}곳을 찾았습니다.` : '대출 가능한 도서관이 없습니다.');
  } catch (error) {
    renderEmpty(libraryListEl, error.message);
    setStatus('도서관 확인 중 오류가 발생했습니다.');
  }
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const keyword = keywordInput.value.trim();
  if (!keyword) {
    setStatus('책 제목을 입력해주세요.');
    keywordInput.focus();
    return;
  }

  setLoading(true);
  setStatus('책 후보를 검색하고 있습니다.');
  renderEmpty(bookListEl, '검색 중입니다.');
  renderEmpty(libraryListEl, '책을 먼저 선택해 주세요.');

  try {
    const payload = await fetchJson(`/api/books?keyword=${encodeURIComponent(keyword)}`);
    renderBooks(payload.books);
    setStatus(payload.books.length ? '원하는 책 후보를 선택해주세요.' : '검색된 책 후보가 없습니다. ISBN13으로 다시 검색해 보세요.');
  } catch (error) {
    renderEmpty(bookListEl, error.message);
    setStatus('책 검색 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
});
