import {it,expect} from 'vitest';
import {Midi} from '@tonejs/midi';
import {midiToMusicXML,inspectMIDI} from '../core/music/midi';
import {parseMusicXML,readMusicFile} from '../core/music/xml';
import {makeMelody,suggestedSettings} from '../core/music/melody';
import {library,newSong,exportBackup,importBackup} from '../core/storage/library';
function song(){const midi=new Midi();midi.name='Ensaio MIDI';midi.header.tempos=[{ticks:0,bpm:120},{ticks:960,bpm:60}];midi.header.timeSignatures=[{ticks:0,timeSignature:[4,4]}];midi.header.update();const lead=midi.addTrack();lead.name='Melodia';lead.instrument.number=73;lead.addNote({midi:72,ticks:0,durationTicks:240}).addNote({midi:73,ticks:480,durationTicks:480}).addNote({midi:76,ticks:1440,durationTicks:960});const bass=midi.addTrack();bass.channel=1;bass.name='Baixo';bass.addNote({midi:48,ticks:0,durationTicks:2400});return midi;}
it('imports MIDI tracks, exact pitches/durations, gaps, ties across measures and tempo changes',()=>{
 const score=parseMusicXML(midiToMusicXML(song().toArray()));expect(score.title).toBe('Ensaio MIDI');expect(score.parts).toHaveLength(2);const lead=score.parts[0];expect(lead.name).toContain('Melodia');expect(lead.events.map(e=>[e.pitch?.midi,e.start,e.duration])).toEqual([[72,0,.5],[73,1,1],[76,3,1],[76,4,1]]);expect(lead.events[2].tieStart).toBe(true);expect(lead.events[3].tieStop).toBe(true);expect(lead.tempos).toContainEqual({at:2,bpm:60});const melody=makeMelody(score,{...suggestedSettings(score),partId:lead.id});expect(melody.events.some(e=>!e.pitch&&e.start===.5)).toBe(true);expect(score.warnings.join(' ')).toContain('sem quantização');
});
it('keeps chords simultaneous and automatically suggests a monophonic reduction',()=>{
 const midi=new Midi();const t=midi.addTrack();t.addNote({midi:72,ticks:0,durationTicks:480}).addNote({midi:79,ticks:0,durationTicks:240});const score=parseMusicXML(midiToMusicXML(midi.toArray())),settings=suggestedSettings(score);expect(settings.policy).not.toBe('voice');expect(makeMelody(score,settings).events.some(e=>e.pitch)).toBe(true);expect(makeMelody(score,{...settings,policy:'highest'}).events.filter(e=>e.pitch).map(e=>e.pitch?.midi)).toEqual([79,72]);
});
it('preserves an explicitly identified composer from MIDI metadata',()=>{const midi=song();midi.header.meta.push({type:'text',text:'Composer: Test Composer',ticks:0});expect(parseMusicXML(midiToMusicXML(midi.toArray())).composer).toBe('Test Composer');});
it('preserves unquantized timing and handles a mid-bar meter change without shifting later notes',()=>{
 const midi=new Midi();midi.header.timeSignatures=[{ticks:0,timeSignature:[4,4]},{ticks:960,timeSignature:[3,4]}];midi.header.update();midi.addTrack().addNote({midi:70,ticks:137,durationTicks:83}).addNote({midi:74,ticks:1000,durationTicks:480});const s=parseMusicXML(midiToMusicXML(midi.toArray()));expect(s.parts[0].events[0].start).toBeCloseTo(137/480);expect(s.parts[0].events[0].duration).toBeCloseTo(83/480);expect(s.parts[0].events[1].start).toBeCloseTo(1000/480);expect(s.parts[0].measures[0].implicit).toBe(true);expect(s.parts[0].measures[1].beats).toBe(3);
});
it('supports type 0 and running status, and rejects SMPTE, independent type 2 and truncated events',()=>{
 const bytes=new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,0,96,77,84,114,107,0,0,0,11,0,144,72,100,96,72,0,0,255,47,0]);
 expect(parseMusicXML(midiToMusicXML(bytes)).parts[0].events[0].duration).toBe(1);
 const smpte=bytes.slice();smpte[12]=0xe8;expect(()=>inspectMIDI(smpte)).toThrow(/SMPTE/);const type2=bytes.slice();type2[9]=2;expect(()=>inspectMIDI(type2)).toThrow(/tipo 2/);expect(()=>inspectMIDI(bytes.subarray(0,bytes.length-1))).toThrow(/truncada/);expect(()=>inspectMIDI(new Uint8Array(2*1024*1024+1))).toThrow(/2 MB/);
});
it('warns about percussion and pitch bends without pretending they are ocarina notes',()=>{
 const midi=song();midi.tracks[0].addPitchBend({ticks:0,value:.5});const drums=midi.addTrack();drums.channel=9;drums.addNote({midi:36,ticks:0,durationTicks:480});const s=parseMusicXML(midiToMusicXML(midi.toArray()));expect(s.warnings.join(' ')).toContain('pitch bends');expect(s.warnings.join(' ')).toContain('percussão');expect(s.parts.at(-1)!.events.every(e=>!e.pitch)).toBe(true);
});
it('rejects unterminated notes and notes with zero duration instead of silently dropping them',()=>{
 const midi=new Midi();midi.addTrack().addNote({midi:72,ticks:0,durationTicks:0});expect(()=>midiToMusicXML(midi.toArray())).toThrow(/duração nula/);
 const bytes=new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,0,96,77,84,114,107,0,0,0,8,0,144,72,100,0,255,47,0]);expect(()=>inspectMIDI(bytes)).toThrow(/sem evento de término/);
});
it('imports .mid and .midi through the normal file flow and survives local backup restoration',async()=>{
 const bytes=song().toArray(),file={name:'tema.midi',size:bytes.length,arrayBuffer:async()=>bytes.buffer} as File;
 const xml=await readMusicFile(file),s=newSong(xml);await library.put(s);const backup=await exportBackup();await library.remove(s.id);await importBackup(backup);const restored=(await library.all()).find(x=>x.id===s.id)!;expect(restored.title).toBe('Ensaio MIDI');expect(restored.score.parts).toHaveLength(2);expect(restored.score.warnings.join(' ')).toContain('Importado de MIDI');
});
