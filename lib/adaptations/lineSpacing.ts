import * as styleStore from '../dom/styleStore';
import { clamp, type Adaptation, type AdaptationContext, type AdaptationResult } from './types';

export interface LineSpacingOptions {
  /** Unitless multiple of the font size. */
  lineHeight: number;
  /** Extra space between letters, in pixels. */
  letterSpacingPx: number;
}

/**
 * Opens up the space between lines and letters.
 *
 * lineHeight is written without a unit on purpose. A unitless value multiplies
 * each element's own font size, so it keeps working after fontSize has run,
 * whatever order the two are applied in.
 */
export const lineSpacing: Adaptation<LineSpacingOptions> = {
  id: 'lineSpacing',
  label: 'More space between lines',
  needsModel: false,
  defaults: { lineHeight: 1.65, letterSpacingPx: 0 },

  async apply(context: AdaptationContext, options: LineSpacingOptions): Promise<AdaptationResult> {
    const lineHeight = clamp(options.lineHeight, 1.1, 2.4);
    const letterSpacing = clamp(options.letterSpacingPx, 0, 4);
    let changed = 0;

    for (const block of context.blocks) {
      styleStore.set(block, 'line-height', String(lineHeight));
      styleStore.set(block, 'letter-spacing', `${letterSpacing}px`);
      changed += 1;
    }

    return { ok: true, changed };
  },

  reset(context: AdaptationContext): void {
    for (const block of context.blocks) {
      styleStore.restore(block, 'line-height');
      styleStore.restore(block, 'letter-spacing');
    }
  },
};
