import type { Melody, Tempo } from '../music/types';
export function secondsAt(beat:number,tempos:Tempo[]) {let seconds=0,at=0,bpm=tempos[0]?.bpm||80;for(const t of tempos){if(t.at>beat)break;if(t.at>at)seconds+=(t.at-at)*60/bpm;at=t.at;bpm=t.bpm;}return seconds+(beat-at)*60/bpm;}
export interface AudioSegment { start:number; end:number; midi:number }
export function timeline(melody:Melody) {
 const segments:AudioSegment[]=[];let previousEvent:typeof melody.events[number]|undefined;
 for(const e of melody.events){const start=secondsAt(e.start,melody.tempos),end=secondsAt(e.start+e.duration,melody.tempos);const prev=segments.at(-1);
  if(e.pitch){if(e.tieStop&&previousEvent?.tieStart&&prev?.midi===e.pitch.midi&&Math.abs(prev.end-start)<.0001)prev.end=end;else segments.push({start,end,midi:e.pitch.midi});}previousEvent=e;
 }
 return {segments,starts:melody.events.map(e=>secondsAt(e.start,melody.tempos)),duration:secondsAt(melody.measures.at(-1)?melody.measures.at(-1)!.start+melody.measures.at(-1)!.duration:0,melody.tempos)};
}
export class Player {
 context?:AudioContext;master?:GainNode;nodes=new Set<OscillatorNode>(); timer?:ReturnType<typeof setInterval>;generation=0;
 playing=false; speed=1;volume=.55;metronome=false;position=0;anchor=0;index=0;count=0;
 melody?:Melody;data?:ReturnType<typeof timeline>; scheduled=new Set<string>();loop?:{start:number;end:number};
 onUpdate:(state:{playing:boolean;index:number;progress:number;count:number})=>void=()=>{};
 constructor(private createContext:()=>AudioContext=()=>new AudioContext()){}
 async ready(){if(!this.context){this.context=this.createContext();this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination);}await this.context.resume();}
 load(melody:Melody){this.pause();this.melody=melody;this.data=timeline(melody);this.position=0;this.index=0;this.loop=undefined;this.emit();}
 current(){return this.playing&&this.context?this.position+(this.context.currentTime-this.anchor)*this.speed:this.position;}
 cancel(){this.generation++;if(this.timer)clearInterval(this.timer);this.timer=undefined;for(const node of this.nodes){try{node.stop();node.disconnect();}catch{}}this.nodes.clear();this.scheduled.clear();}
 pause(){this.position=Math.max(0,this.current());this.playing=false;this.cancel();this.count=0;this.emit();}
 async play(countIn=false){if(this.playing||!this.data?.starts.length)return;const token=++this.generation;await this.ready();if(token!==this.generation)return;
  if(this.position>=this.data.duration-.001)this.position=0;
  if(this.loop&&(this.position<this.loop.start||this.position>=this.loop.end))this.position=this.loop.start;
  if(countIn){const event=this.melody!.events[this.index];const m=this.melody!.measures[event?.measure||0];const beatSec=60/(this.melody!.tempos.find(t=>t.at===0)?.bpm||80)*4/(m?.beatType||4);this.count=m?.beats||4;this.countInEnd=this.position;this.countInStep=beatSec;this.position-=this.count*beatSec;}
  else this.countInEnd=undefined;
  this.anchor=this.context!.currentTime;this.playing=true;this.timer=setInterval(()=>this.tick(),25);this.tick();
 }
 countInEnd?:number;countInStep=0;
 seek(index:number){const active=this.playing;this.pause();this.index=Math.max(0,Math.min(index,(this.data?.starts.length||1)-1));this.position=this.data?.starts[this.index]||0;this.emit();if(active)void this.play();}
 setSpeed(speed:number){const active=this.playing;this.pause();this.speed=Math.max(.25,Math.min(2,speed));if(active)void this.play();}
 setVolume(volume:number){this.volume=volume;if(this.master&&this.context)this.master.gain.setTargetAtTime(volume,this.context.currentTime,.015);}
 setLoop(from:number,to:number,enabled:boolean){const active=this.playing;this.pause();const a=this.melody?.measures[from],b=this.melody?.measures[to];this.loop=enabled&&a&&b?{start:secondsAt(a.start,this.melody!.tempos),end:secondsAt(b.start+b.duration,this.melody!.tempos)}:undefined;if(active)void this.play();}
 tone(midi:number,when:number,duration:number,click=false){if(!this.context||!this.master||duration<=0)return;const ctx=this.context,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=click?midi:440*2**((midi-69)/12);g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(click?.35:.32,when+Math.min(.012,duration/4));g.gain.setValueAtTime(click?.35:.32,when+Math.max(.015,duration-.035));g.gain.linearRampToValueAtTime(0,when+duration);o.connect(g);g.connect(this.master);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};o.start(when);o.stop(when+duration+.01);}
 async preview(midi:number){this.pause();const token=this.generation;await this.ready();if(token!==this.generation)return;this.tone(midi,this.context!.currentTime+.01,.55);}
 tick(){if(!this.playing||!this.data||!this.context||!this.melody)return;let pos=this.current();
  if(this.countInEnd!==undefined&&pos<this.countInEnd){this.count=Math.ceil((this.countInEnd-pos)/this.countInStep);const key=`count-${this.count}`;if(!this.scheduled.has(key)){this.scheduled.add(key);this.tone(1100,this.context.currentTime,.04,true);}this.emit();return;}
  this.count=0;this.countInEnd=undefined;
  if(this.loop&&pos>=this.loop.end){const offset=(pos-this.loop.end)%(this.loop.end-this.loop.start);this.cancel();this.position=this.loop.start+offset;this.anchor=this.context.currentTime;pos=this.position;this.timer=setInterval(()=>this.tick(),25);}
  if(pos>=this.data.duration){this.position=this.data.duration;this.playing=false;this.cancel();this.emit();return;}
  const horizon=pos+.15*this.speed,limit=this.loop?.end??this.data.duration;
  this.data.segments.forEach((s,i)=>{if(s.start>horizon||s.end<=pos||s.start>=limit||this.scheduled.has(`n${i}`))return;this.scheduled.add(`n${i}`);const begin=Math.max(s.start,pos),end=Math.min(s.end,limit);this.tone(s.midi,this.context!.currentTime+(begin-pos)/this.speed,(end-begin)/this.speed);});
  if(this.metronome)for(const m of this.melody.measures){const unit=4/m.beatType;for(let b=0;b*unit<m.duration-.001;b++){const at=secondsAt(m.start+b*unit,this.melody.tempos),key=`m${m.index}-${b}`;if(at>=pos-.025*this.speed&&at<horizon&&at<limit&&!this.scheduled.has(key)){this.scheduled.add(key);this.tone(b===0?1400:950,this.context.currentTime+Math.max(0,(at-pos)/this.speed),.035,true);}}}
  let low=0,high=this.data.starts.length-1;while(low<high){const mid=Math.ceil((low+high)/2);if(this.data.starts[mid]<=pos)low=mid;else high=mid-1;}this.index=low;this.emit();
 }
 emit(){this.onUpdate({playing:this.playing,index:this.index,progress:this.data?.duration?Math.min(1,Math.max(0,this.current()/this.data.duration)):0,count:this.count});}
 dispose(){this.pause();void this.context?.close();}
}
