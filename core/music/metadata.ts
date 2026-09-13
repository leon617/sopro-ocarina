import type {Song} from './types';

const unknown=/^(compositor|autoria).*n[aã]o informad|n[aã]o informad[oa] pela fonte/i;
export const hasComposer=(value?:string)=>!!value?.trim()&&!unknown.test(value.trim());

const knownTracks:[RegExp,string][]=[
 [/\bwet hands\b/i,'C418'],
 [/\bcity escape\b|escape from the city/i,'Jun Senoue'],
 [/\bspace zone(?: suite)?\b/i,'Kazumi Totaka'],
 [/\bgreat fairy(?:'s)? fountain\b/i,'Koji Kondo'],
 [/\b(?:sweden|subwoofer lullaby|mice on venus|living mice|haggstrom|dry hands)\b.*minecraft|minecraft.*\b(?:sweden|subwoofer lullaby|mice on venus|living mice|haggstrom|dry hands)\b/i,'C418'],
];

const knownGames:[RegExp,string][]=[
 [/super mario land 2|mario land 2/i,'Kazumi Totaka'],
 [/sonic adventure 2/i,'Jun Senoue, Kenichi Tokoi, Fumie Kumatani e Tomoya Ohtani'],
 [/minecraft[^\n]*(?:volume alpha|volume beta)/i,'C418'],
 [/ocarina of time/i,'Koji Kondo'],
 [/majora(?:'s|’s) mask/i,'Koji Kondo e Toru Minegishi'],
 [/link(?:'s|’s) awakening/i,'Minako Hamano e Kozue Ishikawa'],
 [/zelda ii|adventure of link/i,'Akito Nakatsuka'],
 [/a link to the past/i,'Koji Kondo'],
 [/the legend of zelda/i,'Koji Kondo'],
];

export function inferredComposer(song:Pick<Song,'title'|'composer'|'collection'|'sourceName'>){
 if(hasComposer(song.composer))return song.composer.trim();
 const identity=`${song.title} ${song.collection||''}`;
 return knownTracks.find(([pattern])=>pattern.test(identity))?.[1]
  ||knownGames.find(([pattern])=>pattern.test(identity))?.[1]
  ||song.composer;
}
