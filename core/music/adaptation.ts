import type {MusicEvent,SongSettings} from './types';
import {altoC,transposeEvents,pitchFromMidi} from './profile';
import {musicalWeights} from './importance';

const fits=(n:number)=>Number.isInteger(n)&&n>=altoC.min&&n<=altoC.max;
export function adaptMusic(original:MusicEvent[],settings:SongSettings){
 const weights=musicalWeights(original),total=[...weights.values()].reduce((a,b)=>a+b,0)||1;
 const mode=settings.adaptation||'original';
 function candidate(shift:number){
  let events=transposeEvents(original,shift),octaveChanges=0,removed=0,loss=0;
  if(mode!=='original'){
   // Phrase-level shifts first in scoring: consistent octaves preserve intervals.
   const phrases:MusicEvent[][]=[];let phrase:MusicEvent[]=[];
   for(const e of events){if(!e.pitch){if(e.duration>=1&&phrase.length){phrases.push(phrase);phrase=[];}continue;}phrase.push(e);}if(phrase.length)phrases.push(phrase);
   for(const group of phrases){
    const shifts=[0,-12,12,-24,24].map(o=>({o,cost:group.reduce((sum,e)=>sum+(fits(e.pitch!.midi+o)?(o?.08:0):1)*(weights.get(e.id)||.1),0)})).sort((a,b)=>a.cost-b.cost||Math.abs(a.o)-Math.abs(b.o));
    const octave=shifts[0].o;
    for(const e of group){const before=e.pitch!.midi;let n=before+octave;
     if(!fits(n)){const choices=[-24,-12,0,12,24].map(o=>before+o).filter(fits);if(choices.length)n=choices.sort((a,b)=>Math.abs(a-n)-Math.abs(b-n))[0];}
     if(fits(n)&&n!==before){e.pitch=pitchFromMidi(n);octaveChanges++;loss+=(weights.get(e.id)||.1)*.08;}
     else if(!fits(n)){const w=weights.get(e.id)||.1;if(w<.35&&!e.tieStart&&!e.tieStop){e.pitch=null;e.type='rest';removed++;}loss+=w;}
    }
   }
   // Penalize altered melodic contour, especially octave jumps between phrases.
   const notes=events.filter(e=>e.pitch);const source=new Map(original.map(e=>[e.id,e]));
   for(let i=1;i<notes.length;i++){const a=notes[i-1],b=notes[i],old=source.get(b.id)!.pitch!.midi-source.get(a.id)!.pitch!.midi;
    const change=Math.abs((b.pitch!.midi-a.pitch!.midi)-old);if(change)loss+=Math.min(weights.get(a.id)||.1,weights.get(b.id)||.1)*Math.min(.7,change/24);
   }
  }else loss=events.reduce((sum,e)=>sum+(e.outOfRange?(weights.get(e.id)||.1):0),0);
  events=transposeEvents(events,0);
  return {events,octaveChanges,removed,loss,shift};
 }
 const base=settings.transpose;
 let best=candidate(base);
 if(mode==='balanced'||mode==='flexible'){
  const threshold=mode==='balanced'?.18:.04;
  for(let shift=-24;shift<=24;shift++){const c=candidate(shift);const penalty=(shift===base?0:total*threshold)+Math.abs(shift-base)*total*.001;
   if(c.loss+penalty<best.loss+(best.shift===base?0:total*threshold)+Math.abs(best.shift-base)*total*.001)best=c;
  }
 }
 if(settings.simplify){
  const events=best.events.map(e=>({...e}));
  for(let i=0;i<events.length;i++){const e=events[i],before=events[i-1],after=events[i+1];
   if(e.pitch&&e.duration<.125&&(weights.get(e.id)||0)<.35&&!e.tieStart&&!e.tieStop&&before?.pitch&&after?.pitch&&Math.abs(before.pitch.midi-after.pitch.midi)<=2&&Math.abs(e.pitch.midi-before.pitch.midi)<=3){
    if(Math.abs(before.start+before.duration-e.start)<.00001){before.duration+=e.duration;best.loss+=weights.get(e.id)||0;best.removed++;events.splice(i--,1);}
   }
  }
  // Only close recurring short articulation gaps; keep phrase rests and the clock.
  const gaps=events.filter((e,i)=>!e.pitch&&e.duration<=.25&&events[i-1]?.pitch&&events[i+1]?.pitch);
  const counts=new Map<string,number>();gaps.forEach(e=>{const k=e.duration.toFixed(2);counts.set(k,(counts.get(k)||0)+1);});
  best.events=events.filter((e,i)=>{if(gaps.includes(e)&&(counts.get(e.duration.toFixed(2))||0)>=4){const prev=events[i-1];if(!prev.tieStart&&Math.abs(prev.start+prev.duration-e.start)<.00001){prev.duration+=e.duration;return false;}}return true;});
 }
 return {events:best.events,analysis:{preserved:Math.round(Math.max(0,1-best.loss/total)*100),octaveChanges:best.octaveChanges,removed:best.removed,transpose:best.shift}};
}
