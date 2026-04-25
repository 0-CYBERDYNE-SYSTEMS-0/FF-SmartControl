// Cameras view — 2-col thumbnail grid, click for capture modal

import { getStore } from '../store.js';
import { halApi, HalDevice } from '../api.js';
import { openModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';

export async function renderCameras(container: HTMLElement): Promise<void> {
  const store = getStore();
  const cameras = store.devices.filter(d => d.type === 'camera');

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Cameras</h1>
      <p class="page-subtitle">Camera feeds and captures</p>
    </div>

    <div id="cameras-grid" class="grid-2">
      ${renderCameraGrid(cameras)}
    </div>
  `;

  injectCamerasStyles();
  attachCameraHandlers(cameras);
}

function renderCameraGrid(cameras: HalDevice[]): string {
  if (cameras.length === 0) {
    return `<div class="empty-state col-span-2"><p class="empty-state-title">No cameras registered</p><p class="empty-state-desc">Cameras will appear here once discovered.</p></div>`;
  }
  return cameras.map(c => `
    <div class="camera-card hal-card" data-camera-id="${c.id}">
      <div class="camera-thumbnail" id="thumb-${c.id}">
        <div class="camera-placeholder">
          <span class="camera-icon">📷</span>
          <span class="text-secondary text-sm">No preview</span>
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
  `).join('');
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

        // Show capture modal
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
.camera-card { padding: 0; overflow: hidden; }
.camera-thumbnail {
  height: 160px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
}
.camera-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.camera-icon { font-size: 40px; opacity: 0.5; }
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
