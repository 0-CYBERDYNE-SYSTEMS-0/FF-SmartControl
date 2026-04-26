// Cameras view — 2-col thumbnail grid with demo stock imagery, click for capture modal

import { getStore } from '../store.js';
import { halApi, HalDevice } from '../api.js';
import { openModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';

const DEMO_IMAGES: Record<string, string> = {
  tent_cam_a: '/hal-ui/assets/cam1.jpg',
  tent_cam_b: '/hal-ui/assets/cam2.jpg',
};

let refreshInterval: ReturnType<typeof setInterval> | null = null;

export async function renderCameras(container: HTMLElement): Promise<void> {
  const store = getStore();
  const cameras = store.devices.filter(d => d.type === 'camera');

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Cameras</h1>
      <p class="page-subtitle">Live feeds and captures</p>
    </div>

    <div id="cameras-grid" class="grid-2">
      ${renderCameraGrid(cameras)}
    </div>
  `;

  injectCamerasStyles();
  attachCameraHandlers(cameras);
  startCameraRefresh();
}

function startCameraRefresh(): void {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    document.querySelectorAll('.camera-time').forEach(el => {
      el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    });
  }, 30000);
}

function renderCameraGrid(cameras: HalDevice[]): string {
  if (cameras.length === 0) {
    return `<div class="empty-state col-span-2"><p class="empty-state-title">No cameras registered</p><p class="empty-state-desc">Cameras will appear here once discovered.</p></div>`;
  }
  return cameras.map(c => {
    const demoImg = DEMO_IMAGES[c.id];
    return `
    <div class="camera-card hal-card" data-camera-id="${c.id}">
      <div class="camera-thumbnail" id="thumb-${c.id}">
        ${demoImg ? `<img src="${demoImg}" alt="${escapeHtml(c.name)}" class="camera-img" />` : `
        <div class="camera-placeholder">
          <span class="camera-icon">CAM</span>
          <span class="text-secondary text-sm">No preview</span>
        </div>`}
        <div class="camera-overlay">
          <span class="camera-live-badge">LIVE</span>
          <span class="camera-time text-mono text-xs">${new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'})}</span>
        </div>
      </div>
      <div class="camera-info">
        <div class="camera-name">${escapeHtml(c.name)}</div>
        <div class="camera-meta text-xs text-secondary">${c.protocol} · ${c.online ? 'online' : 'offline'}</div>
      </div>
      <button class="hal-btn hal-btn-secondary camera-capture-btn" data-camera-id="${c.id}">
        Capture
      </button>
    </div>
  `}).join('');
}

function attachCameraHandlers(cameras: HalDevice[]): void {
  document.querySelectorAll<HTMLButtonElement>('.camera-capture-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cameraId = btn.dataset.cameraId!;
      const camera = cameras.find(c => c.id === cameraId);
      if (!camera) return;

      btn.textContent = 'Capturing...';
      btn.disabled = true;

      try {
        const result = await halApi.captureCamera(cameraId);
        showToast(`Capture saved: ${result.path}`, 'success');

        openModal(
          `${camera.name} — Capture`,
          `
            <div class="capture-result">
              <p class="text-sm text-secondary mb-4">Capture complete</p>
              <div class="capture-meta">
                <div class="capture-meta-row">
                  <span class="text-secondary text-xs">Path</span>
                  <span class="text-mono text-xs">${escapeHtml(result.path)}</span>
                </div>
                <div class="capture-meta-row">
                  <span class="text-secondary text-xs">Size</span>
                  <span class="text-mono text-xs">${(result.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>
          `,
          '<button class="hal-btn hal-btn-primary" onclick="document.getElementById(\'hal-modal-overlay\')?.click()">Close</button>'
        );
      } catch (err: any) {
        showToast(`Capture failed: ${err.message}`, 'danger');
      } finally {
        btn.textContent = 'Capture';
        btn.disabled = false;
      }
    });
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function injectCamerasStyles(): void {
  if (document.getElementById('hal-cameras-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-cameras-styles';
  style.textContent = `
.camera-card { padding: 0; overflow: hidden; position: relative; }
.camera-thumbnail {
  height: 200px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.camera-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.camera-overlay {
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
  pointer-events: none;
}
.camera-live-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fff;
  background: var(--danger);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
.camera-time {
  color: rgba(255,255,255,0.9);
}
.camera-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.camera-icon { font-size: 14px; font-weight: 700; letter-spacing: 0.1em; color: var(--text-tertiary); opacity: 0.6; }
.camera-info {
  padding: var(--space-3) var(--space-4);
}
.camera-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.camera-capture-btn {
  width: 100%;
  border-radius: 0;
  border-top: 1px solid var(--border);
  padding: var(--space-2);
  font-size: 13px;
}
.hal-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.hal-btn-primary {
  background: var(--accent);
  color: var(--on-accent);
}
.hal-btn-primary:hover { background: var(--accent-bright); }
.hal-btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
.hal-btn-secondary:hover { border-color: var(--accent); }
.hal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.capture-result { }
.capture-meta { display: flex; flex-direction: column; gap: var(--space-2); }
.capture-meta-row { display: flex; justify-content: space-between; align-items: center; }
.col-span-2 { grid-column: 1 / -1; }
`;
  document.head.appendChild(style);
}
