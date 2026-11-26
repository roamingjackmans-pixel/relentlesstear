# Relentless Tear: design bible

The source of truth for the story, cast, systems and content rosters. Where code and this file disagree, the code
wins and this file needs fixing.

## 1. Pillars

- **A story that hurts in the right places.** A mentor's betrayal, a brother's chosen death, a child made of a dead
  girl's unfinished life, and a final choice with no clean answer. Every chapter ends on a turn.
- **Reactive turn-based combat.** Menu turns, but every enemy hit can be dodged, parried or jumped in real time,
  every skill has timed inputs, and Free Aim lets you shoot weak points. Mastery turns hard fights into dances.
- **Always four.** The active party is always four. Solo: you play Ash and AI plays the rest (or you command all
  four). Co-op: up to four people, each controls one character; AI fills empty seats.
- **Painted storybook 2D.** Layered parallax silhouettes, watercolor skies, gold stitch-lines across the land, rain,
  embers, motes. Everything drawn in code. Smooth in a browser.
- **Original.** Inspired by the *kind* of game Clair Obscur: Expedition 33 is (reactive combat, character
  mechanics, passives you learn, camp bonds, a gut-punch story). Nothing of its world, names, plot or art.

## 2. The world: the Hem

The world is the **Hem**: a patchwork of lands (**Patches**) sewn together along glowing gold **Seams**. Above
everything hangs the **Loom**: a vast frame of light in the sky, a vertical lattice of threads that never sets,
bright enough that nobody in living memory has seen a star.

Every living thing has a **fate-thread** spun by the Loom and woven into the **Tapestry**: the pattern of everything
that will happen. The **Loomchurch** (its singers are the **Spindle Choir**, its enforcers the **Shears**, its
judges the **Arbiters**) reads the Tapestry and keeps the **Ledger of Fates** in the porcelain city of
**Spindlehold**. **Menders** are an old, practical order who walk the Seams and stitch where the world frays.

**The Tear.** Three years ago a rip opened near the **Loomspire** (the tower where the Loom's threads touch the
ground) and it widens every day: a vertical wound of white with no stars in it. Land near it **unravels**: colors
drain, shapes come apart into loose thread, and the **Frayed** (creatures made of torn pattern) stalk the edges.

**The truth (revealed over the game).**
1. The Loom does not only weave fates; it *ends* them on schedule. The Choir **prunes** threads to keep the
   Tapestry beautiful: whole villages are "trimmed" because the pattern calls for it.
2. **Orrin Thale** made the Tear. Forty years ago his daughter **Lio** (7) drowned on the exact day the Ledger said
   she would, and nothing he did could stop it. He spent his life learning the Loom's craft, then cut the **Warp**
   (the master thread holding the Tapestry taut). He believes that when the Tapestry fully unravels, the world will
   reknit itself *freely*: no written deaths.
3. **Wick** is woven from Lio's cut thread: the life she never got to live. Orrin pulled it out of the Tear and gave
   it a body, then left Wick with Ash and Corin because he could not bear to look at them.
4. **Ash has no fate-thread.** Thirteen years ago the Choir pruned her village, **Thornwick**. The Ledger records
   Ash as dead that day. A young Shear (Rook) could not cut a child; he carried her out and left her on a road where
   Orrin found her. Because she is unfated, only Ash can touch the Warp: she can mend the Tear, or finish it. Orrin
   raised her for that choice.
5. **Mending** sews the Tapestry shut: fate returns, the land stops unraveling, and Wick (a loose thread) is pulled
   back into the weave and is gone. **Tearing** cuts the Loom down: nothing is written any more, Wick lives, the
   land stays fragile and must be mended by hand forever, and the sky goes dark... then, for the first time, stars.

Neither ending is "right." Corin's line is the game's spine: **"Maybe it was written. I'm choosing it anyway.
That's the part they can't weave."**

## 3. The cast

Party size is always four. Story timeline: Prologue party = Ash, Corin, Wick, Orrin. Maudra joins in Ch2, Rook in
Ch3 (six, pick four). Orrin leaves at the end of Ch4. Corin dies at the end of Ch7. Tess joins in Ch8.

| id | Name | Age | Role | Weapon | Signature mechanic |
|---|---|---|---|---|---|
| ash | Ash Vey | 19 | Protagonist, new Mender | needle-rapier | **Stitches**: skills sew Stitches into a target (max 5); *Pull Taut* finishers consume them for big damage; perfect inputs sew an extra Stitch |
| corin | Corin Hale | 26 | Ash's adoptive brother, cook, shield | tower shield + mallet | **Guard** (0-5): parries and protecting allies build Guard; *Interpose* redirects hits to him; *Last Wall* spends Guard |
| wick | Wick | "about six" | Thread-born child | spool & ribbon | **Patterns**: learns skills from beaten enemies (Lio's thread remembers shapes); can **Fray** (spend 15% HP for +50% power) |
| orrin | Orrin Thale | 62 | Mentor, master Mender | great shears | **Tension** (0-100): every action winds it tighter; skills change at high Tension; *Snap* releases it all |
| maudra | Sister Maudra Fell | 54 | Loomchurch priestess, healer | choir bell staff | **Verses**: skills add Hope, Grief or Wrath verses (3 slots); *Hymn* sings them: the mix decides the effect; rhythm-input skills |
| rook | Rook Ardent | 34 | Deserter Shear, gunslinger | long thread-pistol | **Heat** (0-10): shots and skills build Heat; skills scale with it; at 10 *Crucible* fires everything, then he Overheats; *Vent* trades Heat for AP |
| tess | Tess Quill | 24 | Orrin's other apprentice | paired blades | **Penance** (0-100): damage she takes (and takes for others) fills it; spends it on *Absolution* (heals) or *Scissor Rite* (huge hits) |

### Voices and arcs

- **Ash Vey.** Determined, dry, guarded, hums when she stitches (Lio's lullaby, without knowing what it is: Orrin
  hummed it to her). Carries her mother's brass **thimble** (only relic of Thornwick). Arc: follows Orrin's
  teaching → betrayed → learns she is "already dead" → decides what she believes. Never preachy; jokes when scared.
- **Corin Hale.** Big, gentle, funny, feeds everyone, nicknames ("Needle" for Ash, "Sprout" for Wick). Orrin took him
  in at ten after his parents died of fever. Secretly afraid he's ordinary next to Ash. Reads his own fate in the
  Ledger in Ch6 ("Corin Hale. Holds the Seam. Ends.") and tells no one but Maudra. Chooses it in Ch7.
- **Wick.** Made of glowing red-gold thread wearing a too-big Mender's coat; button-bright eyes; curious; collects
  words in a little notebook ("Today's word is *sonder*"); terrified of scissors; dreams of water and a lullaby. Arc:
  wanting to be real → learning they are Lio's thread → "I'm not Lio. I'm Wick. But I'll carry her too."
- **Orrin Thale.** Warm, wry, tea snob, storyteller, quotes old Mender proverbs ("Measure twice, cut never").
  Gentle with everyone; the gentleness is real, and so is the resolve. Final antagonist on the Mend route; on the
  Tear route he gives his life to make the last cut.
- **Sister Maudra Fell.** Sharp tongue, soft hands, devout, funny in a deadpan way, smokes a pipe of sweetgrass.
  Assigned "by decree" to escort the pilgrimage (and secretly to report on Wick). Her younger sister **Hessa** was
  "called to the Choir" at twelve and never seen again (pruned). Arc: faith → horror in the Pruning Halls → faith in
  people ("Then we'll have to be kind on purpose").
- **Rook Ardent.** Laconic, sardonic, kind to animals and children, terrible at apologies. Was the Shear sent to
  Thornwick. Couldn't cut a little girl's thread; carried her out. Deserted. Has looked for her ever since and
  recognises Ash's thimble in Ch3; can't tell her. Confesses in Ch6. Arc: from hiding to standing in front of the
  person he wronged and letting her decide.
- **Tess Quill.** Brilliant, prickly, fiercely loyal, laughs too loud. Trained with Corin under Orrin; Corin's first
  love. Sided with Orrin because the Choir pruned her village too. Fights the party in Ch4 and Ch5; breaks after
  Corin's death (Orrin's war cost the one person she still loved). Joins in Ch8 to atone. Arc: grief → penance →
  forgiving herself.
- **Antagonists.** **Arbiter Seraphine Vael**: serene, utterly certain, believes beauty requires sacrifice; hunts
  Wick ("a loose thread is a heresy") and Ash ("a hole in the pattern"). **The Loom / the Weaver**: not evil:
  vast, sorrowful, speaks in many voices at once; "Without pattern, everything you love comes apart."

### NPCs (src/data/npcs.ts)

Bobbins (small spool-bodied folk with button eyes, traders; speak cheerfully, refer to themselves as "this one":
"This one has buns!"): **Pim Spool** (merchant who follows the party everywhere), **Nana Tuft** (Bobbin elder),
**Little Reel** and **Skein** (lost Bobbin kids, a side quest). Hollowmere villagers: **Bram Cotter** (baker),
**Old Wenna** (village elder), **Fen** (kid who idolises Ash). Lanternmere: **the Lamplighter's widow, Ysolde**.
Cindermill: **Foreman's daughter Pell**, **Brother Anselm** (Choir priest). Spindlehold: **Arbiter Seraphine**,
**Archivist Coll** (frightened clerk who helps). Underweave: **Lio** (echo, a little girl in a yellow raincoat),
**Corin** (echo), **Ash's mother Rhoswen** (echo). Optional: **Grandmother Spool** (optional boss & Bobbin legend).

## 4. Chapter beat sheet

Each chapter: 3-5 side-scrolling scenes, 1-2 Waystitches (rest/camp points), 2-4 journals, 2-6 chests, a few
roaming enemy groups, a boss. Scene ids are prefixed by region. Every chapter ends with a turn.

### Prologue: The Last Stitch (region `hollowmere`, theme `village_autumn`)
- `pro_opening` (title card cutscene on New Game): narration over the Loom-lit sky. Orrin's voice: "Every thread has
  an end. Every end was written. That's what they taught me. I was a good student, once." The Tear glimpsed far
  away. Title: RELENTLESS TEAR.
- `hm_green`: Harvest-festival morning. Ash's **Stitching** (graduation): Orrin gives Ash his old needle. Corin
  teases, Wick cheers, Fen hero-worships. Tutorial: walking, talking, chests. Sparring with Corin = the combat
  tutorial (dodge, parry, jump, timed skills, Free Aim at a scarecrow's patch).
- `hm_orchard`: Frayed (Fraylings, Yarn Hounds) creep in from the north fields. First real fights. Journal.
- `hm_rise`: the hill mill. The Fray eats the north fields in a wave of white. Boss **The Unspun Hound**. After:
  half the orchard is just... gone. Old Wenna's house with it.
- `hm_home` (night, Orrin's house): Orrin announces the **Pilgrimage**: the Choir's Ledger names him to stitch the
  Tear at the Loomspire, and he wants his apprentices beside him. Roof scene with Corin (bond 1): they watched the
  Loom as kids; Corin: "You ever wonder what's behind it?" Ash holds the thimble. Wick asks what a "fate" is.
  Orrin hums the lullaby downstairs. Leave at dawn → world map unlocks.

### Act I: The Pilgrimage
**Ch1 Thimble Fields** (`thimble_fields`, theme `fields_gold`): golden wheat, giant abandoned thimbles half-sunk
(the old giants' sewing room, a children's story), scarecrows. Scenes `tf_road`, `tf_thimbles`, `tf_bobbin_camp`,
`tf_scarecrows`, `tf_tatter`. Meet the **Bobbins** (Pim Spool joins as travelling merchant; Nana Tuft). Side quest:
lost Bobbin kids Little Reel and Skein in the thimbles (reward: patch + bond moment with Wick). Boss **Old Tatter**,
a scarecrow lord sewn from a hundred old coats, crows orbiting. First Lost Mender Journal (by "O.", a young father;
the player won't realise it's Orrin until Ch6). Wick finds a music box that plays the lullaby; Orrin goes quiet.
Turn: at the chapter's end the sky flickers: a thread of the Loom snaps and falls burning across the fields; Orrin
says "It's getting faster," and won't explain how he knows.

**Ch2 Lanternmere** (`lanternmere`, theme `marsh_night`, rain): drowned willows, lantern-moths, mist, a sunken
chapel. Scenes `lm_shore`, `lm_willows`, `lm_chapel`, `lm_lanterns`, `lm_lamplighter`. **Maudra** arrives with a
Choir escort who are killed by Bog Moths; she joins "by decree". Corin and Maudra bicker (he cooks; she critiques).
Lore: the Ledger; Maudra says every death is a stitch in something beautiful. The widow Ysolde's husband (the
Lamplighter) drowned and still lights lanterns for the dead. Boss **The Drowned Lamplighter**: a tall figure whose
lanterns hold souls; after the fight he thanks them and lets the lights go. **Orrin freezes at the water's edge**,
can't step in; Ash has never seen him afraid. Turn: Maudra, alone, writes a report to Spindlehold: "The thread-child
is with them. It hums." Orrin reads it over her shoulder... and says nothing.

**Ch3 Cindermill** (`cindermill`, theme `mill_industrial`, embers): a mill town where the Choir spins "fate-yarn"
sold as blessings. Scenes `cm_outskirts`, `cm_market`, `cm_spinning`, `cm_rooftops`, `cm_furnace`. **Rook Ardent**
duels the party on the rooftops (mini-boss, he's fast and you lose nothing: he stops at half HP: "You parry like an
Orrin student"), then saves them from **Shear Acolytes** hunting Wick. He joins: he "needs to reach the Spire."
Rook sees Ash's thimble and goes white; covers it. Brother Anselm sells yarn; Pell, the foreman's daughter, asks
the party to stop her father's mill-machine. Boss **Foreman Gristle**, a mill automaton the Choir built that spins
people's spare thread into yarn. Turn: Arbiter Seraphine appears in a vision-broadcast on the mill's loom-mirror:
"Bring me the loose thread." Wick hides behind Ash.

**Ch4 The Selvage** (`selvage`, theme `cliffs_wind`): cliffs at the edge of the world near the Tear; the wind is
full of loose threads. Scenes `sv_path`, `sv_windstair`, `sv_camp`, `sv_lip`. Camp the night before (big bond
night: everyone gets a moment). **Tess Quill** blocks the windstair: boss fight; she knows all their moves (Orrin
taught her too). She looks at Corin a long time. At the Tear's lip, Orrin steps forward to stitch it alone... and
opens it wider. **The reveal**: Orrin made the Tear. Tess stands with him. Scripted duel vs **Orrin** (the fight
ends when he drops below 60% HP; he "snaps" Tension and unthreads the party). He asks Wick to come with him; Wick
says "You smell like the song. I don't like it right now." He tells Ash: "You'll understand. I'll wait for you at
the Spire." The lip collapses; the party falls into the Tear. Title: **ACT II: THE UNDERSIDE OF THE PATTERN**.

### Act II: The Fray
**Ch5 The Frayed Expanse** (`frayed_expanse`, theme `fray_surreal`, threads): inside the unravelled world: islands of
half-gone places drifting in white, colors bleeding, echoes of lost villages replaying a single moment over and over.
Scenes `fe_landing`, `fe_isles`, `fe_echo_town`, `fe_nest`. Wick can *hear* the Frayed: they aren't evil; they're
pieces of things trying to become something again. Tess ambushes (second fight, a shorter one, she flees when hurt;
she's crying). Boss **The Moth Mother**, protecting her brood; when she falls the brood becomes light and Wick cries
for the first time (thread tears, gold). Journals reveal "O." lost a daughter named Lio to water. Turn: an echo of
Hollowmere's festival plays in the white... with Corin's voice laughing, and Corin realises the echoes are of things
that *will* be lost.

**Ch6 Spindlehold** (`spindlehold`, theme `porcelain_city`): the Choir's white porcelain city under the Loom; bells,
hymns. Scenes `sh_gate`, `sh_cloister`, `sh_ledger`, `sh_pruning`, `sh_arbiter`. Maudra's home: she believes the
Choir will help. Archivist Coll lets them into the **Ledger Hall**. Discoveries, in order:
1. **The Pruning Halls**: villages "trimmed" for the pattern's beauty; Maudra finds her sister Hessa's name.
2. **Thornwick**, pruned 13 years ago; "Ash Vey, aged 6: cut." Ash is *already dead* by the Ledger.
3. The Shear on duty that night: **R. Ardent**. Rook confesses in front of everyone. Ash walks away from him.
4. Maudra reads Wick in the Ledger: the thread is listed "missing", formerly "**Lio Thale, aged 7, drowned**".
5. Corin, alone with Maudra, asks her to read his: "Corin Hale. Holds the Seam. Ends." He asks her not to tell Ash.
Boss **Arbiter Seraphine Vael** (two phases: porcelain serenity, then her mask cracks). Maudra tears off her
Choir stole. Turn: Seraphine, dying, smiles: "The Seam above Hollowmere fails tonight. It is written."

**Ch7 The Seam of Ages** (`seam_of_ages`, theme `seam_storm`): racing home. Scenes `sa_return` (Hollowmere at the
edge of the Fray, half the village evacuated: Fen, Bram, Wenna), `sa_road`, `sa_seam`. The night before: camp, the
last stew (Corin's bond scene "The Last Stew" if bond is high; a shorter version otherwise). Ash and Rook: the
first real conversation since Spindlehold (she doesn't forgive him; she lets him stay). At the Great Seam the Tear
reaches for Hollowmere. Boss **The Seam-Eater** (a serpent of torn cloth) while Corin holds the seam with his
shield. After: the seam needs an anchor, someone to *become* the stitch. Corin: "I read it. Maudra read it to me.
Maybe it was written. I'm choosing it anyway. That's the part they can't weave." To Ash: "Look after Sprout. Eat
something green." To Wick: "Today's word is *brave*." He turns to gold thread and becomes the stitch that holds
Hollowmere to the world. His shield stays planted in the ground. Tess arrives too late and screams his name.
Title: **ACT III: WHAT WE CHOOSE**.

### Act III: The Loomspire
**Ch8 The Underweave** (`underweave`, theme `underweave_deep`, motes): grief chapter. Beneath the world, where cut
threads go: a dark sea of soft lights. Scenes `uw_shallows`, `uw_echoes`, `uw_drowned_room`, `uw_mirror`. Tess
follows them down and asks to come: she can't undo it, but she can stand between them and harm (joins; Wick takes
her hand first). Echoes: Ash's mother **Rhoswen** sings in Thornwick's last moment; **Corin's echo** (a gentle,
brief scene: he can't stay; he tells Ash to stop carrying everyone). **Lio's echo** in the drowned room: a girl in a
yellow raincoat; Wick talks with her and chooses a name and a self: "I'm not you. I'm Wick. I'll carry you too."
Rook and Ash: she gives him back the thimble's story and something like peace. Boss **Unfated Ash**, the Ash who
died at six, grown up into what fate wanted (a dark mirror); Ash accepts both and is whole.

**Ch9 The Loomspire** (`loomspire`, theme `spire_light`): the climb: a cathedral of threads, the Choir's last
seraphs, hands of light with needles. Scenes `ls_root`, `ls_climb`, `ls_choir`, `ls_summit`. At the summit, Orrin
waits with tea. He tells them everything, kindly. The Loom speaks. **THE CHOICE** (only Ash can make it; in co-op,
the host's choice):
- **Mend**: Ash begins to sew; Orrin can't let it happen. Final boss **Orrin, the Tearer** (3 phases: the mentor,
  the father, the Tear). After: Orrin dying, asks for the lullaby; Wick sings it. The Tear closes. Wick begins to
  unravel: "I was a good thread, right?" Epilogue `end_mend`: spring in Hollowmere, the Loom still in the sky, a
  new red thread in it right above the village. Ash teaches apprentices. "Measure twice. Cut never."
- **Tear**: Ash takes Orrin's shears; they cut the last thread together. The Loom wakes. Final boss **The Weaver**
  (3 phases; in the last phase Orrin throws himself into the Weaver's heart to open it: "Lio... I'm coming."). The
  Loom falls. The sky goes dark. Then: stars. Epilogue `end_tear`: Menders stitching by hand, uncertain lands,
  everyone at Corin's shield. Wick: "Hi Corin. We chose."
Credits. Post-game: New Game+ (keep levels, gear, classes; enemies stronger) and the superboss.

### Optional content
- `bobbin_burrow` (from Ch1 on, theme `burrow`): two scenes, Bobbin Mimics, boss **Grandmother Spool** (gives the
  Bobbin legend + a great patch).
- `glass_orchard` (from Ch6 on, theme `glass`): two scenes, boss **The Glass Choir** (Maudra's past).
- `first_thread` (after the ending, from the Underweave): superboss **The First Thread**; unlocks the Fatebreaker
  class.
- 24 Lost Mender Journals, 10 lullaby/music notes (camp jukebox), Glass Beads (+1 tincture charge each), outfits.

## 5. Bonds (camp conversations)

At a Waystitch marked `camp` you can **Make Camp**: talk to companions. Each companion has bond scenes (BondScene,
`requires` a story flag). Bond levels: 1-6. Rewards: L2 +5% stats, L4 a new skill for that companion, L6 a
**Weave Art** (duo ultimate with Ash). Orrin has 2 scenes (before he leaves). Bond scenes are short (10-25 lines),
specific, funny then sad; at least one choice per scene for Ash (choices never lock you out).

Weave Arts: Ash+Corin *Hearth and Needle*, Ash+Wick *Cat's Cradle*, Ash+Maudra *Vespers*, Ash+Rook *High Noon Hem*,
Ash+Tess *Two Blades, One Thread*, Ash+Orrin *Measure Twice* (prologue only, story-granted).

## 6. Combat

**Turn order.** Speed decides a timeline (shown across the top, next 10 turns). Haste/Slow move you along it.

**Your turn.** Commands: **Attack** (free, +1 AP), **Skills** (cost AP, 0-9; max AP 9), **Aim** (Free Aim: each shot
costs 1 AP and does not end the turn; weak points take extra damage and break armor), **Weave** (team ultimate,
costs Weave gauge segments; needs bond), **Items** (tinctures), **Flee**.

**Timed inputs.** Every skill and basic attack has timed inputs. Three styles:
- **Tap**: a ring closes on the target; press Action as it meets the mark. Perfect ±70 ms (×1.3), Good ±150 ms (×1.0),
  Miss (×0.7).
- **Hold**: hold Action, release in the bright zone.
- **Rhythm** (Maudra's hymns, some others): arrows arrive in time; press each one.
Perfect inputs fill the Weave gauge and trigger character bonuses (Ash sews an extra Stitch).

**Defense.** Each enemy attack has a windup (telegraph) and timed hits. For each hit the targeted character can:
- **Dodge** (window ±160 ms): no damage.
- **Parry** (window ±90 ms): no damage, +1 AP, builds Corin's Guard. Parry **every** hit of an attack to trigger a
  **Counter**.
- **Jump** (for `jump` hits: ground shockwaves, glowing red at the feet): jump every one to stomp-counter.
- `unblockable` hits (purple glow) can only be dodged. `magic` hits (blue glow) can be parried or dodged.
Difficulty changes the windows (Story ×1.6, Mender ×1.0, Unthreaded ×0.7) and the timing aid ring (on by default
in Story).

**Break.** Enemies have a Break bar; break damage from heavy skills, weak-point shots and counters fills it. A
Broken enemy loses its next turn and takes +50% damage.

**Elements & statuses.** Physical, Fire, Ice, Storm, Earth, Light, Dark, Thread. Weak ×1.5, Resist ×0.5, Absorb
heals. Statuses in `StatusId`.

**Defeat** returns the party to the last Waystitch (or retries a boss). **First Strike**: hit a roaming enemy in
exploration before it touches you: the party acts first and the enemies start with damage. **Ambush**: get touched
from behind and the enemies act first.

**Waystitches** (rest points): rest (full heal, refill tinctures, respawn enemies), level up (attributes), skill
tree, equip, camp (if marked), fast travel, save.

## 7. Progression

- **Levels** 1-60 (content ends ~40). Each level: +3 attribute points (Vitality, Might, Agility, Defense, Luck) and
  +1 skill point.
- **Skill trees** per character (~12 skills); equip up to **6** skills (from the character and their class).
- **Weapons** per character (3-4 each), upgraded with Spindlesilk (Raw, Fine, Gilded, Star) to level 30; perks at
  4, 10 and 20.
- **Patches** (equip 3 per character): stats + a passive. Win **4 battles** with a patch on and its passive is
  **Learned** as an **Embroidery**: any character can sew it on for Thread Points (TP grows with level and with
  Spools of Memory found in the world).
- **Classes** (unlocked by account-wide **Tasks**, so co-op guests earn them too): any companion may wear one class;
  it changes stats, adds a passive and adds up to 3 skills unlocked by **class rank** (class XP from battles).
- **Tinctures**: Healing (3), Reviving (2), Spirit (+AP, 2); refilled at Waystitches; Glass Beads add charges.
- **Glim** is the currency. Pim Spool sells consumables, patches, weapons and silk.

## 8. Co-op

The host's save is the campaign. Up to three guests join with a 4-digit code (or from the friends list). In the
lobby each player claims one of the active four characters; unclaimed characters are AI (run on the host).
- Exploration and cutscenes: the host leads and advances; guests watch the same scene (synced ~12 Hz).
- Battle: the host runs the rules. A guest picks its own character's commands and plays its own timed inputs and
  defenses locally (so timing feels right whatever the ping), then sends the results; the host resolves them.
- Guests keep Task progress (class unlocks) on their own account.

## 9. Content rosters

### Regions and scenes

| region | name | scenes (in order) | theme | music |
|---|---|---|---|---|
| hollowmere | Hollowmere | hm_green, hm_orchard, hm_rise, hm_home | village_autumn | hollowmere |
| thimble_fields | Thimble Fields | tf_road, tf_thimbles, tf_bobbin_camp, tf_scarecrows, tf_tatter | fields_gold | fields |
| lanternmere | Lanternmere | lm_shore, lm_willows, lm_chapel, lm_lanterns, lm_lamplighter | marsh_night | marsh |
| cindermill | Cindermill | cm_outskirts, cm_market, cm_spinning, cm_rooftops, cm_furnace | mill_industrial | mill |
| selvage | The Selvage | sv_path, sv_windstair, sv_camp, sv_lip | cliffs_wind | cliffs |
| frayed_expanse | The Frayed Expanse | fe_landing, fe_isles, fe_echo_town, fe_nest | fray_surreal | fray |
| spindlehold | Spindlehold | sh_gate, sh_cloister, sh_ledger, sh_pruning, sh_arbiter | porcelain_city | spindlehold |
| seam_of_ages | The Seam of Ages | sa_return, sa_road, sa_seam | seam_storm (sa_return: village_ruin) | seam |
| underweave | The Underweave | uw_shallows, uw_echoes, uw_drowned_room, uw_mirror | underweave_deep | underweave |
| loomspire | The Loomspire | ls_root, ls_climb, ls_choir, ls_summit | spire_light | spire |
| bobbin_burrow | Bobbin Burrow (optional) | bb_tunnels, bb_hall | burrow | fields |
| glass_orchard | The Glass Orchard (optional) | go_rows, go_choir | glass | spindlehold |
| first_thread | The First Thread (post-game) | ft_origin | underweave_deep | final_weaver |

Scene widths 2400-5200 px (the screen is 1280 wide; the ground line is y = 560). Exits at the far left/right.

### Enemies (id: name, region, art family + look)
Art families (render/enemyArt.ts): `fray` (tangled thread knot creature), `hound` (four-legged yarn beast),
`crow` (thread bird), `scarecrow`, `thimble` (squat golem with a thimble helm), `wisp` (jelly/lantern ghost),
`moth`, `drowned` (humanoid wrapped in wet thread), `reed` (tall reed lurker), `spindle` (flying clockwork spindle),
`shear` (Choir enforcer with giant scissors), `golem` (furnace bobbin), `clockhound`, `shroud` (billowing cloth
ghost), `sentinel` (stone + thread guardian), `echo` (translucent villager memory), `knot` (big tangle with eyes),
`porcelain` (automaton with a hymn mask), `pages` (swarm of flying ledger pages), `angel` (porcelain winged warden),
`crawler` (needle spider), `knight` (unravelling armor), `serpent`, `hand` (hand of light with needles),
`spinner` (spinning-wheel construct), `mimic` (bobbin chest mimic), plus bosses with their own drawings.

- Prologue: `frayling` Frayling (fray, small), `yarn_hound` Yarn Hound (hound, red yarn), boss `unspun_hound` The
  Unspun Hound (hound, huge, trailing loose yarn).
- Ch1: `stitch_crow` Stitchcrow (crow), `scarecrow` Hollow Scarecrow (scarecrow, scythe), `thimble_knight` Thimble
  Knight (thimble), boss `old_tatter` Old Tatter (scarecrow lord, patchwork cloak, orbiting crows).
- Ch2: `lantern_wisp` Lantern Wisp (wisp), `bog_moth` Bog Moth (moth), `drowned_weaver` Drowned Weaver (drowned),
  `reedlurker` Reedlurker (reed), boss `drowned_lamplighter` The Drowned Lamplighter.
- Ch3: `spindle_drone` Spindle Drone (spindle), `shear_acolyte` Shear Acolyte (shear), `cinder_bobbin` Cinder Bobbin
  (golem), `loomhound` Loomhound (clockhound), mini-boss `rook_duel` Rook Ardent (party art), boss `foreman_gristle`
  Foreman Gristle (huge mill automaton).
- Ch4: `seamharpy` Seamharpy (crow, big, woman-faced mask), `gale_shroud` Gale Shroud (shroud), `selvage_sentinel`
  Selvage Sentinel (sentinel), boss `tess_1` Tess Quill (party art), scripted boss `orrin_1` Orrin Thale (party art).
- Ch5: `echo_villager` Echo (echo), `unwoven_moth` Unwoven Moth (moth, torn), `knot` Knot (knot), `driftlight`
  Driftlight (wisp), boss `tess_2` Tess Quill (party art, shorter), boss `moth_mother` The Moth Mother.
- Ch6: `choir_sentinel` Choir Sentinel (porcelain), `shear_knight` Shear Knight (shear, armored), `ledger_pages`
  Ledger Pages (pages), `loom_warden` Loom Warden (angel), boss `seraphine` / `seraphine_2` Arbiter Seraphine Vael.
- Ch7: `seam_crawler` Seam Crawler (crawler), `frayed_knight` Frayed Knight (knight), `storm_crow` Storm Crow (crow),
  boss `seam_eater` The Seam-Eater (serpent).
- Ch8: `lost_thread` Lost Thread (wisp, pale), `grief_knot` Grief Knot (knot, blue), `hollow_mender` Hollow Mender
  (knight, ghostly), boss `unfated_ash` Unfated Ash (party art, dark mirror).
- Ch9: `loomhand` Loomhand (hand), `choir_seraph` Choir Seraph (angel, gold), `fate_spinner` Fate Spinner (spinner),
  bosses `orrin_final` / `orrin_final_2` / `orrin_final_3` Orrin, the Tearer; `weaver` / `weaver_2` / `weaver_3` The
  Weaver.
- Optional: `bobbin_mimic` Bobbin Mimic (mimic), boss `grandmother_spool`; boss `glass_choir`; superboss
  `first_thread`.

Encounter ids: `e_<region>_<n>` for roaming groups, `b_<boss>` for bosses (e.g. `b_unspun_hound`, `b_tess_1`,
`b_orrin_1`, `b_seraphine`, `b_orrin_final`, `b_weaver`), `t_spar` for the sparring tutorial with Corin (enemy
`spar_corin`, party = Ash alone... see the tutorial), `b_rook_duel`.

### Items (ids)
- Tinctures (refilled at Waystitches): `tincture_heal`, `tincture_revive`, `tincture_spirit`.
- Consumables: `honey_bun` (heal party 25%), `smelling_salts` (cure statuses), `ember_vial`, `frost_vial`,
  `storm_vial` (elemental damage to all enemies), `spool_of_will` (+3 AP), `golden_thread` (full revive).
- Materials: `silk_raw`, `silk_fine`, `silk_gilded`, `silk_star` (weapon upgrades), `glass_bead` (+1 tincture
  charge), `memory_spool` (+1 Thread Point).
- Key items: `mothers_thimble`, `music_box`, `ledger_page`, `lio_ribbon`, `corins_shield`, `orrins_shears`,
  `ferry_bell` (Lanternmere crossing), `grapple_spool` (Selvage climbs).
- Patches: `p_first_light`, `p_quick_hands`, `p_stout_heart`, `p_thimble_guard`, `p_parry_echo`, `p_ember_hem`,
  `p_frost_hem`, `p_storm_hem`, `p_second_wind`, `p_lucky_button`, `p_sharp_eye`, `p_seam_seeker`, `p_breaker`,
  `p_leech_stitch`, `p_running_stitch`, `p_patience`, `p_glass_needle`, `p_healers_thread`, `p_last_stand`,
  `p_ember_lining`, `p_wool_lining`, `p_copper_thread`, `p_metronome`, `p_counterweight`, `p_light_feet`,
  `p_steady_hand`, `p_harvest`, `p_wildfire`, `p_hunters_mark`, `p_slow_mending`, `p_bright_weave`, `p_ambusher`,
  `p_bobbins_purse`, `p_scholars_ribbon`, `p_rekindle`, `p_coup_de_grace`, `p_shatterpoint`, `p_mirror_thread`,
  `p_clean_hands`, `p_grandmothers_knot` (optional boss reward), `p_choir_glass` (optional), `p_first_thread`
  (superboss).
- Weapons: `w_ash_1..4`, `w_corin_1..4`, `w_wick_1..4`, `w_orrin_1..2`, `w_maudra_1..3`, `w_rook_1..3`, `w_tess_1..3`
  (each character starts with `_1`).
- Outfits: `o_<char>_<n>` (palette swaps), Songs: `song_01`..`song_10`, Journals: `j_01`..`j_24` (also the journal
  ids in journals.ts).

### Classes and their Tasks (account-wide)
| id | Class | Task |
|---|---|---|
| duelist | Duelist | Perfect-parry 30 hits |
| windstep | Windstep | Dodge 60 hits |
| marksman | Marksman | Hit 25 weak points with Free Aim |
| warden | Warden | Block 20 hits with Shield or Interpose |
| pyrewright | Pyrewright | Apply Burn 40 times |
| rimeweaver | Rimeweaver | Freeze enemies 15 times |
| stormstitcher | Stormstitcher | Land 60 Storm hits |
| chirurgeon | Chirurgeon | Restore 6,000 HP |
| ragged | Ragged | Win 8 battles with someone under 25% HP |
| tinker | Tinker | Use 30 tinctures or items |
| shatterhand | Shatterhand | Break 20 enemies |
| cantor | Cantor | Land 150 Perfect timed inputs |
| fatebreaker | Fatebreaker (secret) | Defeat the First Thread |

### Music (TrackId) and sound (SfxId)
See `src/data/types.ts`. Everything is synthesized with Web Audio (src/audio/).

## 10. Art and audio direction

- Palette per theme, warm-to-cold progression across the acts: Hollowmere amber and apple-red; the Fields gold;
  Lanternmere teal night with orange lanterns; Cindermill rust and soot; the Selvage slate and white wind; the Fray
  bleached pastel with colors leaking; Spindlehold porcelain white and choir gold; the Seam storm violet; the
  Underweave deep indigo with soft lights; the Loomspire white-gold.
- Gold **stitch-lines** (dashed, softly glowing) run across ground and sky in every land: the world is sewn.
- Characters: soft shapes, a rim light, flowing cloaks and hair with secondary motion, readable silhouettes.
- Music: leitmotifs. **Lio's lullaby** (a simple 3/4 melody) is the game's heart: Ash hums it, the music box plays
  it, Orrin's boss theme is it in a minor key, the Mend ending is it on solo piano, the Tear ending is it under
  stars.

## 11. Code map

```
src/data/       types.ts (shapes), characters, skills, classes, enemies, items, patches, encounters
src/story/      dsl.ts (script helpers), cutscenes (one file per act), bonds.ts, journals.ts, npcs.ts
src/world/      scenes.ts (SceneSpec per scene), regions.ts (world map), shops.ts
src/battle/     state, engine (rules, AI), formulas, view (drawing + input), qte
src/explore/    side-scrolling scene runtime, world map
src/render/     painter (themes, parallax), actors (party + NPC rigs), enemyArt, fx, portraits
src/audio/      synth engine, music score, sfx
src/ui/         DOM overlays: title, sign-in, menus, dialogue, lobby, settings
src/net/        api.ts (Shoallhell server), socket.ts, coop.ts
src/game/       campaign state, save, progression, director (state machine)
```

Story flags: `seen:<cutscene>` (automatic), chapter progress flags `pro_done`, `ch1_done` ... `ch9_done`, and
`ch<n>_start` when a chapter begins (bond scenes require these). `route` = 'mend' | 'tear'. Boss defeats set
`beat:<encounter>`. Chests set `got:<id>`.
