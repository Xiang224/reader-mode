import * as styleStore from '../dom/styleStore';
import type { Adaptation, AdaptationContext, AdaptationResult } from './types';

export interface HighlightOptions {
  /** Which block types to emphasise. Tag names, uppercase. */
  tags: string[];
  /** Width of the bar drawn beside each one. */
  barPx: number;
}

/**
 * Marks the headings so the shape of a long page is visible at a glance.
 *
 * A coloured background was the obvious first idea and it was the wrong one. It
 * fights whatever the contrast adaptation has just done to the page, and on a
 * dark scheme a pale highlight is a glare source rather than a help. A bar down
 * the left edge uses position instead of colour, so the two adaptations stop
 * competing for the same property.
 */
export const highlight: Adaptation<HighlightOptions> = {
  id: 'highlight',
  label: 'Mark the headings',
  needsModel: false,
  defaults: { tags: ['H1', 'H2', 'H3'], barPx: 4 },

  async apply(context: AdaptationContext, options: HighlightOptions): Promise<AdaptationResult> {
    let changed = 0;

    for (const block of context.blocks) {
      if (!options.tags.includes(block.tagName)) continue;

      styleStore.set(block, 'border-left', `${options.barPx}px solid currentColor`);
      styleStore.set(block, 'padding-left', '0.6em');
      block.dataset.readerHighlighted = 'heading';
      changed += 1;
    }

    return {
      ok: true,
      changed,
      skipped: changed === 0 ? 'This page has no headings to mark.' : undefined,
    };
  },

  reset(context: AdaptationContext): void {
    for (const block of context.blocks) {
      if (!block.dataset.readerHighlighted) continue;

      styleStore.restore(block, 'border-left');
      styleStore.restore(block, 'padding-left');
      delete block.dataset.readerHighlighted;
    }
  },
};
