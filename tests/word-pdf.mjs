import {convertFile} from '../src/convert.js';
import {Document,Paragraph,Table,TableRow,TableCell,TextRun,ImageRun,Packer} from 'docx';
import * as pdfjs from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc=worker;
const status=document.getElementById('status'),report=document.getElementById('report');
async function verify(file,label,minPages=1){
  const [r]=await convertFile([file],{tool:'word-pdf',target:'pdf'},(p,m)=>{status.textContent=m;});
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await r.blob.arrayBuffer()),enableScripting:false,enableScripting:false,isEvalSupported:false}).promise;
  if(pdf.numPages<minPages)throw new Error('分页未达到预期');
  let ink=0;
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i),viewport=page.getViewport({scale:.9}),canvas=document.createElement('canvas');
    canvas.width=viewport.width;canvas.height=viewport.height;canvas.style.cssText='max-width:100%;border:1px solid #bbb;margin:12px';
    await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let dark=0;for(let j=0;j<pixels.length;j+=4)if(pixels[j]<180&&pixels[j+1]<180&&pixels[j+2]<180)dark++;
    if(dark<100)throw new Error('发现空白 PDF 页');ink+=dark;
    if(i===1||i===pdf.numPages)document.getElementById('previews').append(canvas);
  }
  report.insertAdjacentHTML('beforeend',`<p>${label} PASS · ${pdf.numPages} 页 · 非空像素 ${ink}</p>`);
  const link=document.createElement('a');link.href=URL.createObjectURL(r.blob);link.download=label+'.pdf';link.textContent='下载 '+label+' PDF';report.append(link);
  await pdf.loadingTask.destroy();
}
try{
  const f=await fetch('./fixtures/sample.docx');await verify(new File([await f.blob()],'sample.docx'),'中文段落与表格');
  const image=new Uint8Array(await (await fetch('./fixtures/scan.png')).arrayBuffer());
  const paragraphs=[new Paragraph({children:[new TextRun({text:'Word 转 PDF：中文标题与图片',bold:true,size:36})]}),new Paragraph({children:[new ImageRun({data:image,type:'png',transformation:{width:420,height:180}})]})];
  for(let i=0;i<65;i++)paragraphs.push(new Paragraph(`第 ${i+1} 行：中文内容不会丢失。Table and image conversion 12345. 这是长文档分页测试，每段保留完整内容。`));
  paragraphs.push(new Table({rows:[new TableRow({children:[new TableCell({children:[new Paragraph('末尾表格')]}),new TableCell({children:[new Paragraph('最终内容 98765')]})]})]}));
  const blob=await Packer.toBlob(new Document({sections:[{children:paragraphs}]}));
  await verify(new File([blob],'long.docx'),'长文档图片与分页',2);
  status.textContent='全部 2 项通过';status.dataset.passed='true';
}catch(error){status.textContent='FAIL '+error.message;status.dataset.passed='false';console.error(error);}
