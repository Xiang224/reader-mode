import type { SelectionSnapshot } from './selection';

export type HighlightColour = 'yellow' | 'blue' | 'green';

const COLOURS: Record<HighlightColour, string> = {
  yellow: '#fff0a6',
  blue: '#b9ddff',
  green: '#c8f1d0',
};

const ATTRIBUTE = 'data-reader-selection-highlight';

/** Wraps the selected text in a mark element. The original text stays unchanged. */
export function applySelectionHighlight(
  snapshot: SelectionSnapshot,
  colour: HighlightColour,
  documentRef: Document = document,
): boolean {
  const range = snapshot.range.cloneRange();
  if (range.collapsed || !range.commonAncestorContainer.isConnected) return false;

  const mark = documentRef.createElement('mark');
  mark.setAttribute(ATTRIBUTE, 'true');
  mark.style.backgroundColor = COLOURS[colour];
  mark.style.color = 'inherit';

  // extractContents works even when a selection begins or ends inside nested
  // tags. surroundContents would throw in that common situation.
  const selected = range.extractContents();
  mark.appendChild(selected);
  range.insertNode(mark);

  documentRef.defaultView?.getSelection()?.removeAllRanges();
  return true;
}

/** Removes only highlights this extension inserted, leaving page content alone. */
export function clearSelectionHighlights(documentRef: Document = document): void {
  for (const mark of documentRef.querySelectorAll<HTMLElement>(`mark[${ATTRIBUTE}]`)) {
    mark.replaceWith(...Array.from(mark.childNodes));
  }
}
