import { useId } from 'react';
import { holes, noteName } from '@/core/music/profile';
import type { MusicEvent } from '@/core/music/types';
export default function Diagram({event,next,previous,solfege=true,labels=false}:{event?:MusicEvent;next?:MusicEvent;previous?:MusicEvent;solfege?:boolean;labels?:boolean}){
 const id=useId();const closed=event?.fingering;const comparison=next?.fingering||previous?.fingering;const desc=event?`${noteName(event.pitch,solfege)}. ${event.outOfRange?'Fora do alcance.':!event.pitch?'Pausa.':holes.map((h,i)=>`${h.label}: ${closed?.[i]?'fechado':'aberto'}`).join('; ')}`:'Ocarina de doze furos';
 if(event&&!event.pitch)return <div className="rest-diagram" role="img" aria-label="Pausa: não sopre"><span>𝄽</span></div>;
 if(event?.outOfRange)return <div className="rest-diagram outside" role="img" aria-label={desc}><span>↗</span><small>Fora do alcance</small></div>;
 return <svg className="ocarina" viewBox="0 0 330 207" role="img" aria-labelledby={`${id}-title ${id}-desc`}><title id={`${id}-title`}>{event?noteName(event.pitch,solfege):'Ocarina Alto C'}</title><desc id={`${id}-desc`}>{desc}. Vista de quem toca. Polegares destacados abaixo.</desc>
 <path d="M42 106C36 89 56 67 84 57C125 40 208 20 281 24Q304 25 286 44L228 107Q211 124 201 143Q195 153 183 148L166 126Q159 119 146 122C98 131 51 131 42 106Z" fill="var(--ocarina-body)" stroke="var(--ocarina-line)" strokeWidth="2.3"/>
 {holes.slice(0,10).map((h,i)=><g key={h.id}>{comparison&&closed?.[i]!==comparison[i]&&<circle cx={h.x} cy={h.y} r={h.r+5} fill="none" stroke="var(--gold)" strokeWidth="3" strokeDasharray="3 3"/>}<circle cx={h.x} cy={h.y} r={h.r} fill={closed?.[i]?'var(--hole-closed)':'var(--hole-open)'} stroke="var(--hole-closed)" strokeWidth="2"/></g>)}
 <rect x="88" y="150" width="158" height="40" rx="20" fill="var(--ocarina-body)" stroke="var(--ocarina-line)" strokeWidth="1.5"/>
 {holes.slice(10).map((h,i)=><g key={h.id}>{comparison&&closed?.[i+10]!==comparison[i+10]&&<circle cx={h.x} cy={h.y} r={h.r+5} fill="none" stroke="var(--gold)" strokeWidth="3"/>}<circle cx={h.x} cy={h.y} r={h.r} fill={closed?.[i+10]?'var(--hole-closed)':'var(--hole-open)'} stroke="var(--hole-closed)" strokeWidth="2"/>{labels&&<text x={h.x} y="200" textAnchor="middle" fill="var(--muted)" fontSize="12">{i?'Polegar direito':'Polegar esquerdo'}</text>}</g>)}
 {!labels&&<text x="166" y="196" textAnchor="middle" fill="var(--muted)" fontSize="12">POLEGARES</text>}
 </svg>;
}
