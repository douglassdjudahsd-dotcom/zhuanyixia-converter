import mammoth from 'mammoth/mammoth.browser';
import DOMPurify from 'dompurify';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';

/** DOCX content is reflowed into A4 pages. No external content is fetched. */
export async function wordPdf(buffer, progress) {
  const converted = await mammoth.convertToHtml({arrayBuffer:buffer});
  const safe = DOMPurify.sanitize(converted.value, {
    ALLOWED_TAGS:['p','br','h1','h2','h3','h4','h5','h6','strong','b','em','i','u','s','sup','sub','ul','ol','li','table','thead','tbody','tr','th','td','img','blockquote','a'],
    ALLOWED_ATTR:['src','alt','colspan','rowspan'],
  });
  const host = document.createElement('div');
  host.style.cssText='position:absolute;left:-10000px;top:0;width:794px;background:white;color:#182238;';
  const shadow = host.attachShadow({mode:'open'});
  shadow.innerHTML=`<style>:host{font:16px/1.65 Arial,"Noto Sans CJK SC",sans-serif}*{box-sizing:border-box}article{padding:60px;width:794px;background:white;overflow-wrap:anywhere}p{margin:0 0 12px}h1{font-size:28px}h2{font-size:24px}h3{font-size:20px}img{max-width:100%;height:auto;max-height:970px}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #aeb5c1;padding:7px;vertical-align:top}blockquote{margin-left:20px;border-left:3px solid #ccc;padding-left:12px}a{color:inherit}</style><article>${safe}</article>`;
  const article = shadow.querySelector('article');
  // Mammoth embeds document images; discard any remote reference from the input.
  for(const img of article.querySelectorAll('img')) if(!/^data:image\/(png|jpeg|gif|webp|bmp);base64,/i.test(img.getAttribute('src')||'')) img.remove();
  document.body.append(host);
  const pdf = await PDFDocument.create();
  try {
    await Promise.all([...article.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
    await document.fonts.ready;
    const bounds=article.getBoundingClientRect(), height=Math.ceil(bounds.height), pageHeight=1002;
    if(height>pageHeight*80) throw new Error('Word 内容超过80页，请先拆分文档。');
    const lines=[];
    const walker=document.createTreeWalker(article,NodeFilter.SHOW_TEXT);
    for(let node; (node=walker.nextNode());) {
      const range=document.createRange();range.selectNodeContents(node);
      for(const rect of range.getClientRects()) if(rect.height>0) lines.push({top:rect.top-bounds.top,bottom:rect.bottom-bounds.top});
    }
    for(const el of article.querySelectorAll('img,tr,h1,h2,h3')) {
      const rect=el.getBoundingClientRect();
      if(rect.height<pageHeight) lines.push({top:rect.top-bounds.top,bottom:rect.bottom-bounds.top});
    }
    let y=0,pages=0,total=0;
    while(y<height) {
      let end=Math.min(y+pageHeight,height);
      if(end<height) {
        // Prefer a break above a line/table row, without creating an empty page.
        for(let attempts=0;attempts<30;attempts++) {
          const crossing=lines.filter(r=>r.top<end&&r.bottom>end&&r.top>y+100);
          if(!crossing.length) break;
          end=Math.floor(Math.min(...crossing.map(r=>r.top)));
        }
      }
      if(++pages>80) throw new Error('Word 内容超过80页，请先拆分文档。');
      progress(Math.min(90,y/height*90),`正在生成 Word 的第 ${pages} 页 PDF…`);
      const canvas=await html2canvas(article,{backgroundColor:'#fff',scale:1.5,x:0,y,width:794,height:Math.ceil(end-y),scrollX:0,scrollY:0,logging:false,useCORS:false});
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob) throw new Error('PDF 页面生成失败。');
      total+=blob.size;if(total>64*1024*1024) throw new Error('PDF 结果超过64 MB，请减少内容。');
      const image=await pdf.embedPng(new Uint8Array(await blob.arrayBuffer()));
      const page=pdf.addPage([595.28,841.89]);
      const h=(end-y)*595.28/794;
      page.drawImage(image,{x:0,y:841.89-45-h,width:595.28,height:h});
      canvas.width=canvas.height=1;y=end;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    progress(95,'正在保存 PDF…');
    return pdf.save();
  } finally { host.remove(); }
}
