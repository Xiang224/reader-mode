import type { Preset } from './types';
import { adhd } from './adhd';
import { autism } from './autism';
import { dyslexia } from './dyslexia';

const ALL: Preset[] = [dyslexia, adhd, autism];

const BY_ID = new Map(ALL.map((preset) => [preset.id, preset]));

export function listPresets(): Preset[] {
  return [...ALL];
}

export function getPreset(id: string): Preset | undefined {
  return BY_ID.get(id);
}

export type { Preset, PresetStep } from './types';
