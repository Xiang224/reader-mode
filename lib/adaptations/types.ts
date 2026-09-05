/**
 * The one shape every adaptation has to fit.
 *
 * readerRuntime.ts imports the current six adaptations directly and uses their
 * id to choose which apply/reset function to call. Keeping this shared shape
 * still means every feature exposes the same small interface.
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
 * The runtime's direct feature lookup stores adaptations whose option types
 * differ with the option type widened to a plain object. Method parameters are
 * bivariant in TypeScript, which makes that shared representation legal.
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
