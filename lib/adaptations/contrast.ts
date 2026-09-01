import * as styleStore from '../dom/styleStore';
import type { Adaptation, AdaptationContext, AdaptationResult } from './types';

export interface ContrastOptions {
  preset: ContrastPresetName;
}

export type ContrastPresetName = 'cream' | 'high' | 'dark';

interface ContrastPreset {
  background: string;
  text: string;
}

/**
 * Measured on the English Wikipedia article for ADHD, body text against the page
 * background is already 15.30:1, well past the 7:1 that WCAG asks for at AAA.
 * Turning contrast up there would help nobody. So these presets are alternative
 * colour schemes rather than one "more contrast" slider, and the softer option
 * is the default.
 */
const PRESETS: Record<ContrastPresetName, ContrastPreset> = {
  cream: { background: '#f6f0e2', text: '#3b3527' },
  high: { background: '#ffffff', text: '#000000' },
  dark: { background: '#1b1b1d', text: '#e6e6e6' },
};

/**
 * Known limit: elements that set their own colour, links most of all, keep it.
 * Recolouring them means overriding the page's own link styling, which is a
 * separate decision about how much of the page we are willing to take over.
 */
export const contrast: Adaptation<ContrastOptions> = {
  id: 'contrast',
  label: 'Softer page colours',
  needsModel: false,
  defaults: { preset: 'cream' },

  async apply(context: AdaptationContext, options: ContrastOptions): Promise<AdaptationResult> {
    const preset = PRESETS[options.preset];

    if (!preset) {
      return { ok: false, changed: 0, skipped: `Unknown contrast preset: ${options.preset}` };
    }

    const body = context.document.body;
    let changed = 0;

    if (body) {
      styleStore.set(body, 'background-color', preset.background);
      changed += 1;
    }

    styleStore.set(context.root, 'background-color', preset.background);
    styleStore.set(context.root, 'color', preset.text);
    changed += 1;

    for (const block of context.blocks) {
      styleStore.set(block, 'color', preset.text);
      changed += 1;
    }

    return { ok: true, changed };
  },

  reset(context: AdaptationContext): void {
    const body = context.document.body;
    if (body) styleStore.restore(body, 'background-color');

    styleStore.restore(context.root, 'background-color');
    styleStore.restore(context.root, 'color');

    for (const block of context.blocks) {
      styleStore.restore(block, 'color');
    }
  },
};

/** Exposed so tests can check a preset's ratio without hard-coding the colours. */
export function getPreset(name: ContrastPresetName): ContrastPreset | undefined {
  return PRESETS[name];
}
