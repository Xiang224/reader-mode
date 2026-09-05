import './style.css';
import { browser } from 'wxt/browser';
import type { ContentCommand, ContentResponse } from '../../lib/messages';
import { listPresets } from '../../lib/profiles';
import {
  copySettings,
  createEmptySettings,
  normaliseSettings,
  settingsFromPreset,
  type FeatureId,
  type FeatureSetting,
  type ReaderSettings,
} from '../../lib/settings';
import type { PageCapabilities } from '../../lib/page/eligibility';

const STORAGE_KEY = 'reader-mode.settings.v1';

const GROUPS: Array<{ title: string; ids: FeatureId[] }> = [
  { title: 'Reading', ids: ['fontSize', 'lineSpacing', 'contrast'] },
  { title: 'Focus', ids: ['hideAds', 'highlight'] },
  { title: 'AI support', ids: ['rewriteMode'] },
];

const LABELS: Record<FeatureId, string> = {
  fontSize: 'Larger text',
  lineSpacing: 'More space between lines',
  contrast: 'Softer page colours',
  hideAds: 'Hide advertisements',
  highlight: 'Highlight text I select',
  rewriteMode: 'Explain selected text',
};

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Popup root element was not found.');

app.innerHTML = `
  <main class="popup">
    <h1>Reader Mode</h1>
    <p class="status" id="status">Loading saved settings...</p>

    <section>
      <h2>Start with a preset</h2>
      <div class="presets" id="presets"></div>
    </section>

    <section class="features" id="features"></section>

    <p class="privacy-note" id="privacy-note" hidden>
      External AI sends only the selected text to an outside service when one is connected.
    </p>

    <div class="actions">
      <button class="reset" id="reset" type="button">Turn everything off</button>
    </div>
  </main>
`;

const statusElement = element<HTMLParagraphElement>('status');
const presetsElement = element<HTMLDivElement>('presets');
const featuresElement = element<HTMLElement>('features');
const privacyNote = element<HTMLParagraphElement>('privacy-note');
const resetButton = element<HTMLButtonElement>('reset');

// Popup owns this one object. A preset fills it with defaults; manual changes
// edit it directly; Content receives this same final list of feature settings.
let settings: ReaderSettings = createEmptySettings();
let capabilities: PageCapabilities | null = null;
let pageHasActiveSettings = false;

for (const preset of listPresets()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'preset';
  button.dataset.presetId = preset.id;
  button.innerHTML = '<span class="label"></span><span class="description"></span>';
  text(button, '.label', preset.label);
  text(button, '.description', preset.description);
  button.addEventListener('click', () => choosePreset(preset.id));
  presetsElement.appendChild(button);
}

resetButton.addEventListener('click', turnEverythingOff);
void initialise();

async function initialise(): Promise<void> {
  const [saved, response] = await Promise.all([loadSettings(), requestStatus()]);
  settings = saved;

  if (!response.ok) {
    statusElement.textContent = response.error;
    render();
    return;
  }

  capabilities = response.capabilities;
  pageHasActiveSettings = response.hasActiveSettings;

  // 页面能力比保存的用户偏好优先。即使这页所有已保存功能都被灰掉，也要
  // 发送一次全关的 effectiveSettings，撤销动态网页上可能遗留的旧样式。
  if (pageHasActiveSettings || settings.features.some((feature) => feature.enabled)) {
    applyFeaturesToCurrentPage(settings.features.map((feature) => feature.id));
  }

  render();
}

async function loadSettings(): Promise<ReaderSettings> {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    return normaliseSettings(stored[STORAGE_KEY]);
  } catch (error) {
    console.warn('Could not load Reader Mode settings.', error);
    return createEmptySettings();
  }
}

function saveSettings(): void {
  void browser.storage.local.set({ [STORAGE_KEY]: copySettings(settings) }).catch((error) => {
    console.warn('Could not save Reader Mode settings.', error);
  });
}

async function requestStatus(): Promise<ContentResponse> {
  try {
    const tab = await activeTab();
    return (await browser.tabs.sendMessage(tab.id, { type: 'reader:status' })) as ContentResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not reach Reader Mode on this page.',
    };
  }
}

function choosePreset(presetId: string): void {
  settings = settingsFromPreset(presetId);
  saveSettings();
  render();
  applyFeaturesToCurrentPage(settings.features.map((feature) => feature.id));
}

function changeFeature(id: FeatureId, patch: Partial<FeatureSetting>): void {
  const next = copySettings(settings);
  const feature = findFeature(next, id);

  if (typeof patch.enabled === 'boolean') feature.enabled = patch.enabled;
  if (patch.options) feature.options = { ...feature.options, ...patch.options };

  // A manual change means the selected preset is now only the starting point.
  next.selectedPresetId = null;
  settings = next;
  saveSettings();
  render();
  applyFeaturesToCurrentPage([id]);
}

/**
 * A preset or first Popup open needs to synchronise every switch. A normal
 * checkbox/slider change passes only its own id, so unrelated functions do
 * not undo or redo themselves.
 */
function applyFeaturesToCurrentPage(ids: FeatureId[]): void {
  if (!capabilities) return;

  const effectiveSettings = createEffectiveSettings();
  for (const id of ids) {
    const feature = findFeature(effectiveSettings, id);
    dispatch({ type: 'reader:set-feature', feature: { ...feature, options: { ...feature.options } } });
  }
  pageHasActiveSettings = effectiveSettings.features.some((feature) => feature.enabled);
  renderActions();
}

function turnEverythingOff(): void {
  settings = createEmptySettings();
  saveSettings();
  dispatch({ type: 'reader:reset-all' });
  pageHasActiveSettings = false;
  render();
}

function dispatch(command: Exclude<ContentCommand, { type: 'reader:status' }>): void {
  void activeTab()
    .then((tab) => browser.tabs.sendMessage(tab.id, command))
    .catch((error) => {
      statusElement.textContent = error instanceof Error ? error.message : String(error);
    });
}

async function activeTab(): Promise<{ id: number }> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab.');
  return { id: tab.id };
}

function render(): void {
  renderStatus();
  renderPresets();
  renderFeatures();
  renderActions();
}

function renderStatus(): void {
  if (!capabilities) return;

  if (!capabilities.readingAdaptations.allowed) {
    const selectionToolsAvailable = capabilities.selectionHighlight.allowed || capabilities.explainSelection.allowed;
    statusElement.textContent = selectionToolsAvailable
      ? `${capabilities.readingAdaptations.reason} Selection tools are still available.`
      : capabilities.readingAdaptations.reason;
    return;
  }

  const preset = settings.selectedPresetId
    ? listPresets().find((item) => item.id === settings.selectedPresetId)
    : undefined;
  const hasEnabledFeature = settings.features.some((feature) => feature.enabled);

  if (preset) {
    statusElement.textContent = pageHasActiveSettings
      ? preset.description
      : `${preset.label} is saved.`;
  } else if (hasEnabledFeature) {
    statusElement.textContent = pageHasActiveSettings
      ? 'Custom settings are active.'
      : 'Custom settings are saved.';
  } else {
    statusElement.textContent = 'Choose a preset or turn on individual features.';
  }
}

function renderPresets(): void {
  for (const button of Array.from(presetsElement.querySelectorAll<HTMLButtonElement>('button'))) {
    const preset = listPresets().find((item) => item.id === button.dataset.presetId);
    // A preset is grey only when one of its own functions cannot run here.
    button.disabled = !preset || !preset.steps.every((step) => isFeatureAvailable(step.adaptationId as FeatureId));
    button.setAttribute('aria-pressed', String(button.dataset.presetId === settings.selectedPresetId));
  }
}

function renderFeatures(): void {
  featuresElement.replaceChildren();

  for (const group of GROUPS) {
    const section = document.createElement('section');
    section.className = 'feature-group';
    const heading = document.createElement('h2');
    heading.textContent = group.title;
    section.appendChild(heading);

    for (const id of group.ids) {
      section.appendChild(featureRow(id, isFeatureAvailable(id)));
    }
    featuresElement.appendChild(section);
  }

  privacyNote.hidden = findFeature(settings, 'rewriteMode').options.provider !== 'remote';
}

function featureRow(id: FeatureId, available: boolean): HTMLElement {
  const feature = findFeature(settings, id);
  const row = document.createElement('div');
  row.className = 'feature-row';

  const top = document.createElement('label');
  top.className = 'switch';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = feature.enabled;
  box.disabled = !available;
  box.addEventListener('change', () => changeFeature(id, { enabled: box.checked }));
  const label = document.createElement('span');
  label.textContent = LABELS[id];
  top.append(box, label);
  row.appendChild(top);

  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.hidden = !hasControls(id);
  controls.setAttribute('aria-disabled', String(!feature.enabled || !available));
  controls.appendChild(optionControls(id, feature, available));
  row.appendChild(controls);

  return row;
}

function optionControls(id: FeatureId, feature: FeatureSetting, available: boolean): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const disabled = !feature.enabled || !available;

  if (id === 'fontSize') {
    fragment.appendChild(rangeControl('Text size', Number(feature.options.scale), 0.85, 2, 0.05, disabled,
      (value) => changeFeature(id, { options: { scale: value } })));
  }

  if (id === 'lineSpacing') {
    fragment.appendChild(rangeControl('Line spacing', Number(feature.options.lineHeight), 1.1, 2.4, 0.1, disabled,
      (value) => changeFeature(id, { options: { lineHeight: value } })));
  }

  if (id === 'contrast') {
    fragment.appendChild(selectControl('Colour', String(feature.options.preset), [
      ['cream', 'Cream'], ['high', 'High contrast'], ['dark', 'Dark'],
    ], disabled, (value) => changeFeature(id, { options: { preset: value } })));
  }

  if (id === 'highlight') {
    fragment.appendChild(selectControl('Highlight colour', String(feature.options.colour), [
      ['yellow', 'Yellow'], ['blue', 'Blue'], ['green', 'Green'],
    ], disabled, (value) => changeFeature(id, { options: { colour: value } })));
  }

  if (id === 'rewriteMode') {
    fragment.appendChild(selectControl('AI method', String(feature.options.provider), [
      ['local', 'On this device'], ['remote', 'External API'],
    ], disabled, (value) => changeFeature(id, { options: { provider: value } })));
  }

  return fragment;
}

function rangeControl(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  disabled: boolean,
  onChange: (value: number) => void,
): HTMLElement {
  const control = document.createElement('label');
  control.className = 'option';
  const caption = document.createElement('span');
  caption.textContent = `${label}: ${value.toFixed(2)}`;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.disabled = disabled;
  input.addEventListener('change', () => onChange(Number(input.value)));
  control.append(caption, input);
  return control;
}

function selectControl(
  label: string,
  value: string,
  choices: Array<[string, string]>,
  disabled: boolean,
  onChange: (value: string) => void,
): HTMLElement {
  const control = document.createElement('label');
  control.className = 'option';
  const caption = document.createElement('span');
  caption.textContent = label;
  const select = document.createElement('select');
  select.disabled = disabled;

  for (const [id, textValue] of choices) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = textValue;
    option.selected = id === value;
    select.appendChild(option);
  }

  select.addEventListener('change', () => onChange(select.value));
  control.append(caption, select);
  return control;
}

function renderActions(): void {
  const available = settings.features.some((feature) => feature.enabled && isFeatureAvailable(feature.id));
  resetButton.disabled = !available;
  resetButton.hidden = !pageHasActiveSettings;
}

/** Maps the three Content-reported page capabilities onto six Popup controls. */
function isFeatureAvailable(id: FeatureId): boolean {
  if (!capabilities) return false;
  if (id === 'highlight') return capabilities.selectionHighlight.allowed;
  if (id === 'rewriteMode') return capabilities.explainSelection.allowed;
  return capabilities.readingAdaptations.allowed;
}

/**
 * Storage keeps the user's preference. Content receives a separate copy whose
 * disallowed features are off for this page only. A short page therefore does
 * not erase a reader's Dyslexia preference for the next ordinary article.
 */
function createEffectiveSettings(): ReaderSettings {
  const effective = copySettings(settings);
  for (const feature of effective.features) {
    feature.enabled = feature.enabled && isFeatureAvailable(feature.id);
  }
  return effective;
}

function findFeature(source: ReaderSettings, id: FeatureId): FeatureSetting {
  const feature = source.features.find((item) => item.id === id);
  if (!feature) throw new Error(`Missing feature setting: ${id}`);
  return feature;
}

function hasControls(id: FeatureId): boolean {
  return id !== 'hideAds';
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Popup element #${id} was not found.`);
  return found as T;
}

function text(root: HTMLElement, selector: string, value: string): void {
  (root.querySelector(selector) as HTMLElement).textContent = value;
}
