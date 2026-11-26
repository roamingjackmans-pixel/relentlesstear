// Classes: unlocked by account-wide Tasks, worn by any companion. A class changes stats, adds a passive and adds up
// to three skills unlocked by class rank (battles won while wearing it).

export interface ClassDef {
  id: string;
  name: string;
  task: string; // the counter that unlocks it
  need: number;
  taskText: string;
  mods: { hp?: number; atk?: number; def?: number; spd?: number; crit?: number }; // fractions
  passive: string;
  passiveText: string;
  skills: [string, string, string]; // rank 1, 3, 5
  blurb: string;
  secret?: boolean;
}

export const CLASSES: ClassDef[] = [
  { id: 'duelist', name: 'Duelist', task: 'parry', need: 30, taskText: 'Parry 30 hits', mods: { atk: 0.1, spd: 0.05 }, passive: 'duelist', passiveText: 'Counters deal +40% damage and give +1 AP.', skills: ['cl_feint', 'cl_lunge', 'cl_thousand_cuts'], blurb: 'For those who answer every blow.' },
  { id: 'windstep', name: 'Windstep', task: 'dodge', need: 60, taskText: 'Dodge 60 hits', mods: { spd: 0.2 }, passive: 'windstep', passiveText: 'Perfectly timed dodges give +1 AP, like parries.', skills: ['cl_gale_step', 'cl_cyclone', 'cl_eye_of_storm'], blurb: 'Be where the blow is not.' },
  { id: 'marksman', name: 'Marksman', task: 'weakpoint', need: 25, taskText: 'Hit 25 weak points with Free Aim', mods: { crit: 0.1 }, passive: 'marksman', passiveText: 'The first Free Aim shot each turn costs no AP; weak points take +25%.', skills: ['cl_called_shot', 'cl_pin_down', 'cl_headhunter'], blurb: 'Every seam has a loose end.' },
  { id: 'warden', name: 'Warden', task: 'shield', need: 20, taskText: 'Block 20 hits with Shields', mods: { def: 0.2, hp: 0.1 }, passive: 'warden', passiveText: 'Start every battle with 1 Shield.', skills: ['cl_shield_wall', 'cl_provoke', 'cl_fortress'], blurb: 'Stand where others cannot.' },
  { id: 'pyrewright', name: 'Pyrewright', task: 'burn', need: 40, taskText: 'Apply Burn 40 times', mods: { atk: 0.08 }, passive: 'pyrewright', passiveText: 'Burn you apply deals +50% damage.', skills: ['cl_kindle', 'cl_firestorm', 'cl_pyre'], blurb: 'Cindermill fire-tenders\' old craft.' },
  { id: 'rimeweaver', name: 'Rimeweaver', task: 'freeze', need: 15, taskText: 'Freeze enemies 15 times', mods: { def: 0.08 }, passive: 'rimeweaver', passiveText: 'Frozen enemies take +30% damage.', skills: ['cl_frost_needle', 'cl_hoarfrost', 'cl_glacier'], blurb: 'Stillness is a weapon.' },
  { id: 'stormstitcher', name: 'Stormstitcher', task: 'storm', need: 60, taskText: 'Land 60 Storm hits', mods: { spd: 0.08, atk: 0.05 }, passive: 'stormstitcher', passiveText: 'Hitting a Shocked enemy arcs 30% of the damage to another.', skills: ['cl_static', 'cl_chain_lightning', 'cl_thunderhead'], blurb: 'Sew with lightning.' },
  { id: 'chirurgeon', name: 'Chirurgeon', task: 'healed', need: 6000, taskText: 'Restore 6,000 HP', mods: { hp: 0.1 }, passive: 'chirurgeon', passiveText: 'Your heals are 25% stronger and add Regen.', skills: ['cl_suture', 'cl_triage', 'cl_resurrect'], blurb: 'Menders mend people too.' },
  { id: 'ragged', name: 'Ragged', task: 'ragged', need: 8, taskText: 'Win 8 battles with someone under 25% HP', mods: { atk: 0.12, def: -0.1 }, passive: 'ragged', passiveText: 'Below 40% HP: +40% damage.', skills: ['cl_bloodletting', 'cl_wild_swing', 'cl_last_laugh'], blurb: 'Frayed is not finished.' },
  { id: 'tinker', name: 'Tinker', task: 'items', need: 30, taskText: 'Use 30 tinctures or items', mods: { def: 0.05, spd: 0.05 }, passive: 'tinker', passiveText: 'Tinctures and items work 50% better when you use them.', skills: ['cl_quick_fix', 'cl_bomb', 'cl_contraption'], blurb: 'Bobbin know-how, borrowed.' },
  { id: 'shatterhand', name: 'Shatterhand', task: 'breaks', need: 20, taskText: 'Break 20 enemies', mods: { atk: 0.1 }, passive: 'shatterhand', passiveText: 'Your Break damage is 50% higher.', skills: ['cl_crack', 'cl_sunder', 'cl_shatter'], blurb: 'Find the crack. Lean on it.' },
  { id: 'cantor', name: 'Cantor', task: 'perfects', need: 150, taskText: 'Land 150 Perfect timed inputs', mods: { crit: 0.05, spd: 0.05 }, passive: 'cantor', passiveText: 'Perfect inputs heal you 2% and add extra Weave.', skills: ['cl_harmony', 'cl_cadence', 'cl_crescendo'], blurb: 'Keep time and time keeps you.' },
  { id: 'fatebreaker', name: 'Fatebreaker', task: 'first_thread', need: 1, taskText: 'Defeat the First Thread', mods: { hp: 0.15, atk: 0.15, def: 0.15, spd: 0.1 }, passive: 'fatebreaker', passiveText: 'Your attacks ignore resistance.', skills: ['cl_unwritten', 'cl_loose_end', 'cl_no_ending'], blurb: 'Nothing about you was written.', secret: true },
];

export const CLASS_MAP: Record<string, ClassDef> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));

/** Battles won while wearing a class needed to reach each rank (index = rank - 1). */
export const RANK_AT = [0, 2, 5, 9, 14];
export function classRank(battles: number): number {
  let r = 1;
  for (let i = 0; i < RANK_AT.length; i++) if (battles >= RANK_AT[i]) r = i + 1;
  return r;
}
/** skills a class gives at a rank */
export function classSkills(id: string, rank: number): string[] {
  const c = CLASS_MAP[id];
  if (!c) return [];
  return c.skills.filter((_, i) => rank >= [1, 3, 5][i]);
}
