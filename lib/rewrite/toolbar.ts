import { readSelection, type SelectionSnapshot } from './selection';

/**
 * The small panel that appears when the reader selects text.
 *
 * It never replaces anything on the page. The original stays where it is and the
 * plainer version appears next to it, because the guardrail is weakest on idiom
 * and metaphor, which is exactly what a reader will select. Keeping the original
 * in view means a bad rewrite is visible rather than silent.
 */

export interface ToolbarHandlers {
  /** Return the plainer text, or a reason it could not be produced. */
  onRequest(snapshot: SelectionSnapshot): Promise<{ text: string | null; note: string }>;
}

const HOST_ID = 'reader-mode-toolbar-host';
const WIDTH = 320;
const GAP = 8;

export interface ReaderToolbar {
  setEnabled(value: boolean): void;
  isEnabled(): boolean;
  destroy(): void;
}

export function createToolbar(
  handlers: ToolbarHandlers,
  documentRef: Document = document,
): ReaderToolbar {
  let host: HTMLElement | null = null;
  let shadow: ShadowRoot | null = null;
  let enabled = false;

  function ensureHost(): HTMLElement {
    if (host) return host;

    host = documentRef.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;display:none;';

    // A shadow root keeps the page's stylesheets out of the panel and the
    // panel's styles out of the page.
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .panel {
          width: ${WIDTH}px;
          box-sizing: border-box;
          font: 14px/1.5 system-ui, sans-serif;
          background: #ffffff;
          color: #1a1a1a;
          border: 1px solid #d8d8d8;
          border-radius: 8px;
          padding: 10px 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
        }
        .original { color: #666; font-size: 13px; margin: 0 0 8px; }
        .result { margin: 0; }
        .note { color: #8a5a00; font-size: 12px; margin: 8px 0 0; }
        button {
          font: inherit; cursor: pointer; margin-top: 8px;
          background: #1a1a1a; color: #fff; border: 0;
          border-radius: 6px; padding: 5px 10px;
        }
      </style>
      <div class="panel">
        <p class="original"></p>
        <p class="result"></p>
        <p class="note"></p>
        <button type="button">Explain this</button>
      </div>`;

    // Without this the browser clears the selection the moment the panel is
    // pressed, and by the time the click handler runs there is nothing to read.
    host.addEventListener('mousedown', (event) => event.preventDefault());

    documentRef.body.appendChild(host);
    return host;
  }

  function place(rect: SelectionSnapshot['rect']): void {
    if (!host || !rect) return;

    const view = documentRef.defaultView!;
    const height = host.getBoundingClientRect().height || 120;

    const left = Math.max(
      GAP,
      Math.min(rect.left + rect.width / 2 - WIDTH / 2, view.innerWidth - WIDTH - GAP),
    );

    // Above the selection normally, below it when there is no room above.
    const top = rect.top < height + GAP ? rect.bottom + GAP : rect.top - height - GAP;

    host.style.left = `${Math.round(left)}px`;
    host.style.top = `${Math.round(top)}px`;
  }

  function hide(): void {
    if (host) host.style.display = 'none';
  }

  function show(snapshot: SelectionSnapshot): void {
    const element = ensureHost();
    const root = shadow!;

    (root.querySelector('.original') as HTMLElement).textContent =
      snapshot.text.length > 90 ? `${snapshot.text.slice(0, 90)}...` : snapshot.text;
    (root.querySelector('.result') as HTMLElement).textContent = '';
    (root.querySelector('.note') as HTMLElement).textContent = '';

    const button = root.querySelector('button') as HTMLButtonElement;
    button.disabled = false;
    button.textContent = 'Explain this';
    button.onclick = async () => {
      button.disabled = true;
      button.textContent = 'Working...';

      const outcome = await handlers.onRequest(snapshot);

      (root.querySelector('.result') as HTMLElement).textContent = outcome.text ?? '';
      (root.querySelector('.note') as HTMLElement).textContent = outcome.note;
      button.textContent = 'Explain this';
      button.disabled = false;
    };

    element.style.display = 'block';
    // Position after it is visible, so the measured height is the real one.
    place(snapshot.rect);
  }

  function onMouseUp(): void {
    if (!enabled) return;

    // Deferred by one turn of the event loop, because the selection is not
    // settled while mouseup is still being dispatched.
    //
    // requestAnimationFrame was the first choice and it was wrong: it does not
    // fire at all in a document the browser considers unrendered, which broke
    // every test that drove the panel inside a hidden frame. What is being
    // waited for is the selection settling, not the next paint.
    documentRef.defaultView!.setTimeout(() => {
      const snapshot = readSelection(documentRef);
      if (snapshot) show(snapshot);
      else hide();
    }, 0);
  }

  return {
    setEnabled(value: boolean): void {
      enabled = value;

      if (value) {
        documentRef.addEventListener('mouseup', onMouseUp);
        // Selecting with shift and the arrow keys never fires mouseup.
        documentRef.addEventListener('keyup', onMouseUp);
      } else {
        documentRef.removeEventListener('mouseup', onMouseUp);
        documentRef.removeEventListener('keyup', onMouseUp);
        hide();
      }
    },

    isEnabled(): boolean {
      return enabled;
    },

    destroy(): void {
      this.setEnabled(false);
      host?.remove();
      host = null;
      shadow = null;
    },
  };
}
