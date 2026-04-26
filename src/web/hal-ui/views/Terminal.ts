// Terminal view — live system log with monospace output

import { getStore } from '../store.js';
import { renderTerminal, buildLogEntries, injectTerminalStyles } from '../components/Terminal.js';

export async function renderTerminalView(container: HTMLElement): Promise<void> {
  injectTerminalStyles();

  const store = getStore();
  const entries = buildLogEntries(store.decisions);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Terminal</h1>
      <p class="page-subtitle">System log and diagnostics</p>
    </div>
    ${renderTerminal(entries)}
  `;
}
