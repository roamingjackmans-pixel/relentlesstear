// Relentless Tear: boot. One canvas for the world, one DOM layer for the UI, one Game.
import { audio } from './audio';
import { input } from './core/input';
import { Game } from './game/game';
import { registerPatterns } from './game/rewards';
import { ctx2d, fit, H, W, type View } from './render/canvas';
import { showTitle } from './ui/title';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const stage = document.getElementById('stage')!;
const wrap = document.getElementById('stage-wrap')!;
const view: View = { canvas, ctx: ctx2d(canvas), scale: 1 };
fit(view, wrap);
window.addEventListener('resize', () => fit(view, wrap));
input.attach(stage, W, H);

// sound can only start after the player touches something
const unlock = (): void => audio.unlock();
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, { passive: true });

registerPatterns();

const game = new Game(view);
(window as unknown as { rt: Game; rtInput: typeof input }).rt = game;
(window as unknown as { rtInput: typeof input }).rtInput = input;
game.start();

// wait (briefly) for the storybook fonts so the first canvas text uses them
const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
void fonts.then(() => showTitle(game));
