import type { Preset } from './types';

export const dyslexia: Preset = {
  id: 'dyslexia',
  label: 'Easier reading',
  description: 'Larger text, more space between lines, and a softer page colour.',
  steps: [
    { adaptationId: 'fontSize', options: { scale: 1.25 } },
    { adaptationId: 'lineSpacing', options: { lineHeight: 1.8, letterSpacingPx: 0.5 } },
    { adaptationId: 'contrast', options: { preset: 'cream' } },
  ],
};
