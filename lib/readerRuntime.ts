import { getAdaptation, orderOf } from './adaptations/registry';
import type { AdaptationContext } from './adaptations/types';
import { withDefaults } from './adaptations/types';
import * as styleStore from './dom/styleStore';
import type { AdaptationState } from './messages';
import { checkEligibility, readEligibilityInput, type EligibilityResult } from './page/eligibility';
import { extractPage } from './page/pageExtraction';
import { getPreset } from './profiles';

/**
 * Holds the state of one page: what was extracted, which preset is on, which of
 * its adaptations the reader has switched off, and what each one actually did.
 * It is the only thing the content script talks to.
 */
export interface ReaderRuntime {
  refresh(): void;
  status(): {
    eligibility: EligibilityResult;
    blockCount: number;
    activePresetId: string | null;
    adaptations: AdaptationState[];
  };
  applyPreset(presetId: string, disabled?: string[]): Promise<void>;
  reset(): void;
}

export function createReaderRuntime(documentRef: Document = document): ReaderRuntime {
  let context: AdaptationContext = buildContext(documentRef);
  let activePresetId: string | null = null;
  let adaptations: AdaptationState[] = [];

  function buildContext(doc: Document): AdaptationContext {
    const page = extractPage(doc);
    return { document: doc, root: page.root, blocks: page.blocks };
  }

  function eligibility(): EligibilityResult {
    return checkEligibility(readEligibilityInput(documentRef, context.blocks.length));
  }

  function undo(): void {
    // Reverse of the order they ran in, so an adaptation never writes back a
    // value another one has since replaced.
    for (const entry of [...adaptations].reverse()) {
      if (entry.enabled) getAdaptation(entry.id)?.reset(context);
    }

    // Catches anything an adaptation forgot, and anything applied before the
    // block list was rebuilt.
    styleStore.restoreAll();
    adaptations = [];
  }

  return {
    refresh(): void {
      context = buildContext(documentRef);
    },

    status() {
      return {
        eligibility: eligibility(),
        blockCount: context.blocks.length,
        activePresetId,
        adaptations: [...adaptations],
      };
    },

    async applyPreset(presetId: string, disabled: string[] = []): Promise<void> {
      const preset = getPreset(presetId);
      if (!preset) throw new Error(`Unknown preset: ${presetId}`);

      const check = eligibility();
      if (!check.eligible) throw new Error(check.reason);

      // Undo whatever is on before applying, so two presets never mix and a
      // switch can be flipped by simply reapplying.
      undo();
      this.refresh();

      // The registry decides the order, not the preset. Two presets listing the
      // same adaptations therefore always produce the same page.
      const steps = preset.steps
        .slice()
        .sort((a, b) => orderOf(a.adaptationId) - orderOf(b.adaptationId));

      const ran: AdaptationState[] = [];

      for (const step of steps) {
        const adaptation = getAdaptation(step.adaptationId);

        // An unknown id is a typo in a preset, not a reason to abandon the rest.
        if (!adaptation) continue;

        const off = disabled.includes(adaptation.id);

        if (off) {
          ran.push({
            id: adaptation.id,
            label: adaptation.label,
            enabled: false,
            needsModel: adaptation.needsModel,
            changed: 0,
          });
          continue;
        }

        const options = withDefaults(adaptation.defaults, step.options);
        const result = await adaptation.apply(context, options);

        ran.push({
          id: adaptation.id,
          label: adaptation.label,
          enabled: result.ok,
          needsModel: adaptation.needsModel,
          changed: result.changed,
          note: result.skipped,
        });
      }

      adaptations = ran;
      activePresetId = preset.id;
    },

    reset(): void {
      undo();
      activePresetId = null;
    },
  };
}
