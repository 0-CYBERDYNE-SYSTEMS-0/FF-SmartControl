// Modal — overlay backdrop, panel radius-lg, max 480px

let activeModal: HTMLElement | null = null;

export function openModal(
  title: string,
  bodyContent: string,
  actions = '',
): void {
  closeModal();

  const overlay = document.createElement('div');
  overlay.id = 'hal-modal-overlay';
  overlay.className = 'hal-modal-overlay';

  const panel = document.createElement('div');
  panel.className = 'hal-modal-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');

  panel.innerHTML = `
    <div class="hal-modal-header">
      <h2 class="hal-modal-title">${escapeHtml(title)}</h2>
      <button class="hal-modal-close" aria-label="Close modal">×</button>
    </div>
    <div class="hal-modal-body">${bodyContent}</div>
    ${actions ? `<div class="hal-modal-actions">${actions}</div>` : ''}
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  activeModal = overlay;

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Close on × button
  panel
    .querySelector('.hal-modal-close')
    ?.addEventListener('click', closeModal);

  // Close on Escape
  document.addEventListener('keydown', handleEscape);
}

export function closeModal(): void {
  if (!activeModal) return;
  activeModal.remove();
  activeModal = null;
  document.removeEventListener('keydown', handleEscape);
}

function handleEscape(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeModal();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function injectModalStyles(): void {
  if (document.getElementById('hal-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-modal-styles';
  style.textContent = `
.hal-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  animation: hal-fade-in 150ms ease;
}
.hal-modal-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  animation: hal-slide-up 150ms ease;
}
.hal-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.hal-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.hal-modal-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.hal-modal-close:hover { color: var(--text-primary); }
.hal-modal-body {
  padding: var(--space-4);
  color: var(--text-secondary);
  font-size: 14px;
}
.hal-modal-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  padding: var(--space-4);
  border-top: 1px solid var(--border);
}
@keyframes hal-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes hal-slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
  document.head.appendChild(style);
}
