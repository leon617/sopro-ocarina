import {musicalWeights} from './importance';
import type { MusicEvent, Pitch } from './types';
// Player's view. Ten TOP apertures = eight main holes + two subholes.
// STL 12tenorC.pdf. Cross-checked against Imperial City AC; where variants
// differ (low Eb), this profile follows the STL primary chart.
export const holes = [
 {id:'L4',label:'mínimo esquerdo',x:77,y:84,r:10},
 {id:'L3',label:'anelar esquerdo',x:103,y:74,r:11},
 {id:'L2',label:'médio esquerdo',x:130,y:64,r:11},
 {id:'L1',label:'indicador esquerdo',x:156,y:53,r:10},
 {id:'R1',label:'indicador direito',x:194,y:97,r:11},
 {id:'R2',label:'médio direito',x:217,y:82,r:10},
 {id:'R3',label:'anelar direito',x:240,y:66,r:9},
 {id:'R4',label:'mínimo direito',x:261,y:50,r:8},
 {id:'SL',label:'subfuro esquerdo',x:119,y:91,r:5},
 {id:'SR',label:'subfuro direito',x:201,y:67,r:5},
 {id:'TL',label:'polegar esquerdo (inferior)',x:116,y:171,r:12},
 {id:'TR',label:'polegar direito (inferior)',x:218,y:171,r:12},
];
// Each bit: L4 L3 L2 L1 R1 R2 R3 R4 SL SR TL TR; 1 = covered.
const patterns = [
 '111111111111', // A4
 '111111111011', // A#4: left subhole only
 '111111110111', // B4: right subhole only
 '111111110011', // C5
 '111111100111', // C#5: D + right subhole
 '111111100011', // D5
 '111111000111', // D#5: STL E + right subhole
 '111111000011', // E5
 '111110000011', // F5
 '111100100011', // F#5
 '111100000011', // G5
 '110100100011', // G#5
 '110100000011', // A5
 '100100100011', // A#5
 '100100000011', // B5
 '000100000011', // C6
 '000100100001', // C#6
 '000100000001', // D6
 '000100100000', // D#6
 '000100000000', // E6
 '000000000000', // F6
];
export const altoC = {id:'alto-c-stl',name:'Alto C · 12 furos',min:69,max:89,holes,patterns,sources:[
 'https://cdn.shopify.com/s/files/1/0103/7756/0119/files/12tenorC.pdf',
 'https://www.imperialcityocarina.com/images/cache/ac-12-hole-fingering-chart.pdf',
]};
export function fingering(midi:number) { const p=patterns[midi-altoC.min]; return p ? [...p].map(Number): undefined; }
const steps=['C','C','D','D','E','F','F','G','G','A','A','B'];
export function pitchFromMidi(midi:number):Pitch {const pc=((midi%12)+12)%12;return {step:steps[pc],alter:[1,3,6,8,10].includes(pc)?1:0,octave:Math.floor(midi/12)-1,midi};}
export function noteName(p:Pitch|null,solfege=true) {if(!p)return 'Pausa';return `${solfege?({C:'Dó',D:'Ré',E:'Mi',F:'Fá',G:'Sol',A:'Lá',B:'Si'} as Record<string,string>)[p.step]||p.step:p.step}${p.alter>0?'♯'.repeat(Math.min(2,p.alter)):p.alter<0?'♭'.repeat(Math.min(2,-p.alter)):''}${p.octave}`;}
export function transposeEvents(events:MusicEvent[],semitones:number) {return events.map(e=>{const pitch=e.pitch?(semitones?pitchFromMidi(e.pitch.midi+semitones):e.pitch):null;return {...e,pitch,fingering:pitch?fingering(pitch.midi):undefined,outOfRange:!!pitch&&!fingering(pitch.midi)};});}
export function suggestTranspositions(events:MusicEvent[]) { const weights=musicalWeights(events),notes=events.filter(e=>e?.pitch);return Array.from({length:49},(_,i)=>i-24).map(shift=>({shift,fit:notes.filter(e=>!!fingering(e.pitch!.midi+shift)).length,total:notes.length,preserved:notes.reduce((sum,e)=>sum+(fingering(e.pitch!.midi+shift)?weights.get(e.id)||0:0),0)})).sort((a,b)=>b.preserved-a.preserved||Math.abs(a.shift)-Math.abs(b.shift)).slice(0,5); }
