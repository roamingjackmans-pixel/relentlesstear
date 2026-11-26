// Pim Spool's stock in each Act I region (he walks fast and meets the party at every Bobbin camp). Later regions'
// shops are in shops_b.ts.
import type { ShopDef } from '../data/types';

const BASICS = [
  { item: 'honey_bun', price: 40 },
  { item: 'smelling_salts', price: 30 },
];

export const SHOPS: ShopDef[] = [
  {
    id: 'shop_pim_thimble_fields',
    name: 'Pim Spool’s Cart',
    stock: [
      ...BASICS,
      { item: 'ember_vial', price: 80 },
      { item: 'silk_raw', price: 60 },
      { item: 'p_running_stitch', price: 400 },
      { item: 'p_bobbins_purse', price: 600 },
    ],
  },
  {
    id: 'shop_pim_lanternmere',
    name: 'Pim Spool’s Boat',
    stock: [
      ...BASICS,
      { item: 'ember_vial', price: 80 },
      { item: 'frost_vial', price: 80 },
      { item: 'storm_vial', price: 80 },
      { item: 'spool_of_will', price: 150 },
      { item: 'silk_raw', price: 60 },
      { item: 'p_leech_stitch', price: 900 },
      { item: 'w_orrin_2', price: 1200 },
    ],
  },
  {
    id: 'shop_pim_cindermill',
    name: 'Pim Spool’s Stall',
    stock: [
      ...BASICS,
      { item: 'ember_vial', price: 80 },
      { item: 'frost_vial', price: 80 },
      { item: 'storm_vial', price: 80 },
      { item: 'spool_of_will', price: 150 },
      { item: 'silk_raw', price: 60 },
      { item: 'silk_fine', price: 250 },
      { item: 'p_seam_seeker', price: 800 },
      { item: 'p_ember_lining', price: 700 },
    ],
  },
  {
    id: 'shop_pim_selvage',
    name: 'Pim Spool’s Windbreak',
    stock: [
      ...BASICS,
      { item: 'ember_vial', price: 80 },
      { item: 'frost_vial', price: 80 },
      { item: 'storm_vial', price: 80 },
      { item: 'spool_of_will', price: 150 },
      { item: 'golden_thread', price: 600 },
      { item: 'silk_raw', price: 60 },
      { item: 'silk_fine', price: 250 },
    ],
  },
  {
    id: 'shop_burrow',
    name: 'The Burrow Stores',
    stock: [
      ...BASICS,
      { item: 'spool_of_will', price: 150 },
      { item: 'silk_raw', price: 60 },
      { item: 'silk_fine', price: 250 },
    ],
  },
];
