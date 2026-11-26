// Every cutscene, bond scene, journal and NPC in one place. Act files: act_a.ts (Prologue + Act I), act_b.ts
// (Acts II-III, endings, optional content). Ids must be unique across files (tests/content.test.ts checks).
import type { BondScene, Cutscene, Journal, NpcDef } from '../data/types';
import { CUTSCENES_A } from './act_a';
import { CUTSCENES_B } from './act_b';
import { BONDS } from './bonds';
import { JOURNALS_A } from './journals_a';
import { JOURNALS_B } from './journals_b';
import { NPCS_A } from './npcs';
import { NPCS_B } from './npcs_b';

export const CUTSCENES: Record<string, Cutscene> = Object.fromEntries([...CUTSCENES_A, ...CUTSCENES_B].map((c) => [c.id, c]));
export const BOND_SCENES: BondScene[] = BONDS;
export const JOURNALS: Record<string, Journal> = Object.fromEntries([...JOURNALS_A, ...JOURNALS_B].map((j) => [j.id, j]));
export const NPCS: Record<string, NpcDef> = Object.fromEntries([...NPCS_A, ...NPCS_B].map((n) => [n.id, n]));
export const ALL_CUTSCENE_LISTS = { A: CUTSCENES_A, B: CUTSCENES_B };
