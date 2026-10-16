import jsQR from 'jsqr';
import './style.css';

const api = window.qrScan;
let history = [];
let latestResult = null;

const themes = {
  dark: { label: 'Dark', description: 'Calm and focused' },
  light: { label: 'Light', description: 'Bright and clean' },
  arcane: { label: 'Arcane Pixel', description: 'Retro fantasy' }
};

const savedTheme = localStorage.getItem('qr-scan-theme');
let activeTheme = Object.hasOwn(themes, savedTheme) ? savedTheme : 'dark';
document.documentElement.dataset.theme = activeTheme;

const icons = {
  scan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 8h3v3H8zm5 0h3v3h-3zm-5 5h3v3H8zm5 0h1.5v1.5H13zm3 0h-1.5v3H13v-1.5M16 16h.01"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><path d="M8 8h10v10H8zM6 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  open: '<svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  palette: '<svg viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 0 0 16h1.2a1.3 1.3 0 0 0 .9-2.2 1.3 1.3 0 0 1 .9-2.2h1a4 4 0 0 0 4-4A7.8 7.8 0 0 0 12 4Z"/><path d="M7.5 11h.01M9.5 7.5h.01M14 7h.01M17 10h.01"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-8"/></svg>'
};

document.querySelector('#app').innerHTML = `
  <header class="titlebar">
    <div class="brand-mark">${icons.scan}</div>
    <span>QR Scan</span>
    <div class="titlebar-spacer"></div>
    <div class="theme-picker">
      <button id="themeButton" class="theme-button" type="button" aria-haspopup="menu" aria-expanded="false">
        ${icons.palette}<span id="themeButtonLabel">Dark</span><span class="theme-chevron">⌄</span>
      </button>
      <div id="themeMenu" class="theme-menu" role="menu" hidden>
        ${Object.entries(themes).map(([id, theme]) => `
          <button type="button" role="menuitemradio" data-theme-choice="${id}">
            <span class="theme-swatch ${id}"><i></i></span>
            <span><strong>${theme.label}</strong><small>${theme.description}</small></span>
            <span class="theme-check">${icons.check}</span>
          </button>`).join('')}
      </div>
    </div>
  </header>
  <main>
    <section class="hero">
      <div>
        <p class="eyebrow">DESKTOP QR READER</p>
        <h1>Scan anything<br><span>on your screen.</span></h1>
        <p class="subhead">Draw a box around any QR code. Your scans stay private and on this device.</p>
      </div>
      <button id="scanButton" class="scan-button">${icons.scan}<span>Scan an area</span><kbd>Ctrl Shift Q</kbd></button>
      <div class="arcane-decoration" aria-hidden="true">
        <span class="pixel-star star-one">+</span><span class="pixel-star star-two">+</span>
        <div class="pixel-crystal"><i></i></div>
        <div class="arcane-label">LV. 01 · SCREEN MAGE</div>
      </div>
    </section>

    <section id="resultPanel" class="result-panel" hidden>
      <div class="result-preview"><img id="resultImage" alt="Captured QR code" /></div>
      <div class="result-content">
        <div class="result-heading"><span class="success-dot"></span><span>QR code found</span></div>
        <p id="resultValue"></p>
        <div class="result-actions">
          <button id="copyResult" class="primary-small">${icons.copy} Copy</button>
          <button id="openResult" class="secondary-small">${icons.open} Open</button>
          <button id="closeResult" class="icon-text">Dismiss</button>
        </div>
      </div>
    </section>

    <section class="history-section">
      <div class="section-heading">
        <div><h2>Recent scans</h2><p id="historyCount">Your scanned codes appear here</p></div>
        <div class="history-tools">
          <label class="search"><span>⌕</span><input id="searchInput" type="search" placeholder="Search history" /></label>
          <button id="clearHistory" class="text-button">Clear all</button>
        </div>
      </div>
      <div id="historyList" class="history-list"></div>
      <div id="emptyState" class="empty-state">
        <div class="empty-icon">${icons.scan}</div>
        <h3>No scans yet</h3>
        <p>Use “Scan an area”, paste an image, or drop one here.</p>
      </div>
    </section>
  </main>
  <div id="dropZone"><div>${icons.scan}<strong>Drop an image to scan</strong></div></div>
  <div id="toast" role="status"></div>
`;

const $ = (selector) => document.querySelector(selector);
const resultPanel = $('#resultPanel');
const resultValue = $('#resultValue');
const resultImage = $('#resultImage');
const toast = $('#toast');

function applyTheme(theme, persist = true) {
  if (!Object.hasOwn(themes, theme)) return;
  activeTheme = theme;
  document.documentElement.dataset.theme = theme;
  $('#themeButtonLabel').textContent = themes[theme].label;
  document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f7f5fb' : theme === 'arcane' ? '#09051b' : '#111018';
  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    const selected = button.dataset.themeChoice === theme;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  if (persist) localStorage.setItem('qr-scan-theme', theme);
  api.setTheme(theme);
}

function closeThemeMenu() {
  $('#themeMenu').hidden = true;
  $('#themeButton').setAttribute('aria-expanded', 'false');
}

function showToast(message, tone = 'normal') {
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2600);
}

function isOpenable(value) {
  try {
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function friendlyType(value) {
  if (/^https?:\/\//i.test(value)) return 'Website';
  if (/^mailto:/i.test(value)) return 'Email';
  if (/^tel:/i.test(value)) return 'Phone';
  if (/^WIFI:/i.test(value)) return 'Wi-Fi';
  return 'Text';
}

function formatDate(value) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? `Today, ${new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)}`
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function renderHistory(filter = '') {
  const normalized = filter.trim().toLowerCase();
  const items = history.filter((item) => item.value.toLowerCase().includes(normalized));
  $('#historyCount').textContent = history.length ? `${history.length} saved ${history.length === 1 ? 'code' : 'codes'}` : 'Your scanned codes appear here';
  $('#clearHistory').hidden = history.length === 0;
  $('#emptyState').hidden = items.length > 0;
  $('#historyList').innerHTML = items.map((item) => `
    <article class="history-item" data-id="${item.id}">
      <div class="history-preview">${item.preview ? `<img src="${item.preview}" alt="" />` : icons.scan}</div>
      <div class="history-main">
        <div class="meta"><span class="type-pill">${friendlyType(item.value)}</span><span>${icons.clock}${formatDate(item.scannedAt)}</span></div>
        <p title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</p>
      </div>
      <div class="row-actions">
        <button data-action="copy" title="Copy">${icons.copy}</button>
        ${isOpenable(item.value) ? `<button data-action="open" title="Open">${icons.open}</button>` : ''}
        <button data-action="delete" title="Delete">${icons.trash}</button>
      </div>
    </article>`).join('');
}

function makePreview(image) {
  const canvas = document.createElement('canvas');
  const max = 180;
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.76);
}

async function decodeImage(source) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });

  if (!result) {
    showToast('No QR code found. Try a slightly larger selection.', 'error');
    return;
  }

  latestResult = { value: result.data, image: source };
  resultValue.textContent = result.data;
  resultImage.src = source;
  $('#openResult').hidden = !isOpenable(result.data);
  resultPanel.hidden = false;
  const item = await api.addHistory({ value: result.data, preview: makePreview(image) });
  history = [item, ...history.filter((candidate) => candidate.value !== item.value)];
  renderHistory($('#searchInput').value);
  showToast('QR code scanned');
}

async function fileToDataUrl(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please choose an image file.');
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

$('#scanButton').addEventListener('click', () => api.startCapture());
$('#themeButton').addEventListener('click', (event) => {
  event.stopPropagation();
  const menu = $('#themeMenu');
  menu.hidden = !menu.hidden;
  $('#themeButton').setAttribute('aria-expanded', String(!menu.hidden));
});
$('#themeMenu').addEventListener('click', (event) => {
  const choice = event.target.closest('[data-theme-choice]');
  if (!choice) return;
  applyTheme(choice.dataset.themeChoice);
  closeThemeMenu();
  showToast(`${themes[activeTheme].label} theme activated`);
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.theme-picker')) closeThemeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('#themeMenu').hidden) closeThemeMenu();
});
$('#closeResult').addEventListener('click', () => { resultPanel.hidden = true; });
$('#copyResult').addEventListener('click', async () => {
  if (!latestResult) return;
  await api.copyText(latestResult.value);
  showToast('Copied to clipboard');
});
$('#openResult').addEventListener('click', () => latestResult && api.openLink(latestResult.value));
$('#searchInput').addEventListener('input', (event) => renderHistory(event.target.value));
$('#clearHistory').addEventListener('click', async () => {
  if (!confirm('Clear all scanned QR code history?')) return;
  await api.clearHistory();
  history = [];
  renderHistory();
  showToast('History cleared');
});

$('#historyList').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  const article = event.target.closest('.history-item');
  if (!button || !article) return;
  const item = history.find((candidate) => candidate.id === article.dataset.id);
  if (!item) return;
  if (button.dataset.action === 'copy') {
    await api.copyText(item.value);
    showToast('Copied to clipboard');
  } else if (button.dataset.action === 'open') {
    await api.openLink(item.value);
  } else if (button.dataset.action === 'delete') {
    await api.removeHistory(item.id);
    history = history.filter((candidate) => candidate.id !== item.id);
    renderHistory($('#searchInput').value);
  }
});

document.addEventListener('paste', async (event) => {
  const file = [...event.clipboardData.files].find((item) => item.type.startsWith('image/'));
  if (file) decodeImage(await fileToDataUrl(file));
});

let dragDepth = 0;
document.addEventListener('dragenter', (event) => { event.preventDefault(); dragDepth += 1; $('#dropZone').classList.add('visible'); });
document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('dragleave', () => { dragDepth -= 1; if (dragDepth <= 0) $('#dropZone').classList.remove('visible'); });
document.addEventListener('drop', async (event) => {
  event.preventDefault();
  dragDepth = 0;
  $('#dropZone').classList.remove('visible');
  try { await decodeImage(await fileToDataUrl(event.dataTransfer.files[0])); }
  catch (error) { showToast(error.message, 'error'); }
});

api.onCapture((image) => decodeImage(image).catch((error) => showToast(error.message, 'error')));
api.onCaptureError((message) => showToast(message, 'error'));

history = await api.listHistory();
applyTheme(activeTheme, false);
renderHistory();
