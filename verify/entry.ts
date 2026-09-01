import * as styleStore from '../lib/dom/styleStore';
import { extractPage } from '../lib/page/pageExtraction';
import { checkEligibility, readEligibilityInput } from '../lib/page/eligibility';
import { fontSize } from '../lib/adaptations/fontSize';
import { lineSpacing } from '../lib/adaptations/lineSpacing';
import { contrast } from '../lib/adaptations/contrast';
import { hideAds } from '../lib/adaptations/hideAds';
import { highlight } from '../lib/adaptations/highlight';
import { getAdaptation, orderOf, listAdaptations } from '../lib/adaptations/registry';
import { withDefaults } from '../lib/adaptations/types';
import { listPresets, getPreset } from '../lib/profiles';
import { cleanText, readSelection } from '../lib/rewrite/selection';
import { createReaderRuntime } from '../lib/readerRuntime';
import { rewriteMode } from '../lib/adaptations/rewriteMode';
import * as fixtures from './fixtures';

(window as any).RM = {
  styleStore, extractPage, checkEligibility, readEligibilityInput,
  fontSize, lineSpacing, contrast, hideAds, highlight,
  getAdaptation, orderOf, listAdaptations, withDefaults,
  listPresets, getPreset, cleanText, readSelection,
  createReaderRuntime, rewriteMode,
  fixtures,
};
