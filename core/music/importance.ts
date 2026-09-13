import type {MusicEvent} from './types';

export function validEvent(e:MusicEvent|null|undefined):e is MusicEvent {
 return !!e&&Number.isFinite(e.start)&&e.start>=0&&Number.isFinite(e.duration)&&e.duration>0&&(e.pitch===null||!!e.pitch&&Number.isFinite(e.pitch.midi)&&e.pitch.midi>=0&&e.pitch.midi<=127);
}
/** Heuristic weights, not a claim of perceptual accuracy. Never deletes input. */
export function musicalWeights(events:MusicEvent[]):Map<string,number> {
 const notes=events.filter(validEvent).filter(e=>e.pitch),counts=new Map<number,number>(),motifs=new Map<string,number>();
 const motif=(i:number)=>i>0&&i<notes.length-1?`${notes[i].pitch!.midi-notes[i-1].pitch!.midi},${notes[i+1].pitch!.midi-notes[i].pitch!.midi}`:'';
 notes.forEach((e,i)=>{counts.set(e.pitch!.midi,(counts.get(e.pitch!.midi)||0)+1);const key=motif(i);if(key)motifs.set(key,(motifs.get(key)||0)+1);});
 const prefixGap=notes.findIndex((e,i)=>i<3&&notes[i+1]&&notes[i+1].start-e.start-e.duration>4);
 const suffixGap=notes.findIndex((e,i)=>i>=notes.length-3&&i>0&&e.start-notes[i-1].start-notes[i-1].duration>4);
 const median=[...notes].sort((a,b)=>a.duration-b.duration)[Math.floor(notes.length/2)]?.duration||1;
 return new Map(notes.map((e,i)=>{
  let w=Math.max(.1,Math.min(2,e.duration/median))*(1+Math.min(2,(counts.get(e.pitch!.midi)||1)/4))*(1+Math.min(1,(motifs.get(motif(i))||0)/4));
  const isolatedStart=prefixGap>=0&&i<=prefixGap;
  const isolatedEnd=suffixGap>=0&&i>=suffixGap;
  if(isolatedStart||isolatedEnd)w*=.15;
  if(e.duration<.125)w*=.2;
  if(e.tieStart||e.tieStop)w=Math.max(1,w);
  return [e.id,w];
 }));
}

export function fingerContext(events:MusicEvent[],index:number){
 const previous=events.slice(0,index).reverse().find(e=>e.pitch);
 const next=events.slice(index+1).find(e=>e.pitch);
 return {previous,next,reference:events[index]?.pitch?events[index]:previous};
}
