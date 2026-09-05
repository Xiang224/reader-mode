import type { AiProvider } from '../settings';
import { getReaderToolbar } from '../rewrite/toolbar';
import type { Adaptation, AdaptationContext, AdaptationResult } from './types';

export interface RewriteModeOptions {
  provider: AiProvider;
}

/**
 * Turns on the panel that appears when the reader selects a sentence.
 *
 * It is written as an adaptation rather than as a separate mode so that the
 * reader can switch it off with the same control as everything else, and so the
 * popup needs no special case for it. It is the only adaptation with needsModel
 * set, which is what makes "does this preset send text anywhere?" a question a
 * test can answer.
 *
 * Nothing is changed on the page when this is switched on. It only starts
 * listening. That is why changed is 1 rather than a count of elements: one thing
 * was turned on.
 */
export const rewriteMode: Adaptation<RewriteModeOptions> = {
  id: 'rewriteMode',
  label: 'Explain a sentence I select',
  needsModel: true,
  defaults: { provider: 'local' },

  async apply(context: AdaptationContext, options: RewriteModeOptions): Promise<AdaptationResult> {
    getReaderToolbar(context.document).setRewriteEnabled(true, options.provider);

    return { ok: true, changed: 1 };
  },

  reset(context: AdaptationContext): void {
    getReaderToolbar(context.document).setRewriteEnabled(false);
  },
};
