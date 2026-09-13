import {Midi} from '@tonejs/midi';
const MAX_MIDI=2*1024*1024,MAX_NOTES=10000;
const escapeXML=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!)).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
/** Validate SMF framing and bound work before the third-party parser allocates event objects. */
export function inspectMIDI(bytes:Uint8Array){
 if(bytes.length>MAX_MIDI)throw Error('O limite para MIDI é 2 MB.');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),tag=(p:number)=>String.fromCharCode(...bytes.subarray(p,p+4));
 if(bytes.length<14||tag(0)!=='MThd'||v.getUint32(4)!==6)throw Error('MIDI inválido: cabeçalho SMF ausente.');
 const format=v.getUint16(8),tracks=v.getUint16(10),division=v.getUint16(12);
 if(format>1)throw Error('MIDI tipo 2 contém sequências independentes e ainda não é suportado. Exporte como tipo 0 ou 1.');
 if(!division||(division&0x8000))throw Error('MIDI com relógio SMPTE não é suportado. Exporte com pulsos por semínima (PPQ).');
 if(!tracks||tracks>64||format===0&&tracks!==1)throw Error('MIDI inválido ou acima do limite de 64 faixas.');
 let pos=14,notes=0,events=0,sysex=false;
 for(let t=0;t<tracks;t++){
  if(pos+8>bytes.length||tag(pos)!=='MTrk')throw Error('Faixa MIDI inválida ou truncada.');
  const end=pos+8+v.getUint32(pos+4);pos+=8;if(end>bytes.length)throw Error('Faixa MIDI truncada.');
  let running=0,ticks=0;const active=new Map<string,number>();
  const read=()=>{if(pos>=end)throw Error('Evento MIDI truncado.');return bytes[pos++];};
  const variable=()=>{let n=0;for(let i=0;i<4;i++){const b=read();n=n*128+(b&127);if(!(b&128))return n;}throw Error('Duração MIDI inválida.');};
  while(pos<end){
   ticks+=variable();if(ticks/division>12000||++events>150000)throw Error('MIDI longo ou complexo demais.');
   let status=read();if(status<128){if(!running)throw Error('MIDI sem status de evento.');pos--;status=running;}else if(status<240)running=status;
   if(status===255){const type=read(),length=variable();if(type===0x2f&&length!==0)throw Error('Fim de faixa MIDI inválido.');pos+=length;running=0;}
   else if(status===240||status===247){const length=variable();pos+=length;running=0;sysex=true;}
   else if(status>=128&&status<240){
    const a=read(),kind=status>>4,b=[12,13].includes(kind)?0:read();if(a>127||b>127)throw Error('Dados de nota MIDI inválidos.');
    if(kind===9&&b>0){notes++;if(notes>MAX_NOTES)throw Error('MIDI excede o limite de 10.000 notas.');const key=`${status&15}:${a}`;active.set(key,(active.get(key)||0)+1);}
    if(kind===8||kind===9&&b===0){const key=`${status&15}:${a}`,count=active.get(key)||0;if(count)active.set(key,count-1);}
   }else throw Error('Evento MIDI não suportado.');
   if(pos>end)throw Error('Evento MIDI excede sua faixa.');
  }
  if([...active.values()].some(n=>n>0))throw Error('MIDI tem notas sem evento de término. Exporte novamente para preservar as durações.');
 }
 if(pos!==bytes.length)throw Error('Dados extras após as faixas MIDI.');
 if(!notes)throw Error('O MIDI não contém notas.');return {notes,sysex};
}
/** SMF 0/1 -> canonical MusicXML. Tick positions and note-off durations remain exact, without quantization. */
export function midiToMusicXML(bytes:Uint8Array,filename='Música MIDI'):string{
 const inspected=inspectMIDI(bytes);let midi:Midi;
 try{midi=new Midi(bytes);}catch{throw Error('MIDI inválido. Exporte novamente como MIDI tipo 0 ou 1.');}
 const ppq=midi.header.ppq,tracks=midi.tracks.filter(t=>t.notes.length);
 if(tracks.reduce((n,t)=>n+t.notes.length,0)!==inspected.notes)throw Error('Algumas notas MIDI não puderam ser reconstruídas. Exporte novamente.');
 if(!tracks.some(t=>!t.instrument.percussion))throw Error('Este MIDI contém apenas percussão sem altura definida. Escolha uma faixa melódica.');
 const warnings=['Importado de MIDI: faixas e tempos foram preservados, sem quantização. Nomes das notas e compassos são reconstruídos; o arquivo não contém a notação completa da partitura.','MIDI: dinâmica, pedal, controladores e efeitos de sintetizador não são reproduzidos; a duração usada vai do início ao término de cada nota.'];
 if(tracks.some(t=>t.instrument.percussion))warnings.push('MIDI: faixas de percussão foram identificadas e representadas como pausas. Escolha uma faixa melódica.');
 if(tracks.some(t=>t.pitchBends.length))warnings.push('MIDI: pitch bends não foram aplicados. A prévia usa a altura base das notas.');
 if(inspected.sysex)warnings.push('MIDI: mensagens SysEx de configuração do sintetizador não foram aplicadas.');
 if(!midi.header.timeSignatures.some(s=>s.ticks===0))warnings.push('MIDI sem fórmula de compasso inicial: foi adotado 4/4.');
 const signatures=[{ticks:0,timeSignature:[4,4]},...midi.header.timeSignatures].sort((a,b)=>a.ticks-b.ticks);
 for(const s of signatures)if(!Number.isInteger(s.ticks)||s.ticks<0||s.timeSignature.length!==2||!Number.isInteger(s.timeSignature[0])||s.timeSignature[0]<1||s.timeSignature[0]>32||![1,2,4,8,16,32,64].includes(s.timeSignature[1]))throw Error('Fórmula de compasso MIDI inválida ou não suportada.');
 let end=0;for(const t of tracks)for(const n of t.notes){if(!Number.isInteger(n.ticks)||!Number.isInteger(n.durationTicks)||n.ticks<0||n.durationTicks<=0)throw Error('MIDI contém notas de duração nula ou inválida.');end=Math.max(end,n.ticks+n.durationTicks);}
 const tempos=[{ticks:0,bpm:120},...midi.header.tempos].sort((a,b)=>a.ticks-b.ticks);
 if(tempos.some(t=>!Number.isFinite(t.bpm)||t.bpm<=0||t.bpm>600))throw Error('MIDI contém andamento fora do limite de 0–600 bpm.');
 const measures:{start:number;end:number;beats:number;unit:number;implicit:boolean}[]=[];
 let start=0,signatureIndex=0;
 while(start<end){
  while(signatureIndex+1<signatures.length&&signatures[signatureIndex+1].ticks<=start)signatureIndex++;
  const [beats,unit]=signatures[signatureIndex].timeSignature,expected=start+beats*4*ppq/unit;
  const next=signatures[signatureIndex+1]?.ticks??Infinity,stop=Math.min(expected,next,end);
  if(!Number.isInteger(stop)||stop<=start||measures.length>=3000)throw Error('MIDI com compassos excessivos ou divisão rítmica não suportada.');
  measures.push({start,end:stop,beats,unit,implicit:stop!==expected});start=stop;
 }
 if(measures.some(m=>m.implicit&&m.end<end))warnings.push('Uma mudança de compasso MIDI ocorre entre barras: o compasso foi dividido no instante indicado.');
 const title=escapeXML(midi.name.trim()||filename.replace(/\.(mid|midi)$/i,''));
 const composer=midi.header.meta.map(event=>event.text.trim()).map(text=>text.match(/(?:^|[.;]\s*)(?:composer|composed by|music by)\s*[:\-]?\s*([^;|]{2,160})/i)?.[1]?.trim()).find(Boolean);
 const names=tracks.map((t,i)=>escapeXML(`${t.name||`Faixa ${i+1}`} · canal ${t.channel+1}${t.instrument.percussion?' · percussão':''}`));
 const parts=tracks.map((track,ti)=>{
  const segments:Map<number,{start:number;duration:number;midi:number;stop:boolean;tie:boolean}[]>=new Map();
  let count=0;
  for(const n of track.notes){
   // Binary search avoids scanning every measure for every note.
   let lo=0,hi=measures.length-1;while(lo<hi){const m=Math.floor((lo+hi)/2);if(measures[m].end<=n.ticks)lo=m+1;else hi=m;}
   for(let i=lo;i<measures.length&&measures[i].start<n.ticks+n.durationTicks;i++){
    if(++count>30000)throw Error('MIDI produz eventos demais ao dividir notas entre compassos.');
    const m=measures[i],a=Math.max(n.ticks,m.start),b=Math.min(n.ticks+n.durationTicks,m.end),list=segments.get(i)||[];
    list.push({start:a-m.start,duration:b-a,midi:n.midi,stop:a>n.ticks,tie:b<n.ticks+n.durationTicks});segments.set(i,list);
   }
  }
  return `<part id="P${ti+1}">`+measures.map((m,mi)=>{
   let xml=`<measure number="${mi+1}" implicit="${m.implicit?'yes':'no'}"><attributes><divisions>${ppq}</divisions><time><beats>${m.beats}</beats><beat-type>${m.unit}</beat-type></time></attributes>`,cursor=0;
   for(const t of tempos.filter(t=>t.ticks>=m.start&&t.ticks<m.end))xml+=`<direction><offset>${t.ticks-m.start}</offset><sound tempo="${t.bpm}"/></direction>`;
   for(const n of (segments.get(mi)||[]).sort((a,b)=>a.start-b.start||b.midi-a.midi)){
    const delta=n.start-cursor;if(delta)xml+=`<${delta>0?'forward':'backup'}><duration>${Math.abs(delta)}</duration></${delta>0?'forward':'backup'}>`;
    const pc=n.midi%12,step=['C','C','D','D','E','F','F','G','G','A','A','B'][pc],alter=[1,3,6,8,10].includes(pc)?1:0;
    xml+=`<note>${track.instrument.percussion?'<rest/>':`<pitch><step>${step}</step><alter>${alter}</alter><octave>${Math.floor(n.midi/12)-1}</octave></pitch>`}<duration>${n.duration}</duration><voice>1</voice>${n.stop?'<tie type="stop"/>':''}${n.tie?'<tie type="start"/>':''}</note>`;cursor=n.start+n.duration;
   }
   if(cursor<m.end-m.start)xml+=`<forward><duration>${m.end-m.start-cursor}</duration></forward>`;
   return xml+'</measure>';
  }).join('')+'</part>';
 }).join('');
 const xml=`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>${title}</work-title></work><identification>${composer?`<creator type="composer">${escapeXML(composer)}</creator>`:''}<miscellaneous><miscellaneous-field name="sopro-original-format">MIDI</miscellaneous-field>${warnings.map(w=>`<miscellaneous-field name="sopro-import-warning">${escapeXML(w)}</miscellaneous-field>`).join('')}</miscellaneous></identification><part-list>${tracks.map((t,i)=>`<score-part id="P${i+1}"><part-name>${names[i]}</part-name><score-instrument id="I${i+1}"><instrument-name>${escapeXML(t.instrument.name)}</instrument-name></score-instrument></score-part>`).join('')}</part-list>${parts}</score-partwise>`;
 if(new TextEncoder().encode(xml).length>8*1024*1024)throw Error('MIDI produz uma partitura maior que 8 MB. Exporte menos faixas.');return xml;
}
