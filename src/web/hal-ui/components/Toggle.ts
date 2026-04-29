// Toggle — 40x22px pill, 18px thumb, 200ms ease

export function injectToggleStyles(): void {
  if (document.getElementById('hal-toggle-styles')) return;
  const style = document.createElement('style');
  style.id = 'hal-toggle-styles';
  style.textContent = `
.hal-toggle {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: var(--radius-pill);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: background var(--transition-base);
  flex-shrink: 0;
  border: none;
  padding: 0;
}
.hal-toggle.active {
  background: var(--accent);
}
.hal-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--transition-base);
  pointer-events: none;
}
.hal-toggle.active .hal-toggle-thumb {
  transform: translateX(18px);
}
.hal-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
`;
  document.head.appendChild(style);
}

export function createToggle(
  id: string,
  initialState: boolean,
  onChange: (on: boolean) => void,
): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'hal-toggle' + (initialState ? ' active' : '');
  btn.id = id;
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', String(initialState));
  btn.setAttribute('aria-label', 'Toggle power state');

  const thumb = document.createElement('span');
  thumb.className = 'hal-toggle-thumb';
  btn.appendChild(thumb);

  btn.addEventListener('click', () => {
    const newState = !btn.classList.contains('active');
    btn.classList.toggle('active', newState);
    btn.setAttribute('aria-checked', String(newState));
    onChange(newState);
  });

  return btn;
}

export function setToggleState(el: HTMLElement, on: boolean): void {
  el.classList.toggle('active', on);
  el.setAttribute('aria-checked', String(on));
}
