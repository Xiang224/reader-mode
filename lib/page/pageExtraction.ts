export interface PageExtraction {
  root: HTMLElement;
  blocks: HTMLElement[];
}

export const READER_BLOCK_ID_ATTRIBUTE = 'data-reader-block-id';

const TEXT_BLOCK_SELECTOR = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'figcaption',
  'td',
  'th',
].join(',');

const CONTENT_ROOT_SELECTOR = [
  'article',
  'main',
  '[role="main"]',
  '[class*="article" i]',
  '[class*="content" i]',
  '[id*="content" i]',
].join(',');

const IGNORED_SELECTOR = [
  'script',
  'style',
  'noscript',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  '[hidden]',
  '[aria-hidden="true"]',
].join(',');

export function extractPage(documentRef: Document = document): PageExtraction {
  const root = findContentRoot(documentRef);
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(TEXT_BLOCK_SELECTOR))
    .filter(isReadableBlock);

  blocks.forEach((block, index) => {
    if (!block.getAttribute(READER_BLOCK_ID_ATTRIBUTE)) {
      block.setAttribute(READER_BLOCK_ID_ATTRIBUTE, `reader-block-${index + 1}`);
    }
  });

  return { root, blocks };
}

function findContentRoot(documentRef: Document): HTMLElement {
  const body = documentRef.body;
  if (!body) return documentRef.documentElement;

  // Guard added after testing on en.wikipedia.org: <html> carries the class
  // "vector-feature-limited-width-content-enabled", which matches
  // [class*="content" i], so the whole document scored highest and became the
  // root. Excluding the two elements that always contain everything is enough.
  const candidates = Array.from(documentRef.querySelectorAll<HTMLElement>(CONTENT_ROOT_SELECTOR))
    .filter((element) => element !== documentRef.documentElement && element !== body)
    .filter(isVisible)
    .map((element) => ({
      element,
      score: getText(element).length + element.querySelectorAll('p, li').length * 80,
    }))
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.score ? candidates[0].element : body;
}

function isReadableBlock(element: HTMLElement): boolean {
  if (element.closest(IGNORED_SELECTOR) || !isVisible(element)) {
    return false;
  }

  const text = getText(element);
  const isHeading = /^H[1-6]$/.test(element.tagName);

  return isHeading ? text.length > 0 : text.length >= 24;
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && rect.width > 0
    && rect.height > 0;
}

function getText(element: HTMLElement): string {
  return (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
}
