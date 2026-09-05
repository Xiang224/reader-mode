/**
 * A page can be unsuitable for article-wide changes but still suitable for a
 * reader deliberately selecting a short piece of text. The Popup uses these
 * three capabilities to disable only the controls that are unsafe or useless.
 */

export type EligibilityCode =
  | 'ok'
  | 'unsupported-protocol'
  | 'sensitive-page'
  | 'not-enough-text';

export interface Capability {
  allowed: boolean;
  code: EligibilityCode;
  reason: string;
}

export interface PageCapabilities {
  /** Font, spacing, contrast and clutter changes need a readable article. */
  readingAdaptations: Capability;
  /** A local mark can still be useful on a short normal webpage. */
  selectionHighlight: Capability;
  /** Never offer text transmission on known sign-in or payment pages. */
  explainSelection: Capability;
}

/** Kept for the earlier verification fixture that asks the old yes/no question. */
export interface EligibilityResult {
  eligible: boolean;
  code: EligibilityCode;
  reason: string;
}

const SENSITIVE_PATH = /(^|\/)(login|signin|sign-in|register|signup|sign-up|password|checkout|payment|billing|account|banking)(\/|$|\?)/i;
const MINIMUM_BLOCKS = 3;

export interface EligibilityInput {
  url: string;
  blockCount: number;
  hasPasswordField: boolean;
}

const ORDINARY_PAGE: Capability = {
  allowed: true,
  code: 'ok',
  reason: 'This page can be adapted.',
};

function blocked(code: EligibilityCode, reason: string): Capability {
  return { allowed: false, code, reason };
}

/**
 * Early rules only. They are deliberately small and easy to revise after team
 * discussion; they are not a claim to recognise every sensitive webpage.
 */
export function checkPageCapabilities(input: EligibilityInput): PageCapabilities {
  let parsed: URL;

  try {
    parsed = new URL(input.url);
  } catch {
    return allUnavailable(blocked('unsupported-protocol', 'This is not a normal web page.'));
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return allUnavailable(blocked('unsupported-protocol', 'Reader Mode only works on ordinary web pages.'));
  }

  if (input.hasPasswordField || SENSITIVE_PATH.test(parsed.pathname)) {
    return {
      readingAdaptations: blocked('sensitive-page', 'This looks like a sign-in or payment page, so article changes are off.'),
      selectionHighlight: {
        allowed: true,
        code: 'ok',
        reason: 'Local highlighting is available on this page.',
      },
      explainSelection: blocked('sensitive-page', 'Explain is off on sign-in and payment pages to protect selected text.'),
    };
  }

  if (input.blockCount < MINIMUM_BLOCKS) {
    return {
      readingAdaptations: blocked('not-enough-text', 'There is not enough article text for page-wide changes.'),
      selectionHighlight: {
        allowed: true,
        code: 'ok',
        reason: 'You can still highlight text you choose.',
      },
      explainSelection: {
        allowed: true,
        code: 'ok',
        reason: 'You can still explain text you choose.',
      },
    };
  }

  return {
    readingAdaptations: ORDINARY_PAGE,
    selectionHighlight: ORDINARY_PAGE,
    explainSelection: ORDINARY_PAGE,
  };
}

function allUnavailable(capability: Capability): PageCapabilities {
  return {
    readingAdaptations: capability,
    selectionHighlight: capability,
    explainSelection: capability,
  };
}

/** Compatibility wrapper for existing verification fixtures. */
export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const reading = checkPageCapabilities(input).readingAdaptations;
  return { eligible: reading.allowed, code: reading.code, reason: reading.reason };
}

/** Gathers the small amount of live-page information the rules need. */
export function readEligibilityInput(documentRef: Document, blockCount: number): EligibilityInput {
  return {
    url: documentRef.location?.href ?? '',
    blockCount,
    hasPasswordField: Boolean(documentRef.querySelector('input[type="password"]')),
  };
}
