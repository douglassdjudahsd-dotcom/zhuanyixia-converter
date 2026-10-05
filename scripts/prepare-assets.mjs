import {mkdirSync,copyFileSync,cpSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
for(const folder of ['public/pdf','public/ocr/lang','public/licenses'])mkdirSync(folder,{recursive:true});
for(const name of ['cmaps','standard_fonts','wasm'])cpSync(path.join('node_modules/pdfjs-dist',name),path.join('public/pdf',name),{recursive:true});
copyFileSync('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const name of ['tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js'])copyFileSync(path.join('node_modules/tesseract.js-core',name),path.join('public/ocr',name));
const revision='87416418657359cb625c412a48b6e1d6d41c29bd';
const hashes={eng:'7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2',chi_sim:'a5fcb6f0db1e1d6d8522f39db4e848f05984669172e584e8d76b6b3141e1f730'};
for(const [name,hash] of Object.entries(hashes)){
 const filename=path.join('public/ocr/lang',name+'.traineddata.gz');
 let data;
 if(existsSync(filename))data=gunzipSync(readFileSync(filename));
 else {console.log('Downloading official OCR model: '+name);const response=await fetch('https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/'+revision+'/'+name+'.traineddata');if(!response.ok)throw new Error('OCR model download failed: '+response.status);data=Buffer.from(await response.arrayBuffer());}
 if(createHash('sha256').update(data).digest('hex')!==hash)throw new Error('OCR model integrity check failed: '+name);
 writeFileSync(filename,gzipSync(data,{level:9}));
}
cpSync('licenses','public/licenses',{recursive:true});
for(const name of ['LICENSE','THIRD_PARTY.md'])copyFileSync(name,path.join('public/licenses',name));
for(const component of ['docx','pdfjs-dist','pdf-lib','fflate','mammoth','dompurify','tesseract.js','tesseract.js-core','xlsx']){
 const folder=path.join('node_modules',component);
 for(const name of ['LICENSE','LICENSE.txt','LICENSE.md','LICENSE_APACHE','LICENSE_MPL'])if(existsSync(path.join(folder,name)))copyFileSync(path.join(folder,name),path.join('public/licenses',component+'-'+name));
}
console.log('PDF / OCR resources ready; model hashes verified.');
