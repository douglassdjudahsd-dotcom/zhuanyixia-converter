import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.PORT||8787);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be 1024–65535.');
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.mjs':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.wasm':'application/wasm','.gz':'application/gzip','.woff2':'font/woff2','.ttf':'font/ttf'};
createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const filename=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(!(await stat(filename)).isFile())throw new Error('Not a file');
  const data=await readFile(filename);
  res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Content-Length':data.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>{const url='http://127.0.0.1:'+port+'/';console.log('转一下已启动：'+url+'\n保持窗口打开，按 Ctrl+C 退出。');if(process.argv.includes('--open')){const [cmd,args]=process.platform==='win32'?['cmd',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];spawn(cmd,args,{windowsHide:true,stdio:'ignore'}).on('error',()=>{});}});
