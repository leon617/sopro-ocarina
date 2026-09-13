import {it,expect,vi} from 'vitest';
import {allowedURL,safeFetch,rateLimit} from '../core/catalog/server';
it('rejects local, arbitrary hosts, credential URLs and deceptive prefixes',()=>{for(const url of ['http://localhost/a','https://127.0.0.1/a','https://raw.githubusercontent.com.evil/a','https://user@raw.githubusercontent.com/OpenScore/Lieder/main/scores/a.mxl','https://raw.githubusercontent.com/other/repo/main/a.mxl','https://raw.githubusercontent.com/OpenScore/Lieder/main/scores/a.mxl?redirect=evil'])expect(()=>allowedURL(url)).toThrow();expect(allowedURL('https://raw.githubusercontent.com/OpenScore/Lieder/main/scores/A/a.mxl').protocol).toBe('https:');});
it('blocks redirects to nonallowlisted destinations and limits response size',async()=>{const original=globalThis.fetch;globalThis.fetch=vi.fn(async()=>new Response(null,{status:302,headers:{location:'http://169.254.169.254/'}})) as any;await expect(safeFetch('https://raw.githubusercontent.com/OpenScore/Lieder/main/scores/a.mxl')).rejects.toThrow();globalThis.fetch=vi.fn(async()=>new Response('x',{headers:{'content-length':'1000'}})) as any;await expect(safeFetch('https://raw.githubusercontent.com/OpenScore/Lieder/main/scores/a.mxl',10)).rejects.toThrow(/limite/);globalThis.fetch=original;});
it('rate limits and expires a bucket',()=>{for(let i=0;i<30;i++)expect(rateLimit('test',1000)).toBe(true);expect(rateLimit('test',1000)).toBe(false);expect(rateLimit('test',61001)).toBe(true);});

import {archiveSearchURL,archiveResult,archiveFiles,archiveLicense,internetArchive} from '../core/catalog/archive';
import {CatalogCache} from '../core/catalog/http';
import {GET} from '../app/api/catalog/route';
import {afterEach} from 'vitest';
afterEach(()=>{vi.restoreAllMocks();});
const archiveDoc={identifier:'folk.001.omr',title:'Folk song',creator:['Composer','Arranger'],collection:['PublicJukebox'],licenseurl:'https://creativecommons.org/publicdomain/mark/1.0/',format:['MusicXML','Text PDF','Djvu XML'],downloads:120};
it('builds an Archive popularity query with source restrictions, pagination and literal user terms',()=>{
 const u=new URL(archiveSearchURL('Auld OR collection:private',{sort:'popularity',page:2}));
 expect(u.searchParams.getAll('sort[]')).toEqual(['downloads desc','identifier asc']);expect(u.searchParams.get('page')).toBe('2');
 expect(u.searchParams.get('q')).toContain('collection:PublicJukebox');expect(u.searchParams.get('q')).toContain('AND format:MusicXML');expect(u.searchParams.get('q')).not.toContain('collection:private');
 expect(new URL(archiveSearchURL('',{importableOnly:false})).searchParams.get('q')).toContain('format:"Text PDF"');
});
it('exposes source views honestly and distinguishes PDF-only from MusicXML',()=>{
 const xml=archiveResult(archiveDoc)!;expect(xml.importable).toBe(true);expect(xml.popularity?.value).toBe(120);expect(xml.formats).toEqual(['MusicXML','PDF']);expect(xml.composer).toBe('Composer · Arranger');
 const pdf=archiveResult({...archiveDoc,format:['Text PDF','Metadata'],downloads:undefined})!;expect(pdf.importable).toBe(false);expect(pdf.fileUrl).toBeUndefined();expect(pdf.popularity).toBeUndefined();
 expect(archiveResult({...archiveDoc,collection:['arbitrary']})).toBeUndefined();expect(archiveResult({...archiveDoc,'access-restricted-item':'true'})).toBeUndefined();
});
it('requires recognized license URLs, not misleading free-text or lookalike domains',()=>{
 expect(archiveLicense('https://creativecommons.org.evil/publicdomain/mark/1.0/')).toBeUndefined();expect(archiveLicense('public domain')).toBeUndefined();expect(archiveLicense('https://creativecommons.org/licenses/by-nc/4.0/')).toBeUndefined();expect(archiveLicense('http://creativecommons.org/licenses/publicdomain/')?.label).toContain('Domínio público');
});
it('resolves only explicitly identified MusicXML files, rejecting metadata XML, private, oversized and traversal files',()=>{
 const files=archiveFiles({metadata:archiveDoc,files:[{name:'score.musicxml',format:'MusicXML',size:'400'},{name:'score.musicxml',format:'MusicXML',size:'400'},{name:'item_meta.xml',format:'Metadata',size:'100'},{name:'private.mxl',format:'MusicXML',size:'100',private:'true'},{name:'../a.mxl',format:'MusicXML',size:'100'},{name:'large.mxl',format:'MusicXML',size:String(9*1024*1024)}]});
 expect(files.map(f=>f.name)).toEqual(['score.musicxml']);expect(()=>archiveFiles({metadata:{...archiveDoc,licenseurl:''},files:[]})).toThrow(/autorizada/);
});
it('allows Archive API and documented download nodes, and rejects traversal and internal destinations',()=>{
 expect(allowedURL(archiveSearchURL('Bach')).hostname).toBe('archive.org');expect(allowedURL('https://archive.org/metadata/folk.001.omr').hostname).toBe('archive.org');expect(allowedURL('https://dn720303.ca.archive.org/0/items/folk.001.omr/score.musicxml').protocol).toBe('https:');
 for(const url of ['https://archive.org/metadata/../admin','https://archive.org/download/folk.001.omr/%2e%2e/a.xml','https://archive.org/download/folk.001.omr/%252e%252e.xml','https://evil.archive.org/0/items/folk.001.omr/a.xml','https://archive.org/services/proxy?url=http://localhost','https://dn720303.ca.archive.org/0/items/folk.001.omr/score.musicxml?x=1'])expect(()=>allowedURL(url)).toThrow();
});
it('follows only redirects retaining the same Archive item and filename',async()=>{
 const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response(null,{status:302,headers:{location:'https://dn720303.ca.archive.org/0/items/folk.001.omr/score.musicxml'}})).mockResolvedValueOnce(new Response('score'));
 expect(new TextDecoder().decode(await safeFetch('https://archive.org/download/folk.001.omr/score.musicxml'))).toBe('score');expect(fetchMock).toHaveBeenCalledTimes(2);
 fetchMock.mockResolvedValueOnce(new Response(null,{status:302,headers:{location:'https://dn720303.ca.archive.org/0/items/different/score.musicxml'}}));await expect(safeFetch('https://archive.org/download/folk.001.omr/score.musicxml')).rejects.toThrow(/Redirecionamento/);
});
it('deduplicates concurrent cache loads, bounds storage, and retries after failures',async()=>{
 const cache=new CatalogCache<string>(1,100),load=vi.fn(async()=>'one');expect(await Promise.all([cache.get('a',load),cache.get('a',load)])).toEqual(['one','one']);expect(load).toHaveBeenCalledTimes(1);
 await cache.get('b',async()=>'two');await cache.get('a',load);expect(load).toHaveBeenCalledTimes(2);
 await expect(cache.get('bad',async()=>{throw Error('unavailable');})).rejects.toThrow();expect(await cache.get('bad',async()=>'recovered')).toBe('recovered');
});
it('routes the selected connector and rejects unsupported sort/source before any fetch',async()=>{
 const spy=vi.spyOn(internetArchive,'search').mockResolvedValue({results:[],source:'internet-archive',page:2,pageSize:20,total:0,sort:'popularity',fetchedAt:'2026-09-11T00:00:00Z'});
 expect((await GET(new Request('http://localhost/api/catalog?source=internet-archive&sort=popularity&page=2&importable=false'))).status).toBe(200);
 expect(spy).toHaveBeenCalledWith('',{sort:'popularity',page:2,importableOnly:false});
 expect((await GET(new Request('http://localhost/api/catalog?source=openscore&sort=popularity'))).status).toBe(400);expect((await GET(new Request('http://localhost/api/catalog?source=private-host'))).status).toBe(400);
});

import {parseIchigos,ichigos} from '../core/catalog/ichigos';
import {parsePDMXIndex,pdmx} from '../core/catalog/pdmx';
it('extracts real source structure into credited MIDI results without executing or displaying HTML',()=>{
 const h=`<span class='title2'><a href='/sheets/134'>Zelda &amp; Friends</a></span><br><br>Forest Theme (Transcribed by Arranger)<br><i>for Piano</i> | <a href='/res/getfile.php?id=123&type=pdf&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaa'>pdf</a> | <a href='/res/getfile.php?id=123&type=midi&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaa'>midi</a> | <br><br>Second Theme<br><i>for Flute</i> | <a href='/res/getfile.php?id=456&type=pdf&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaa'>pdf</a><br><br><script>alert('bad')</script>`;
 const rows=parseIchigos(h);expect(rows).toHaveLength(2);expect(rows[0].result).toMatchObject({id:'134:123',title:'Forest Theme',work:'Zelda & Friends',author:'Arranger',importable:true,formats:['PDF','MIDI']});expect(rows[1].result.importable).toBe(false);expect(rows[0].result.popularity).toBeUndefined();expect(rows[0].result.license).toContain('não comercial');
});
it('permits only public Ichigo MIDI link parameters, never PDF, forum, arbitrary paths or injected query keys',()=>{
 expect(allowedURL('https://ichigos.com/sheets/134').hostname).toBe('ichigos.com');expect(allowedURL('https://ichigos.com/res/getfile.php?id=123&type=midi&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaa').hostname).toBe('ichigos.com');
 for(const url of ['https://ichigos.com/forum','https://ichigos.com/res/getfile.php?id=123&type=pdf&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaa','https://ichigos.com/res/getfile.php?id=123&type=midi&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaa&url=http://localhost','https://ichigos.com.evil/sheets/134'])expect(()=>allowedURL(url)).toThrow();
});
it('rejects unsupported popularity on the geek connector rather than making up rankings',async()=>{
 expect(ichigos.sorts).not.toContain('popularity');expect((await GET(new Request('http://localhost/api/catalog?source=ichigos&sort=popularity'))).status).toBe(400);
});
it('accepts only reviewed PDMX no-conflict MXL records and removes duplicate works',()=>{
 const valid={id:'pdmx-amazing-grace',title:'Amazing Grace',composer:'Traditional',arranger:'E. Excell',format:'musicxml',assetPath:'assets/pdmx/pdmx-amazing-grace.mxl',source:{name:'PDMX',url:'https://zenodo.org/records/15571083'},license:{kind:'CC0-1.0',url:'https://creativecommons.org/publicdomain/zero/1.0/',basis:'pdmx-filtered-and-manually-reviewed'},bytes:4132,sha256:'a'.repeat(64)};
 const rows=parsePDMXIndex({entries:[valid,{...valid,id:'pdmx-duplicate'},{...valid,id:'pdmx-conflict',title:'Conflict',license:{...valid.license,basis:'source-declared'}},{...valid,id:'pdmx-pdf',title:'PDF',format:'pdf'}]});
 expect(rows).toHaveLength(1);expect(rows[0].result).toMatchObject({source:'pdmx',title:'Amazing Grace',license:'CC0 1.0',importable:true,formats:['MXL']});expect(rows[0].result.warning).toContain('no_license_conflict');
});
it('allows only the fixed PDMX index and curated MXL path',async()=>{
 expect(allowedURL('https://raw.githubusercontent.com/shafranek-js/MelodicaTrainer/main/public/score-library/catalog.json').protocol).toBe('https:');
 expect(allowedURL('https://raw.githubusercontent.com/shafranek-js/MelodicaTrainer/main/public/score-library/assets/pdmx/pdmx-amazing-grace.mxl').protocol).toBe('https:');
 for(const url of ['https://raw.githubusercontent.com/shafranek-js/MelodicaTrainer/main/package.json','https://raw.githubusercontent.com/shafranek-js/MelodicaTrainer/main/public/score-library/assets/pdmx/../private.mxl','https://raw.githubusercontent.com/other/MelodicaTrainer/main/public/score-library/assets/pdmx/a.mxl'])expect(()=>allowedURL(url)).toThrow();
 expect(pdmx.sorts).toEqual(['relevance','title']);expect((await GET(new Request('http://localhost/api/catalog?source=pdmx&sort=popularity'))).status).toBe(400);
});
