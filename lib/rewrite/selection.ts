/**
 * Reads what the reader has selected and gets it ready to send to a model.
 *
 * Selection was chosen over hovering and clicking a paragraph for three reasons
 * found while testing: the browser draws the highlight itself, so nothing is
 * inserted into the page; it works from the keyboard with shift and the arrow
 * keys, and from touch with a long press; and nothing at all happens on the page
 * until the reader acts.
 */

export interface SelectionRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface SelectionSnapshot {
  /** Exactly what the browser reported. */
  raw: string;
  /** Cleaned up, this is what gets sent onward. */
  text: string;
  /** The tagged block the selection sits in, when it sits in only one. */
  blockId: string | null;
  /** Union box of the selection, in viewport coordinates. */
  rect: SelectionRect | null;
  /** A copy of the selected range, used only inside this same webpage. */
  range: Range;
}

/**
 * Citation markers such as [1] come along with the selection. Measured on the
 * English Wikipedia article for ADHD, a plain sentence selection came back as
 * "...disorder (ADHD)[1] is a neurodevelopmental disorder...". Sending that to a
 * model invites it to explain the marker, so it goes first.
 */
export function cleanText(raw: string): string {
  return raw
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MINIMUM_CHARACTERS = 8;
const MAXIMUM_CHARACTERS = 600;

/**
 * Returns null when there is nothing usable selected, so the caller has one
 * thing to check rather than several.
 */
export function readSelection(documentRef: Document = document): SelectionSnapshot | null {
  const view = documentRef.defaultView;
  const selection = view?.getSelection();

  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const raw = selection.toString();
  const text = cleanText(raw);

  if (text.length < MINIMUM_CHARACTERS || text.length > MAXIMUM_CHARACTERS) return null;

  const range = selection.getRangeAt(0);

  if (isInsideEditableField(range.commonAncestorContainer)) return null;

  return {
    raw,
    text,
    blockId: findBlockId(range.commonAncestorContainer),
    rect: toRect(range.getBoundingClientRect()),
    range: range.cloneRange(),
  };
}

/**
 * A selection inside a search box or a comment field is the reader typing, not
 * the reader asking about the page.
 */
function isInsideEditableField(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;

  if (!element) return false;

  return Boolean(element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
}

function findBlockId(node: Node): string | null {
  const element = node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;

  const block = element?.closest('[data-reader-block-id]');

  return block?.getAttribute('data-reader-block-id') ?? null;
}

/**
 * getClientRects returns one rectangle per inline fragment, not one per line. A
 * selection of 251 characters across three lines of the ADHD article returned 27
 * of them, the last only 4 pixels wide. The union box is the only one that is
 * safe to position anything against.
 */
function toRect(box: DOMRect): SelectionRect {
  return {
    top: box.top,
    left: box.left,
    bottom: box.bottom,
    right: box.right,
    width: box.width,
    height: box.height,
  };
}
