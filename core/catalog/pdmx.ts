import type {CatalogConnector,CatalogResult,CatalogOptions} from './types';
import {allowedURL,readJSON,PDMX_INDEX,CatalogCache,cachedDownload} from './http';

type SourceEntry={
 id?:unknown;title?:unknown;composer?:unknown;arranger?:unknown;format?:unknown;assetPath?:unknown;
 difficulty?:unknown;tags?:unknown;source?:{name?:unknown;url?:unknown;recordId?:unknown};
 license?:{kind?:unknown;url?:unknown;basis?:unknown};bytes?:unknown;sha256?:unknown;
};
type Indexed={result:CatalogResult;fileName:string;sha256:string};
const cache=new CatalogCache<{entries:Indexed[];fetchedAt:string}>(1,2*1024*1024);
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

function safeText(value:unknown,max=240){return typeof value==='string'?value.trim().slice(0,max):'';}
export function parsePDMXIndex(raw:unknown):Indexed[]{
 const rows=raw&&typeof raw==='object'&&Array.isArray((raw as {entries?:unknown}).entries)?(raw as {entries:SourceEntry[]}).entries:[];
 const entries:Indexed[]=[],ids=new Set<string>(),works=new Set<string>();
 for(const row of rows){
  const id=safeText(row.id,100),title=safeText(row.title,300),composer=safeText(row.composer,240),asset=safeText(row.assetPath,300),sha256=safeText(row.sha256,64).toLowerCase();
  const kind=safeText(row.license?.kind,40),basis=safeText(row.license?.basis,80),source=safeText(row.source?.name,40),bytes=Number(row.bytes);
  if(source!=='PDMX'||basis!=='pdmx-filtered-and-manually-reviewed'||!['CC0-1.0','PUBLIC_DOMAIN'].includes(kind)||row.format!=='musicxml'||!/^pdmx-[a-z0-9-]{1,90}$/.test(id)||!title||!asset.startsWith('assets/pdmx/')||!/^[a-zA-Z0-9/_-]+\.mxl$/.test(asset)||!Number.isSafeInteger(bytes)||bytes<1||bytes>8*1024*1024||!/^[a-f0-9]{64}$/.test(sha256))continue;
  const workKey=normalize(`${title}\0${composer}`);if(ids.has(id)||works.has(workKey))continue;ids.add(id);works.add(workKey);
  const encoded=asset.split('/').map(encodeURIComponent).join('/'),fileUrl=`https://raw.githubusercontent.com/shafranek-js/MelodicaTrainer/main/public/score-library/${encoded}`;allowedURL(fileUrl);
  const license=kind==='CC0-1.0'?'CC0 1.0':'Domínio público';
  entries.push({fileName:asset.split('/').at(-1)!,sha256,result:{id,source:'pdmx',title,composer:composer||'Compositor não informado',author:safeText(row.arranger,180)||'PDMX',license,licenseUrl:safeText(row.license?.url,300)||undefined,formats:['MXL'],pageUrl:safeText(row.source?.url,300)||'https://zenodo.org/records/15571083',fileUrl,importable:true,warning:'Fonte: PDMX. Item da amostra deduplicada, validada e filtrada pelo subconjunto no_license_conflict. O Sopro verificará a linha melódica e a extensão ao importar.'}});
 }
 return entries;
}
async function index(){return cache.get('index',async()=>{const entries=parsePDMXIndex(await readJSON(PDMX_INDEX,2*1024*1024));if(!entries.length)throw Error('O índice PDMX não retornou partituras compatíveis.');return {entries,fetchedAt:new Date().toISOString()};},3600000);}
async function sha256(bytes:Uint8Array){const digest=await crypto.subtle.digest('SHA-256',bytes as BufferSource);return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');}

export const pdmx:CatalogConnector={
 id:'pdmx',name:'PDMX · domínio público',sorts:['relevance','title'],
 async search(query:string,options:CatalogOptions={}){
  const data=await index(),terms=normalize(query).split(/\s+/).filter(Boolean),sort=options.sort||'relevance',page=options.page||1,pageSize=20;
  const entries=data.entries.filter(e=>terms.every(t=>normalize(`${e.result.title} ${e.result.composer} ${e.result.author}`).includes(t)));
  if(sort==='title')entries.sort((a,b)=>a.result.title.localeCompare(b.result.title,'pt-BR')||a.result.id.localeCompare(b.result.id));
  return {results:entries.slice((page-1)*pageSize,page*pageSize).map(e=>e.result),total:entries.length,page,pageSize,fetchedAt:data.fetchedAt,source:this.id,sort};
 },
 async files(id){if(!/^pdmx-[a-z0-9-]{1,90}$/.test(id))throw Error('Identificador inválido.');const entry=(await index()).entries.find(e=>e.result.id===id);if(!entry?.result.fileUrl)throw Error('Partitura não encontrada.');return [{name:entry.fileName,format:'MXL',url:entry.result.fileUrl}];},
 async download(id,file){
  const entry=(await index()).entries.find(e=>e.result.id===id);if(!entry?.result.fileUrl||file&&file!==entry.fileName)throw Error('Arquivo não encontrado na fonte.');
  const bytes=await cachedDownload(entry.result.fileUrl);if(await sha256(bytes)!==entry.sha256)throw Error('A partitura não passou na verificação de integridade.');return {bytes,name:entry.fileName};
 }
};
