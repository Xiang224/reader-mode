/**
 * Stands in for wxt/browser so the runtime can be bundled and driven in an
 * ordinary page. The only extension API the library layer touches is
 * runtime.sendMessage, which the background worker would normally answer.
 */
export const browser = {
  runtime: {
    async sendMessage(message: { type: string; text: string }) {
      if (message.type !== 'ai:rewrite') {
        return { ok: false, text: null, blocked: false, reason: 'Unknown message.', source: 'none' };
      }
      return {
        ok: true,
        text: 'This is placeholder text. Every selection returns this same sentence, '
          + 'because no rewriting model is connected yet.',
        blocked: false,
        source: 'none',
      };
    },
  },
};
