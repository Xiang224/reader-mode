import { contrast } from './adaptations/contrast';
import { fontSize } from './adaptations/fontSize';
import { hideAds } from './adaptations/hideAds';
import { highlight } from './adaptations/highlight';
import { lineSpacing } from './adaptations/lineSpacing';
import { rewriteMode } from './adaptations/rewriteMode';
import { getPreset } from './profiles';

/** The six features currently shown in the popup, in a fixed display order. */
export const FEATURE_IDS = [
  'fontSize',
  'lineSpacing',
  'contrast',
  'hideAds',
  'highlight',
  'rewriteMode',
] as const;

export type FeatureId = typeof FEATURE_IDS[number];
export type AiProvider = 'local' | 'remote';

/** One concrete feature choice made by the reader. */
export interface FeatureSetting {
  id: FeatureId;
  enabled: boolean;
  options: Record<string, unknown>;
}

/**
 * The one saved configuration shared by the Popup and Content Script.
 *
 * selectedPresetId is only a UI hint. Content never uses it to decide what to
 * run: it follows features instead. This is what lets a reader start from a
 * preset and then freely change individual switches and values.
 */
export interface ReaderSettings {
  version: 1;
  selectedPresetId: string | null;
  features: FeatureSetting[];
}

function defaultFeatures(): FeatureSetting[] {
  return [
    { id: 'fontSize', enabled: false, options: { ...fontSize.defaults } },
    { id: 'lineSpacing', enabled: false, options: { ...lineSpacing.defaults } },
    { id: 'contrast', enabled: false, options: { ...contrast.defaults } },
    { id: 'hideAds', enabled: false, options: { ...hideAds.defaults } },
    { id: 'highlight', enabled: false, options: { ...highlight.defaults } },
    { id: 'rewriteMode', enabled: false, options: { ...rewriteMode.defaults } },
  ];
}

/** A blank custom configuration. It changes nothing until a switch is enabled. */
export function createEmptySettings(): ReaderSettings {
  return { version: 1, selectedPresetId: null, features: defaultFeatures() };
}

/**
 * Builds the starting configuration for a preset. The result is an ordinary
 * ReaderSettings object, so Popup can edit it exactly like a custom setup.
 */
export function settingsFromPreset(presetId: string): ReaderSettings {
  const preset = getPreset(presetId);
  if (!preset) return createEmptySettings();

  const settings = createEmptySettings();
  settings.selectedPresetId = preset.id;

  for (const step of preset.steps) {
    const feature = settings.features.find((item) => item.id === step.adaptationId);
    if (!feature) continue;

    feature.enabled = true;
    feature.options = { ...feature.options, ...(step.options ?? {}) };
  }

  return settings;
}

/**
 * Makes data read from browser.storage.local safe to use. Old, incomplete, or
 * hand-edited saved data falls back to defaults instead of breaking the popup.
 */
export function normaliseSettings(value: unknown): ReaderSettings {
  const base = createEmptySettings();
  if (!isRecord(value) || !Array.isArray(value.features)) return base;

  for (const feature of base.features) {
    const saved = value.features.find((item) => isRecord(item) && item.id === feature.id);
    if (!isRecord(saved)) continue;

    feature.enabled = saved.enabled === true;
    if (isRecord(saved.options)) {
      feature.options = { ...feature.options, ...saved.options };
    }
  }

  if (typeof value.selectedPresetId === 'string' && getPreset(value.selectedPresetId)) {
    base.selectedPresetId = value.selectedPresetId;
  }

  return base;
}

export function copySettings(settings: ReaderSettings): ReaderSettings {
  return {
    version: 1,
    selectedPresetId: settings.selectedPresetId,
    features: settings.features.map((feature) => ({
      ...feature,
      options: { ...feature.options },
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
