/**
 * Decides whether this page should be adapted at all, before anything touches it.
 *
 * Two jobs. It keeps the extension away from pages where reading the content is
 * not appropriate, which is part of the privacy design rather than a nicety. And
 * it gives the popup a reason to show, so "nothing happened" and "it is broken"
 * do not look the same to the user.
 */

export interface EligibilityResult {
  eligible: boolean;
  /** Machine-readable, so the popup can pick its own wording. */
  code: EligibilityCode;
  /** Plain sentence, safe to show as is. */
  reason: string;
}

export type EligibilityCode =
  | 'ok'
  | 'unsupported-protocol'
  | 'sensitive-page'
  | 'not-enough-text';

/**
 * Paths that usually mean a form holding credentials or payment details. The
 * list is deliberately short: it is a floor, not a claim to catch everything.
 */
const SENSITIVE_PATH = /(^|\/)(login|signin|sign-in|register|signup|sign-up|password|checkout|payment|billing|account|banking)(\/|$|\?)/i;

const MINIMUM_BLOCKS = 3;

export interface EligibilityInput {
  url: string;
  blockCount: number;
  hasPasswordField: boolean;
}

export function checkEligibility(input: EligibilityInput): EligibilityResult {
  let parsed: URL;

  try {
    parsed = new URL(input.url);
  } catch {
    return {
      eligible: false,
      code: 'unsupported-protocol',
      reason: 'This is not a normal web page.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      eligible: false,
      code: 'unsupported-protocol',
      reason: 'Reader Mode only works on ordinary web pages.',
    };
  }

  if (input.hasPasswordField || SENSITIVE_PATH.test(parsed.pathname)) {
    return {
      eligible: false,
      code: 'sensitive-page',
      reason: 'This looks like a sign-in or payment page, so it is left alone.',
    };
  }

  if (input.blockCount < MINIMUM_BLOCKS) {
    return {
      eligible: false,
      code: 'not-enough-text',
      reason: 'There is not enough text on this page to adapt.',
    };
  }

  return { eligible: true, code: 'ok', reason: 'This page can be adapted.' };
}

/** Gathers what checkEligibility needs from a live document. */
export function readEligibilityInput(
  documentRef: Document,
  blockCount: number,
): EligibilityInput {
  return {
    url: documentRef.location?.href ?? '',
    blockCount,
    hasPasswordField: Boolean(documentRef.querySelector('input[type="password"]')),
  };
}
