import * as styleStore from '../dom/styleStore';
import { clamp, type Adaptation, type AdaptationContext, type AdaptationResult } from './types';

export interface FontSizeOptions {
  /** Multiplier applied to each block's own font size. 1 leaves the page alone. */
  scale: number;
}

const BASE_ATTRIBUTE = 'readerBaseFontSize';

/**
 * Scales each block relative to the size the page already gave it, so a heading
 * stays larger than body text instead of everything collapsing to one size.
 *
 * The base size is stored on the element the first time it is scaled. Without
 * that, applying the adaptation twice would scale an already scaled value and
 * the text would grow every click.
 */
export const fontSize: Adaptation<FontSizeOptions> = {
  id: 'fontSize',
  label: 'Larger text',
  needsModel: false,
  defaults: { scale: 1.15 },

  async apply(context: AdaptationContext, options: FontSizeOptions): Promise<AdaptationResult> {
    const scale = clamp(options.scale, 0.85, 2);
    let changed = 0;

    for (const block of context.blocks) {
      const stored = block.dataset[BASE_ATTRIBUTE];
      const base = stored
        ? Number.parseFloat(stored)
        : Number.parseFloat(context.document.defaultView!.getComputedStyle(block).fontSize);

      if (!Number.isFinite(base) || base <= 0) continue;

      block.dataset[BASE_ATTRIBUTE] = String(base);
      styleStore.set(block, 'font-size', `${(base * scale).toFixed(2)}px`);
      changed += 1;
    }

    return { ok: true, changed };
  },

  reset(context: AdaptationContext): void {
    for (const block of context.blocks) {
      styleStore.restore(block, 'font-size');
      delete block.dataset[BASE_ATTRIBUTE];
    }
  },
};
