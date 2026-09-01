import type { Preset } from './types';

/**
 * Rewriting is not applied to the page. Switching this preset on starts the
 * panel listening, and nothing happens until the reader selects a sentence.
 */
export const autism: Preset = {
  id: 'autism',
  label: 'Clearer wording',
  description: 'Select any sentence to see a plainer version of it beside the original.',
  steps: [
    { adaptationId: 'rewriteMode' },
  ],
};
