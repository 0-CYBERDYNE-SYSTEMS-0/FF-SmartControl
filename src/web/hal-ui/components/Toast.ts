// Toast — bottom-right, stacked, auto-dismiss 4s

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

const MAX_VISIBLE = 3;
let toasts: HTMLElement[] = [];

const borderColors: Record<ToastType, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

export function showToast(
  message: string,
  type: ToastType = 'info',
  duration = 4000,
): void {
  const container = getOrCreateContainer();
  const toast = document.createElement('div');
  toast.className = `hal-toast hal-toast-${type}`;
  toast.style.borderLeftColor = borderColors[type];
  toast.textContent = message;

  // Dismiss button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'hal-toast-close';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => dismissToast(toast));
  toast.appendChild(closeBtn);

  container.appendChild(toast);
  toasts.push(toast);

  // Enforce max visible
  while (toasts.length > MAX_VISIBLE) {
    dismissToast(toasts[0]);
  }

  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }
}

function dismissToast(toast: HTMLElement): void {
  toast.classList.add('hal-toast-out');
  setTimeout(() => {
    toast.remove();
    toasts = toasts.filter((t) => t !== toast);
  }, 200);
}

function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById('hal-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'hal-toast-container';
    injectToastStyles();
    document.body.appendChild(container);
  }
  return container;
}

function injectToastStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
#hal-toast-container {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}
.hal-toast {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-left: 4px solid var(--success);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  font-size: 14px;
  max-width: 320px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  pointer-events: all;
  animation: hal-toast-in 200ms ease forwards;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.hal-toast-out {
  animation: hal-toast-out 200ms ease forwards;
}
.hal-toast-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}
.hal-toast-close:hover { color: var(--text-primary); }
@keyframes hal-toast-in {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes hal-toast-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(20px); }
}
`;
  document.head.appendChild(style);
}
