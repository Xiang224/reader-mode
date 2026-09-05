/**
 * The fixed Popup ↔ Content contract. Popup states the reader's desired final
 * settings; it never sends low-level do/undo jobs. Runtime owns that queue.
 */

import type { PageCapabilities } from './page/eligibility';
import type { AiProvider, FeatureSetting } from './settings';

export type ContentCommand =
  | { type: 'reader:status' }
  // A normal Popup interaction changes one feature. Presets send several of
  // these small commands, one per feature, rather than a single "reset all".
  | { type: 'reader:set-feature'; feature: FeatureSetting }
  | { type: 'reader:reset-all' };

export interface ReaderStatus {
  ok: true;
  capabilities: PageCapabilities;
  hasActiveSettings: boolean;
}

export interface ContentFailure {
  ok: false;
  error: string;
}

export type ContentResponse = ReaderStatus | ContentFailure;

/* Content script → background worker. */
export interface RewriteRequest {
  type: 'ai:rewrite';
  text: string;
  provider: AiProvider;
}

export interface RewriteResponse {
  ok: boolean;
  text: string | null;
  blocked: boolean;
  reason?: string;
  source: 'none' | 'on-device' | 'remote';
}

export type BackgroundMessage = RewriteRequest;
