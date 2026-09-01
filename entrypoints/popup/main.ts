import './style.css';
import { browser } from 'wxt/browser';
import type { AdaptationState, ContentCommand, ContentResponse } from '../../lib/messages';
import { listPresets } from '../../lib/profiles';

/**
 * The popup cannot touch the page, so it only sends commands and renders what
 * comes back. Every button goes through the same send function, which means one
 * place handles the case where no content script is listening.
 *
 * The preset buttons are generated from listPresets and the switches from the
 * reply, so adding a preset or an adaptation needs no change here.
 */

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Popup root element was not found.');

app.innerHTML = `
  <main class="popup">
    <h1>Reader Mode</h1>
    <p class="status" id="status">Checking this page...</p>
    <div class="presets" id="presets"></div>
    <section class="switches" id="switches" hidden>
      <h2>What this does</h2>
      <div id="switch-list"></div>
    </section>
    <button class="reset" id="reset" type="button">Turn everything off</button>
  </main>`;

const statusElement = element<HTMLParagraphElement>('status');
const presetsElement = element<HTMLDivElement>('presets');
const switchesSection = element<HTMLElement>('switches');
const switchList = element<HTMLDivElement>('switch-list');
const resetButton = element<HTMLButtonElement>('reset');

/** Which adaptations the reader has switched off, per preset. */
const disabledByPreset = new Map<string, Set<string>>();
let activePresetId: string | null = null;

for (const preset of listPresets()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'preset';
  button.dataset.presetId = preset.id;
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = '<span class="label"></span><span class="description"></span>';
  text(button, '.label', preset.label);
  text(button, '.description', preset.description);
  button.addEventListener('click', () => applyPreset(preset.id));
  presetsElement.appendChild(button);
}

resetButton.addEventListener('click', () => send({ type: 'reader:reset' }));

send({ type: 'reader:status' });

function applyPreset(presetId: string): void {
  const disabled = Array.from(disabledByPreset.get(presetId) ?? []);
  send({ type: 'reader:apply-preset', presetId, disabled });
}

async function send(command: ContentCommand): Promise<void> {
  statusElement.textContent = 'Working...';

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab.');

    render((await browser.tabs.sendMessage(tab.id, command)) as ContentResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    statusElement.textContent = message.includes('Could not establish connection')
      ? 'Reader Mode is not running here. Reload an ordinary web page and try again.'
      : message;
  }
}

function render(response: ContentResponse): void {
  if (!response.ok) {
    statusElement.textContent = response.error;
    return;
  }

  const { eligibility, blockCount, adaptations } = response;
  activePresetId = response.activePresetId;

  statusElement.textContent = summarise(eligibility.eligible, eligibility.reason, blockCount, adaptations);

  for (const button of Array.from(presetsElement.querySelectorAll('button'))) {
    button.setAttribute('aria-pressed', String(button.dataset.presetId === activePresetId));
    button.disabled = !eligibility.eligible;
  }

  renderSwitches(adaptations);
  resetButton.hidden = activePresetId === null;
}

function summarise(
  eligible: boolean,
  reason: string,
  blockCount: number,
  adaptations: AdaptationState[],
): string {
  if (!eligible) return reason;
  if (adaptations.length === 0) return `${blockCount} blocks of text found. Choose a setting.`;

  const changed = adaptations.reduce((total, entry) => total + entry.changed, 0);
  return `${changed} changes across ${blockCount} blocks.`;
}

function renderSwitches(adaptations: AdaptationState[]): void {
  switchesSection.hidden = adaptations.length === 0;
  switchList.replaceChildren();

  for (const state of adaptations) {
    const row = document.createElement('label');
    row.className = 'switch';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.enabled;
    box.addEventListener('change', () => toggle(state.id, box.checked));

    const body = document.createElement('span');
    body.className = 'switch-body';

    const name = document.createElement('span');
    name.className = 'switch-label';
    name.textContent = state.label;

    const detail = document.createElement('span');
    detail.className = 'switch-detail';
    detail.textContent = describe(state);

    body.append(name, detail);

    if (state.needsModel) {
      const flag = document.createElement('span');
      flag.className = 'flag';
      flag.textContent = 'uses AI';
      body.appendChild(flag);
    }

    row.append(box, body);
    switchList.appendChild(row);
  }
}

/** Says what the adaptation did, not what it is supposed to do. */
function describe(state: AdaptationState): string {
  if (!state.enabled) return 'Off';
  if (state.note) return state.note;
  if (state.id === 'rewriteMode') return 'Select a sentence on the page';
  return state.changed === 1 ? '1 element changed' : `${state.changed} elements changed`;
}

function toggle(adaptationId: string, on: boolean): void {
  if (!activePresetId) return;

  const off = disabledByPreset.get(activePresetId) ?? new Set<string>();
  if (on) off.delete(adaptationId);
  else off.add(adaptationId);
  disabledByPreset.set(activePresetId, off);

  // Reapplying with the new list is how a switch takes effect. Undoing one
  // adaptation in place would leave the others to guess what changed.
  applyPreset(activePresetId);
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Popup element #${id} was not found.`);
  return found as T;
}

function text(root: HTMLElement, selector: string, value: string): void {
  (root.querySelector(selector) as HTMLElement).textContent = value;
}
