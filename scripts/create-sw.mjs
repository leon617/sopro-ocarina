import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root='dist/client';
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.name.startsWith('.')||e.name==='_headers'||e.name==='_redirects')continue;if(e.isDirectory())walk(f);else if(!/\.(map|br|gz)$/.test(f)&&!f.endsWith('/sw.js')&&fs.statSync(f).size<5*1024*1024)files.push('/'+path.relative(root,f).replaceAll('\\','/'));}}walk(root);
const version=crypto.createHash('sha256').update(files.sort().join('|')+fs.readFileSync('components/sopro/App.tsx')).digest('hex').slice(0,12);
const source=`const CACHE='sopro-${version}';const SHELL=${JSON.stringify(['/',...files])};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async cache=>{await cache.addAll(SHELL);await self.skipWaiting();}));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sopro-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('auth')||url.pathname.includes('signin')||request.headers.get('RSC'))return;
if(request.mode==='navigate'){event.respondWith(fetch(request).then(async response=>{if(response.ok&&response.headers.get('content-type')?.includes('text/html')){const cache=await caches.open(CACHE);await cache.put('/',response.clone());}return response;}).catch(async()=>await caches.match('/')||Response.error()));return;}
event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&SHELL.includes(url.pathname)){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));});`;
fs.writeFileSync(path.join(root,'sw.js'),source);console.log(`Offline cache ${version}: ${files.length} assets`);
