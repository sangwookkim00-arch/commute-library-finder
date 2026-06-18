const searchForm = document.querySelector('#searchForm');
const routeForm = document.querySelector('#routeForm');
const keywordInput = document.querySelector('#keyword');
const startStationInput = document.querySelector('#startStation');
const endStationInput = document.querySelector('#endStation');
const submitButton = document.querySelector('#submitButton');
const routeButton = document.querySelector('#routeButton');
const statusEl = document.querySelector('#status');
const bookShelfEl = document.querySelector('#bookShelf');
const selectedBookEl = document.querySelector('#selectedBook');
const libraryListEl = document.querySelector('#libraryList');
const bookCountEl = document.querySelector('#bookCount');
const libraryCountEl = document.querySelector('#libraryCount');
const stationOptionsEl = document.querySelector('#stationOptions');
const routeStartEl = document.querySelector('#routeStart');
const routeEndEl = document.querySelector('#routeEnd');
const routeDistrictCountEl = document.querySelector('#routeDistrictCount');
const districtGridEl = document.querySelector('#districtGrid');

let selectedRoute = {
  start: '강남',
  end: '길음',
  districts: [],
};

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || '요청에 실패했습니다.');
  return payload;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function resetSelectedBook(message = '책을 선택하면 상세와 대출 가능 도서관이 표시됩니다.') {
  selectedBookEl.className = 'selected-book empty-detail';
  selectedBookEl.innerHTML = '';
  const text = document.createElement('p');
  text.textContent = message;
  selectedBookEl.append(text);
}

function resetLibraries(message = '도서관 결과 대기 중') {
  libraryCountEl.textContent = '0 places';
  libraryListEl.innerHTML = '';
  const empty = document.createElement('article');
  empty.className = 'library-empty';
  empty.textContent = message;
  libraryListEl.append(empty);
}

function renderDistricts(districts) {
  districtGridEl.innerHTML = '';

  if (!districts.length) {
    for (const label of ['경로', '구역', '계산', '필요']) {
      const chip = document.createElement('span');
      chip.textContent = label;
      districtGridEl.append(chip);
    }
    return;
  }

  for (const district of districts) {
    const chip = document.createElement('span');
    chip.textContent = district;
    districtGridEl.append(chip);
  }
}

function renderRoute(route) {
  selectedRoute = {
    start: route.start.name,
    end: route.end.name,
    districts: route.districts,
  };
  routeStartEl.textContent = route.start.name;
  routeEndEl.textContent = route.end.name;
  routeDistrictCountEl.textContent = `${route.districts.length}개 구`;
  renderDistricts(route.districts);
}

async function loadStations() {
  const payload = await fetchJson('/api/stations');
  stationOptionsEl.innerHTML = '';

  for (const station of payload.stations) {
    const option = document.createElement('option');
    option.value = station.name;
    option.label = `${station.name} · ${station.lines.join(',')}호선 · ${station.district}`;
    stationOptionsEl.append(option);
  }
}

async function updateRoute() {
  const start = startStationInput.value.trim();
  const end = endStationInput.value.trim();

  if (!start || !end) {
    setStatus('출발역과 도착역을 선택해 주세요.');
    return;
  }

  routeButton.disabled = true;
  routeButton.textContent = '...';

  try {
    const payload = await fetchJson(`/api/route?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    renderRoute(payload.route);
    resetLibraries('새 경로가 적용되었습니다. 책을 선택하면 도서관을 다시 확인합니다.');
    setStatus(`${payload.route.districts.join(', ')} 기준으로 도서관을 찾습니다.`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    routeButton.disabled = false;
    routeButton.textContent = 'Route';
  }
}

function renderBooks(books) {
  bookCountEl.textContent = `${books.length} books`;
  bookShelfEl.innerHTML = '';

  if (!books.length) {
    const empty = document.createElement('article');
    empty.className = 'placeholder-card';
    empty.textContent = '책 후보가 없습니다. ISBN13으로 다시 검색해 보세요.';
    bookShelfEl.append(empty);
    return;
  }

  for (const book of books) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'book-card';
    button.dataset.isbn13 = book.isbn13;

    const cover = document.createElement(book.bookImageURL ? 'img' : 'div');
    cover.className = 'book-cover';
    if (book.bookImageURL) {
      cover.src = book.bookImageURL;
      cover.alt = `${book.bookname} 표지`;
      cover.loading = 'lazy';
    }

    const title = document.createElement('p');
    title.className = 'shelf-title';
    title.textContent = book.bookname;

    const meta = document.createElement('p');
    meta.className = 'shelf-meta';
    meta.textContent = book.publisher || '출판사 정보 없음';

    button.append(cover, title, meta);
    button.addEventListener('click', () => selectBook(button, book));
    bookShelfEl.append(button);
  }
}

function renderSelectedBook(book) {
  selectedBookEl.className = 'selected-book';
  selectedBookEl.innerHTML = '';

  const cover = document.createElement(book.bookImageURL ? 'img' : 'div');
  cover.className = book.bookImageURL ? '' : 'cover-fallback';
  if (book.bookImageURL) {
    cover.src = book.bookImageURL;
    cover.alt = `${book.bookname} 표지`;
  }

  const body = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = book.bookname;
  const meta = document.createElement('p');
  meta.textContent = `${book.authors || '저자 정보 없음'} · ${book.publisher || '출판사 정보 없음'} · ${book.publicationYear || '연도 정보 없음'} · ISBN ${book.isbn13}`;

  body.append(title, meta);
  selectedBookEl.append(cover, body);
}

function renderLibraries(libraries, message) {
  libraryCountEl.textContent = `${libraries.length} places`;
  libraryListEl.innerHTML = '';

  if (!libraries.length) {
    resetLibraries(message || '8개 구 안에서 현재 대출 가능한 도서관이 없습니다.');
    return;
  }

  for (const library of libraries) {
    const card = document.createElement('article');
    card.className = 'library-card';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = `${library.district} · Available`;

    const title = document.createElement('h3');
    title.textContent = library.libName;

    const meta = document.createElement('p');
    meta.textContent = [
      library.address,
      library.tel ? `전화 ${library.tel}` : '',
      library.closed ? `휴관 ${library.closed}` : '',
    ].filter(Boolean).join(' · ');

    card.append(badge, title, meta);

    if (library.homepage) {
      const link = document.createElement('a');
      link.className = 'link-button';
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
  document.querySelectorAll('.book-card').forEach((card) => card.classList.remove('selected'));
  button.classList.add('selected');
  renderSelectedBook(book);
  resetLibraries('대출 가능 도서관을 확인하고 있습니다.');
  setStatus(`"${book.bookname}" 도서관을 찾고 있습니다.`);

  try {
    const districts = selectedRoute.districts.join(',');
    const payload = await fetchJson(`/api/availability?isbn13=${encodeURIComponent(book.isbn13)}&districts=${encodeURIComponent(districts)}`);
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
  setStatus('책 표지를 불러오고 있습니다.');
  bookShelfEl.innerHTML = '';
  const loading = document.createElement('article');
  loading.className = 'placeholder-card';
  loading.textContent = '검색 중입니다.';
  bookShelfEl.append(loading);
  resetSelectedBook();
  resetLibraries();

  try {
    const payload = await fetchJson(`/api/books?keyword=${encodeURIComponent(keyword)}`);
    renderBooks(payload.books);
    setStatus(payload.books.length ? '책 표지를 선택하면 도서관을 확인합니다.' : '검색된 책 후보가 없습니다.');
  } catch (error) {
    bookShelfEl.innerHTML = '';
    const empty = document.createElement('article');
    empty.className = 'placeholder-card';
    empty.textContent = error.message;
    bookShelfEl.append(empty);
    setStatus('책 검색 중 오류가 발생했습니다.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Search';
  }
});

routeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await updateRoute();
});

async function initializeRoutePlanner() {
  try {
    await loadStations();
    await updateRoute();
  } catch (error) {
    renderDistricts([]);
    setStatus(`경로 데이터를 불러오지 못했습니다. ${error.message}`);
  }
}

initializeRoutePlanner();
