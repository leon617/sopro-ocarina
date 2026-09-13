import { Unzip, UnzipInflate, strFromU8 } from 'fflate';
import type { Score, Part, MusicEvent, Pitch } from './types';
const MAX_FILE=8*1024*1024, MAX_EXPANDED=20*1024*1024;
const children=(e:Element,tag:string)=>Array.from(e.children).filter(c=>c.localName===tag);
const child=(e:Element,tag:string)=>children(e,tag)[0];
const txt=(e:Element,tag:string,fallback='')=>child(e,tag)?.textContent?.trim()||fallback;
const num=(e:Element,tag:string,fallback=0)=>{const s=txt(e,tag); const n=s?Number(s):fallback;if(!Number.isFinite(n))throw Error(`Valor inválido em ${tag}.`);return n;};
const types:Record<string,number>={maxima:32,long:16,breve:8,whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125,'64th':.0625,'128th':.03125};
export function safeDocument(xml:string) {
 if(new TextEncoder().encode(xml).length>MAX_FILE)throw Error('O XML excede o limite de 8 MB.');
 if(/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(xml))throw Error('Entidades e DTDs internas não são permitidas.');
 // Standard MusicXML external DOCTYPE is stripped, never loaded or resolved.
 xml=xml.replace(/<!DOCTYPE[^>]*>/gi,'');
 let depth=0,count=0; for(const t of xml.matchAll(/<([^>]+)>/g)){const s=t[1];if(s.startsWith('?')||s.startsWith('!'))continue;if(s.startsWith('/'))depth--;else {count++;if(!s.endsWith('/'))depth++;}if(depth>100||count>200000)throw Error('XML complexo demais (limite de profundidade ou elementos).');}
 const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('XML inválido. Confira o arquivo e exporte novamente.');return doc;
}
export async function readMusicFile(file:File):Promise<string> {
 if(!/\.(musicxml|xml|mxl|mid|midi)$/i.test(file.name))throw Error('Escolha MusicXML, MXL ou MIDI (.mid/.midi). PDF não é compatível.');
 if(file.size>MAX_FILE)throw Error('Arquivo muito grande. O limite é 8 MB.');
 if(/\.(mid|midi)$/i.test(file.name)&&file.size>2*1024*1024)throw Error('O limite para MIDI é 2 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(/\.(mid|midi)$/i.test(file.name)){const {midiToMusicXML}=await import('./midi');return midiToMusicXML(bytes,file.name);}
 if(!/\.mxl$/i.test(file.name))return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 const entries:Record<string,Uint8Array>={};let total=0,count=0,failure:Error|undefined;
 const unzip=new Unzip(entry=>{
  if(++count>128 || /(^\/|\\|(^|\/)\.\.(\/|$))/.test(entry.name))throw Error('MXL contém caminhos ou quantidade de arquivos inválidos.');
  if((entry.originalSize||0)>MAX_FILE || ((entry.size||0)>0&&(entry.originalSize||0)/(entry.size||1)>200))throw Error('MXL excede o limite de descompressão.');
  let size=0;const chunks:Uint8Array[]=[];
  entry.ondata=(err,data,final)=>{if(err){failure=err;return;}size+=data.length;total+=data.length;
   if(size>MAX_FILE||total>MAX_EXPANDED){entry.terminate();failure=Error('MXL excede o limite de descompressão.');return;}
   chunks.push(data);if(final){const out=new Uint8Array(size);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}entries[entry.name]=out;}
  };entry.start();
 });unzip.register(UnzipInflate);
 try {for(let i=0;i<bytes.length;i+=1024){unzip.push(bytes.subarray(i,i+1024),i+1024>=bytes.length);if(failure)throw failure;}}catch(e){throw Error(`MXL inválido: ${e instanceof Error?e.message:'falha na descompressão'}`);}
 const container=entries['META-INF/container.xml'];if(!container)throw Error('MXL sem META-INF/container.xml.');
 const root=safeDocument(strFromU8(container)).querySelector('rootfile')?.getAttribute('full-path');
 if(!root||!entries[root])throw Error('Partitura principal não encontrada no MXL.');return strFromU8(entries[root]);
}
export function parseMusicXML(xml:string):Score {
 const doc=safeDocument(xml),root=doc.documentElement;
 if(root.localName!=='score-partwise')throw Error('Esta versão aceita MusicXML score-partwise. Exporte novamente nesse formato.');
 const warnings=new Set<string>();
 const warn=(s:string)=>warnings.add(s);
 if(root.querySelector('grace'))warn('Notas de adorno foram omitidas; a duração das notas principais foi preservada.');
 for(const field of root.querySelectorAll('miscellaneous-field[name="sopro-import-warning"]')){if(field.textContent)warn(field.textContent.slice(0,800));}
 if(root.querySelector('unpitched'))warn('Percussão sem altura foi representada por pausas.');
 if(root.querySelector('ornaments, tremolo, glissando, slide'))warn('Ornamentos, trêmolos e glissandos não são executados.');
 if(root.querySelector('sound[dacapo], sound[dalsegno], sound[tocoda], sound[fine], segno, coda'))warn('Saltos D.C., D.S., Coda e Fine não são executados; a leitura segue os compassos e repetições simples.');
 if(root.querySelector('senza-misura'))warn('Compasso livre usa as durações explícitas das notas.');
 const names=new Map(Array.from(root.querySelectorAll('part-list > score-part')).map(p=>[p.id,{name:txt(p,'part-name','Parte'),instrument:p.querySelector('instrument-name')?.textContent||''}]));
 let eventCount=0;
 const parts:Part[]=children(root,'part').map((part,partIndex)=>{
  const id=part.id||`P${partIndex+1}`, info=names.get(id);
  let divisions=1,beats=4,beatType=4,fifths=0,start=0,transposition=0,endings:number[]=[];
  const output:Part={id,name:info?.name||id,instrument:info?.instrument||'',events:[],measures:[],tempos:[],voices:[]};
  children(part,'measure').forEach((measure,mi)=>{
   if(mi>3000)throw Error('Limite de 3.000 compassos por parte excedido.');
   let cursor=0,max=0,lastStart=0,repeatStart=false,repeatEnd=0,endingStop=false;
   const label=measure.getAttribute('number')||String(mi+1),implicit=measure.getAttribute('implicit')==='yes';
   for(const el of Array.from(measure.children)) {
    if(el.localName==='attributes'){
     divisions=num(el,'divisions',divisions);if(divisions<=0)throw Error('Divisões rítmicas inválidas.');
     const time=child(el,'time');if(time){const b=txt(time,'beats',String(beats));beats=b.split('+').reduce((n,v)=>n+Number(v),0);beatType=num(time,'beat-type',beatType);if(!Number.isFinite(beats)||beats<=0||beatType<=0)throw Error('Fórmula de compasso inválida.');if(children(time,'beats').length>1)warn('Fórmulas de compasso compostas com denominadores diferentes usam o primeiro par.');}
     const key=child(el,'key');if(key)fifths=num(key,'fifths');
     const tr=child(el,'transpose');if(tr){transposition=num(tr,'chromatic')+12*num(tr,'octave-change');if(transposition)warn('A transposição do instrumento foi aplicada para obter as alturas reais.');}
    } else if(el.localName==='backup'||el.localName==='forward'){
     cursor+=num(el,'duration')/divisions*(el.localName==='backup'?-1:1);if(cursor<-.0001)throw Error(`Backup inválido no compasso ${label}.`);cursor=Math.max(0,cursor);max=Math.max(max,cursor);
    } else if(el.localName==='direction'||el.localName==='sound'){
     const sound=el.localName==='sound'?el:el.querySelector('sound');const raw=sound?.getAttribute('tempo');let bpm=raw?Number(raw):0;
     const met=el.querySelector('metronome');if(!bpm&&met){const unit=types[txt(met,'beat-unit','quarter')]||1;bpm=num(met,'per-minute',0)*unit*(met.querySelector('beat-unit-dot')?1.5:1);}
     if(bpm>0&&Number.isFinite(bpm))output.tempos.push({at:start+cursor+num(el,'offset')/divisions,bpm:Math.min(600,bpm)});
    } else if(el.localName==='note'){
     if(++eventCount>60000)throw Error('Limite de 60.000 eventos excedido.');
     if(child(el,'grace'))continue;
     const isChord=!!child(el,'chord');const noteStart=isChord?lastStart:cursor;
     const type=txt(el,'type','quarter'),dots=children(el,'dot').length,tm=child(el,'time-modification');
     const ratio=tm?num(tm,'normal-notes',2)/num(tm,'actual-notes',3):1;
     const duration=num(el,'duration',(types[type]||1)*(2-1/2**dots)*ratio*divisions)/divisions;
     if(!(duration>0)||duration>1024)throw Error(`Duração inválida no compasso ${label}.`);
     let pitch:Pitch|null=null;const p=child(el,'pitch');
     if(p){const step=txt(p,'step'),octave=num(p,'octave'),alter=num(p,'alter');const base=({C:0,D:2,E:4,F:5,G:7,A:9,B:11} as Record<string,number>)[step];if(base===undefined)throw Error('Altura musical inválida.');
      // MusicXML pitch/alter is authoritative; absent alter means natural, even with a key signature.
      pitch={step,octave,alter,midi:(octave+1)*12+base+alter+transposition};if(!Number.isInteger(pitch.midi))warn('Microtons não possuem digitação neste perfil e são marcados fora do alcance.');
      if(transposition){const pc=((pitch.midi%12)+12)%12;const steps=['C','C','D','D','E','F','F','G','G','A','A','B'];pitch={step:steps[pc],alter:[1,3,6,8,10].includes(pc)?1:0,octave:Math.floor(pitch.midi/12)-1,midi:pitch.midi};}
     }
     const voice=`${txt(el,'staff','1')}:${txt(el,'voice','1')}`;const ties=Array.from(el.querySelectorAll('tie,tied'));
     output.events.push({id:`${id}-${mi}-${output.events.length}`,pitch,start:start+noteStart,duration,measure:mi,measureLabel:label,voice,type,dots,tuplet:tm?`${num(tm,'actual-notes',3)}:${num(tm,'normal-notes',2)}`:undefined,tieStart:ties.some(t=>t.getAttribute('type')==='start'),tieStop:ties.some(t=>t.getAttribute('type')==='stop')});
     if(!isChord){lastStart=cursor;cursor+=duration;}max=Math.max(max,noteStart+duration,cursor);
    } else if(el.localName==='barline'){
     const rep=child(el,'repeat');if(rep?.getAttribute('direction')==='forward')repeatStart=true;if(rep?.getAttribute('direction')==='backward')repeatEnd=Math.max(2,Math.min(4,Number(rep.getAttribute('times')||2)));
     const ending=child(el,'ending');if(ending){if(ending.getAttribute('type')==='start'){const n=ending.getAttribute('number')||'';endings=n.split(',').map(Number).filter(n=>n>=1&&n<=4);if(!endings.length)warn('Casa alternativa não numérica não foi interpretada.');}else endingStop=true;}
    }
   }
   const duration=implicit?max:Math.max(max,beats*4/beatType);if(max>beats*4/beatType+.001&&!implicit)warn('Há compassos com duração maior que a fórmula indicada; as durações originais foram mantidas.');
   output.measures.push({index:mi,label,start,duration,beats,beatType,fifths,implicit,repeatStart,repeatEnd,endings:[...endings]});if(endingStop)endings=[];start+=duration;
  });output.voices=[...new Set(output.events.map(e=>e.voice))];return output;
 });
 if(!parts.length||!parts.some(p=>p.events.length))throw Error('A partitura não contém notas ou pausas utilizáveis.');
 const globalTempo=parts.find(p=>p.tempos.length)?.tempos||[{at:0,bpm:80}];parts.forEach(p=>{if(!p.tempos.length)p.tempos=[...globalTempo];if(!p.tempos.some(t=>t.at===0))p.tempos.unshift({at:0,bpm:80});p.tempos.sort((a,b)=>a.at-b.at);});
 return {title:root.querySelector('work-title')?.textContent?.trim()||txt(root,'movement-title','Sem título'),composer:root.querySelector('creator[type="composer"]')?.textContent?.trim()||'Compositor não informado',parts,warnings:[...warnings]};
}

/** Keep catalogue attribution inside the stored score, including exported/restored backups. */
export function attributeMusicXML(xml:string,source:{url:string;credit:string;license:string;warning?:string}):string {
 const doc=safeDocument(xml),root=doc.documentElement;
 let identification=child(root,'identification');if(!identification){identification=doc.createElement('identification');const list=child(root,'part-list');root.insertBefore(identification,list||root.firstChild);}
 let misc=child(identification,'miscellaneous');if(!misc){misc=doc.createElement('miscellaneous');identification.appendChild(misc);}
 const fields=[['sopro-source-url',source.url],['sopro-import-warning',`Fonte: ${source.credit}. ${source.license}.`],...(source.warning?[['sopro-import-warning',source.warning]]:[])];
 for(const [name,text]of fields){const field=doc.createElement('miscellaneous-field');field.setAttribute('name',name);field.textContent=text;misc.appendChild(field);}
 return new XMLSerializer().serializeToString(doc);
}
