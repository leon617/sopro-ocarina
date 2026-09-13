import type { Score, SongSettings, Melody, MusicEvent, Measure, Tempo } from './types';
import { validEvent } from './importance';
import {adaptMusic} from './adaptation';

function reductionLine(events:MusicEvent[],policy:'highest'|'lowest'){
 const selected=events.filter(validEvent).sort((a,b)=>a.start-b.start);
 const boundaries=[...new Set(selected.flatMap(e=>[e.start,e.start+e.duration]))].sort((a,b)=>a-b),line:MusicEvent[]=[];
 for(let i=0;i<boundaries.length-1;i++){
  const start=boundaries[i],duration=boundaries[i+1]-start;
  const active=selected.filter(e=>e.pitch&&e.start<=start+.00001&&e.start+e.duration>start+.00001).sort((a,b)=>(a.pitch!.midi-b.pitch!.midi)*(policy==='highest'?-1:1));
  if(active[0])line.push({...active[0],start,duration});
 }
 return line;
}

function reductionQuality(events:MusicEvent[],policy:'highest'|'lowest'){
 const line=reductionLine(events,policy);if(!line.length)return -Infinity;
 const duration=line.reduce((sum,e)=>sum+e.duration,0)||1;
 const average=line.reduce((sum,e)=>sum+e.pitch!.midi*e.duration,0)/duration;
 const intervals=line.slice(1).map((e,i)=>Math.abs(e.pitch!.midi-line[i].pitch!.midi));
 const smooth=intervals.length?intervals.filter(n=>n<=5).length/intervals.length:1;
 const leaps=intervals.reduce((sum,n)=>sum+Math.max(0,n-12),0)/(intervals.length||1);
 const pitches=line.map(e=>e.pitch!.midi),range=Math.max(...pitches)-Math.min(...pitches);
 return smooth*35-Math.abs(average-76)*.7-leaps-Math.max(0,range-24)*.35;
}

export function suggestedReduction(events:MusicEvent[],force=false):SongSettings['policy']{
 const selected=events.filter(validEvent).filter(e=>e.pitch).sort((a,b)=>a.start-b.start);let end=-1,overlap=false;
 for(const event of selected){if(event.start<end-.00001)overlap=true;end=Math.max(end,event.start+event.duration);}
 if(!force&&!overlap)return 'voice';
 const high=reductionQuality(selected,'highest'),low=reductionQuality(selected,'lowest');
 return low>high+10?'lowest':'highest';
}

export function suggestedSettings(score:Score):SongSettings {
 const choices=score.parts.flatMap(p=>p.voices.map(voice=>{
  const notes=p.events.filter(validEvent).filter(e=>e.voice===voice&&e.pitch).sort((a,b)=>a.start-b.start),n=notes.length;
  const avg=notes.reduce((a,e)=>a+e.pitch!.midi,0)/(n||1);
  let overlap=0,end=-1;for(const e of notes){if(e.start<end-.02)overlap++;end=Math.max(end,e.start+e.duration);}
  const single=1-overlap/(n||1),typical=notes.filter(e=>e.duration>=.125&&e.duration<=4).length/(n||1);
  const intervals=notes.slice(1).map((e,i)=>e.pitch!.midi-notes[i].pitch!.midi),motifs=new Set(intervals.slice(1).map((x,i)=>`${intervals[i]},${x}`));
  const recurrence=intervals.length?1-motifs.size/intervals.length:0;
  const name=`${p.name} ${p.instrument}`;
  const rank=n?single*60+typical*15+Math.min(15,Math.log2(n+1)*3)+recurrence*10-Math.abs(avg-76)*.8+(/flute|flauta|voice|vocal|melod|lead|ocarina|soprano/i.test(name)?25:0)-(/bass|baixo|drum|percuss|accomp|chord/i.test(name)?70:0):-1000;
  return {p,voice,rank};
 })).sort((a,b)=>b.rank-a.rank);
 const choice=choices[0],part=choice?.p||score.parts[0],voice=choice?.voice||part?.voices[0]||'1:1';
 return {partId:part?.id||'',voice,policy:suggestedReduction(part?.events.filter(validEvent).filter(e=>e.voice===voice)||[]),transpose:0,speed:1,lastIndex:0};
}
export function makeMelody(score:Score,settings:SongSettings):Melody {
 if(!score.parts.length)throw Error('A partitura não contém partes musicais.');
 const part=score.parts.find(p=>p.id===settings.partId)||score.parts[0];const warnings=[...score.warnings];
 const selected=part.events.filter(validEvent).filter(e=>settings.voice==='all'||e.voice===settings.voice).sort((a,b)=>a.start-b.start);
 let events=selected;
 let overlaps=false,end=-1;for(const e of selected.filter(e=>e.pitch)){if(e.start<end-.00001)overlaps=true;end=Math.max(end,e.start+e.duration);}
 if((overlaps||settings.voice==='all'&&part.voices.length>1)&&settings.policy==='voice') {warnings.push('Esta voz contém acordes ou sobreposição. Escolha a nota mais aguda ou mais grave para gerar uma melodia monofônica.');events=[];}
 if(settings.policy!=='voice') {
  // Sweep all onset AND release boundaries: preserve sustained tones when another voice ends.
  const boundaries=[...new Set(selected.flatMap(e=>[e.start,e.start+e.duration]))].sort((a,b)=>a-b);const flat:MusicEvent[]=[];
  for(let i=0;i<boundaries.length-1;i++){const start=boundaries[i],duration=boundaries[i+1]-start;
   const active=selected.filter(e=>e.start<=start+.00001&&e.start+e.duration>start+.00001);
   const pitches=active.filter(e=>e.pitch).sort((a,b)=>(a.pitch!.midi-b.pitch!.midi)*(settings.policy==='highest'?-1:1));const e=pitches[0]||active[0];if(!e)continue;
   const prev=flat.at(-1);if(prev?.sourceId===e.id&&Math.abs(prev.start+prev.duration-start)<.00001)prev.duration+=duration;
   else flat.push({...e,id:`${e.id}-slice-${i}`,sourceId:e.id,start,duration,tieStart:false,tieStop:false});
  }events=flat;if(overlaps)warnings.push('A polifonia foi reduzida pela altura escolhida. Notas sustentadas podem ser divididas nos pontos de mudança.');
 }
 const order:number[]=[];let repeatFrom=0,pass=1,i=0,steps=0,openRepeat=false,nested=false,completed=false;const visits=new Map<number,number>();
 for(const m of part.measures){if(m.repeatStart){if(openRepeat)nested=true;openRepeat=true;}if(m.repeatEnd)openRepeat=false;}
 if(nested){warnings.push('Repetições aninhadas não são expandidas; leitura linear aplicada.');part.measures.forEach((_,i)=>order.push(i));}
 else while(i<part.measures.length&&steps++<12000){const m=part.measures[i];if(completed&&!m.endings.length){pass=1;completed=false;}if(m.repeatStart&&pass===1)repeatFrom=i;
  if(!m.endings.length||m.endings.includes(pass))order.push(i);
  if(m.repeatEnd){const count=visits.get(i)||1;if(count<m.repeatEnd){visits.set(i,count+1);pass=count+1;i=repeatFrom;continue;}repeatFrom=i+1;completed=true;}
  i++;
 }
 if(steps>=12000)throw Error('Repetições excederam o limite de segurança.');
 const expanded:MusicEvent[]=[],measures:Measure[]=[],tempos:Tempo[]=[];let start=0;
 order.forEach((index,occurrence)=>{const m=part.measures[index];measures.push({...m,index:occurrence,start});
  const activeTempo=[...part.tempos].reverse().find(t=>t.at<=m.start)?.bpm||80;tempos.push({at:start,bpm:activeTempo});
  for(const t of part.tempos.filter(t=>t.at>m.start&&t.at<m.start+m.duration))tempos.push({at:start+t.at-m.start,bpm:t.bpm});
  const inMeasure=events.filter(e=>e.measure===index);let cursor=0;
  for(const e of inMeasure){const offset=e.start-m.start;if(offset>cursor+.00001)expanded.push({id:`gap-${occurrence}-${cursor}`,pitch:null,start:start+cursor,duration:offset-cursor,measure:occurrence,measureLabel:m.label,voice:settings.voice,type:'rest',dots:0,tieStart:false,tieStop:false});expanded.push({...e,id:`${e.id}@${occurrence}`,start:start+offset,measure:occurrence});cursor=Math.max(cursor,offset+e.duration);}
  if(cursor<m.duration-.00001&&events.length)expanded.push({id:`gap-${occurrence}-end`,pitch:null,start:start+cursor,duration:m.duration-cursor,measure:occurrence,measureLabel:m.label,voice:settings.voice,type:'rest',dots:0,tieStart:false,tieStop:false});start+=m.duration;
 });
 if(expanded.length>120000)throw Error('Partitura expandida excede o limite de eventos.');
 const adapted=adaptMusic(expanded,settings);
 return {...adapted,measures,tempos,warnings,transformation:`${part.name} · ${settings.voice==='all'?'todas as vozes':`voz ${settings.voice.split(':')[1]} / pauta ${settings.voice.split(':')[0]}`} · ${{voice:'voz original',highest:'nota mais aguda',lowest:'nota mais grave'}[settings.policy]} · transposição ${adapted.analysis.transpose>0?'+':''}${adapted.analysis.transpose} st${settings.simplify?' · versão simplificada':''} · ${adapted.analysis.octaveChanges} notas mudaram de oitava · ${adapted.analysis.removed} notas removidas · preservação estimada ${adapted.analysis.preserved}%`};
}
