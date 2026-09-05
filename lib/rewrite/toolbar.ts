import type { AiProvider } from '../settings';
import { requestRewrite } from './client';
import { applySelectionHighlight, type HighlightColour } from './highlightAction';
import { readSelection, type SelectionSnapshot } from './selection';

const HOST_ID = 'reader-mode-toolbar-host';
const WIDTH = 320;
const GAP = 8;

/** One shared selection toolbar per webpage. Highlight and Explain use it together. */
export interface ReaderToolbar {
  setRewriteEnabled(value: boolean, provider?: AiProvider): void;
  setHighlightEnabled(value: boolean, colour?: HighlightColour): void;
  destroy(): void;
}

const toolbars = new WeakMap<Document, ReaderToolbar>();

export function getReaderToolbar(documentRef: Document = document): ReaderToolbar {
  const existing = toolbars.get(documentRef);
  if (existing) return existing;

  const toolbar = createToolbar(documentRef);
  toolbars.set(documentRef, toolbar);
  return toolbar;
}

function createToolbar(documentRef: Document): ReaderToolbar {
  let host: HTMLElement | null = null;
  let shadow: ShadowRoot | null = null;
  let rewriteEnabled = false;
  let highlightEnabled = false;
  let provider: AiProvider = 'local';
  let highlightColour: HighlightColour = 'yellow';
  let listening = false;

  function ensureHost(): HTMLElement {
    if (host) return host;

    host = documentRef.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;display:none;';

    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .panel { width: ${WIDTH}px; box-sizing: border-box; font: 14px/1.5 system-ui, sans-serif;
          background: #ffffff; color: #1a1a1a; border: 1px solid #d8d8d8; border-radius: 8px;
          padding: 10px 12px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14); }
        .original { color: #666; font-size: 13px; margin: 0 0 8px; }
        .result { margin: 8px 0 0; }
        .note { color: #8a5a00; font-size: 12px; margin: 8px 0 0; }
        .actions { display: flex; gap: 6px; flex-wrap: wrap; }
        button { font: inherit; cursor: pointer; background: #1a1a1a; color: #fff; border: 0;
          border-radius: 6px; padding: 5px 10px; }
      </style>
      <div class="panel">
        <p class="original"></p>
        <div class="actions"></div>
        <p class="result"></p>
        <p class="note"></p>
      </div>`;

    // Keep the selection alive while a toolbar button is pressed.
    host.addEventListener('mousedown', (event) => event.preventDefault());
    documentRef.body.appendChild(host);
    return host;
  }

  function place(rect: SelectionSnapshot['rect']): void {
    if (!host || !rect) return;

    const view = documentRef.defaultView!;
    const height = host.getBoundingClientRect().height || 120;
    const left = Math.max(GAP, Math.min(rect.left + rect.width / 2 - WIDTH / 2, view.innerWidth - WIDTH - GAP));
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
    const result = root.querySelector('.result') as HTMLElement;
    const note = root.querySelector('.note') as HTMLElement;
    const actions = root.querySelector('.actions') as HTMLElement;

    (root.querySelector('.original') as HTMLElement).textContent =
      snapshot.text.length > 90 ? `${snapshot.text.slice(0, 90)}...` : snapshot.text;
    result.textContent = '';
    note.textContent = '';
    actions.replaceChildren();

    if (highlightEnabled) {
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.textContent = 'Highlight';
      button.onclick = () => {
        const changed = applySelectionHighlight(snapshot, highlightColour, documentRef);
        note.textContent = changed ? 'Highlighted.' : 'The selection is no longer available.';
        if (changed) hide();
      };
      actions.appendChild(button);
    }

    if (rewriteEnabled) {
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.textContent = 'Explain this';
      button.onclick = async () => {
        button.disabled = true;
        button.textContent = 'Working...';
        const outcome = await requestRewrite(snapshot.text, provider);
        result.textContent = outcome.text ?? '';
        note.textContent = outcome.blocked
          ? outcome.reason ?? 'The check did not pass.'
          : outcome.reason ?? sourceNote(outcome.source);
        button.disabled = false;
        button.textContent = 'Explain this';
      };
      actions.appendChild(button);
    }

    element.style.display = 'block';
    place(snapshot.rect);
  }

  function onMouseUp(): void {
    if (!rewriteEnabled && !highlightEnabled) return;
    documentRef.defaultView!.setTimeout(() => {
      const snapshot = readSelection(documentRef);
      if (snapshot) show(snapshot);
      else hide();
    }, 0);
  }

  function updateListening(): void {
    const shouldListen = rewriteEnabled || highlightEnabled;
    if (shouldListen === listening) return;

    listening = shouldListen;
    if (shouldListen) {
      documentRef.addEventListener('mouseup', onMouseUp);
      documentRef.addEventListener('keyup', onMouseUp);
    } else {
      documentRef.removeEventListener('mouseup', onMouseUp);
      documentRef.removeEventListener('keyup', onMouseUp);
      hide();
    }
  }

  return {
    setRewriteEnabled(value: boolean, nextProvider: AiProvider = 'local'): void {
      rewriteEnabled = value;
      provider = nextProvider;
      updateListening();
    },

    setHighlightEnabled(value: boolean, colour: HighlightColour = 'yellow'): void {
      highlightEnabled = value;
      highlightColour = colour;
      updateListening();
    },

    destroy(): void {
      rewriteEnabled = false;
      highlightEnabled = false;
      updateListening();
      host?.remove();
      host = null;
      shadow = null;
      toolbars.delete(documentRef);
    },
  };
}

function sourceNote(source: string): string {
  if (source === 'on-device') return 'Written on this device.';
  if (source === 'remote') return 'Written by a service outside this device.';
  return 'Placeholder text. No model is connected.';
}
