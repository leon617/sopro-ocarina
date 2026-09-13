import {useEffect,useRef,useState} from 'react';
import {Music2} from 'lucide-react';
import {library} from '@/core/storage/library';

type ImageInfo={descriptionurl?:string;thumburl?:string;url?:string;extmetadata?:Record<string,{value:string}>};
type WikiPage={title:string;thumbnail?:{source:string};pageimage?:string;images?:{title:string}[];imageinfo?:ImageInfo[]};
type Cover={url:string;credit:string;origin:string;checked:number};

const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim();
const articleAliases:[RegExp,string][]=[
 [/minecraft/i,'Minecraft – Volume Alpha'],
 [/sonic adventure 2|city escape/i,'Sonic Adventure 2'],
 [/mario land 2|space zone/i,'Super Mario Land 2: 6 Golden Coins'],
 [/ocarina of time|great fairy fountain/i,'The Legend of Zelda: Ocarina of Time'],
 [/majora(?:'s|’s)? mask/i,"The Legend of Zelda: Majora's Mask"],
];
const articleFor=(title:string)=>articleAliases.find(([pattern])=>pattern.test(title))?.[1];
let queue=Promise.resolve();

async function lookup(title:string):Promise<Cover|null>{
 const key=`cover-v3:${normalized(title)}`,cached=await library.getPreference<Cover>(key);
 if(cached&&Date.now()-cached.checked<30*86400000)return cached;
 const api=async(params:Record<string,string>)=>{
  const response=await fetch(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({action:'query',format:'json',origin:'*',...params})}`,{signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw Error('Capa indisponível');
  return response.json() as Promise<{query?:{pages?:Record<string,WikiPage>}}>;
 };
 const alias=articleFor(title);
 const search=await api({generator:'search',gsrsearch:alias||title.slice(0,180),gsrlimit:'5',prop:'pageimages',piprop:'name|thumbnail',pithumbsize:'480'});
 const words=normalized(`${title} ${alias||''}`).split(/\s+/).filter(word=>word.length>2);
 const candidates=Object.values(search.query?.pages||{}).map(page=>{
  const pageWords=normalized(page.title).split(/\s+/).filter(word=>word.length>2);
  const shared=words.filter(word=>pageWords.includes(word)).length;
  return {page,shared,score:shared/Math.max(1,Math.min(words.length,pageWords.length))+(alias&&normalized(page.title)===normalized(alias)?10:0)};
 }).sort((a,b)=>b.score-a.score||b.shared-a.shared);
 const page=(alias||candidates[0]?.shared>=2||words.length===1&&candidates[0]?.shared===1)?candidates[0]?.page:undefined;
 let cover:Cover={url:'',credit:'',origin:'',checked:Date.now()};
 if(page){
  const imageList=await api({titles:page.title,prop:'images',imlimit:'max'});
  const images=Object.values(imageList.query?.pages||{})[0]?.images?.map(image=>image.title)||[];
  if(page.pageimage)images.push(`File:${page.pageimage}`);
  const pageTokens=normalized(`${page.title} ${alias||''}`).split(/\s+/).filter(word=>word.length>2);
  const ranked=[...new Set(images)].map(image=>{
   const name=normalized(image);
   const shared=pageTokens.filter(word=>name.includes(word)).length;
   const opaque=/\.(?:jpe?g|webp)$/i.test(image)?25:/\.png$/i.test(image)?12:-20;
   const subject=/box art|cover|album|poster/i.test(image)?100:/logo/i.test(image)?5:0;
   const noise=/commons-logo|wikiquote|speaker|icon|audio|gameplay|screenshot/i.test(image)?-200:0;
   return {image,score:subject+opaque+shared*8+noise};
  }).sort((a,b)=>b.score-a.score);
  const selected=ranked[0]?.score>0?ranked[0].image:undefined;
  if(selected){
   const info=await api({titles:selected,prop:'imageinfo',iiprop:'extmetadata|url',iiurlwidth:'480'});
   const image=Object.values(info.query?.pages||{})[0]?.imageinfo?.[0],meta=image?.extmetadata;
   const plain=(value:string)=>new DOMParser().parseFromString(value||'','text/html').body.textContent||'';
   const license=plain(meta?.LicenseShortName?.value||'Imagem da Wikipédia');
   const url=image?.thumburl||image?.url;
   if(url&&/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(url))cover={url,credit:`${plain(meta?.Artist?.value||page.title).slice(0,300)} · ${license}`,origin:image?.descriptionurl||'',checked:Date.now()};
  }
 }
 await library.setPreference(key,cover);
 return cover;
}

export default function SongCover({title}:{title:string}){
 const ref=useRef<HTMLDivElement>(null),[cover,setCover]=useState<Cover|null>(null),[failed,setFailed]=useState(false),[credit,setCredit]=useState(false);
 useEffect(()=>{let alive=true;setCover(null);setFailed(false);const observer=new IntersectionObserver(entries=>{if(!entries.some(entry=>entry.isIntersecting))return;observer.disconnect();queue=queue.then(async()=>{if(!alive)return;try{const result=await lookup(title);if(alive)setCover(result);}catch{/* A capa local continua disponível offline. */}});},{rootMargin:'100px'});if(ref.current)observer.observe(ref.current);return()=>{alive=false;observer.disconnect();};},[title]);
 const hue=[...title].reduce((sum,char)=>sum+char.charCodeAt(0),0)%34+92;
 return <div ref={ref} className="cover-layer">{cover?.url&&!failed?<><img src={cover.url} alt={`Capa relacionada a ${title}`} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/><button className="cover-credit-toggle" onClick={()=>setCredit(!credit)} aria-label="Créditos da capa">ⓘ</button>{credit&&<div className="cover-credit">{cover.credit}<small>{cover.origin}</small><button onClick={()=>setCredit(false)}>Fechar</button></div>}</>:<div className="cover-fallback" role="img" aria-label={`Capa de ${title}`} style={{background:`linear-gradient(135deg,hsl(${hue} 28% 29%),hsl(${hue+24} 31% 16%))`}}><Music2 size={37}/><span>{title}</span></div>}</div>;
}
