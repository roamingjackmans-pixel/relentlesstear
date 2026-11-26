// Pim Spool's stalls in the second half. Pim goes where the customers go, including places that should be
// impossible to sell things in.
import type { ShopDef } from '../data/types';

const basics = (bun: number, salts: number, vial: number, will: number) => [
  { item: 'honey_bun', price: bun },
  { item: 'smelling_salts', price: salts },
  { item: 'ember_vial', price: vial },
  { item: 'frost_vial', price: vial },
  { item: 'storm_vial', price: vial },
  { item: 'spool_of_will', price: will },
];

export const SHOPS_B: ShopDef[] = [
  {
    id: 'shop_pim_fray',
    name: 'Pim’s Drifting Stall',
    stock: [
      ...basics(150, 100, 300, 600),
      { item: 'silk_fine', price: 350 },
      { item: 'silk_gilded', price: 900 },
      { item: 'p_light_feet', price: 2200 },
      { item: 'p_steady_hand', price: 2600 },
      { item: 'w_ash_3', price: 4200 },
    ],
  },
  {
    id: 'shop_pim_spindlehold',
    name: 'Pim’s Contraband Cart',
    stock: [
      ...basics(160, 110, 320, 650),
      { item: 'golden_thread', price: 1400 },
      { item: 'silk_gilded', price: 900 },
      { item: 'silk_star', price: 3000 },
      { item: 'p_counterweight', price: 3000 },
      { item: 'p_hunters_mark', price: 2800 },
      { item: 'w_rook_3', price: 5200 },
    ],
  },
  {
    id: 'shop_pim_seam',
    name: 'Pim’s Evacuation Sale',
    stock: [
      ...basics(120, 90, 300, 600),
      { item: 'golden_thread', price: 1400 },
      { item: 'silk_gilded', price: 900 },
      { item: 'silk_star', price: 3000 },
      { item: 'p_wildfire', price: 3200 },
      { item: 'p_ambusher', price: 2600 },
    ],
  },
  {
    id: 'shop_pim_underweave',
    name: 'Pim’s Little Boat',
    stock: [
      ...basics(180, 120, 340, 700),
      { item: 'golden_thread', price: 1500 },
      { item: 'silk_star', price: 3000 },
      { item: 'p_scholars_ribbon', price: 3000 },
      { item: 'o_tess_1', price: 1800 },
      { item: 'w_tess_2', price: 4800 },
    ],
  },
  {
    id: 'shop_pim_spire',
    name: 'Pim’s Final Sale (Everything Must Go)',
    stock: [
      ...basics(180, 120, 340, 700),
      { item: 'golden_thread', price: 1500 },
      { item: 'silk_star', price: 3000 },
      { item: 'p_shatterpoint', price: 5200 },
      { item: 'w_tess_3', price: 8800 },
    ],
  },
];
