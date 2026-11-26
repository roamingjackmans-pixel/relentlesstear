// Acts II-III: Ch5 The Frayed Expanse, Ch6 Spindlehold, Ch7 The Seam of Ages, Ch8 The Underweave,
// Ch9 The Loomspire (the choice and both endings), plus the Glass Orchard and the First Thread.
import type { Cutscene } from '../data/types';
import { CH5 } from './act_b_ch5';
import { CH6 } from './act_b_ch6';
import { CH7 } from './act_b_ch7';
import { CH8 } from './act_b_ch8';
import { CH9 } from './act_b_ch9';
import { EXTRA_B } from './act_b_extra';

export const CUTSCENES_B: Cutscene[] = [...CH5, ...CH6, ...CH7, ...CH8, ...CH9, ...EXTRA_B];
