import type {CatalogConnector,CatalogOptions,CatalogPage,CatalogResult,CatalogFile} from './types';
import {allowedURL,readJSON,CatalogCache,FILE_LIMIT} from './http';
import {downloadFile} from './openscore';
const searches=new CatalogCache<CatalogPage>(),metadata=new CatalogCache<any>(40,4*1024*1024);
const idPattern=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const strings=(v:unknown):string[]=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):typeof v==='string'?[v]:[];
export function archiveLicense(value:unknown):{label:string;url:string}|undefined{
 for(const s of strings(value)){
  try{const u=new URL(s);if(!['http:','https:'].includes(u.protocol)||u.hostname!=='creativecommons.org'||u.username||u.password||u.port||u.search||u.hash)continue;
   if(['/publicdomain/mark/1.0/','/licenses/publicdomain/'].includes(u.pathname))return {label:'Domínio público · declarado pela fonte',url:'https://creativecommons.org'+u.pathname};
   if(u.pathname==='/publicdomain/zero/1.0/')return {label:'CC0 1.0',url:'https://creativecommons.org'+u.pathname};
  }catch{/* Unknown license is not import authorization. */}
 }
}
export function archiveSearchURL(query:string,options:CatalogOptions={}){
 // User text is quoted term-by-term; it can never override collection, license or format restrictions.
 const terms=query.match(/[\p{L}\p{N}]+/gu)||[];
 let q='collection:PublicJukebox AND -collection:printdisabled AND -access-restricted-item:true AND (licenseurl:"https://creativecommons.org/publicdomain/mark/1.0/" OR licenseurl:"http://creativecommons.org/publicdomain/mark/1.0/" OR licenseurl:"https://creativecommons.org/publicdomain/zero/1.0/" OR licenseurl:"http://creativecommons.org/licenses/publicdomain/")';
 q+=options.importableOnly!==false?' AND format:MusicXML':' AND (format:MusicXML OR format:"Text PDF" OR format:"Image Container PDF" OR format:PDF)';
 for(const term of terms)q+=` AND (title:"${term}" OR creator:"${term}")`;
 const u=new URL('https://archive.org/advancedsearch.php');u.searchParams.set('q',q);u.searchParams.set('output','json');u.searchParams.set('rows','20');u.searchParams.set('page',String(options.page||1));
 for(const f of ['identifier','title','creator','downloads','licenseurl','format','collection','access-restricted-item'])u.searchParams.append('fl[]',f);
 if(options.sort==='popularity')u.searchParams.append('sort[]','downloads desc');else if(options.sort==='title')u.searchParams.append('sort[]','titleSorter asc');
 // Preserve source relevance for the default order. Secondary stable ID order only applies to explicit sorts.
 if(options.sort&&options.sort!=='relevance')u.searchParams.append('sort[]','identifier asc');return u.href;
}
export function archiveResult(doc:any):CatalogResult|undefined{
 if(typeof doc?.identifier!=='string'||!idPattern.test(doc.identifier)||!strings(doc.collection).includes('PublicJukebox')||doc['access-restricted-item']===true||doc['access-restricted-item']==='true')return;
 const license=archiveLicense(doc.licenseurl);if(!license)return;
 const formats=strings(doc.format),xml=formats.includes('MusicXML'),pdf=formats.some(f=>/PDF/i.test(f));if(!xml&&!pdf)return;
 const views=Number(doc.downloads);
 return {id:doc.identifier,source:'internet-archive',title:strings(doc.title).join(' · ')||doc.identifier,composer:strings(doc.creator).join(' · ')||'Autoria não informada',author:'Internet Archive · PublicJukebox',license:license.label,licenseUrl:license.url,formats:[...(xml?['MusicXML']:[]),...(pdf?['PDF']:[])],pageUrl:`https://archive.org/details/${doc.identifier}`,importable:xml,popularity:Number.isFinite(views)&&views>=0?{value:views,label:'acessos no Archive'}:undefined,warning:xml?'Transcrição por reconhecimento óptico: confira possíveis erros na partitura original.':undefined};
}
export function archiveFiles(data:any):CatalogFile[]{
 const meta=data?.metadata,id=meta?.identifier;
 if(typeof id!=='string'||!idPattern.test(id)||!strings(meta.collection).includes('PublicJukebox')||!archiveLicense(meta.licenseurl)||meta['access-restricted-item']===true||meta['access-restricted-item']==='true'||data.is_dark||data.is_restricted)throw Error('Esta partitura não está disponível para importação autorizada.');
 if(!Array.isArray(data.files)||data.files.length>10000)throw Error('Lista de arquivos inválida.');
 const seen=new Set<string>(),files:CatalogFile[]=[];
 for(const f of data.files){
  if(typeof f.name!=='string'||f.name.length>240||/[\/\\\x00-\x1f]/.test(f.name)||f.private||f.format!=='MusicXML'||! /\.(musicxml|mxl|xml)$/i.test(f.name)||seen.has(f.name))continue;
  const size=Number(f.size);if(!Number.isFinite(size)||size<=0||size>FILE_LIMIT)continue;
  const url=`https://archive.org/download/${id}/${encodeURIComponent(f.name)}`;try{allowedURL(url);}catch{continue;}
  seen.add(f.name);files.push({name:f.name,format:/\.mxl$/i.test(f.name)?'MXL':'MusicXML',url,size});
 }
 return files.sort((a,b)=>a.name.localeCompare(b.name));
}
export const internetArchive:CatalogConnector={
 id:'internet-archive',name:'Internet Archive · PublicJukebox',sorts:['relevance','popularity','title'],
 async search(query,options={}){
  const url=archiveSearchURL(query,options);
  return searches.get(url,async()=>{
   const raw=await readJSON(url);if(raw.responseHeader?.status!==0||!Array.isArray(raw.response?.docs)||!Number.isInteger(raw.response.numFound))throw Error('Resposta inválida do Internet Archive.');
   const seen=new Set<string>(),results:CatalogResult[]=[];
   for(const doc of raw.response.docs){const result=archiveResult(doc);if(result&&!seen.has(result.id)){seen.add(result.id);results.push(result);}}
   return {results,total:raw.response.numFound,page:options.page||1,pageSize:20,fetchedAt:new Date().toISOString(),source:this.id,sort:options.sort||'relevance'};
  },15*60000);
 },
 async files(id){if(!idPattern.test(id))throw Error('Identificador inválido.');const data=await metadata.get(id,()=>readJSON(`https://archive.org/metadata/${id}`),15*60000);if(data.metadata?.identifier!==id)throw Error('Identificador divergente na fonte.');return archiveFiles(data);},
 async download(id,file){return downloadFile(await this.files(id),file);}
};
