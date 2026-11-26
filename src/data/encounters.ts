import type { EncounterDef } from './types';
import { ENCOUNTERS_A } from './encounters_a';
import { ENCOUNTERS_B } from './encounters_b';

export const ENCOUNTERS: Record<string, EncounterDef> = Object.fromEntries([...ENCOUNTERS_A, ...ENCOUNTERS_B].map((e) => [e.id, e]));
