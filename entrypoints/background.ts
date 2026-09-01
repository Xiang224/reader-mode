import type { BackgroundMessage, RewriteResponse } from '../lib/messages';

/**
 * The only place in the extension that could send page text anywhere. Nothing
 * else is allowed to hold a model or open a network connection, so the answer to
 * "can what someone reads leave this machine?" is settled by reading this file.
 *
 * No model is connected. The placeholder below returns the same sentence for
 * every request, on purpose: it exercises the panel, the message types and the
 * error paths, and it is obviously not a real answer, so nobody demonstrating
 * this can mistake it for working rewriting.
 */

const PLACEHOLDER =
  'This is placeholder text. Every selection returns this same sentence, because '
  + 'no rewriting model is connected yet.';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: BackgroundMessage): Promise<RewriteResponse> => {
    if (message?.type === 'ai:rewrite') {
      return rewrite(message.text);
    }

    return Promise.resolve({
      ok: false,
      text: null,
      blocked: false,
      reason: 'Unknown background message.',
      source: 'none',
    });
  });
});

/**
 * Replace this with a real call. Everything around it already works.
 *
 * When a model is connected, the guardrail goes between the model's answer and
 * the return statement: on failure, set blocked true and leave text null, and
 * the panel will show the reason and leave the page alone.
 */
async function rewrite(text: string): Promise<RewriteResponse> {
  if (!text.trim()) {
    return { ok: false, text: null, blocked: false, reason: 'Nothing was selected.', source: 'none' };
  }

  return { ok: true, text: PLACEHOLDER, blocked: false, source: 'none' };
}
