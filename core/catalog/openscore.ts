import type {CatalogConnector,CatalogResult,CatalogOptions,CatalogFile} from './types';
import {allowedURL,readJSON,GITHUB_API,CatalogCache,cachedDownload} from './http';
const indexCache=new CatalogCache<{results:CatalogResult[];fetchedAt:string}>(1,4*1024*1024);
async function index(){return indexCache.get('index',async()=>{
 const raw=await readJSON(GITHUB_API,12*1024*1024);
 if(raw.truncated||!Array.isArray(raw.tree))throw Error('Índice incompleto na fonte.');
 const results:CatalogResult[]=[],seen=new Set<string>();
 for(const item of raw.tree){
  const path=item.path;if(item.type!=='blob'||typeof path!=='string'||!path.startsWith('scores/')||!path.endsWith('.mxl'))continue;
  const pieces=path.split('/'),id=pieces.at(-1)!.replace('.mxl','');if(!/^lc\d+$/.test(id)||seen.has(id))continue;seen.add(id);
  const encoded=pieces.map(encodeURIComponent).join('/'),fileUrl='https://raw.githubusercontent.com/OpenScore/Lieder/main/'+encoded;allowedURL(fileUrl);
  results.push({id,source:'openscore',title:(pieces[3]||id).replaceAll('_',' '),composer:(pieces[1]||'').replaceAll('_',' '),author:'OpenScore Lieder',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',formats:['MXL'],pageUrl:`https://github.com/OpenScore/Lieder/blob/main/${encoded}`,fileUrl,importable:true});
 }
 if(!results.length)throw Error('A fonte não retornou partituras compatíveis.');return {results,fetchedAt:new Date().toISOString()};
});}
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const openScore:CatalogConnector={
 id:'openscore',name:'OpenScore Lieder',sorts:['relevance','title'],
 async search(query:string,options:CatalogOptions={}){
  const data=await index(),terms=normalize(query).split(/\s+/).filter(Boolean),sort=options.sort||'relevance',page=options.page||1,pageSize=20;
  const results=data.results.filter(r=>terms.every(t=>normalize(`${r.title} ${r.composer}`).includes(t)));
  if(sort==='title')results.sort((a,b)=>a.title.localeCompare(b.title,'pt-BR')||a.id.localeCompare(b.id));
  return {results:results.slice((page-1)*pageSize,page*pageSize),total:results.length,page,pageSize,fetchedAt:data.fetchedAt,source:this.id,sort};
 },
 async files(id){if(!/^lc\d{1,12}$/.test(id))throw Error('Identificador inválido.');const result=(await index()).results.find(r=>r.id===id);if(!result?.fileUrl)throw Error('Partitura não encontrada.');return [{name:`${id}.mxl`,format:'MXL',url:result.fileUrl}];},
 async download(id,file){const files=await this.files(id);return downloadFile(files,file);}
};
export async function downloadFile(files:CatalogFile[],name?:string){
 if(!files.length)throw Error('Nenhum MusicXML disponível para importação.');
 if(!name&&files.length>1)throw Error('Escolha qual arquivo deseja importar.');
 const file=name?files.find(f=>f.name===name):files[0];if(!file)throw Error('Arquivo não encontrado na fonte.');
 return {bytes:await cachedDownload(file.url),name:file.name};
}
