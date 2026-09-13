export const GITHUB_API='https://api.github.com/repos/OpenScore/Lieder/git/trees/main?recursive=1';
export const PDMX_INDEX='https://raw.githubusercontent.com/shafranek-js/MelodicaTrainer/main/public/score-library/catalog.json';
export const VGLEADSHEETS_INDEX='https://vgleadsheets.com/download/csv';
export const FILE_LIMIT=8*1024*1024;
const archiveId='[A-Za-z0-9][A-Za-z0-9_.-]{0,99}';
const archiveFile=new RegExp(`^/download/(${archiveId})/([^/]+\\.(?:musicxml|mxl|xml))$`,'i');
const archiveMirror=new RegExp(`^/\\d+/items/(${archiveId})/([^/]+\\.(?:musicxml|mxl|xml))$`,'i');
function validPath(value:string){
 const raw=value.replace(/^https:\/\/[^/]+/,'').split('?')[0];
 const decoded=decodeURIComponent(raw);
 if(/[\\\x00-\x1f\x7f]/.test(decoded)||decoded.split('/').some(p=>p==='.'||p==='..')||/%(?:2e|2f|5c|00)/i.test(decoded))throw Error('URL não permitida.');
}
export function allowedURL(value:string){
 validPath(value);const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)throw Error('URL não permitida.');
 if(value===GITHUB_API)return u;
 if(u.hostname==='raw.githubusercontent.com'&&u.pathname.startsWith('/OpenScore/Lieder/main/scores/')&&/\.mxl$/.test(u.pathname)&&!u.search)return u;
 if(value===PDMX_INDEX)return u;
 if(u.hostname==='raw.githubusercontent.com'&&u.pathname.startsWith('/shafranek-js/MelodicaTrainer/main/public/score-library/assets/pdmx/')&&/\.mxl$/.test(u.pathname)&&!u.search)return u;
 if(value===VGLEADSHEETS_INDEX)return u;
 if(u.hostname==='www.classiczelda.com'&&!u.search&&(/^\/music\/midi\/zelda[1-6]\/index\.php$/.test(u.pathname)||/^\/music\/midi\/zelda[1-6]\/[A-Za-z0-9_-]+\.mid$/i.test(u.pathname)))return u;
 if(u.hostname==='ichigos.com'){
  if(!u.search&&(u.pathname==='/sheets'||/^\/sheets\/\d{1,6}$/.test(u.pathname)))return u;
  if(u.pathname==='/res/getfile.php'&&[...u.searchParams.keys()].sort().join(',')==='id,token,type'&&/^\d{1,8}$/.test(u.searchParams.get('id')||'')&&u.searchParams.get('type')==='midi'&&/^[a-f0-9]{20,64}$/.test(u.searchParams.get('token')||''))return u;
 }
 if(u.hostname==='archive.org'){
  if(u.pathname==='/advancedsearch.php'&&u.search.length<3000&&[...u.searchParams.keys()].every(k=>['q','fl[]','sort[]','rows','page','output'].includes(k))&&u.searchParams.get('output')==='json')return u;
  if(!u.search&&(new RegExp(`^/metadata/${archiveId}$`).test(u.pathname)||archiveFile.test(u.pathname)))return u;
 }
 if(/^(?:ia|dn)\d{6}\.(?:us|ca)\.archive\.org$/.test(u.hostname)&&archiveMirror.test(u.pathname)&&!u.search)return u;
 throw Error('URL não permitida.');
}
function redirectAllowed(start:URL,next:URL){
 if(start.hostname==='archive.org'&&archiveFile.test(start.pathname)){
  const a=start.pathname.match(archiveFile)!,b=next.hostname==='archive.org'?next.pathname.match(archiveFile):next.pathname.match(archiveMirror);
  return !!b&&a[1]===b[1]&&a[2]===b[2];
 }
 return start.href===next.href;
}
const cooldown=new Map<string,number>();
export async function safeFetch(value:string,max=FILE_LIMIT,searchBody?:string):Promise<Uint8Array>{
 const start=allowedURL(value),host=start.hostname;
 if(searchBody&&(value!=='https://ichigos.com/sheets'||searchBody.length>1200))throw Error('Consulta de fonte inválida.');
 if((cooldown.get(host)||0)>Date.now())throw Error('A fonte pediu uma pausa nas consultas. Tente novamente mais tarde.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);let url=value;
 try{
  for(let redirect=0;redirect<3;redirect++){
   allowedURL(url);
   const response=await fetch(url,{signal:controller.signal,redirect:'manual',...(searchBody?{method:'POST',body:searchBody}:{}),headers:{...(searchBody?{'Content-Type':'application/x-www-form-urlencoded'}:{}),Accept:host==='api.github.com'?'application/vnd.github+json':'application/json, application/octet-stream;q=0.9','User-Agent':'Sopro-Ocarina/1.1 (+https://sopro-ocarina.videotenir.chatgpt.site)'}});
   if(response.status>=300&&response.status<400){
    const location=response.headers.get('location');await response.body?.cancel();
    if(!location)throw Error('Redirecionamento inválido.');
    const next=allowedURL(new URL(location,url).href);
    if(!redirectAllowed(start,next))throw Error('Redirecionamento não permitido.');url=next.href;continue;
   }
   if(response.status===429||response.status===403){
    const retry=response.headers.get('Retry-After');const seconds=retry&&/^\d+$/.test(retry)?Number(retry):retry?Math.max(60,(Date.parse(retry)-Date.now())/1000):60;
    cooldown.set(host,Date.now()+Math.max(60,Number.isFinite(seconds)?seconds:60)*1000);
    await response.body?.cancel();throw Error('A fonte atingiu o limite de consultas. Tente novamente mais tarde.');
   }
   if(!response.ok){await response.body?.cancel();throw Error('O catálogo está temporariamente indisponível.');}
   if(Number(response.headers.get('content-length')||0)>max){await response.body?.cancel();throw Error('Download excede o limite permitido.');}
   if(!response.body)throw Error('Resposta vazia.');
   const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
   while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw Error('Download excede o limite permitido.');}chunks.push(value);}
   const result=new Uint8Array(length);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;
  }
  throw Error('Redirecionamentos em excesso.');
 }finally{clearTimeout(timer);}
}
export async function readJSON(url:string,max=2*1024*1024){return JSON.parse(new TextDecoder().decode(await safeFetch(url,max)));}
// Bounded caches and in-flight deduplication, shared by connectors. No failure is cached.
export class CatalogCache<T>{
 private entries=new Map<string,{value:T;expires:number;size:number}>();private pending=new Map<string,Promise<T>>();private used=0;
 constructor(private maxEntries=100,private maxBytes=4*1024*1024){}
 async get(key:string,load:()=>Promise<T>,ttl=3600000,size:(value:T)=>number=v=>JSON.stringify(v).length*2):Promise<T>{
  const hit=this.entries.get(key);if(hit&&hit.expires>Date.now())return hit.value;
  if(this.pending.has(key))return this.pending.get(key)!;
  if(this.pending.size>=8)throw Error('Muitas consultas em andamento. Tente novamente em instantes.');
  const job=(async()=>{
   const value=await load(),weight=size(value);
   const old=this.entries.get(key);if(old){this.used-=old.size;this.entries.delete(key);}
   while(this.entries.size&&(this.used+weight>this.maxBytes||this.entries.size>=this.maxEntries)){
    const first=this.entries.keys().next().value!;this.used-=this.entries.get(first)!.size;this.entries.delete(first);
   }
   if(weight<=this.maxBytes){this.entries.set(key,{value,expires:Date.now()+ttl,size:weight});this.used+=weight;}return value;
  })();this.pending.set(key,job);try{return await job;}finally{this.pending.delete(key);}
 }
}
export const fileCache=new CatalogCache<Uint8Array>(100,16*1024*1024);
export function cachedDownload(url:string){return fileCache.get(url,()=>safeFetch(url),3600000,v=>v.byteLength);}
