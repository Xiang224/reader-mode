import { browser } from 'wxt/browser';
import type { ContentCommand, ContentResponse } from '../lib/messages';
import { createReaderRuntime, type ReaderRuntime } from '../lib/readerRuntime';

/**
 * Routing only. Every decision belongs in lib, so that the parts can be tested
 * without loading an extension and so that several people can work on features
 * without editing this file.
 *
 * Note what is not here: nothing mentions font size, advertisements or
 * rewriting. Adding a feature does not bring this file into the change.
 */

declare global {
  interface Window {
    __readerMode?: ReaderRuntime;
  }
}

export default defineContentScript({
  matches: ['*://*/*'],

  main() {
    const runtime = createReaderRuntime();

    // Handy while developing: the runtime can be driven from the page console.
    window.__readerMode = runtime;

    browser.runtime.onMessage.addListener((message: ContentCommand): Promise<ContentResponse> =>
      handle(message).catch((error: unknown) => ({
        ok: false as const,
        error: error instanceof Error ? error.message : 'Reader Mode command failed.',
      })));

    async function handle(message: ContentCommand): Promise<ContentResponse> {
      switch (message.type) {
        case 'reader:status':
          runtime.refresh();
          return report();

        case 'reader:apply-preset':
          await runtime.applyPreset(message.presetId, message.disabled ?? []);
          return report();

        case 'reader:reset':
          runtime.reset();
          return report();

        default:
          return { ok: false, error: 'Unknown Reader Mode command.' };
      }
    }

    function report(): ContentResponse {
      return { ok: true, ...runtime.status() };
    }
  },
});
