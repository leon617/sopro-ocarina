import {ichigos} from './ichigos';
import {openScore} from './openscore';
import {internetArchive} from './archive';
import {pdmx} from './pdmx';
import {vgLeadSheets,zeldaCentral,unavailableConnector} from './extra';
export {allowedURL,safeFetch} from './http';
export {openScore,internetArchive,pdmx};
export const connectors=[ichigos,zeldaCentral,pdmx,openScore,internetArchive,vgLeadSheets,unavailableConnector('vgmusic','VGMusic','O VGMusic não permite ligação direta aos arquivos; a importação interna permanece desativada.'),unavailableConnector('ninsheetmusic','NinSheetMusic','O NinSheetMusic exige uma verificação antirobô nas rotas do catálogo. O Sopro não contorna CAPTCHA.')];
// Bounded per-isolate protection. Deployment-wide quotas belong at the edge (README).
const buckets=new Map<string,{count:number;reset:number}>();
export function rateLimit(key:string,now=Date.now()){for(const [k,v]of buckets)if(v.reset<=now)buckets.delete(k);if(buckets.size>5000)return false;const bucket=buckets.get(key)||{count:0,reset:now+60000};bucket.count++;buckets.set(key,bucket);return bucket.count<=30;}
