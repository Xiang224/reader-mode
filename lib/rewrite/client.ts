import { browser } from 'wxt/browser';
import type { RewriteRequest, RewriteResponse } from '../messages';
import type { AiProvider } from '../settings';

/**
 * The content script's only route to a model. Everything that could send text
 * off the device goes through here and then through the background worker, so
 * the question "can this page's text leave?" is answered by reading two files.
 */
export async function requestRewrite(text: string, provider: AiProvider): Promise<RewriteResponse> {
  const message: RewriteRequest = { type: 'ai:rewrite', text, provider };

  try {
    return (await browser.runtime.sendMessage(message)) as RewriteResponse;
  } catch (error) {
    return {
      ok: false,
      text: null,
      blocked: false,
      reason: error instanceof Error ? error.message : 'Could not reach the rewriter.',
      source: 'none',
    };
  }
}
