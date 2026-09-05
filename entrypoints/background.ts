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
  // Popup is the only context that reads saved settings. Chrome exposes local
  // storage to content scripts by default, so restrict it where this API is
  // available. Firefox simply skips this Chromium-specific extra hardening.
  const storageWithAccessLevel = browser.storage.local as typeof browser.storage.local & {
    setAccessLevel?: (options: { accessLevel: 'TRUSTED_CONTEXTS' }) => Promise<void>;
  };
  if (storageWithAccessLevel.setAccessLevel) {
    void storageWithAccessLevel.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch((error) => {
      console.warn('Could not restrict Reader Mode storage access.', error);
    });
  }

  browser.runtime.onMessage.addListener((message: BackgroundMessage): Promise<RewriteResponse> => {
    if (message?.type === 'ai:rewrite') {
      return rewrite(message.text, message.provider);
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
async function rewrite(text: string, provider: 'local' | 'remote'): Promise<RewriteResponse> {
  if (!text.trim()) {
    return { ok: false, text: null, blocked: false, reason: 'Nothing was selected.', source: 'none' };
  }

  // provider is deliberately received here even though both routes still use
  // the placeholder. When a model is added, this is the single place that will
  // choose the local or external implementation.
  void provider;
  return { ok: true, text: PLACEHOLDER, blocked: false, source: 'none' };
}
