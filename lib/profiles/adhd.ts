import type { Preset } from './types';

export const adhd: Preset = {
  id: 'adhd',
  label: 'Fewer distractions',
  description: 'Removes advertisements, enlarges the article, and marks the headings.',
  steps: [
    { adaptationId: 'hideAds' },
    { adaptationId: 'fontSize', options: { scale: 1.15 } },
    { adaptationId: 'highlight' },
  ],
};
