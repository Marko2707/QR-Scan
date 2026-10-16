import './overlay.css';

const canvas = document.querySelector('#screen');
const selection = document.querySelector('#selection');
const sizeLabel = document.querySelector('#size');
const context = canvas.getContext('2d');
let screenshot;
let start = null;
let current = null;

window.captureOverlay.onInit(async ({ image }) => {
  screenshot = new Image();
  screenshot.src = image;
  await screenshot.decode();
  canvas.width = screenshot.naturalWidth;
  canvas.height = screenshot.naturalHeight;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  context.drawImage(screenshot, 0, 0);
});

function point(event) {
  return { x: event.clientX, y: event.clientY };
}

function rectangle() {
  const left = Math.min(start.x, current.x);
  const top = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);
  return { left, top, width, height };
}

window.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  start = point(event);
  current = start;
  selection.hidden = false;
  selection.style.left = `${start.x}px`;
  selection.style.top = `${start.y}px`;
  selection.style.width = '0';
  selection.style.height = '0';
  document.body.classList.add('selecting');
  window.setPointerCapture?.(event.pointerId);
});

window.addEventListener('pointermove', (event) => {
  if (!start) return;
  current = point(event);
  const rect = rectangle();
  Object.assign(selection.style, {
    left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`
  });
  sizeLabel.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
});

window.addEventListener('pointerup', () => {
  if (!start || !screenshot) return;
  const rect = rectangle();
  start = null;
  document.body.classList.remove('selecting');
  if (rect.width < 12 || rect.height < 12) {
    selection.hidden = true;
    return;
  }

  const scaleX = screenshot.naturalWidth / window.innerWidth;
  const scaleY = screenshot.naturalHeight / window.innerHeight;
  const crop = document.createElement('canvas');
  crop.width = Math.max(1, Math.round(rect.width * scaleX));
  crop.height = Math.max(1, Math.round(rect.height * scaleY));
  crop.getContext('2d').drawImage(
    screenshot,
    Math.round(rect.left * scaleX), Math.round(rect.top * scaleY), crop.width, crop.height,
    0, 0, crop.width, crop.height
  );
  window.captureOverlay.complete(crop.toDataURL('image/png'));
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.captureOverlay.cancel();
});
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  window.captureOverlay.cancel();
});
