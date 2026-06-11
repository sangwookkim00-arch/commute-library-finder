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

function emptyBlock(message) {
  const block = document.createElement('div');
  block.className = 'rounded-3xl border border-dashed border-line bg-white/70 p-6 text-center text-sm font-semibold text-slate-500';
  block.textContent = message;
  return block;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function renderBooks(books) {
  bookCountEl.textContent = `${books.length}권`;
  bookListEl.innerHTML = '';
  if (!books.length) {
    bookListEl.append(emptyBlock('책 후보가 없습니다. ISBN13으로 다시 검색해 보세요.'));
    return;
  }

  for (const book of books) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.isbn13 = book.isbn13;
    button.className = 'grid w-full grid-cols-[62px_1fr] gap-3 rounded-3xl bg-white p-3 text-left shadow-sm ring-1 ring-line transition active:scale-[0.99]';

    const cover = document.createElement(book.bookImageURL ? 'img' : 'div');
    cover.className = 'h-[84px] w-[62px] rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 object-cover';
    if (book.bookImageURL) {
      cover.src = book.bookImageURL;
      cover.alt = `${book.bookname} 표지`;
    }

    const body = document.createElement('div');
    body.className = 'min-w-0 py-1';
    const title = document.createElement('p');
    title.className = 'line-clamp-2 text-[15px] font-black leading-snug text-ink';
    title.textContent = book.bookname;
    const meta = document.createElement('p');
    meta.className = 'mt-2 line-clamp-3 text-xs font-semibold leading-relaxed text-slate-500';
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
    libraryListEl.append(emptyBlock(message || '8개 구 안에서 현재 대출 가능한 도서관이 없습니다.'));
    return;
  }

  for (const library of libraries) {
    const card = document.createElement('article');
    card.className = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-line';

    const badge = document.createElement('span');
    badge.className = 'inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-leaf';
    badge.textContent = `${library.district} · 대출 가능`;

    const title = document.createElement('h3');
    title.className = 'mt-3 text-base font-black text-ink';
    title.textContent = library.libName;

    const meta = document.createElement('p');
    meta.className = 'mt-2 text-xs font-semibold leading-relaxed text-slate-500';
    meta.textContent = [
      library.address,
      library.tel ? `전화 ${library.tel}` : '',
      library.closed ? `휴관 ${library.closed}` : '',
    ].filter(Boolean).join(' · ');

    card.append(badge, title, meta);
    if (library.homepage) {
      const link = document.createElement('a');
      link.className = 'mt-4 inline-flex min-h-10 items-center justify-center rounded-2xl bg-sky-50 px-4 text-sm font-black text-sky-700';
      link.href = library.homepage;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = '도서관 홈페이지';
      card.append(link);
    }

    libraryListEl.append(card);
  }
}

async function selectBook(button, book) {
  document.querySelectorAll('[data-isbn13]').forEach((item) => {
    item.classList.remove('ring-2', 'ring-leaf');
    item.classList.add('ring-1', 'ring-line');
  });
  button.classList.remove('ring-1', 'ring-line');
  button.classList.add('ring-2', 'ring-leaf');
  renderLibraries([], '도서관 대출 가능 여부를 확인하고 있습니다.');
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
  submitButton.textContent = '...';
  setStatus('책 후보를 검색하고 있습니다.');
  bookListEl.innerHTML = '';
  libraryListEl.innerHTML = '';
  bookListEl.append(emptyBlock('검색 중입니다.'));
  libraryListEl.append(emptyBlock('책을 선택하면 도서관이 표시됩니다.'));
  libraryCountEl.textContent = '0곳';

  try {
    const payload = await fetchJson(`/api/books?keyword=${encodeURIComponent(keyword)}`);
    renderBooks(payload.books);
    setStatus(payload.books.length ? '원하는 책을 선택해 주세요.' : '검색된 책 후보가 없습니다.');
  } catch (error) {
    bookListEl.innerHTML = '';
    bookListEl.append(emptyBlock(error.message));
    setStatus('책 검색 중 오류가 발생했습니다.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '검색';
  }
});
