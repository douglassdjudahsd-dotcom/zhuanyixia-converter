import {convertFile} from '../src/convert.js';
import {unzipSync,strFromU8} from 'fflate';
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
let passed=0,failed=0;
async function fixture(name){const response=await fetch('./fixtures/'+name);return new File([await response.arrayBuffer()],name);}
async function run(name,fn){const li=document.createElement('li');li.textContent=name+' · 运行中';document.querySelector('#tests').append(li);try{await fn();li.textContent=name+' · PASS';li.className='ok';passed++;}catch(error){li.textContent=name+' · FAIL: '+error.message;li.className='fail';failed++;}}
async function word(name){const [result]=await convertFile([await fixture(name)],{tool:'caj-word',target:'docx',layout:'editable',ocr:true});return strFromU8(unzipSync(new Uint8Array(await result.blob.arrayBuffer()))['word/document.xml']);}
await run('缺少 Catalog / Pages 的 CAJ → Word',async()=>{assert((await word('missing-root.caj')).includes('中文文件转换测试'),'重建后文字缺失');});
await run('旧式 HN → Word',async()=>{assert((await word('old-style-hn.caj')).includes('CAJ文件转换测试'),'旧版 HN 文字缺失');});
await run('图片互转保留 3000 × 1200 像素',async()=>{const canvas=document.createElement('canvas');canvas.width=3000;canvas.height=1200;const ctx=canvas.getContext('2d');ctx.fillStyle='#3057f2';ctx.fillRect(0,0,3000,1200);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const [result]=await convertFile([new File([blob],'wide.png',{type:'image/png'})],{tool:'image-format',target:'jpg'});const bitmap=await createImageBitmap(result.blob);assert(bitmap.width===3000&&bitmap.height===1200,'图片尺寸发生变化');bitmap.close();});
document.querySelector('#status').textContent=`${passed} 项通过，${failed} 项失败`;
document.querySelector('#status').dataset.complete='true';
