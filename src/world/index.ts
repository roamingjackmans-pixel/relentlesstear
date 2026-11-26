// The world: side-scrolling scenes, the world map's regions, shops. scenes_a.ts = Prologue + Act I regions,
// scenes_b.ts = Acts II-III and optional regions.
import type { RegionSpec, SceneSpec, ShopDef } from '../data/types';
import { REGIONS } from './regions';
import { SCENES_A } from './scenes_a';
import { SCENES_B } from './scenes_b';
import { SHOPS } from './shops';
import { SHOPS_B } from './shops_b';

export const SCENES: Record<string, SceneSpec> = Object.fromEntries([...SCENES_A, ...SCENES_B].map((s) => [s.id, s]));
export const REGION_LIST: RegionSpec[] = REGIONS;
export const REGION_MAP: Record<string, RegionSpec> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const SHOP_MAP: Record<string, ShopDef> = Object.fromEntries([...SHOPS, ...SHOPS_B].map((s) => [s.id, s]));
/** New Game plays this cutscene; it ends with goto('hm_green', ...). */
export const OPENING_CUTSCENE = 'pro_opening';
