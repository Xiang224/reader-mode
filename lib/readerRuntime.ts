import { contrast } from './adaptations/contrast';
import { fontSize } from './adaptations/fontSize';
import { hideAds } from './adaptations/hideAds';
import { highlight } from './adaptations/highlight';
import { lineSpacing } from './adaptations/lineSpacing';
import { rewriteMode } from './adaptations/rewriteMode';
import { withDefaults, type AdaptationContext, type AnyAdaptation } from './adaptations/types';
import * as styleStore from './dom/styleStore';
import { checkPageCapabilities, readEligibilityInput, type PageCapabilities } from './page/eligibility';
import { extractPage } from './page/pageExtraction';
import type { FeatureSetting } from './settings';

type QueuedWork = () => Promise<void> | void;

const ALL_ADAPTATIONS: AnyAdaptation[] = [
  hideAds, fontSize, lineSpacing, contrast, highlight, rewriteMode,
];

export interface ReaderRuntime {
  /** Waits for earlier page changes, then reports this page's capabilities. */
  status(): Promise<{ capabilities: PageCapabilities; hasActiveSettings: boolean }>;
  /** Replaces one feature's effect: undo itself first, then optionally do itself. */
  setFeature(feature: FeatureSetting): Promise<void>;
  /** Adds every feature's undo work to the same FIFO queue. */
  resetAll(): Promise<void>;
}

export function createReaderRuntime(documentRef: Document = document): ReaderRuntime {
  let context: AdaptationContext = buildContext(documentRef);
  let capabilities = pageCapabilities();
  let activeFeatureIds = new Set<string>();

  // Every task begins only after the earlier task has settled. A failed feature
  // is logged, but it never permanently blocks later settings or Reset.
  let queue: Promise<void> = Promise.resolve();

  function enqueue(label: string, work: QueuedWork): Promise<void> {
    const job = queue.then(work);
    queue = job.catch((error: unknown) => {
      console.warn(`Reader Mode queued work failed: ${label}`, error);
    });
    return job.catch(() => undefined);
  }

  /** Like enqueue(), but preserves a read-only result for status(). */
  function enqueueResult<T>(label: string, work: () => Promise<T> | T): Promise<T> {
    const job = queue.then(work);
    queue = job.then(
      () => undefined,
      (error: unknown) => {
        console.warn(`Reader Mode queued work failed: ${label}`, error);
      },
    );
    return job;
  }

  function buildContext(doc: Document): AdaptationContext {
    const page = extractPage(doc);
    return { document: doc, root: page.root, blocks: page.blocks };
  }

  function pageCapabilities(): PageCapabilities {
    return checkPageCapabilities(readEligibilityInput(documentRef, context.blocks.length));
  }

  function refreshPage(): void {
    context = buildContext(documentRef);
    capabilities = pageCapabilities();
  }

  function queueUndoAll(): void {
    // Every reset must be safe even if its feature never ran. Reverse is only a
    // small safety measure for shared DOM state, not a user-facing priority.
    for (const adaptation of [...ALL_ADAPTATIONS].reverse()) {
      enqueue(`undo ${adaptation.id}`, () => {
        adaptation.reset(context);
        activeFeatureIds.delete(adaptation.id);
      });
    }

    enqueue('restore saved styles', () => styleStore.restoreAll());
  }

  return {
    status() {
      return enqueueResult('refresh status', () => {
        refreshPage();
        return { capabilities, hasActiveSettings: activeFeatureIds.size > 0 };
      });
    },

    setFeature(feature) {
      const adaptation = getAdaptation(feature.id);
      if (!adaptation) return queue;

      // A normal click only touches its own feature. Calling reset first is
      // deliberately safe on the first use: every reset() must do nothing
      // rather than fail when that feature has never been applied.
      enqueue(`undo ${feature.id}`, () => {
        adaptation.reset(context);
        activeFeatureIds.delete(adaptation.id);
      });

      if (feature.enabled) {
        enqueue(`do ${feature.id}`, async () => {
          const options = withDefaults(adaptation.defaults, feature.options);
          const result = await adaptation.apply(context, options);
          if (result.ok) activeFeatureIds.add(adaptation.id);
        });
      }

      return queue;
    },

    resetAll() {
      queueUndoAll();
      return queue;
    },
  };
}

/** Direct lookup is deliberately readable for the fixed six-feature MVP. */
export function getAdaptation(id: string): AnyAdaptation | undefined {
  if (id === 'hideAds') return hideAds;
  if (id === 'fontSize') return fontSize;
  if (id === 'lineSpacing') return lineSpacing;
  if (id === 'contrast') return contrast;
  if (id === 'highlight') return highlight;
  if (id === 'rewriteMode') return rewriteMode;
  return undefined;
}

export function listAdaptations(): AnyAdaptation[] {
  return [...ALL_ADAPTATIONS];
}
