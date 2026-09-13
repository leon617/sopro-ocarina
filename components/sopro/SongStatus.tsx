import {useState} from 'react';
import {Sprout,Sparkles,Trophy} from 'lucide-react';
import type {Song} from '@/core/music/types';

const statuses=[
 {value:'learning',label:'Aprendendo',Icon:Sprout},
 {value:'almost',label:'Quase pronta',Icon:Sparkles},
 {value:'mastered',label:'Dominada',Icon:Trophy},
] as const;

export default function SongStatus({value,onChange}:{value:Song['status'];onChange:(value:Song['status'])=>void}){
 const [open,setOpen]=useState(false);
 const current=statuses.find(status=>status.value===value)||statuses[0];
 return <div className={`song-status status-${current.value}`} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
  <button className="status-main" aria-label={`Progresso: ${current.label}. Alterar`} title={current.label} aria-expanded={open} onClick={()=>setOpen(!open)}><current.Icon size={18}/></button>
  {open&&<div className="status-cascade" role="menu" aria-label="Progresso da música">{statuses.filter(status=>status.value!==current.value).map(({value:next,label,Icon})=><button key={next} className={`status-option status-${next}`} role="menuitem" aria-label={label} title={label} onClick={()=>{onChange(next);setOpen(false);}}><Icon size={17}/></button>)}</div>}
 </div>;
}
