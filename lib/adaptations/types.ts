/**
 * The one shape every adaptation has to fit.
 *
 * The runtime never imports an adaptation directly. It looks one up in the
 * registry by id and calls apply/reset. That is what lets a new feature be added
 * as one new file plus one line in the registry, with nothing else changed.
 */

export interface AdaptationContext {
  /** The document being adapted. Passed in so tests can supply their own. */
  document: Document;
  /** The container the extraction step decided holds the main content. */
  root: HTMLElement;
  /** Text blocks the extraction step tagged, in document order. */
  blocks: HTMLElement[];
}

export interface AdaptationResult {
  ok: boolean;
  /** How many elements were actually changed. Shown in the popup, asserted in tests. */
  changed: number;
  /** Why nothing happened, when changed is 0 and that was expected. */
  skipped?: string;
}

export interface Adaptation<TOptions extends object = Record<string, never>> {
  id: string;

  /** What the reader sees in the list of switches. Plain words, no jargon. */
  label: string;

  /**
   * Whether this adaptation needs a language model.
   *
   * Only adaptations with needsModel true can cause data to leave the device, so
   * a test can assert that a whole preset is model free by checking this flag
   * rather than by reading every implementation.
   */
  needsModel: boolean;

  /** Values used for any option a profile leaves out. */
  defaults: TOptions;

  apply(context: AdaptationContext, options: TOptions): Promise<AdaptationResult>;

  reset(context: AdaptationContext): void;
}

/**
 * The registry holds adaptations whose option types differ, so it stores them
 * with the option type widened to a plain object. Method parameters are
 * bivariant in TypeScript, which is what makes this assignment legal without a
 * cast at every registration.
 */
export type AnyAdaptation = Adaptation<object>;

/** Fills in the defaults for the options a profile did not specify. */
export function withDefaults<TOptions extends object>(
  defaults: TOptions,
  provided: Partial<TOptions> | undefined,
): TOptions {
  return { ...defaults, ...(provided ?? {}) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
