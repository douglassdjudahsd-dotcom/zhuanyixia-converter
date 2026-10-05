import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {zipSync} from 'fflate';
const version=JSON.parse(readFileSync('package.json')).version;
const files={};
function collect(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())collect(file);else files[file.replaceAll('\\','/')]=new Uint8Array(readFileSync(file));}}
collect('dist');
for(const file of ['server.mjs','start-windows.cmd','LICENSE','THIRD_PARTY.md','README.md'])files[file]=new Uint8Array(readFileSync(file));
mkdirSync('release',{recursive:true});
const name='zhuanyixia-v'+version+'-web.zip';
const bytes=zipSync(files,{level:6});
writeFileSync(path.join('release',name),bytes);
const hash=createHash('sha256').update(bytes).digest('hex');
writeFileSync('release/SHA256SUMS.txt',hash+'  '+name+'\n');
console.log(JSON.stringify({name,size:bytes.length,sha256:hash,files:Object.keys(files).length}));
