// Prologue + Act I cutscenes (Hollowmere, Thimble Fields + Bobbin Burrow, Lanternmere, Cindermill, the Selvage).
import type { Cutscene } from '../data/types';
import { PROLOGUE } from './act_a_prologue';
import { CH1 } from './act_a_ch1';
import { CH2 } from './act_a_ch2';
import { CH3 } from './act_a_ch3';
import { CH4 } from './act_a_ch4';

export const CUTSCENES_A: Cutscene[] = [...PROLOGUE, ...CH1, ...CH2, ...CH3, ...CH4];
