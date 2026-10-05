import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const assets=readdirSync('dist/assets').map(file=>'assets/'+file);
const version=createHash('sha256').update(readFileSync('dist/index.html')).digest('hex').slice(0,12);
writeFileSync('dist/sw.js',`const ROOT=new URL('./',self.location.href);const PREFIX='zhuanyixia-'+ROOT.pathname+'-';const CACHE=PREFIX+'${version}';const APP=${JSON.stringify(['./','favicon.svg','manifest.webmanifest','app-icon.png',...assets])}.map(path=>new URL(path,ROOT).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==ROOT.origin||!u.href.startsWith(ROOT.href))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(ROOT.href)));return;}const local=u.href.slice(ROOT.href.length);if(!(/^(assets|pdf|ocr)\\//.test(local)||APP.includes(u.href)))return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok&&!r.redirected){caches.open(CACHE).then(c=>c.put(e.request,r.clone()));}return r;})));});`);
console.log('Service worker generated: '+version);
