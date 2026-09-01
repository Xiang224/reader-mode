import * as styleStore from '../dom/styleStore';
import { READER_BLOCK_ID_ATTRIBUTE } from '../page/pageExtraction';
import type { Adaptation, AdaptationContext, AdaptationResult } from './types';

export interface HideAdsOptions {
  /** Extra selectors a preset can add without changing this file. */
  extraSelectors: string[];
}

/**
 * Patterns for containers that are advertisements or promotions.
 *
 * Deliberately narrow. A bare substring match on "ad" also hits "add", "admin",
 * "header-address" and "shadow", so every entry here is either a whole class
 * token, a longer word, or a known ad network's own markup.
 */
const AD_SELECTORS = [
  '[class~="ad"]',
  '[class~="ads"]',
  '[class^="ad-" i]',
  '[class*=" ad-" i]',
  '[class$="-ad" i]',
  '[class*="-ad-" i]',
  '[class*="advert" i]',
  '[class*="sponsor" i]',
  '[class*="promo" i]',
  '[id*="advert" i]',
  '[id^="google_ads"]',
  '[data-ad]',
  '[data-ad-slot]',
  'ins.adsbygoogle',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
  '[aria-label*="advertisement" i]',
];

/**
 * Hides advertisements and promotional blocks.
 *
 * The adaptation rules require the system to behave conservatively when it is
 * not sure, and never to hide something the reader needs. Three guards enforce
 * that: nothing that contains article text is hidden, nothing containing a form
 * control is hidden, and nothing that contains or equals the content root is
 * hidden. A false negative leaves an advertisement on screen. A false positive
 * removes something the reader came for, which is much worse.
 */
export const hideAds: Adaptation<HideAdsOptions> = {
  id: 'hideAds',
  label: 'Hide advertisements',
  needsModel: false,
  defaults: { extraSelectors: [] },

  async apply(context: AdaptationContext, options: HideAdsOptions): Promise<AdaptationResult> {
    const selector = [...AD_SELECTORS, ...options.extraSelectors].join(',');
    const candidates = Array.from(
      context.document.querySelectorAll<HTMLElement>(selector),
    );

    let changed = 0;
    let heldBack = 0;

    for (const element of candidates) {
      if (!isSafeToHide(element, context)) {
        heldBack += 1;
        continue;
      }

      styleStore.set(element, 'display', 'none');
      element.dataset.readerHidden = 'ad';
      changed += 1;
    }

    return {
      ok: true,
      changed,
      skipped: changed === 0
        ? candidates.length === 0
          ? 'No advertisements matched on this page.'
          : `${heldBack} matches were left alone because they hold page content.`
        : undefined,
    };
  },

  reset(context: AdaptationContext): void {
    for (const element of Array.from(
      context.document.querySelectorAll<HTMLElement>('[data-reader-hidden="ad"]'),
    )) {
      styleStore.restore(element, 'display');
      delete element.dataset.readerHidden;
    }
  },
};

function isSafeToHide(element: HTMLElement, context: AdaptationContext): boolean {
  // Never hide the article itself, or anything wrapping it.
  if (element === context.root || element.contains(context.root)) return false;

  // Never hide something that holds text we decided was the article.
  if (element.querySelector(`[${READER_BLOCK_ID_ATTRIBUTE}]`)) return false;

  // Never hide something the reader might have to use.
  if (element.querySelector('input, textarea, select, button')) return false;

  // Skip anything already hidden, so the count means what it says.
  if (element.offsetParent === null && element.style.display !== '') return false;

  return true;
}
