// nu.tide: the home page listens to the local clock and surfaces what fits the hour — focus in the morning,
// Chopin and nocturnes in the evening, healing late — without a server and without a profile. Programmes and
// collections stay the same; only which ones greet you changes. Pair with live channels that are already
// clock-pinned: the tide is the personal face of the same idea.

import { ALBUMS, CHANNELS, COLLECTIONS, TRACKS, artistOf, type Album, type Channel, type Collection, type Track } from '../../data/waves';

export type TideBand = 'dawn' | 'day' | 'dusk' | 'night';

export type TidePick = {
  band: TideBand;
  label: string;
  lede: string;
  collectionIds: string[];
  albumIds: string[];
  channelIds: string[];
  trackIds: string[];
};

const hour = () => new Date().getHours();

export function bandOf(h = hour()): TideBand {
  if (h >= 5 && h < 11) return 'dawn';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'dusk';
  return 'night';
}

export function tide(h = hour()): TidePick {
  const band = bandOf(h);
  if (band === 'dawn') {
    return {
      band,
      label: 'morning tide',
      lede: 'Focus tones and a little piano while the day opens. Generated here; nothing uploaded.',
      collectionIds: ['focus'],
      albumIds: ['healing-nature'],
      channelIds: ['healing-live'],
      trackIds: TRACKS.filter((t) => t.tags.includes('focus') || t.tags.includes('binaural') || t.tags.includes('noise')).map((t) => t.id).slice(0, 6),
    };
  }
  if (band === 'day') {
    return {
      band,
      label: 'day tide',
      lede: 'First Attempt in the hall, Chopin when you want piano, live radio if you leave it on.',
      collectionIds: [],
      albumIds: ['more-of-the-same', 'chopin-nocturnes'],
      channelIds: ['khensu-radio'],
      trackIds: ['first-attempt'],
    };
  }
  if (band === 'dusk') {
    return {
      band,
      label: 'evening tide',
      lede: 'Nocturnes and the night collection as the light goes. Tune the nocturnes channel to hear the same moment as everyone else.',
      collectionIds: ['night'],
      albumIds: ['chopin-nocturnes'],
      channelIds: ['nocturnes'],
      trackIds: TRACKS.filter((t) => t.tags.includes('nocturne') || t.tags.includes('waltz') || t.tags.includes('prelude')).map((t) => t.id).slice(0, 6),
    };
  }
  return {
    band,
    label: 'night tide',
    lede: 'Rain, bowls and the chakra journey. Sleep timer collapses the room before it fades the volume.',
    collectionIds: ['chakra-journey', 'night'],
    albumIds: ['healing-chakras', 'healing-nature'],
    channelIds: ['healing-live'],
    trackIds: TRACKS.filter((t) => t.tags.includes('sleep') || t.tags.includes('rain') || t.tags.includes('healing')).map((t) => t.id).slice(0, 6),
  };
}

export const resolveTide = (p: TidePick) => ({
  collections: p.collectionIds.map((id) => COLLECTIONS.find((c) => c.id === id)).filter((c): c is Collection => !!c),
  albums: p.albumIds.map((id) => ALBUMS.find((a) => a.id === id)).filter((a): a is Album => !!a),
  channels: p.channelIds.map((id) => CHANNELS.find((c) => c.id === id)).filter((c): c is Channel => !!c),
  tracks: p.trackIds.map((id) => TRACKS.find((t) => t.id === id)).filter((t): t is Track => !!t),
  artists: p.trackIds.map((id) => TRACKS.find((t) => t.id === id)).map((t) => (t ? artistOf(t.artistId) : undefined)).filter(Boolean),
});
