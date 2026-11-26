// Optional and post-game content in the second half: the Glass Orchard (Maudra and Hessa) and the First Thread
// (the bottom of everything, where the very first stitch was made by hand).
import type { Cmd, Cutscene } from '../data/types';
import {
  actor, camera, cut, emote, fadeIn, flag, flash, give, hide, ifFlag, music, narrate, pose, say, sfx, shake, unlock,
  vfx, wait, walk,
} from './dsl';

/** Wick is gone after the Mend ending: post-game lines for Wick only play on the Tear route. */
const wickHere = (...cmds: Cmd[]): Cmd => ifFlag('route', cmds, [], 'tear');
/** the Glass Orchard can be visited before the ending (Wick is there) or after it (not after the Mend ending) */
const preGameOrTear = (cmds: Cmd[]): Cmd => ifFlag('ending_mend', [], cmds);

export const EXTRA_B: Cutscene[] = [
  // ================================================================== THE GLASS ORCHARD (optional, Ch6+)
  cut('go_enter', [
    music(null, 1500),
    camera(700, 0),
    fadeIn(1500),
    narrate('An orchard of glass trees north of Spindlehold. When the wind moves through them they chime, and the chimes are a chord.'),
    sfx('choir'),
    music('spindlehold', 3000),
    walk('maudra', 800, 0.6),
    say('maudra', 'neutral', 'I know that chord. That is the Hymn of Measure. Second verse. The trees are singing it.'),
    say('rook', 'neutral', 'Trees don’t sing.'),
    say('maudra', 'sad', 'These do. Coll said this is where the Choir keeps the voices. I thought it was a figure of speech.'),
    preGameOrTear([say('wick', 'afraid', 'The glass is warm, Maudra. Like a hand. Like lots of hands.')]),
    say('maudra', 'determined', 'Then let us go and find whoever is holding them.'),
  ]),
  cut('go_choir_before', [
    music(null, 1200),
    camera(1400, 1500),
    narrate('At the orchard’s heart: a chandelier of glass figures, hundreds of them, mouths open, singing one chord forever.'),
    sfx('choir'),
    shake(3, 1200),
    say('maudra', 'afraid', 'They made a hymn out of them. Every novice that was “called.” They kept the voices and threw away the rest.'),
    say('maudra', 'neutral', 'Listen. Under the chord. Somewhere low.'),
    wait(1500),
    narrate('Among a hundred perfect voices, one is singing the low part slightly, deliberately, wrong.'),
    say('maudra', 'cry', 'Hessa.'),
    say('rook', 'neutral', 'It’s not going to let them go quietly, Maudra.'),
    say('maudra', 'determined', 'No. But it is going to let them go.'),
    music('boss', 400),
  ]),
  cut('go_choir_after', [
    music(null, 1500),
    sfx('explosion'),
    flash('#ffffff', 600),
    vfx('sparkle', 1400, 260, 4000),
    narrate('The Glass Choir shatters. The chord breaks into a hundred separate voices, and the voices into light, and the light goes up.'),
    wait(1800),
    actor('hessa', 1450, 'left', 'idle', 'hessa'),
    sfx('magic_light'),
    say('hessa', 'smile', 'Maudy? Oh. You got OLD.'),
    say('maudra', 'laugh', 'I did. I did, you horrible child. Forty-two years. Where have you been?'),
    say('hessa', 'tender', 'Singing. Every night. For them. I sang the low part wrong on purpose. So you’d know it was me.'),
    say('maudra', 'cry', 'I knew. I always— some evenings I knew. I told myself I was imagining it.'),
    say('hessa', 'smile', 'You weren’t. You never imagined anything in your life, Maudy. You were always the sensible one.'),
    pose('maudra', 'kneel'),
    say('maudra', 'cry', 'I sang for them, Hessa. Forty years. I sang to the thing that took you.'),
    say('hessa', 'tender', 'I know. I heard you. You were always flat on the high bit.'),
    say('hessa', 'tender', 'Sing something else now. Something nobody wrote. Promise?'),
    say('maudra', 'tender', 'I promise.'),
    vfx('sparkle', 1450, 400, 3000),
    hide('hessa'),
    wait(2000),
    pose('maudra', 'idle'),
    narrate('Where Hessa stood lies a single shard of glass, still faintly humming. The low part. Slightly wrong.'),
    give('p_choir_glass'),
    preGameOrTear([say('wick', 'neutral', 'What do you call it? Singing the wrong part on purpose so someone knows it’s you?')]),
    say('rook', 'neutral', 'That’s called a sister.'),
    say('maudra', 'smile', '...Yes. That is exactly what it is called.'),
    music('spindlehold', 3000),
    flag('hessa_freed'),
  ]),

  // ================================================================== THE FIRST THREAD (post-game)
  cut('ft_enter', [
    music(null, 1500),
    camera(700, 0),
    fadeIn(2500),
    narrate('Below the Underweave, below the bottom of the dark sea, there is a floor. On the floor, one thread, glowing, older than anything.'),
    music('underweave', 3000),
    actor('b_first_mender', 1100, 'left', 'idle', 'b_first_mender'),
    say('b_first_mender', 'smile', 'Oh. Visitors. Nobody comes this far down. I was starting to think I’d invented you.'),
    say('ash', 'neutral', 'Who are you?'),
    say('b_first_mender', 'neutral', 'Someone who sewed two fields together once, so her children could walk to the river without wading.'),
    say('b_first_mender', 'smile', 'That was the first stitch. Before the Loom. Before anyone thought stitches had to be neat.'),
    say('maudra', 'shock', 'Before the Loom? The Choir teaches that the Loom wove the Hem.'),
    say('b_first_mender', 'laugh', 'The Choir would. No, love. People sewed the world. The Loom came later, to keep it tidy. Tidiness is a hungry thing.'),
    flag('met_first_mender'),
  ]),
  cut('ft_talk_mender', [
    ifFlag('beat:b_first_thread', [
      say('b_first_mender', 'tender', 'It’s resting now. It held a long time. So did you. Go up and sew something small and kind.'),
    ], [
      say('b_first_mender', 'neutral', 'The First Thread has held those two fields together since before your grandmothers’ grandmothers.'),
      say('b_first_mender', 'sad', 'It’s tired. It wants to know if the world can hold without it. You’ll have to show it. It won’t be gentle.'),
    ]),
  ], true),
  cut('ft_before', [
    music(null, 1200),
    camera(2400, 1500),
    narrate('The thread rises off the floor, and keeps rising: a shape of light as tall as the dark, stitched from every stitch ever made.'),
    shake(6, 1500),
    sfx('thunder'),
    say('b_first_mender', 'neutral', 'There it is. The first thing anyone ever mended. Everything since has been a copy of it.'),
    ifFlag('route', [
      say('b_first_mender', 'neutral', 'You cut the Loom down. Now everything holds by hand. It wants to know if your hands are good enough.'),
    ], [
      say('b_first_mender', 'neutral', 'You mended the Loom. Now the pattern holds again. It wants to know if you deserved the choice.'),
    ], 'tear'),
    say('ash', 'determined', 'Then let’s show it.'),
    wickHere(say('wick', 'determined', 'Very loudly!')),
    music('final_weaver', 400),
  ]),
  cut('ft_after', [
    music(null, 1500),
    vfx('sparkle', 2500, 300, 4000),
    sfx('magic_light'),
    narrate('The shape of light folds itself down, smaller and smaller, until it is just a thread again: lying on the floor, resting.'),
    wait(1500),
    actor('b_first_mender', 2200, 'right', 'idle', 'b_first_mender'),
    say('b_first_mender', 'smile', 'Good hands. Good hands, all of you.'),
    say('b_first_mender', 'tender', 'Measure twice. And cut... well. You’ll decide. You always did. That was the whole point of hands.'),
    narrate('She presses something into Ash’s palm. A knot of very old thread, tied by someone who did not care if it was neat.'),
    give('p_first_thread'),
    unlock('class', 'fatebreaker'),
    emote('ash', '!'),
    say('ash', 'smile', 'Thank you.'),
    say('b_first_mender', 'smile', 'Thank YOU. Now go up. It’s dark down here, and I’ve got a very long nap planned.'),
    hide('b_first_mender'),
    music('underweave', 3000),
    flag('beat_first_thread'),
  ]),
];
