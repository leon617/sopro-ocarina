// Original melody created for Sopro. CC0. Durations are quarter-note units.
const bars:[string|null,number,string?][][]=[
 [['C5',1],['E5',.5],['G5',.5],['A5',1],['G5',1]],
 [['F5',1.5],['E5',.5],[null,1],['D5',1]],
 [['C5',1],['D5',1],['F#5',1],['G5',1,'start']],
 [['G5',1,'stop'],['E5',1],['D5',1],['C5',1]],
 [['A4',1],['B4',.5],['C5',.5],['E5',2]],
 [['F5',2/3],['G5',2/3],['A5',2/3],['C6',1],[null,1]],
 [['B5',1],['A5',1],['G5',1.5],['E5',.5]],
 [['D5',1],['C5',3]],
];
export const demoXML=`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><work><work-title>Jardim ao anoitecer</work-title></work><identification><creator type="composer">Sopro · composição original</creator><rights>CC0 1.0</rights></identification><part-list><score-part id="P1"><part-name>Ocarina</part-name><score-instrument id="I1"><instrument-name>Alto C</instrument-name></score-instrument></score-part></part-list><part id="P1">${bars.map((notes,i)=>`<measure number="${i+1}">${i===0?'<attributes><divisions>6</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><sound tempo="80"/></direction><barline location="left"><repeat direction="forward"/></barline>':''}${i===4?'<direction><sound tempo="92"/></direction>':''}${notes.map(([n,d,tie])=>`<note>${n?`<pitch><step>${n[0]}</step>${n.includes('#')?'<alter>1</alter>':''}<octave>${n.at(-1)}</octave></pitch>`:'<rest/>'}<duration>${Math.round(d*6)}</duration><voice>1</voice><type>${d>=2?'half':d<1&&d!==2/3?'eighth':'quarter'}</type>${[1.5,3].includes(d)?'<dot/>':''}${d===2/3?'<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>':''}${tie?`<tie type="${tie}"/><notations><tied type="${tie}"/></notations>`:''}</note>`).join('')}${i===3?'<barline location="right"><repeat direction="backward"/></barline>':''}</measure>`).join('')}</part></score-partwise>`;
