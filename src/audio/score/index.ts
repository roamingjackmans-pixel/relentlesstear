// Every track in the game. The Record type makes TypeScript insist that each TrackId has a piece.
import type { TrackId } from '../../data/types';
import type { TrackDef } from '../compile';
import { battleTracks } from './battle';
import { lullabyTracks } from './lullaby';
import { regionTracks } from './regions';

export const TRACKS: Record<TrackId, TrackDef> = {
  ...lullabyTracks,
  ...regionTracks,
  ...battleTracks,
};

export { LULLABY, LULLABY_CHORDS } from './lullaby';
