import {useEffect,useRef,useState} from 'react';
import {Compass,Search,Music2,Plus,Headphones,ChevronLeft,ChevronRight,TrendingUp,Info} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogHeader} from '@/components/ui/dialog';
import {Choice,Toggle} from './Controls';
import {library} from '@/core/storage/library';
import {catalogSources,type CatalogResult,type CatalogPage,type CatalogSort,type CatalogFile} from '@/core/catalog/types';
const sortNames:Record<CatalogSort,string>={relevance:'Relevância',title:'Título A–Z',popularity:'Mais populares'};
export default function Explore({onImport,importing}:{onImport:(r:CatalogResult,file?:string)=>Promise<void>;importing:boolean}){
 const [source,setSource]=useState('ichigos'),[query,setQuery]=useState('Zelda'),[sort,setSort]=useState<CatalogSort>('relevance'),[only,setOnly]=useState(true);
 const [data,setData]=useState<CatalogPage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[cached,setCached]=useState(false);
 const [credits,setCredits]=useState<CatalogResult|null>(null);
 const [selection,setSelection]=useState<{result:CatalogResult;files:CatalogFile[]}|null>(null),[file,setFile]=useState('');
 const request=useRef<AbortController|null>(null),revision=useRef(0),resultRef=useRef<HTMLParagraphElement>(null);
 const currentSource=catalogSources.find(s=>s.id===source)!;
 useEffect(()=>()=>{revision.current++;request.current?.abort();},[]);
 function reset(){revision.current++;request.current?.abort();setData(null);setError('');setCached(false);setBusy(false);setSelection(null);}
 async function search(page=1){
  request.current?.abort();const controller=new AbortController();request.current=controller;const rev=++revision.current;
  const params=new URLSearchParams({source,q:query,sort,page:String(page),importable:String(only)}),key=params.toString();
  setBusy(true);setError('');setCached(false);const timeout=setTimeout(()=>controller.abort(),25000);
  try{
   const response=await fetch(`/api/catalog?${key}`,{signal:controller.signal,cache:'no-store'});const value=await response.json() as CatalogPage & {error?:string};
   if(!response.ok)throw Error(value.error||'Fonte indisponível.');if(rev!==revision.current)return;
   setData(value);await library.setPreference(`catalog-last-v2-${source}`,{key,data:value});
  }catch(e){
   if(rev!==revision.current)return;
   const last=await library.getPreference<{key:string;data:CatalogPage}>(`catalog-last-v2-${source}`).catch(()=>undefined);
   if(rev!==revision.current)return;
   if(last?.key===key){setData(last.data);setCached(true);}else setData(null);
   setError(controller.signal.aborted?'A fonte demorou para responder. Tente novamente.':e instanceof Error?e.message:'Sem conexão. Sua biblioteca continua disponível.');
  }finally{clearTimeout(timeout);if(rev===revision.current){setBusy(false);if(page>1)resultRef.current?.scrollIntoView({block:'start'});}}
 }
 async function prepareImport(result:CatalogResult){
  setError('');if(result.source==='openscore'){await onImport(result);return;}
  request.current?.abort();const controller=new AbortController();request.current=controller;const rev=++revision.current;
  setBusy(true);const timeout=setTimeout(()=>controller.abort(),25000);
  try{
   const params=new URLSearchParams({source:result.source,id:result.id,action:'files'}),response=await fetch(`/api/catalog?${params}`,{signal:controller.signal}),value=await response.json() as {error?:string;files:CatalogFile[]};
   if(!response.ok)throw Error(value.error||'Não foi possível consultar os arquivos.');if(rev!==revision.current)return;
   if(!value.files?.length)throw Error('Não há arquivo compatível disponível neste item. Escolha outra transcrição.');
   if(value.files.length===1)await onImport(result,value.files[0].name);
   else{setSelection({result,files:value.files});setFile(value.files[0].name);}
  }catch(e){if(rev===revision.current)setError(e instanceof Error?e.message:'Fonte indisponível.');}
  finally{clearTimeout(timeout);if(rev===revision.current)setBusy(false);}
 }
 const locked=busy||importing;
 return <>
  <div className="page-heading"><div><span className="eyebrow">NOVAS MELODIAS PARA O SEU REPERTÓRIO</span><h1>Deixe a música chegar<span className="gold-dot">.</span></h1><p>Dos seus jogos e animes favoritos para os dedos. Busque, importe e pratique aqui.</p></div><Compass size={40} className="gold" strokeWidth={1}/></div>
  <form className="catalog-controls panel" onSubmit={e=>{e.preventDefault();void search();}}>
   <div className="catalog-filters">
    <Choice label="Fonte de partituras" value={source} onChange={v=>{reset();setSource(v);setQuery(v==='ichigos'?'Zelda':v==='pdmx'?'Amazing Grace':v==='zelda-central'?'Ocarina of Time':'');setSort(v==='internet-archive'?'popularity':'relevance');}} options={catalogSources.map(s=>({value:s.id,label:s.name,disabled:'disabled' in s&&s.disabled}))}/>
    <Choice key={source} label="Ordenar catálogo" value={sort} onChange={v=>{reset();setSort(v as CatalogSort);}} options={currentSource.sorts.map(value=>({value,label:sortNames[value]}))}/>
    <Toggle label="Somente importáveis" value={only} onChange={v=>{reset();setOnly(v);}}/>
   </div>
   <div className="catalog-search"><Search/><Input aria-label="Buscar no catálogo" maxLength={150} placeholder={source==='ichigos'?'Jogo, anime ou música: Zelda, Naruto, Final Fantasy':source==='internet-archive'?'Título ou autor, como Auld Lang Syne':'Título ou compositor, como Schubert'} value={query} onChange={e=>{reset();setQuery(e.target.value);}}/><Button className="primary" disabled={locked}>{busy?'Buscando…':'Buscar partituras'}</Button></div>
   <p className="catalog-source-note">{source==='ichigos'?'Arranjos de jogos e anime do Ichigo’s, para uso pessoal e não comercial.':source==='zelda-central'?'MIDI público do Ice’s Zelda Central, importado e convertido dentro do Sopro.':source==='pdmx'?'Amostra curada do PDMX em MXL, restrita a no_license_conflict.':source==='internet-archive'?'Acervo PublicJukebox; popularidade usa acessos do Archive.':source==='vgleadsheets'?'Índice completo de títulos do VGLeadSheets; a fonte oferece PDF, ainda não importável.':source==='vgmusic'?'A fonte proíbe ligação direta aos MIDIs; o Sopro respeita essa condição.':source==='ninsheetmusic'?'A fonte exige verificação antirobô e o Sopro não contorna CAPTCHA.':'Edições CC0 do OpenScore Lieder.'}</p>
  </form>
  {error&&<div className="message error" role="alert"><Info size={20}/><p>{error} {cached?'Mostrando a mesma busca salva neste dispositivo.':'As músicas da sua biblioteca continuam disponíveis.'}</p></div>}
  <p className="catalog-status" role="status" ref={resultRef}>{data?`${data.total.toLocaleString('pt-BR')} itens na fonte · ${currentSource.name} · ${sortNames[data.sort]}${cached?' · Resultados em cache':''} · Consultado em ${new Date(data.fetchedAt).toLocaleString('pt-BR')}`:source==='ichigos'?'Busque pelo jogo, anime ou nome da música. “Somente importáveis” mostra transcrições com MIDI.':'Escolha uma fonte e busque por título ou autor. Deixe o campo vazio para navegar pelo acervo.'}</p>
  <div className="catalog-list" aria-busy={locked}>{data?.results.map(r=><article key={`${r.source}:${r.id}`} className="catalog-result panel">
   <span className="catalog-icon"><Music2/></span><div className="catalog-result-copy"><h2>{r.title}</h2><p>{r.work||r.composer} · {r.author}</p><small>{r.license} · {r.formats.join(', ')}</small>{r.popularity&&<span className="catalog-popularity"><TrendingUp size={15}/>{r.popularity.value.toLocaleString('pt-BR')} {r.popularity.label}</span>}</div>
   <div className="catalog-result-actions"><Button variant="ghost" onClick={()=>setCredits(r)}>Créditos</Button>{r.importable?<Button variant="outline" disabled={locked} onClick={()=>void prepareImport(r)}><Plus/>Importar</Button>:<span className="catalog-pdf">Formato sem importação</span>}</div>
  </article>)}</div>
  {data&&data.total>data.pageSize&&<nav className="catalog-pagination" aria-label="Páginas do catálogo"><Button variant="outline" disabled={locked||data.page===1} onClick={()=>void search(data.page-1)}><ChevronLeft size={16}/>Anterior</Button><span>Página {data.page} de {Math.min(500,Math.ceil(data.total/data.pageSize))}</span><Button variant="outline" disabled={locked||data.page>=Math.min(500,Math.ceil(data.total/data.pageSize))} onClick={()=>void search(data.page+1)}>Próxima<ChevronRight size={16}/></Button></nav>}
  {!data?.results.length&&!busy&&<div className="catalog-empty"><Headphones size={42} strokeWidth={1}/><h2>{data?'Nenhuma partitura nesta busca':'Um repertório para descobrir'}</h2><p>{data?'Experimente outro título ou autor.':'Explore temas de jogos e anime, obras em domínio público, canções clássicas e partituras históricas nas fontes disponíveis do catálogo.'}</p></div>}
  <Dialog open={!!credits} onOpenChange={open=>{if(!open)setCredits(null);}}><DialogContent className="sopro-dialog"><DialogHeader><DialogTitle>Créditos da partitura</DialogTitle><DialogDescription>{credits?.title}</DialogDescription></DialogHeader><p>{credits?.work||credits?.composer}</p><p>Transcrição / edição: {credits?.author}</p><p>{credits?.license}</p>{credits?.warning&&<p>{credits.warning}</p>}<p className="catalog-source-note">Fonte: {catalogSources.find(s=>s.id===credits?.source)?.name}. Os créditos são preservados ao importar.</p><Button variant="outline" onClick={()=>setCredits(null)}>Voltar ao catálogo</Button></DialogContent></Dialog>
  <Dialog open={!!selection} onOpenChange={open=>{if(!open)setSelection(null);}}><DialogContent className="sopro-dialog"><DialogHeader><DialogTitle>Escolha a partitura</DialogTitle><DialogDescription>{selection?.result.title} contém mais de um arquivo compatível. Escolha o arquivo que deseja praticar.</DialogDescription></DialogHeader><Choice label="Arquivo da partitura" value={file} onChange={setFile} options={selection?.files.map(f=>({value:f.name,label:f.name}))||[]}/><p>Transcrições automáticas podem conter erros. Você poderá escolher a melodia e ouvir uma prévia antes de salvar.</p><Button className="primary" disabled={importing||!file} onClick={()=>{if(selection){const r=selection.result;setSelection(null);void onImport(r,file);}}}>Importar arquivo selecionado</Button></DialogContent></Dialog>
 </>;
}
