import type { AnyAdaptation } from './types';
import { contrast } from './contrast';
import { fontSize } from './fontSize';
import { hideAds } from './hideAds';
import { highlight } from './highlight';
import { lineSpacing } from './lineSpacing';
import { rewriteMode } from './rewriteMode';

/**
 * Every adaptation the system knows about.
 *
 * Adding a feature means writing one file and adding one line here. Nothing else
 * changes, which is what lets several people build features at the same time
 * without editing the same file.
 *
 * The array order is the order adaptations are applied in, and the reverse of it
 * is the order they are undone in. Presets choose which adaptations run, not
 * when. Letting a preset reorder them would mean the result depended on how the
 * preset happened to be written.
 *
 * Removal comes before styling, so the styling pass never spends work on a block
 * that is about to disappear. Rewriting comes last because it changes nothing on
 * the page, it only starts listening.
 */
const ORDERED: AnyAdaptation[] = [
  hideAds,
  fontSize,
  lineSpacing,
  contrast,
  highlight,
  rewriteMode,
];

const BY_ID = new Map(ORDERED.map((adaptation) => [adaptation.id, adaptation]));

export function getAdaptation(id: string): AnyAdaptation | undefined {
  return BY_ID.get(id);
}

/** All adaptations, in the fixed application order. */
export function listAdaptations(): AnyAdaptation[] {
  return [...ORDERED];
}

/** Where an adaptation sits in the fixed order. Unknown ids sort last. */
export function orderOf(id: string): number {
  const index = ORDERED.findIndex((adaptation) => adaptation.id === id);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
