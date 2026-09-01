/**
 * Remembers the inline style values an adaptation overwrites, so any adaptation
 * can be undone on its own without disturbing the others.
 *
 * Why this exists: a page may set inline styles of its own. Clearing a property
 * would leave the page in a state it was never in, so we write the saved value
 * back instead. Adaptations are split across files and several of them touch the
 * same element, so the bookkeeping has to live in one place.
 */

type PropertyName = string;

const saved = new Map<HTMLElement, Map<PropertyName, string>>();

/**
 * Records the element's current inline value for one property.
 * Safe to call repeatedly: only the first call for a property is kept, so an
 * adaptation applied twice still restores the true original.
 */
export function remember(element: HTMLElement, property: PropertyName): void {
  let entry = saved.get(element);

  if (!entry) {
    entry = new Map();
    saved.set(element, entry);
  }

  if (!entry.has(property)) {
    entry.set(property, element.style.getPropertyValue(property));
  }
}

/** Records the property, then writes the new value. */
export function set(element: HTMLElement, property: PropertyName, value: string): void {
  remember(element, property);
  element.style.setProperty(property, value);
}

/** Writes one property back to what it was, and forgets it. */
export function restore(element: HTMLElement, property: PropertyName): void {
  const entry = saved.get(element);
  const original = entry?.get(property);

  if (original === undefined) return;

  if (original === '') {
    element.style.removeProperty(property);
  } else {
    element.style.setProperty(property, original);
  }

  entry!.delete(property);
  if (entry!.size === 0) saved.delete(element);
}

/** Writes every property this element had recorded back to its original value. */
export function restoreElement(element: HTMLElement): void {
  const entry = saved.get(element);
  if (!entry) return;

  for (const property of Array.from(entry.keys())) {
    restore(element, property);
  }
}

/** Writes back everything, for every element. Used by the global reset. */
export function restoreAll(): void {
  for (const element of Array.from(saved.keys())) {
    restoreElement(element);
  }
  saved.clear();
}

/** How many elements currently hold saved values. Used by tests. */
export function trackedCount(): number {
  return saved.size;
}
