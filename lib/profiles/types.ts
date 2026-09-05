/**
 * A preset is data, not code. It names which adaptations run and what options
 * they get. It does not decide the order: readerRuntime.ts does, so that two
 * presets listing the same adaptations always behave the same way.
 */

export interface PresetStep {
  adaptationId: string;
  /** Anything left out falls back to the adaptation's own defaults. */
  options?: Record<string, unknown>;
}

export interface Preset {
  id: string;

  /**
   * Names a difficulty, not a diagnosis. Someone picks a preset from what they
   * find hard rather than by identifying with a condition, which keeps the
   * choice from creating sensitive data at the moment it is made.
   */
  label: string;

  description: string;

  steps: PresetStep[];
}
