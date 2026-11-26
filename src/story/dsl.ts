// Helpers for writing story scripts. Every function returns one Cmd (see data/types.ts).
//
//   cut('pro_graduation', [
//     music('hollowmere'),
//     actor('ash', 400, 'right'), actor('orrin', 620, 'left'),
//     say('orrin', 'smile', 'Hold out your hand.'),
//     say('ash', 'shock', 'That's... your needle.'),
//   ])
import type { BondScene, CharId, ChoiceOption, Cmd, Cutscene, Emote, Expr, Grade, Pose, SfxId, Speaker, TrackId, VfxKind } from '../data/types';

export const cut = (id: string, cmds: Cmd[], repeat = false): Cutscene => ({ id, cmds, repeat });

export const say = (who: Speaker, e: Expr, text: string): Cmd => ({ t: 'say', who, e, text });
/** a speaker whose name is shown differently from their id (e.g. a hooded figure before the reveal) */
export const sayAs = (who: Speaker, name: string, e: Expr, text: string): Cmd => ({ t: 'say', who, e, text, name });
export const narrate = (text: string): Cmd => ({ t: 'narrate', text });
export const think = (who: Speaker, e: Expr, text: string): Cmd => ({ t: 'think', who, e, text });
export const choice = (...options: ChoiceOption[]): Cmd => ({ t: 'choice', options });
export const opt = (label: string, ...cmds: Cmd[]): ChoiceOption => ({ label, cmds });

export const wait = (ms: number): Cmd => ({ t: 'wait', ms });
export const fadeOut = (ms = 800, color = '#000'): Cmd => ({ t: 'fade', dir: 'out', ms, color });
export const fadeIn = (ms = 800, color = '#000'): Cmd => ({ t: 'fade', dir: 'in', ms, color });
export const title = (text: string, sub?: string, ms = 3200): Cmd => ({ t: 'title', text, sub, ms });
export const music = (track: TrackId | null, fadeMs = 1200): Cmd => ({ t: 'music', track, fadeMs });
export const sfx = (id: SfxId): Cmd => ({ t: 'sfx', id });
export const shake = (power = 6, ms = 400): Cmd => ({ t: 'shake', power, ms });
export const flash = (color = '#fff', ms = 300): Cmd => ({ t: 'flash', color, ms });
export const grade = (mode: Grade, ms = 1000): Cmd => ({ t: 'grade', mode, ms });

/** place (or move instantly) an actor; `kind` is an NPC id from npcs.ts or a party CharId (default: the id itself) */
export const actor = (id: string, x: number, face: 'left' | 'right' = 'right', pose: Pose = 'idle', kind?: string): Cmd => ({ t: 'actor', id, x, face, pose, kind });
export const walk = (id: string, x: number, speed = 1, waitDone = true): Cmd => ({ t: 'walk', id, x, speed, wait: waitDone });
export const face = (id: string, dir: 'left' | 'right'): Cmd => ({ t: 'face', id, dir });
export const pose = (id: string, p: Pose): Cmd => ({ t: 'pose', id, pose: p });
export const emote = (id: string, e: Emote): Cmd => ({ t: 'emote', id, emote: e });
export const hide = (id: string): Cmd => ({ t: 'hide', id });
export const camera = (x: number, ms = 1000): Cmd => ({ t: 'camera', x, ms });
export const vfx = (kind: VfxKind, x: number, y?: number, ms = 1200): Cmd => ({ t: 'vfx', kind, x, y, ms });

export const join = (who: CharId): Cmd => ({ t: 'join', who });
export const leave = (who: CharId): Cmd => ({ t: 'leave', who });
export const flag = (name: string, value: boolean | number | string = true): Cmd => ({ t: 'flag', name, value });
export const give = (item: string, n = 1): Cmd => ({ t: 'give', item, n });
export const glim = (n: number): Cmd => ({ t: 'glim', n });
export const battle = (enc: string, o: { loseOk?: boolean; noFlee?: boolean; ifLose?: Cmd[] } = {}): Cmd => ({ t: 'battle', enc, noFlee: true, ...o });
export const goto = (scene: string, x?: number): Cmd => ({ t: 'goto', scene, x });
export const worldmap = (at?: string): Cmd => ({ t: 'worldmap', at });
export const bond = (who: CharId, n = 1): Cmd => ({ t: 'bond', who, n });
export const unlock = (kind: 'class' | 'region' | 'weave' | 'outfit' | 'song', id: string): Cmd => ({ t: 'unlock', kind, id });
export const ifFlag = (name: string, then: Cmd[], otherwise?: Cmd[], is?: boolean | number | string): Cmd => ({ t: 'if', flag: name, is, then, else: otherwise });
export const save = (): Cmd => ({ t: 'save' });
export const chapter = (n: number, name: string): Cmd => ({ t: 'chapter', n, name });
export const healParty = (): Cmd => ({ t: 'heal' });
export const ending = (route: 'mend' | 'tear'): Cmd => ({ t: 'ending', route });
export const credits = (): Cmd => ({ t: 'credits' });
export const tutorial = (id: string): Cmd => ({ t: 'tutorial', id });
export const shop = (id: string): Cmd => ({ t: 'shop', id });
export const camp = (): Cmd => ({ t: 'camp' });

export const bondScene = (id: string, who: CharId, level: number, requires: string, titleText: string, cmds: Cmd[]): BondScene => ({ id, who, level, requires, title: titleText, cmds });
