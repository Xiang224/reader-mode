import { requestRewrite } from '../rewrite/client';
import { createToolbar, type ReaderToolbar } from '../rewrite/toolbar';
import type { Adaptation, AdaptationContext, AdaptationResult } from './types';

export interface RewriteModeOptions {
  /** Nothing to configure yet. Kept so a preset can pass options later. */
  placeholder?: never;
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
  defaults: {},

  async apply(context: AdaptationContext): Promise<AdaptationResult> {
    const toolbar = getToolbar(context);
    toolbar.setEnabled(true);

    return { ok: true, changed: 1 };
  },

  reset(context: AdaptationContext): void {
    toolbars.get(context.document)?.setEnabled(false);
  },
};

/**
 * One panel per document, kept here rather than in the content script so that
 * the content script has no idea this feature exists.
 */
const toolbars = new WeakMap<Document, ReaderToolbar>();

function getToolbar(context: AdaptationContext): ReaderToolbar {
  const existing = toolbars.get(context.document);
  if (existing) return existing;

  const toolbar = createToolbar({
    async onRequest(snapshot) {
      const response = await requestRewrite(snapshot.text);

      if (response.blocked) {
        return {
          text: null,
          note: response.reason ?? 'The check did not pass, so the page is unchanged.',
        };
      }

      if (!response.ok || !response.text) {
        return { text: null, note: response.reason ?? 'No plainer version is available.' };
      }

      return { text: response.text, note: sourceNote(response.source) };
    },
  }, context.document);

  toolbars.set(context.document, toolbar);
  return toolbar;
}

function sourceNote(source: string): string {
  if (source === 'on-device') return 'Written on this device.';
  if (source === 'remote') return 'Written by a service outside this device.';
  return 'Placeholder text. No model is connected.';
}
