// Pause menu (party, items, journal, settings), the party screens (stats, skills, gear, class), the shop and the
// rewards screen.
import { audio } from '../audio';
import { CHARS, xpToNext } from '../data/characters';
import { CLASSES, CLASS_MAP, classRank, classSkills, RANK_AT } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import { ITEMS, OUTFITS, PATCH_MAP, PATCHES, upgradeCost, WEAPON_MAP, WEAPON_MAX, WEAPONS, weaponAtk } from '../data/items';
import { CHAR_SKILLS, skill } from '../data/skills';
import type { CharId } from '../data/types';
import type { Game } from '../game/game';
import type { Rewards } from '../game/rewards';
import { availableSkills, count, statsOf, takeItem, tpTotal, tpUsed, type Attrs, type SaveData } from '../game/state';
import { figureFor, portrait } from '../render/actors';
import { ctx2d, makeCanvas } from '../render/canvas';
import { SHOP_MAP } from '../world';
import { JOURNALS } from '../story';
import { btn, confirmBox, fmtTime, focusFirst, h, notice, pushLayer, toast } from './dom';

function portraitEl(id: CharId, save: SaveData, w = 120, hgt = 130, expr: 'neutral' | 'smile' = 'neutral'): HTMLCanvasElement {
  const c = makeCanvas(w, hgt);
  ctx2d(c).drawImage(portrait(figureFor(id, save.chars[id]?.outfit), expr), 0, 0, w, hgt);
  return c;
}

/** what the focused control says (minus check marks), so a rebuilt list can focus the same control again */
function focusKey(): string {
  const el = document.activeElement as HTMLElement | null;
  return (el?.textContent ?? '').replace(/^[●☑☐]\s*/, '').trim();
}
function refocus(scope: HTMLElement, key: string): boolean {
  if (!key) return false;
  const hit = [...scope.querySelectorAll<HTMLElement>('[data-nav]')].find((b) => (b.textContent ?? '').replace(/^[●☑☐]\s*/, '').trim() === key);
  hit?.focus({ preventScroll: true });
  return !!hit;
}

const ATTR_INFO: [keyof Attrs, string, string][] = [
  ['vit', 'Vitality', '+12 max HP'],
  ['might', 'Might', '+2 attack'],
  ['agi', 'Agility', '+0.8 speed'],
  ['def', 'Defense', '+1.5 defense'],
  ['luck', 'Luck', '+0.5% critical chance'],
];

// ------------------------------------------------------------------ pause menu

export function openPauseMenu(g: Game, startTab: 'party' | 'items' | 'journal' | 'settings' = 'party'): Promise<void> {
  return new Promise((res) => {
    let pop: () => void = () => {};
    const close = (): void => {
      pop();
      void g.persist();
      res();
    };
    const body = h('div', { class: 'grow', style: 'display:flex;min-height:0' });
    const tabs = h('div', { class: 'tabs' });
    const guest = !!(g.net && !g.net.isHost);
    const names: [typeof startTab, string][] = guest ? [['settings', 'Settings']] : [
      ['party', 'Party'],
      ['items', 'Items'],
      ['journal', 'Journal'],
      ['settings', 'Settings'],
    ];
    const show = (t: typeof startTab): void => {
      tabs.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.t === t));
      body.innerHTML = '';
      if (t === 'party') body.append(partyView(g));
      if (t === 'items') body.append(itemsView(g));
      if (t === 'journal') body.append(journalView(g));
      if (t === 'settings') body.append(settingsView(g));
      requestAnimationFrame(() => focusFirst(body));
    };
    for (const [t, label] of names) tabs.append(h('button', { class: 'tab', 'data-nav': '1', 'data-t': t, on: { click: () => show(t) } }, label));
    const s = g.save;
    const el = h(
      'div',
      { class: 'panel menu' },
      h('div', { class: 'close' }, btn('✕', close, 'btn small ghost')),
      h('div', { class: 'row', style: 'align-items:baseline;gap:18px' }, h('h2', {}, s ? s.chapterName : 'Menu'), s ? h('span', { class: 'muted' }, `${g.explore?.spec.name ?? ''} · ${s.glim} Glim · ${fmtTime(s.playtime)}`) : null),
      tabs,
      body,
      h('div', { class: 'row', style: 'margin-top:10px;justify-content:flex-end' }, guest ? btn('Leave game', () => {
        close();
        void g.confirmQuit();
      }) : [btn('Save', () => void g.persist().then(() => toast('Saved.')), 'btn small'), btn('Title screen', () => {
        close();
        void g.confirmQuit();
      }, 'btn small')]),
    );
    pop = pushLayer(el, close);
    show(guest ? 'settings' : startTab);
  });
}

export function openPartyMenu(g: Game): Promise<void> {
  return openPauseMenu(g, 'party');
}

// ------------------------------------------------------------------ party

function partyView(g: Game): HTMLElement {
  const s = g.save;
  let sel: CharId = s.active[0] ?? 'ash';
  const wrap = h('div', { style: 'display:flex;gap:16px;width:100%;min-height:0' });
  const left = h('div', { class: 'col scroll', style: 'width:250px;flex:none;max-height:560px' });
  const right = h('div', { class: 'grow col', style: 'min-width:0' });
  const sub = h('div', { class: 'tabs', style: 'margin:0' });
  const page = h('div', { class: 'grow scroll', style: 'max-height:510px;padding-right:6px' });
  let pageName = 'stats';
  const drawLeft = (): void => {
    left.innerHTML = '';
    for (const id of s.roster) {
      const c = s.chars[id];
      const st = statsOf(s, id);
      const inParty = s.active.includes(id);
      left.append(
        h(
          'button',
          { class: `ccard ${id === sel ? 'on' : ''}`, 'data-nav': '1', style: 'display:flex;gap:10px;align-items:center', on: { click: () => {
            sel = id;
            drawLeft();
            drawPage();
          } } },
          portraitEl(id, s, 64, 70),
          h('div', { class: 'grow' }, h('div', { class: 'nm' }, CHARS[id].short), h('div', { style: 'font-size:14px' }, `Lv ${c.level} · ${Math.round(st.maxHp * c.hpFrac)}/${st.maxHp} HP`), h('div', {}, inParty ? h('span', { class: 'pill gold' }, 'In party') : h('span', { class: 'pill' }, 'Reserve'), c.attrPts ? h('span', { class: 'pill red', style: 'margin-left:4px' }, `+${c.attrPts}`) : null, c.sp ? h('span', { class: 'pill red', style: 'margin-left:4px' }, `${c.sp} SP`) : null)),
        ),
      );
    }
    if (s.roster.length > 4) left.append(h('p', { class: 'muted', style: 'font-size:14px' }, 'Pick a companion, then "Swap into party" on their Stats page.'));
    if (!g.coop) {
      left.append(
        btn(s.commandAll ? 'Commanding all four' : 'Commanding Ash only', () => {
          s.commandAll = !s.commandAll;
          toast(s.commandAll ? 'You will choose every companion\'s actions and timing.' : 'Your companions will act on their own; you play Ash.');
          drawLeft();
        }, 'btn small'),
      );
    }
  };
  const drawPage = (): void => {
    sub.innerHTML = '';
    for (const [k, label] of [
      ['stats', 'Stats'],
      ['skills', 'Skills'],
      ['gear', 'Gear'],
      ['class', 'Class'],
    ] as const)
      sub.append(h('button', { class: `tab ${pageName === k ? 'on' : ''}`, 'data-nav': '1', on: { click: () => {
        pageName = k;
        drawPage();
      } } }, label));
    page.innerHTML = '';
    const redraw = (): void => {
      const key = focusKey();
      drawLeft();
      drawPage();
      refocus(wrap, key);
    };
    if (pageName === 'stats') page.append(statsPage(g, sel, redraw));
    if (pageName === 'skills') page.append(skillsPage(g, sel, redraw));
    if (pageName === 'gear') page.append(gearPage(g, sel, redraw));
    if (pageName === 'class') page.append(classPage(g, sel, redraw));
  };
  right.append(sub, page);
  wrap.append(left, right);
  drawLeft();
  drawPage();
  return wrap;
}

function statsPage(g: Game, id: CharId, redraw: () => void): HTMLElement {
  const s = g.save;
  const c = s.chars[id];
  const C = CHARS[id];
  const st = statsOf(s, id);
  const inParty = s.active.includes(id);
  const attrs = h('div', { class: 'col' });
  for (const [k, name, info] of ATTR_INFO) {
    attrs.append(
      h('div', { class: 'stat', style: 'align-items:center' }, h('span', {}, h('b', {}, name), h('span', { class: 'muted', style: 'font-size:13px;margin-left:8px' }, info)), h('span', { class: 'row' }, btn('−', () => {
        if (c.attrs[k] <= 0) return;
        c.attrs[k]--;
        c.attrPts++;
        redraw();
      }, 'btn small', { disabled: c.attrs[k] <= 0 }), h('b', { style: 'min-width:30px;text-align:center' }, String(c.attrs[k])), btn('+', () => {
        if (c.attrPts <= 0) return;
        c.attrs[k]++;
        c.attrPts--;
        audio.sfx('ui_ok');
        redraw();
      }, 'btn small', { disabled: c.attrPts <= 0 }))),
    );
  }
  const xpNeed = xpToNext(c.level);
  return h(
    'div',
    { class: 'grid2' },
    h(
      'div',
      { class: 'col' },
      h('div', { class: 'row' }, portraitEl(id, s, 120, 130, 'smile'), h('div', { class: 'col' }, h('h2', { style: 'margin:0' }, C.name), h('div', { class: 'muted' }, C.title), h('div', {}, `Level ${c.level}`), h('div', { class: 'bar xp', style: 'width:200px' }, h('i', { style: `width:${Math.round((c.xp / xpNeed) * 100)}%` })), h('div', { class: 'muted', style: 'font-size:13px' }, `${c.xp} / ${xpNeed} XP`))),
      h('p', { style: 'font-style:italic' }, C.bio),
      h('div', { class: 'desc' }, h('b', {}, `${C.mechName}. `), C.mechDesc),
      h('div', { class: 'stat' }, h('span', {}, 'Bond with Ash'), h('b', {}, id === 'ash' ? '—' : `${c.bond} / 6`)),
      id !== 'ash' || s.roster.length > 4
        ? btn(inParty ? 'Move to reserve' : 'Swap into party', () => {
            if (inParty) {
              if (s.active.length <= 1) return;
              if (s.roster.length <= 4) {
                toast('The party is always four.');
                return;
              }
              s.active = s.active.filter((x) => x !== id);
              const add = s.roster.find((r) => !s.active.includes(r) && r !== id);
              if (add) s.active.push(add);
            } else {
              if (s.active.length >= 4) s.active.pop();
              s.active.unshift(id);
            }
            g.explore?.syncParty();
            redraw();
          }, 'btn small')
        : null,
    ),
    h(
      'div',
      { class: 'col' },
      h('h3', {}, 'Stats'),
      h('div', { class: 'stat' }, h('span', {}, 'Max HP'), h('b', {}, String(st.maxHp))),
      h('div', { class: 'stat' }, h('span', {}, 'Attack'), h('b', {}, String(st.atk))),
      h('div', { class: 'stat' }, h('span', {}, 'Defense'), h('b', {}, String(st.def))),
      h('div', { class: 'stat' }, h('span', {}, 'Speed'), h('b', {}, String(st.spd))),
      h('div', { class: 'stat' }, h('span', {}, 'Critical'), h('b', {}, `${Math.round(st.crit * 100)}%`)),
      h('h3', { style: 'margin-top:10px' }, `Attributes `, h('span', { class: 'pill red' }, `${c.attrPts} to spend`)),
      attrs,
    ),
  );
}

function skillsPage(g: Game, id: CharId, redraw: () => void): HTMLElement {
  const s = g.save;
  const c = s.chars[id];
  const desc = h('div', { class: 'desc' }, 'Learn skills with skill points; equip up to six. Click a learned skill to equip or unequip it.');
  const tree = h('div', { class: 'grid3' });
  for (const sid of CHAR_SKILLS[id]) {
    const sk = skill(sid);
    if (!sk) continue;
    const learned = c.learned.includes(sid);
    const reqOk = (sk.req ?? []).every((r) => c.learned.includes(r)) && (!sk.flag || !!s.flags[sk.flag]);
    const eq = c.equipped.includes(sid);
    tree.append(
      h(
        'button',
        {
          class: `skill ${learned ? 'learned' : reqOk ? '' : 'locked'} ${eq ? 'eq' : ''}`,
          'data-nav': '1',
          on: {
            focus: () => (desc.textContent = `${sk.desc}${sk.req?.length ? ` Needs: ${sk.req.map((r) => skill(r)?.name).join(', ')}.` : ''}${sk.flag && !s.flags[sk.flag] ? ' Unlocks later in the story.' : ''}`),
            mouseenter: () => (desc.textContent = sk.desc),
            click: () => {
              if (learned) {
                toggleEquip(c, sid);
                redraw();
              } else if (reqOk && c.sp >= (sk.cost ?? 1)) {
                c.sp -= sk.cost ?? 1;
                c.learned.push(sid);
                if (c.equipped.length < 6) c.equipped.push(sid);
                audio.sfx('unlock');
                redraw();
              } else audio.sfx('ui_error');
            },
          },
        },
        h('span', { class: 'sa' }, `${sk.ap} AP`),
        h('div', { class: 'sn' }, sk.name),
        h('div', { style: 'font-size:13px' }, learned ? (eq ? 'Equipped' : 'Learned') : reqOk ? `Learn: ${sk.cost ?? 1} SP` : 'Locked'),
      ),
    );
  }
  const others = availableSkills(s, id).filter((sid) => !CHAR_SKILLS[id].includes(sid));
  const otherBox = h('div', { class: 'grid3' });
  for (const sid of others) {
    const sk = skill(sid);
    if (!sk) continue;
    const eq = c.equipped.includes(sid);
    otherBox.append(h('button', { class: `skill learned ${eq ? 'eq' : ''}`, 'data-nav': '1', on: { focus: () => (desc.textContent = sk.desc), mouseenter: () => (desc.textContent = sk.desc), click: () => {
      toggleEquip(c, sid);
      redraw();
    } } }, h('span', { class: 'sa' }, `${sk.ap} AP`), h('div', { class: 'sn' }, sk.name), h('div', { style: 'font-size:13px' }, sk.owner === 'pattern' ? 'Pattern' : 'Class skill')));
  }
  return h(
    'div',
    { class: 'col' },
    h('div', { class: 'row' }, h('h3', { style: 'margin:0' }, 'Skill tree'), h('span', { class: 'pill red' }, `${c.sp} SP`), h('span', { class: 'pill' }, `${c.equipped.length} / 6 equipped`)),
    tree,
    others.length ? [h('h3', { style: 'margin-top:8px' }, id === 'wick' ? 'Patterns and class skills' : 'Class skills'), otherBox] : null,
    desc,
  );
}

function toggleEquip(c: SaveData['chars'][CharId], sid: string): void {
  if (c.equipped.includes(sid)) c.equipped = c.equipped.filter((x) => x !== sid);
  else if (c.equipped.length < 6) c.equipped.push(sid);
  else {
    toast('Six skills at most. Unequip one first.');
    return;
  }
  audio.sfx('ui_ok');
}

function gearPage(g: Game, id: CharId, redraw: () => void): HTMLElement {
  const s = g.save;
  const c = s.chars[id];
  const desc = h('div', { class: 'desc' }, 'Weapons, Patches, Embroideries and outfits.');
  // weapon
  const weapons = WEAPONS.filter((w) => w.who === id && s.weapons[w.id]);
  const wl = s.weapons[c.weapon] ?? 1;
  const wdef = WEAPON_MAP[c.weapon];
  const cost = upgradeCost(wl);
  const weaponBox = h(
    'div',
    { class: 'col' },
    h('h3', {}, 'Weapon'),
    ...weapons.map((w) =>
      h('button', { class: `item-row ${w.id === c.weapon ? 'on' : ''}`, 'data-nav': '1', on: { focus: () => (desc.textContent = `${w.desc} Element: ${w.element}. Perks: ${w.perkText.map((p, i) => `Lv${[4, 10, 20][i]} ${p}`).join(' · ')}`), click: () => {
        c.weapon = w.id;
        audio.sfx('ui_ok');
        redraw();
      } } }, h('span', { class: 'n' }, w.name), h('span', { class: 'r' }, `Lv ${s.weapons[w.id]} · ATK ${weaponAtk(w.id, s.weapons[w.id])}`)),
    ),
    wdef && wl < WEAPON_MAX
      ? btn(`Upgrade ${wdef.name} to Lv ${wl + 1} (${cost.n} ${ITEMS[cost.item].name}, you have ${count(s, cost.item)})`, () => {
          if (!takeItem(s, cost.item, cost.n)) {
            audio.sfx('ui_error');
            toast(`Not enough ${ITEMS[cost.item].name}.`);
            return;
          }
          s.weapons[c.weapon] = wl + 1;
          audio.sfx('level_up');
          redraw();
        }, 'btn small', { disabled: count(s, cost.item) < cost.n })
      : null,
  );
  // patches
  const owned = PATCHES.filter((p) => count(s, p.id) > 0);
  const usedBy = (pid: string): number => s.roster.filter((r) => s.chars[r].patches.includes(pid)).length;
  const patchBox = h('div', { class: 'col' }, h('h3', {}, `Patches (${c.patches.length}/3)`));
  for (const p of owned) {
    const on = c.patches.includes(p.id);
    const free = count(s, p.id) - usedBy(p.id) > 0;
    const wins = s.patchWins[p.id] ?? 0;
    patchBox.append(
      h('button', { class: `item-row ${on ? 'on' : ''}`, 'data-nav': '1', disabled: !on && (!free || c.patches.length >= 3), on: { focus: () => (desc.textContent = `${p.desc} ${s.learnedPatches.includes(p.id) ? 'Learned as an Embroidery.' : `${Math.min(4, wins)}/4 battles to learn it.`}`), click: () => {
        if (on) c.patches = c.patches.filter((x) => x !== p.id);
        else if (c.patches.length < 3) {
          c.patches.push(p.id);
          c.embroideries = c.embroideries.filter((x) => x !== p.id);
        }
        audio.sfx('stitch');
        redraw();
      } } }, h('span', { class: 'n' }, `${on ? '● ' : ''}${p.name}`), h('span', { class: 'r' }, s.learnedPatches.includes(p.id) ? 'learned' : `${Math.min(4, wins)}/4`)),
    );
  }
  if (!owned.length) patchBox.append(h('p', { class: 'muted' }, 'No patches yet. They hide in chests and Bobbin stalls.'));
  // embroideries
  const tpT = tpTotal(s, c);
  const embBox = h('div', { class: 'col' }, h('h3', {}, `Embroideries (${tpUsed(c)}/${tpT} TP)`));
  for (const pid of s.learnedPatches) {
    const p = PATCH_MAP[pid];
    if (!p) continue;
    const on = c.embroideries.includes(pid);
    // the same power can't be worn twice (as a Patch and as its Embroidery)
    const canAdd = tpUsed(c) + p.tp <= tpT && !c.patches.includes(pid);
    embBox.append(
      h('button', { class: `item-row ${on ? 'on' : ''}`, 'data-nav': '1', disabled: !on && !canAdd, on: { focus: () => (desc.textContent = p.desc), click: () => {
        if (on) c.embroideries = c.embroideries.filter((x) => x !== pid);
        else if (canAdd) c.embroideries.push(pid);
        audio.sfx('stitch');
        redraw();
      } } }, h('span', { class: 'n' }, `${on ? '● ' : ''}${p.name}`), h('span', { class: 'r' }, `${p.tp} TP`)),
    );
  }
  if (!s.learnedPatches.length) embBox.append(h('p', { class: 'muted' }, 'Win four battles wearing a Patch to learn it as an Embroidery anyone can sew on.'));
  // outfits
  const outfits = Object.keys(OUTFITS).filter((o) => o.split('_')[1] === id && count(s, o) > 0);
  const outBox = outfits.length
    ? h('div', { class: 'col' }, h('h3', {}, 'Outfit'), btn(`${c.outfit ? '' : '● '}Default`, () => {
        c.outfit = null;
        g.explore?.syncParty();
        redraw();
      }, 'btn small'), ...outfits.map((o) => btn(`${c.outfit === o ? '● ' : ''}${ITEMS[o]?.name ?? o}`, () => {
        c.outfit = o;
        const a = g.explore?.actor(id);
        if (a) g.explore!.applyKind(a, id);
        redraw();
      }, 'btn small')))
    : null;
  return h('div', { class: 'col' }, h('div', { class: 'grid2' }, h('div', { class: 'col' }, weaponBox, outBox), h('div', { class: 'col' }, patchBox, embBox)), desc);
}

function classPage(g: Game, id: CharId, redraw: () => void): HTMLElement {
  const s = g.save;
  const c = s.chars[id];
  const p = g.profile;
  const list = h('div', { class: 'col' });
  const desc = h('div', { class: 'desc' }, 'Classes are unlocked by Tasks across all your saves (and in friends\' games). Anyone can wear one.');
  for (const cl of CLASSES) {
    const unlocked = p.classes.includes(cl.id);
    if (cl.secret && !unlocked) continue;
    const prog = Math.min(cl.need, p.tasks[cl.task] ?? 0);
    const wearing = c.cls === cl.id;
    const rank = classRank(c.classBattles[cl.id] ?? 0);
    const wornBy = s.roster.find((r) => r !== id && s.chars[r].cls === cl.id);
    list.append(
      h(
        'button',
        {
          class: `item-row ${wearing ? 'on' : ''}`,
          'data-nav': '1',
          disabled: !unlocked,
          on: {
            focus: () => (desc.innerHTML = `<b>${cl.name}</b>: ${cl.blurb} <br>Passive: ${cl.passiveText}<br>Skills: ${cl.skills.map((sid, i) => `${skill(sid)?.name} (rank ${[1, 3, 5][i]})`).join(', ')}<br>${unlocked ? `Rank ${rank} · ${c.classBattles[cl.id] ?? 0} battles${rank < 5 ? ` · rank ${rank + 1} at ${RANK_AT[rank]}` : ''}` : `Task: ${cl.taskText} (${prog}/${cl.need})`}`),
            click: () => {
              if (!unlocked) return;
              if (wearing) c.cls = null;
              else {
                if (wornBy) {
                  // the class leaves its old wearer, skills included
                  s.chars[wornBy].cls = null;
                  const theirs = availableSkills(s, wornBy);
                  s.chars[wornBy].equipped = s.chars[wornBy].equipped.filter((x) => theirs.includes(x));
                }
                c.cls = cl.id;
              }
              // drop class skills that no longer apply
              const avail = availableSkills(s, id);
              c.equipped = c.equipped.filter((x) => avail.includes(x));
              for (const sk of classSkills(c.cls ?? '', classRank(c.classBattles[c.cls ?? ''] ?? 0))) if (c.equipped.length < 6 && !c.equipped.includes(sk)) c.equipped.push(sk);
              audio.sfx('buff');
              redraw();
            },
          },
        },
        h('span', { class: 'n' }, `${wearing ? '● ' : ''}${cl.name}`),
        h('span', { class: 'r' }, unlocked ? (wornBy ? `worn by ${CHARS[wornBy].short}` : `rank ${rank}`) : `${prog}/${cl.need}`),
      ),
    );
  }
  return h('div', { class: 'grid2' }, list, h('div', { class: 'col' }, h('h3', {}, c.cls ? `Wearing: ${CLASS_MAP[c.cls].name}` : 'No class'), desc));
}

// ------------------------------------------------------------------ items, journal, settings

function itemsView(g: Game): HTMLElement {
  const s = g.save;
  const desc = h('div', { class: 'desc' });
  const groups: [string, string[]][] = [
    ['Tinctures', ['tincture_heal', 'tincture_revive', 'tincture_spirit']],
    ['Consumables', Object.keys(s.inv).filter((k) => ITEMS[k]?.kind === 'consumable')],
    ['Materials', Object.keys(s.inv).filter((k) => ITEMS[k]?.kind === 'material')],
    ['Key items', Object.keys(s.inv).filter((k) => ITEMS[k]?.kind === 'key')],
    ['Patches', Object.keys(s.inv).filter((k) => ITEMS[k]?.kind === 'patch')],
  ];
  const cols = h('div', { class: 'grid3', style: 'width:100%' });
  for (const [name, ids] of groups) {
    const col = h('div', { class: 'col' }, h('h3', {}, name));
    for (const id of ids) {
      const it = ITEMS[id];
      if (!it) continue;
      const n = it.kind === 'tincture' ? `${s.tinct[id] ?? 0}/${s.tinctMax[id] ?? 0}` : `×${s.inv[id]}`;
      col.append(h('button', { class: 'item-row', 'data-nav': '1', on: { focus: () => (desc.textContent = it.desc), mouseenter: () => (desc.textContent = it.desc) } }, h('span', { class: 'n' }, it.name), h('span', { class: 'r' }, n)));
    }
    if (!ids.length) col.append(h('p', { class: 'muted' }, 'None.'));
    cols.append(col);
  }
  return h('div', { class: 'col', style: 'width:100%' }, h('div', { class: 'scroll', style: 'max-height:440px' }, cols), desc);
}

function journalView(g: Game): HTMLElement {
  const s = g.save;
  const p = g.profile;
  const out = h('div', { class: 'grid3', style: 'width:100%' });
  const reader = h('div', { class: 'desc scroll', style: 'max-height:430px;white-space:pre-wrap' }, 'Choose a page.');
  const journals = h('div', { class: 'col scroll', style: 'max-height:430px' }, h('h3', {}, `Lost Journals (${s.journals.length}/24)`));
  for (const id of s.journals) {
    const j = JOURNALS[id];
    if (!j) continue;
    journals.append(h('button', { class: 'item-row', 'data-nav': '1', on: { click: () => (reader.textContent = `${j.title}\n— ${j.author}\n\n${j.text}`) } }, h('span', { class: 'n' }, j.title)));
  }
  const beasts = h('div', { class: 'col scroll', style: 'max-height:430px' }, h('h3', {}, `Bestiary (${Object.keys(s.bestiary).length})`));
  for (const [id, n] of Object.entries(s.bestiary)) {
    const e = ENEMIES[id];
    if (!e) continue;
    beasts.append(h('button', { class: 'item-row', 'data-nav': '1', on: { click: () => (reader.textContent = `${e.name}  (defeated ${n})\nLevel ${e.level}\nWeak: ${e.weak.join(', ') || 'nothing'}\nResists: ${e.resist.join(', ') || 'nothing'}\n\n${e.lore}`) } }, h('span', { class: 'n' }, e.name), h('span', { class: 'r' }, `×${n}`)));
  }
  const tasks = h('div', { class: 'col scroll', style: 'max-height:160px' }, h('h3', {}, 'Tasks'));
  for (const cl of CLASSES.filter((c) => !c.secret)) {
    const prog = Math.min(cl.need, p.tasks[cl.task] ?? 0);
    tasks.append(h('div', { class: 'stat' }, h('span', {}, `${cl.taskText}`), h('b', {}, p.classes.includes(cl.id) ? '✓' : `${prog}/${cl.need}`)));
  }
  out.append(journals, beasts, h('div', { class: 'col' }, reader, tasks));
  return out;
}

function settingsView(g: Game): HTMLElement {
  const st = g.settings;
  const slider = (label: string, key: 'master' | 'music' | 'sfx'): HTMLElement =>
    h('label', { class: 'field' }, label, h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(st[key]), 'data-nav': '1', on: { input: (e: Event) => {
      st[key] = Number((e.target as HTMLInputElement).value);
      g.applySettings();
    } } }));
  // each button rewrites its own label (Safari doesn't focus clicked buttons, so activeElement can't be trusted)
  const toggle = (label: string, key: 'timingAid' | 'shake' | 'autoAdvance' | 'reducedFlash'): HTMLElement => {
    const b: HTMLButtonElement = btn(`${st[key] ? '☑' : '☐'} ${label}`, () => {
      st[key] = !st[key];
      g.applySettings();
      b.textContent = `${st[key] ? '☑' : '☐'} ${label}`;
    }, 'btn small');
    return b;
  };
  const gfx: HTMLButtonElement = btn(`Graphics: ${st.quality === 'high' ? 'Beautiful' : 'Fast'}`, () => {
    st.quality = st.quality === 'high' ? 'low' : 'high';
    g.applySettings();
    gfx.textContent = `Graphics: ${st.quality === 'high' ? 'Beautiful' : 'Fast'}`;
  }, 'btn small');
  const DIFFS = { story: 'Story: wide timing windows, gentler enemies', mender: 'Mender: the intended challenge', unthreaded: 'Unthreaded: tight windows, hard hits' } as const;
  const diffBtns: [keyof typeof DIFFS, HTMLButtonElement][] = [];
  const paintDiff = (): void => {
    for (const [d, b] of diffBtns) b.textContent = `${g.save?.difficulty === d ? '● ' : ''}${DIFFS[d]}`;
  };
  for (const d of Object.keys(DIFFS) as (keyof typeof DIFFS)[])
    diffBtns.push([
      d,
      btn('', () => {
        g.save.difficulty = d;
        toast(`Difficulty: ${d}`);
        paintDiff();
      }, 'btn small'),
    ]);
  paintDiff();
  const guest = !!(g.net && !g.net.isHost);
  const diff = g.save && !guest ? h('div', { class: 'col' }, h('h3', {}, 'Difficulty'), ...diffBtns.map(([, b]) => b)) : null;
  return h(
    'div',
    { class: 'grid3', style: 'width:100%' },
    h('div', { class: 'col' }, h('h3', {}, 'Sound'), slider('Master volume', 'master'), slider('Music', 'music'), slider('Effects', 'sfx'), h('h3', {}, 'Text'), h('label', { class: 'field' }, 'Text speed', h('input', { type: 'range', min: '0', max: '120', step: '5', value: String(st.textSpeed), 'data-nav': '1', on: { input: (e: Event) => {
      st.textSpeed = Number((e.target as HTMLInputElement).value);
      g.applySettings();
    } } })), toggle('Auto-advance dialogue', 'autoAdvance')),
    h('div', { class: 'col' }, h('h3', {}, 'Play'), toggle('Timing aid rings on attacks', 'timingAid'), toggle('Screen shake', 'shake'), toggle('Reduce flashing', 'reducedFlash'), gfx, diff),
    h('div', { class: 'col' }, h('h3', {}, 'Controls'), h('div', { class: 'desc', style: 'font-size:14px;line-height:1.7', html: '<kbd>A</kbd><kbd>D</kbd> move · <kbd>Shift</kbd> run · <kbd>E</kbd> interact · <kbd>Z</kbd> strike first<br><kbd>Esc</kbd> menu (hold in a scene to fast-forward) · <kbd>M</kbd> map<br>In battle: <kbd>Space</kbd> timed strikes &amp; parry · <kbd>Shift</kbd> dodge · <kbd>W</kbd> jump · arrows choose<br>Free Aim: mouse or arrows, <kbd>Space</kbd> fire<br>Gamepad: A confirm/parry · B dodge · Y jump · X strike/aim · Start menu<br>Touch: on-screen pad to walk, buttons to act' }), g.user ? h('p', { class: 'muted' }, `Signed in as ${g.user.name}. Saves go to the cloud.`) : h('p', { class: 'muted' }, 'Playing on this device only.')),
  );
}

// ------------------------------------------------------------------ shop

export function openShopMenu(g: Game, id: string): Promise<void> {
  const shop = SHOP_MAP[id];
  const s = g.save;
  return new Promise((res) => {
    let pop: () => void = () => {};
    const close = (): void => {
      pop();
      res();
    };
    const desc = h('div', { class: 'desc' }, 'Pim Spool rubs their little hands together.');
    const list = h('div', { class: 'col scroll', style: 'max-height:380px' });
    const glimEl = h('span', { class: 'pill gold' }, `${s.glim} Glim`);
    const draw = (): void => {
      list.innerHTML = '';
      glimEl.textContent = `${s.glim} Glim`;
      for (const it of shop?.stock ?? []) {
        if (it.requires && !s.flags[it.requires]) continue;
        const d = ITEMS[it.item];
        if (!d) continue;
        const unique = d.kind === 'weapon' || d.kind === 'patch' || d.kind === 'outfit' || d.kind === 'key';
        const owned = d.kind === 'weapon' ? !!s.weapons[it.item] : unique && count(s, it.item) > 0;
        list.append(
          h('button', { class: 'item-row', 'data-nav': '1', disabled: owned || s.glim < it.price, on: { focus: () => (desc.textContent = `${d.desc}${d.who ? ` (for ${CHARS[d.who].short})` : ''}`), mouseenter: () => (desc.textContent = d.desc), click: () => {
            if (s.glim < it.price || owned) return;
            s.glim -= it.price;
            g.save.inv[it.item] = (g.save.inv[it.item] ?? 0) + 1;
            if (d.kind === 'weapon') {
              delete g.save.inv[it.item];
              s.weapons[it.item] = 1;
            }
            audio.sfx('chest');
            toast(`Bought ${d.name}.`);
            void g.persist();
            const key = focusKey();
            draw();
            if (!refocus(list, key)) focusFirst(list);
          } } }, h('span', { class: 'n' }, d.name), h('span', { class: 'r' }, owned ? 'owned' : `${it.price} Glim${!unique && count(s, it.item) ? ` · have ${count(s, it.item)}` : ''}`)),
        );
      }
    };
    draw();
    const el = h('div', { class: 'panel', style: 'left:330px;top:70px;width:620px' }, h('div', { class: 'row' }, h('h2', { class: 'grow', style: 'margin:0' }, shop?.name ?? 'Shop'), glimEl), list, desc, h('div', { style: 'text-align:right;margin-top:10px' }, btn('Leave', close)));
    pop = pushLayer(el, close);
  });
}

// ------------------------------------------------------------------ rewards

export function showRewards(g: Game, r: Rewards): Promise<void> {
  const rows: HTMLElement[] = [];
  rows.push(h('p', { style: 'font-size:22px' }, `+${r.xp} XP   ·   +${r.glim} Glim`));
  for (const l of r.levels) rows.push(h('p', { class: 'lvl' }, `${CHARS[l.id].short} reached level ${l.to}!`));
  for (const it of r.items) rows.push(h('p', {}, `Found ${ITEMS[it.id]?.name ?? it.id}${it.n > 1 ? ` ×${it.n}` : ''}`));
  for (const pid of r.patterns) rows.push(h('p', { style: 'color:#ff9a5a' }, `Wick learned a Pattern: ${skill(pid)?.name ?? pid}`));
  for (const pid of r.mastered) rows.push(h('p', { style: 'color:#c9a0e0' }, `Patch learned as an Embroidery: ${PATCH_MAP[pid]?.name ?? pid}`));
  for (const rk of r.ranks) rows.push(h('p', {}, `${CHARS[rk.id].short} reached ${CLASS_MAP[rk.cls]?.name} rank ${rk.rank}`));
  for (const c of r.classes) rows.push(h('p', { class: 'lvl' }, `New class unlocked: ${CLASS_MAP[c]?.name}!`));
  if (r.levels.length) audio.sfx('level_up');
  return new Promise((res) => {
    let pop: () => void = () => {};
    const close = (): void => {
      pop();
      res();
    };
    const el = h('div', { class: 'panel dark rewards' }, h('p', { class: 'big', style: 'color:#ffe08a' }, 'Victory'), ...rows, h('div', { style: 'margin-top:14px' }, btn('Continue', close, 'btn gold', { 'data-autofocus': '1' })));
    pop = pushLayer(el, close);
    if (r.classes.length) void g.tutorialOnce('classes');
  });
}

export async function confirmNewGamePlus(): Promise<boolean> {
  return confirmBox('New Game+', 'Start again from the beginning with your levels, gear, patches and classes. Enemies grow much stronger.', 'Begin', 'Not yet');
}

export { notice };
