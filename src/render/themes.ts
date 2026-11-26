// The look of each land: sky, parallax silhouette layers, ground, weather, light.
import type { ThemeId } from '../data/types';

export type LayerKind =
  | 'hills'
  | 'mountains'
  | 'trees'
  | 'pines'
  | 'willows'
  | 'buildings'
  | 'cliffs'
  | 'spires'
  | 'islands'
  | 'columns'
  | 'reeds'
  | 'wheat'
  | 'thimbles'
  | 'chimneys'
  | 'roots'
  | 'crystals'
  | 'waves'
  | 'glasstrees'
  | 'burrow';

export interface LayerSpec {
  kind: LayerKind;
  color: string;
  edge?: string;
  y: number; // base line on screen (720 high)
  h: number; // height of features
  par: number; // parallax factor
  seed: number;
  density?: number;
  lights?: string; // lit windows / glows
  alpha?: number;
}

export interface Theme {
  sky: [string, string, string];
  sun?: { x: number; y: number; r: number; color: string; glow: string };
  loom: number; // 0..1 visibility of the Loom lattice in the sky
  tear?: number; // 0..1 visibility of the Tear (a white rift)
  stars?: number;
  cloud: string;
  cloudAlpha: number;
  layers: LayerSpec[];
  ground: { top: string; bottom: string; edge: string; detail: 'grass' | 'stone' | 'mud' | 'cobble' | 'porcelain' | 'void' | 'wood' | 'glass' | 'dirt' | 'water'; tuft: string };
  seam: string;
  fog: string;
  fogAlpha: number;
  weather: 'none' | 'rain' | 'snow' | 'embers' | 'motes' | 'petals' | 'ash' | 'threads' | 'stars';
  dark: number;
  darkColor: string;
  front?: { color: string; density: number; kind: 'grass' | 'branches' | 'reeds' | 'rocks' | 'threads' | 'crystals' };
}

export const THEMES: Record<ThemeId, Theme> = {
  village_autumn: {
    sky: ['#4a5f8a', '#d99a6c', '#f6d6a0'],
    sun: { x: 980, y: 250, r: 46, color: '#fff1c4', glow: '#ffcf8a' },
    loom: 0.55,
    cloud: '#ffe2c4',
    cloudAlpha: 0.55,
    layers: [
      { kind: 'mountains', color: '#8a7aa0', edge: '#e8c4b0', y: 430, h: 130, par: 0.08, seed: 11, alpha: 0.75 },
      { kind: 'hills', color: '#a8805a', edge: '#f7d29a', y: 470, h: 70, par: 0.18, seed: 12 },
      { kind: 'trees', color: '#8a4a2a', edge: '#f0a86a', y: 500, h: 110, par: 0.35, seed: 13, density: 0.7 },
      { kind: 'buildings', color: '#5a3a2a', edge: '#f0b070', y: 540, h: 120, par: 0.6, seed: 14, density: 0.5, lights: '#ffd27a' },
    ],
    ground: { top: '#7a6a2e', bottom: '#3e3018', edge: '#c9b25a', detail: 'grass', tuft: '#a8923a' },
    seam: '#ffd36a',
    fog: '#f6d0a0',
    fogAlpha: 0.18,
    weather: 'petals',
    dark: 0,
    darkColor: '#1a1020',
    front: { color: '#2a1e10', density: 0.5, kind: 'grass' },
  },
  village_ruin: {
    sky: ['#2c2a3e', '#6a5a70', '#b8a8a8'],
    loom: 0.4,
    tear: 0.5,
    cloud: '#c8b8c0',
    cloudAlpha: 0.4,
    layers: [
      { kind: 'mountains', color: '#5a5270', y: 430, h: 120, par: 0.08, seed: 21, alpha: 0.7 },
      { kind: 'hills', color: '#6a5a5a', edge: '#c8a8a0', y: 470, h: 60, par: 0.18, seed: 22 },
      { kind: 'trees', color: '#4a3a3a', y: 505, h: 100, par: 0.35, seed: 23, density: 0.45 },
      { kind: 'buildings', color: '#3a2e2e', edge: '#a08a8a', y: 540, h: 110, par: 0.6, seed: 24, density: 0.4 },
    ],
    ground: { top: '#5a5040', bottom: '#2a2420', edge: '#8a8070', detail: 'dirt', tuft: '#6a6048' },
    seam: '#ffcf6a',
    fog: '#d8d0e0',
    fogAlpha: 0.28,
    weather: 'threads',
    dark: 0.15,
    darkColor: '#140f1c',
    front: { color: '#1a1414', density: 0.4, kind: 'rocks' },
  },
  fields_gold: {
    sky: ['#5a8ac0', '#a8c8e0', '#fbe6b0'],
    sun: { x: 300, y: 200, r: 52, color: '#fffbe0', glow: '#ffe6a0' },
    loom: 0.5,
    cloud: '#ffffff',
    cloudAlpha: 0.7,
    layers: [
      { kind: 'hills', color: '#9ab07a', edge: '#f2f0c0', y: 440, h: 60, par: 0.08, seed: 31, alpha: 0.8 },
      { kind: 'thimbles', color: '#b8a070', edge: '#fff0c0', y: 480, h: 150, par: 0.22, seed: 32, density: 0.35 },
      { kind: 'trees', color: '#6a7a3a', edge: '#e8e08a', y: 500, h: 80, par: 0.35, seed: 33, density: 0.3 },
      { kind: 'wheat', color: '#c8a03a', edge: '#ffe88a', y: 545, h: 50, par: 0.65, seed: 34 },
    ],
    ground: { top: '#b8902e', bottom: '#5a4214', edge: '#f2d06a', detail: 'grass', tuft: '#e0b84a' },
    seam: '#fff0a0',
    fog: '#fff2c8',
    fogAlpha: 0.15,
    weather: 'motes',
    dark: 0,
    darkColor: '#1a1020',
    front: { color: '#6a4a10', density: 0.6, kind: 'grass' },
  },
  marsh_night: {
    sky: ['#0c1626', '#1a3440', '#3a5a5a'],
    sun: { x: 900, y: 160, r: 30, color: '#e8f0e0', glow: '#9ac8c0' },
    loom: 0.75,
    cloud: '#4a6a70',
    cloudAlpha: 0.45,
    layers: [
      { kind: 'hills', color: '#18303a', y: 450, h: 40, par: 0.08, seed: 41 },
      { kind: 'willows', color: '#14262c', edge: '#4a8a80', y: 500, h: 170, par: 0.25, seed: 42, density: 0.6, lights: '#ffb04a' },
      { kind: 'reeds', color: '#10201e', y: 530, h: 60, par: 0.45, seed: 43 },
      { kind: 'waves', color: '#1a3a40', edge: '#5a9a90', y: 552, h: 10, par: 0.7, seed: 44 },
    ],
    ground: { top: '#2a3a2a', bottom: '#0e1810', edge: '#4a6a4a', detail: 'mud', tuft: '#3a5a3a' },
    seam: '#ffc46a',
    fog: '#6a9a98',
    fogAlpha: 0.32,
    weather: 'rain',
    dark: 0.55,
    darkColor: '#050a12',
    front: { color: '#08120e', density: 0.7, kind: 'reeds' },
  },
  mill_industrial: {
    sky: ['#2a1e22', '#7a4030', '#d0804a'],
    sun: { x: 640, y: 330, r: 70, color: '#ffb070', glow: '#ff7a3a' },
    loom: 0.35,
    cloud: '#5a3a30',
    cloudAlpha: 0.6,
    layers: [
      { kind: 'chimneys', color: '#4a2a26', y: 440, h: 200, par: 0.1, seed: 51, density: 0.5 },
      { kind: 'buildings', color: '#3a2222', edge: '#ff9a5a', y: 490, h: 170, par: 0.25, seed: 52, density: 0.8, lights: '#ffb04a' },
      { kind: 'buildings', color: '#2a1818', edge: '#e07a40', y: 540, h: 140, par: 0.55, seed: 53, density: 0.55, lights: '#ff9a3a' },
    ],
    ground: { top: '#4a3a32', bottom: '#1e1614', edge: '#8a6a5a', detail: 'cobble', tuft: '#5a4a40' },
    seam: '#ffb050',
    fog: '#a05a3a',
    fogAlpha: 0.25,
    weather: 'embers',
    dark: 0.3,
    darkColor: '#120808',
    front: { color: '#120a08', density: 0.3, kind: 'rocks' },
  },
  cliffs_wind: {
    sky: ['#5a6a80', '#9aa8b8', '#e0e4e8'],
    loom: 0.85,
    tear: 0.75,
    cloud: '#f0f2f6',
    cloudAlpha: 0.75,
    layers: [
      { kind: 'mountains', color: '#7a8698', edge: '#ffffff', y: 420, h: 180, par: 0.07, seed: 61, alpha: 0.8 },
      { kind: 'cliffs', color: '#5a6272', edge: '#e8ecf0', y: 470, h: 200, par: 0.2, seed: 62 },
      { kind: 'pines', color: '#3a4252', y: 520, h: 100, par: 0.45, seed: 63, density: 0.5 },
    ],
    ground: { top: '#6a7068', bottom: '#2a2e2e', edge: '#b0b8b0', detail: 'stone', tuft: '#8a9a7a' },
    seam: '#fff2b0',
    fog: '#ffffff',
    fogAlpha: 0.3,
    weather: 'threads',
    dark: 0,
    darkColor: '#101418',
    front: { color: '#1e2226', density: 0.4, kind: 'rocks' },
  },
  fray_surreal: {
    sky: ['#f0e8f4', '#f6dce4', '#fff8f0'],
    loom: 0.3,
    tear: 1,
    cloud: '#ffffff',
    cloudAlpha: 0.5,
    layers: [
      { kind: 'islands', color: '#d8c0d8', edge: '#ffffff', y: 380, h: 120, par: 0.08, seed: 71, alpha: 0.7, density: 0.5 },
      { kind: 'islands', color: '#c0a8c8', edge: '#ffffff', y: 450, h: 140, par: 0.2, seed: 72, density: 0.6 },
      { kind: 'trees', color: '#b09ab8', edge: '#ffe6f0', y: 520, h: 120, par: 0.45, seed: 73, density: 0.4, alpha: 0.85 },
    ],
    ground: { top: '#d8c8d8', bottom: '#a890a8', edge: '#ffffff', detail: 'void', tuft: '#e8d8e8' },
    seam: '#ff8ab0',
    fog: '#ffffff',
    fogAlpha: 0.35,
    weather: 'threads',
    dark: 0,
    darkColor: '#201020',
    front: { color: '#8a6a90', density: 0.35, kind: 'threads' },
  },
  porcelain_city: {
    sky: ['#8aa0c8', '#d8e0f0', '#fff6e8'],
    sun: { x: 640, y: 120, r: 40, color: '#ffffff', glow: '#fff0c0' },
    loom: 1,
    cloud: '#ffffff',
    cloudAlpha: 0.7,
    layers: [
      { kind: 'spires', color: '#c8ccd8', edge: '#ffffff', y: 440, h: 260, par: 0.08, seed: 81, alpha: 0.85, density: 0.5 },
      { kind: 'buildings', color: '#d8d8e0', edge: '#fff4d0', y: 500, h: 180, par: 0.25, seed: 82, density: 0.7, lights: '#ffe6a0' },
      { kind: 'columns', color: '#b8b8c4', edge: '#ffffff', y: 545, h: 200, par: 0.55, seed: 83, density: 0.35 },
    ],
    ground: { top: '#e8e4dc', bottom: '#a8a49c', edge: '#ffffff', detail: 'porcelain', tuft: '#d0c8b8' },
    seam: '#e8c060',
    fog: '#ffffff',
    fogAlpha: 0.2,
    weather: 'petals',
    dark: 0,
    darkColor: '#10101a',
    front: { color: '#7a7a88', density: 0.2, kind: 'rocks' },
  },
  seam_storm: {
    sky: ['#1a1230', '#4a3060', '#8a5a8a'],
    loom: 0.6,
    tear: 0.9,
    cloud: '#6a4a7a',
    cloudAlpha: 0.7,
    layers: [
      { kind: 'mountains', color: '#3a2a4a', y: 430, h: 140, par: 0.08, seed: 91 },
      { kind: 'hills', color: '#4a3450', edge: '#d8a0e0', y: 480, h: 70, par: 0.2, seed: 92 },
      { kind: 'trees', color: '#2a1e34', edge: '#a070c0', y: 515, h: 120, par: 0.4, seed: 93, density: 0.5 },
    ],
    ground: { top: '#4a3a4a', bottom: '#1a141e', edge: '#8a6a9a', detail: 'grass', tuft: '#5a4a5a' },
    seam: '#ffd070',
    fog: '#a080c0',
    fogAlpha: 0.25,
    weather: 'rain',
    dark: 0.35,
    darkColor: '#0a0614',
    front: { color: '#100a14', density: 0.5, kind: 'grass' },
  },
  underweave_deep: {
    sky: ['#04040e', '#0c1030', '#18204a'],
    loom: 0,
    stars: 0.0,
    cloud: '#2a3a7a',
    cloudAlpha: 0.25,
    layers: [
      { kind: 'roots', color: '#0e1430', edge: '#5a7ad0', y: 300, h: 300, par: 0.08, seed: 101, alpha: 0.9 },
      { kind: 'crystals', color: '#141c44', edge: '#8aa8ff', y: 490, h: 120, par: 0.22, seed: 102, density: 0.4, lights: '#9ab8ff' },
      { kind: 'roots', color: '#0a0e24', edge: '#4a6ac0', y: 530, h: 90, par: 0.45, seed: 103 },
    ],
    ground: { top: '#1a2248', bottom: '#060818', edge: '#5a7ad0', detail: 'water', tuft: '#2a3a7a' },
    seam: '#a8c8ff',
    fog: '#3a5aa0',
    fogAlpha: 0.25,
    weather: 'motes',
    dark: 0.5,
    darkColor: '#02030a',
    front: { color: '#04061a', density: 0.4, kind: 'crystals' },
  },
  spire_light: {
    sky: ['#fff0c8', '#fff8e8', '#ffffff'],
    loom: 1,
    cloud: '#fff8e0',
    cloudAlpha: 0.6,
    layers: [
      { kind: 'spires', color: '#f0e0b0', edge: '#ffffff', y: 420, h: 300, par: 0.06, seed: 111, alpha: 0.7, density: 0.6 },
      { kind: 'columns', color: '#e8d4a0', edge: '#ffffff', y: 500, h: 260, par: 0.2, seed: 112, density: 0.45 },
      { kind: 'columns', color: '#d8c08a', edge: '#fff8d0', y: 545, h: 240, par: 0.5, seed: 113, density: 0.3 },
    ],
    ground: { top: '#f0e0b0', bottom: '#b8a070', edge: '#ffffff', detail: 'porcelain', tuft: '#e8d8a0' },
    seam: '#ffffff',
    fog: '#ffffff',
    fogAlpha: 0.3,
    weather: 'threads',
    dark: 0,
    darkColor: '#201808',
    front: { color: '#a08a5a', density: 0.25, kind: 'threads' },
  },
  burrow: {
    sky: ['#1a120a', '#2a1e12', '#3a2a18'],
    loom: 0,
    cloud: '#3a2a1a',
    cloudAlpha: 0,
    layers: [
      { kind: 'burrow', color: '#2a1e14', edge: '#8a6a3a', y: 300, h: 260, par: 0.15, seed: 121 },
      { kind: 'roots', color: '#3a2a1a', edge: '#a07a4a', y: 520, h: 120, par: 0.4, seed: 122, lights: '#ffc46a' },
    ],
    ground: { top: '#5a4228', bottom: '#2a1e12', edge: '#a07a4a', detail: 'wood', tuft: '#6a5030' },
    seam: '#ffc46a',
    fog: '#5a3a1a',
    fogAlpha: 0.25,
    weather: 'motes',
    dark: 0.45,
    darkColor: '#0a0604',
    front: { color: '#140c06', density: 0.4, kind: 'branches' },
  },
  glass: {
    sky: ['#2a4a6a', '#6aa0c0', '#d0f0f8'],
    sun: { x: 860, y: 180, r: 40, color: '#ffffff', glow: '#c8f0ff' },
    loom: 0.7,
    cloud: '#e0f8ff',
    cloudAlpha: 0.5,
    layers: [
      { kind: 'mountains', color: '#6a90b0', edge: '#ffffff', y: 440, h: 120, par: 0.08, seed: 131, alpha: 0.7 },
      { kind: 'glasstrees', color: '#8ac0d8', edge: '#ffffff', y: 510, h: 180, par: 0.28, seed: 132, density: 0.6, alpha: 0.75 },
      { kind: 'glasstrees', color: '#5a90b0', edge: '#e0ffff', y: 545, h: 160, par: 0.55, seed: 133, density: 0.4, alpha: 0.8 },
    ],
    ground: { top: '#9ac8d8', bottom: '#3a6a80', edge: '#ffffff', detail: 'glass', tuft: '#c0e8f0' },
    seam: '#ffffff',
    fog: '#e0ffff',
    fogAlpha: 0.2,
    weather: 'motes',
    dark: 0,
    darkColor: '#081018',
    front: { color: '#2a4a5a', density: 0.3, kind: 'crystals' },
  },
};
