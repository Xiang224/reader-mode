import { clearSelectionHighlights, type HighlightColour } from '../rewrite/highlightAction';
import { getReaderToolbar } from '../rewrite/toolbar';
import type { Adaptation, AdaptationContext, AdaptationResult } from './types';

export interface HighlightOptions {
  colour: HighlightColour;
}

/**
 * Enables the Highlight action in the shared selection toolbar. The page stays
 * unchanged until the reader selects text and chooses Highlight.
 */
export const highlight: Adaptation<HighlightOptions> = {
  id: 'highlight',
  label: 'Highlight text I select',
  needsModel: false,
  defaults: { colour: 'yellow' },

  async apply(context: AdaptationContext, options: HighlightOptions): Promise<AdaptationResult> {
    getReaderToolbar(context.document).setHighlightEnabled(true, options.colour);
    return { ok: true, changed: 1 };
  },

  reset(context: AdaptationContext): void {
    getReaderToolbar(context.document).setHighlightEnabled(false);
    // Turning this individual switch off should also remove the marks the
    // feature previously inserted, not merely stop future selections.
    clearSelectionHighlights(context.document);
  },
};
