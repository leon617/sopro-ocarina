import {Parser} from 'htmlparser2';
import {allowedURL,safeFetch,CatalogCache} from './http';
import type {CatalogConnector,CatalogResult} from './types';
type Entry={result:CatalogResult;midiUrl?:string};
const cache=new CatalogCache<{entries:Entry[];fetchedAt:string}>(60,6*1024*1024);
const norm=(s:string)=>s.replace(/\s+/g,' ').trim();
/** Read only catalogue facts and public MIDI links, never render source HTML or redistribute PDFs. */
export function parseIchigos(html:string,fallbackGroup=''):Entry[]{
 const entries:Entry[]=[],seen=new Set<string>();let group=fallbackGroup,work='',heading=false,headingText='',name='',instrument='',inInstrument=false,skip=0;
 let record:{title:string;author:string;formats:Set<string>;sheet:string;midiUrl?:string}|undefined;
 function flush(){
  if(record?.sheet&&/^\d{1,6}$/.test(group)){
   const id=`${group}:${record.sheet}`;
   if(!seen.has(id)){seen.add(id);entries.push({midiUrl:record.midiUrl,result:{id,source:'ichigos',title:record.title,work,composer:'Compositor não informado pela fonte',author:record.author||'Transcritor não informado',license:'Uso pessoal e não comercial · Ichigo’s',licenseUrl:'https://ichigos.com/legal',formats:[...record.formats],pageUrl:`https://ichigos.com/sheets/${group}`,importable:!!record.midiUrl,warning:`Fonte: Ichigo’s Sheet Music. Transcrição: ${record.author||'não informada'}. Uso pessoal e não comercial, conforme as condições da fonte. MIDI: escolha a faixa melódica; o arranjo pode conter acordes.`}});}
  }record=undefined;name='';instrument='';
 }
 const parser=new Parser({
  onopentag(tag,attrs){
   if(tag==='script'||tag==='style'){skip++;return;}if(skip)return;
   if(tag==='span'&&attrs.class?.split(/\s+/).includes('title2')){flush();heading=true;headingText='';group=fallbackGroup;return;}
   if(heading&&tag==='a'){const match=attrs.href?.match(/^\/sheets\/(\d{1,6})$/);if(match)group=match[1];return;}
   if(!work||heading)return;
   if(tag==='i'){const text=norm(name),match=text.match(/^(.*?)\s*\(Transcribed by ([\s\S]+)\)\s*$/i);record={title:(match?.[1]||text).slice(0,300),author:(match?.[2]||'').slice(0,180),formats:new Set(),sheet:''};inInstrument=true;instrument='';name='';return;}
   if(tag==='a'&&record&&attrs.href){
    try{
     const u=new URL(attrs.href,'https://ichigos.com');if(u.origin!=='https://ichigos.com'||u.pathname!=='/res/getfile.php')return;
     const id=u.searchParams.get('id'),type=u.searchParams.get('type');if(!id||!/^\d{1,8}$/.test(id)||!type||!['midi','pdf','mus','gif'].includes(type))return;
     if(record.sheet&&record.sheet!==id)return;record.sheet=id;record.formats.add(type.toUpperCase());
     if(type==='midi'){allowedURL(u.href);record.midiUrl=u.href;}
    }catch{/* Unsafe links do not become imports. */}
   }
   if(tag==='br'&&record?.formats.size)flush();
  },
  ontext(text){if(skip)return;if(heading)headingText+=text;else if(inInstrument)instrument+=text;else if(work&&!record)name+=text;},
  onclosetag(tag){if(tag==='script'||tag==='style'){skip=Math.max(0,skip-1);return;}if(skip)return;if(tag==='span'&&heading){work=norm(headingText).slice(0,300);heading=false;name='';}if(tag==='i')inInstrument=false;},
 },{decodeEntities:true});parser.end(html);flush();return entries;
}
async function searchIndex(query:string){
 const text=query.trim();if(!text)throw Error('Digite o nome de um jogo, anime ou música para buscar no Ichigo’s.');
 return cache.get(`q:${text.toLowerCase()}`,async()=>{
  const body=new URLSearchParams({qtitle:text,qdesc:'',qauthor:'',q:'1'}).toString();
  const html=new TextDecoder().decode(await safeFetch('https://ichigos.com/sheets',3*1024*1024,body));
  const entries=parseIchigos(html);if(!/Your search matched|No (?:sheets|results)|did not match/i.test(html)&&!entries.length)throw Error('A fonte mudou sua página de busca ou está indisponível.');
  return {entries,fetchedAt:new Date().toISOString()};
 },10*60000);
}
export const ichigos:CatalogConnector={
 id:'ichigos',name:'Ichigo’s · jogos e anime',sorts:['relevance','title'],
 async search(query,options={}){
  const data=await searchIndex(query),page=options.page||1,sort=options.sort||'relevance',pageSize=20;
  const results=data.entries.map(e=>e.result).filter(r=>options.importableOnly===false||r.importable);
  if(sort==='title')results.sort((a,b)=>a.title.localeCompare(b.title,'pt-BR')||a.id.localeCompare(b.id));
  return {results:results.slice((page-1)*pageSize,page*pageSize),total:results.length,page,pageSize,sort,source:this.id,fetchedAt:data.fetchedAt};
 },
 async files(id){
  const match=id.match(/^(\d{1,6}):(\d{1,8})$/);if(!match)throw Error('Identificador inválido.');
  // Re-read the public item page for a fresh download link. Tokens are supplied by the source, never guessed.
  const html=new TextDecoder().decode(await safeFetch(`https://ichigos.com/sheets/${match[1]}`,3*1024*1024));
  const entry=parseIchigos(html,match[1]).find(e=>e.result.id===id);if(!entry?.midiUrl)throw Error('Esta transcrição não oferece mais um MIDI público.');
  return [{name:`ichigos-${match[2]}.mid`,format:'MIDI',url:entry.midiUrl}];
 },
 async download(id,name){
  const [file]=await this.files(id);if(name&&name!==file.name)throw Error('Arquivo não encontrado na fonte.');
  const bytes=await safeFetch(file.url,2*1024*1024);
  if(String.fromCharCode(...bytes.subarray(0,4))!=='MThd')throw Error('A fonte não entregou um MIDI válido. Tente novamente mais tarde.');
  return {bytes,name:file.name};
 }
};
