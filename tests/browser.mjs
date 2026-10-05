import {convertFile} from '../src/convert.js';
import {readCaj} from '../src/caj.js';
import {unzipSync,strFromU8} from 'fflate';
import {PDFDocument} from 'pdf-lib';
import * as XLSX from 'xlsx';
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const reports=[];let allPassed=true;
async function fixture(name){const r=await fetch('./fixtures/'+name);if(!r.ok)throw new Error('Fixture missing: '+name);return new File([await r.arrayBuffer()],name);}
async function run(name,fn){const li=document.createElement('li');li.textContent=name+' · 运行中';document.querySelector('#tests').append(li);try{await fn();li.textContent=name+' · PASS';li.className='ok';reports.push({name,ok:true});}catch(e){console.error(name,e);allPassed=false;li.textContent=name+' · FAIL: '+e.message;li.className='fail';reports.push({name,ok:false,error:e.message});}}
async function convert(file,tool,target,extra={}){return (await convertFile([await fixture(file)],{tool,target,layout:'editable',ocr:true,...extra},(p,m)=>{document.querySelector('#status').textContent=m;}))[0];}
async function wordText(r){const entries=unzipSync(new Uint8Array(await r.blob.arrayBuffer()));assert(!!entries['word/document.xml'],'Word package missing document.xml');return strFromU8(entries['word/document.xml']);}
function save(r){const a=document.createElement('a');a.textContent='下载验证结果 '+r.name;a.href=URL.createObjectURL(r.blob);a.download=r.name;a.style.display='block';document.querySelector('#downloads').append(a);}
await run('PDF → 可编辑 Word（中英文、两页）',async()=>{const r=await convert('sample.pdf','pdf-word','docx');const text=await wordText(r);assert(text.includes('PDF conversion test 1')&&text.includes('12345')&&text.includes('中文文件转换测试'),'PDF text mismatch');save(r);});
await run('PDF → 原稿图片 Word',async()=>{const r=await convert('sample.pdf','pdf-word','docx',{layout:'visual'});const zip=unzipSync(new Uint8Array(await r.blob.arrayBuffer()));assert(Object.keys(zip).filter(x=>x.startsWith('word/media/')).length>=2,'Missing page images');});
await run('PDF → PNG ZIP（逐页）',async()=>{const r=await convert('sample.pdf','pdf-export','png');const zip=unzipSync(new Uint8Array(await r.blob.arrayBuffer()));assert(Object.keys(zip).length===2,'Expected two pages');assert(Object.values(zip).every(v=>v[0]===137&&v[1]===80),'Invalid PNG bytes');});
await run('标准 CAJ → Word',async()=>{const r=await convert('sample.caj','caj-word','docx');assert((await wordText(r)).includes('中文文件转换测试'),'CAJ text mismatch');save(r);});
await run('标准 CAJ → PDF',async()=>{const r=await convert('sample.caj','caj-word','pdf');const d=await PDFDocument.load(await r.blob.arrayBuffer());assert(d.getPageCount()===2,'CAJ PDF pages mismatch');});
await run('KDH → PDF',async()=>{const r=await convert('sample.kdh','caj-word','pdf');const d=await PDFDocument.load(await r.blob.arrayBuffer());assert(d.getPageCount()===2,'KDH PDF pages mismatch');});
await run('压缩 HN 文字层 → Word',async()=>{const r=await convert('sample-hn.caj','caj-word','docx');assert((await wordText(r)).includes('CAJ文件转换测试'),'HN text mismatch');save(r);});
await run('C8 文字层 → TXT',async()=>{const r=await convert('sample-c8.caj','caj-word','txt');assert((await r.blob.text()).includes('CAJ文件转换测试'),'C8 text mismatch');});
await run('损坏 CAJ 拒绝转换',async()=>{let caught=false;try{readCaj(await (await fixture('broken.caj')).arrayBuffer());}catch{caught=true;}assert(caught,'Malformed CAJ must fail');});
await run('多图片 → 单个 PDF',async()=>{const f=await fixture('scan.png');const [r]=await convertFile([f,f],{tool:'image-pdf',target:'pdf'});const d=await PDFDocument.load(await r.blob.arrayBuffer());assert(d.getPageCount()===2,'Image merge page count mismatch');});
await run('PNG → JPG',async()=>{const r=await convert('scan.png','image-format','jpg');const bytes=new Uint8Array(await r.blob.arrayBuffer());assert(bytes[0]===255&&bytes[1]===216,'Invalid JPEG signature');});
await run('Word → TXT / HTML',async()=>{const txt=await convert('sample.docx','word-export','txt');assert((await txt.blob.text()).includes('中文段落'),'Word extraction failed');const html=await convert('sample.docx','word-export','html');assert((await html.blob.text()).includes('<table>'),'Word table export failed');});
await run('TXT → Word / PDF',async()=>{const w=await convert('sample.txt','text-word','docx');assert((await wordText(w)).includes('文字转Word测试'),'Text DOCX failed');const p=await convert('sample.txt','text-word','pdf');const d=await PDFDocument.load(await p.blob.arrayBuffer());assert(d.getPageCount()===1,'Text PDF page count failed');});
await run('CSV → XLSX → JSON（中文数据）',async()=>{const r=await convert('sample.csv','sheet-format','xlsx');const wb=XLSX.read(await r.blob.arrayBuffer(),{type:'array'});const row=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])[0];assert(row['姓名']==='小明'&&row['成绩']===90,'CSV encoding or numeric values changed');const x=new File([r.blob],'sample.xlsx');const [j]=await convertFile([x],{tool:'sheet-format',target:'json'});assert(JSON.parse(await j.blob.text())[1]['成绩']===95,'XLSX JSON mismatch');});
await run('JSON → CSV',async()=>{const r=await convert('sample.json','sheet-format','csv');assert((await r.blob.text()).includes('小明,90'),'JSON CSV mismatch');});
await run('扫描 PDF → OCR 文字',async()=>{const r=await convert('scan.pdf','pdf-export','txt');const text=await r.blob.text();assert(text.includes('12345')&&text.toUpperCase().includes('SCANNED'),'Scanned OCR mismatch: '+text);assert(text.includes('文字'),'Chinese OCR missing: '+text);save(r);});
await run('图片 → OCR Word',async()=>{const r=await convert('scan.png','image-word','docx');assert((await wordText(r)).includes('12345'),'Image OCR Word mismatch');});
document.querySelector('#status').textContent=allPassed?`全部 ${reports.length} 项通过`:'存在失败项，请修复后重跑';document.querySelector('#status').dataset.complete='true';document.querySelector('#status').dataset.passed=String(allPassed);
const report=new Blob([JSON.stringify(reports,null,2)],{type:'application/json'});save({name:'conversion-test-report.json',blob:report});
