import {connectors,rateLimit} from '../../../core/catalog/server';
import type {CatalogSort} from '../../../core/catalog/types';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, max-age=60','X-Content-Type-Options':'nosniff'},url=new URL(request.url);
 const ip=request.headers.get('cf-connecting-ip')||'local';if(!rateLimit(ip))return Response.json({error:'Muitas consultas. Aguarde um minuto.'},{status:429,headers:{...headers,'Retry-After':'60'}});
 const q=url.searchParams.get('q')||'',id=url.searchParams.get('id'),source=url.searchParams.get('source')||'openscore',sort=url.searchParams.get('sort')||'relevance',page=Number(url.searchParams.get('page')||1),file=url.searchParams.get('file')||undefined,action=url.searchParams.get('action'),importable=url.searchParams.get('importable')||'true';
 const connector=connectors.find(c=>c.id===source);
 if(!connector||!connector.sorts.includes(sort as CatalogSort)||q.length>150||id&&id.length>100||file&&(file.length>240||/[\x00-\x1f]/.test(file))||!Number.isInteger(page)||page<1||page>500||action&&action!=='files'||!['true','false'].includes(importable))return Response.json({error:'Consulta ou filtro inválido para esta fonte.'},{status:400,headers:{'Cache-Control':'no-store'}});
 try{
  if(id){
   if(action==='files')return Response.json({files:await connector.files(id)},{headers});
   const data=await connector.download(id,file);
   return new Response(data.bytes as BodyInit,{headers:{...headers,'Content-Type':/\.mid$/i.test(data.name)?'audio/midi':/\.mxl$/i.test(data.name)?'application/vnd.recordare.musicxml':'application/vnd.recordare.musicxml+xml','Content-Disposition':`attachment; filename="score.${/\.mid$/i.test(data.name)?'mid':/\.mxl$/i.test(data.name)?'mxl':'musicxml'}"`}});
  }
  if(action||file)return Response.json({error:'Falta o identificador da partitura.'},{status:400});
  return Response.json(await connector.search(q,{sort:sort as CatalogSort,page,importableOnly:importable==='true'}),{headers});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Fonte indisponível. A biblioteca local continua funcionando.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
