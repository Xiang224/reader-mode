/**
 * Every message that crosses between the popup, the content script and the
 * background worker. They cannot see each other's variables, so this file is the
 * only contract they share. Change a shape here and TypeScript will point at
 * both ends of it.
 */

import type { EligibilityResult } from './page/eligibility';

/* Popup to content script */

export type ContentCommand =
  | { type: 'reader:status' }
  | { type: 'reader:apply-preset'; presetId: string; disabled?: string[] }
  | { type: 'reader:reset' };

/** One switch in the popup. */
export interface AdaptationState {
  id: string;
  label: string;
  enabled: boolean;
  needsModel: boolean;
  /** How many elements it changed. Zero is a legitimate answer. */
  changed: number;
  /** Why it changed nothing, when it changed nothing. */
  note?: string;
}

export interface ReaderStatus {
  ok: true;
  eligibility: EligibilityResult;
  blockCount: number;
  activePresetId: string | null;
  /** Every adaptation in the active preset, in the order it ran. */
  adaptations: AdaptationState[];
}

export interface ContentFailure {
  ok: false;
  error: string;
}

export type ContentResponse = ReaderStatus | ContentFailure;

/* Content script to background */

export interface RewriteRequest {
  type: 'ai:rewrite';
  /** Already cleaned. The background worker does not clean it again. */
  text: string;
}

/**
 * blocked is present from the first version even though nothing sets it yet.
 * When the guardrail is added it fills this field in, and no caller has to
 * change shape to accommodate it.
 */
export interface RewriteResponse {
  ok: boolean;
  text: string | null;
  blocked: boolean;
  reason?: string;
  /** Which backend answered. Shown to the reader, because it decides where the text went. */
  source: 'none' | 'on-device' | 'remote';
}

export type BackgroundMessage = RewriteRequest;
