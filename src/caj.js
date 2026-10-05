import { unzlibSync } from 'fflate';

// Format research: caj2pdf/caj2pdf (GLWTPL). HN text-record adaptation:
// Copyright 2021 Hin-Tak Leung, FreeType Project License. See THIRD_PARTY.md.
const latin=new TextDecoder('latin1');
const gbk=new TextDecoder('gbk',{fatal:false});
const byteString=a=>{let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return s;};
const ascii=s=>Uint8Array.from(s,c=>c.charCodeAt(0)&255);
function requireRange(a,start,length){if(!Number.isInteger(start)||start<0||length<0||start+length>a.length)throw new Error('CAJ 文件结构不完整或已损坏。');}
const i32=(a,p)=>{requireRange(a,p,4);return new DataView(a.buffer,a.byteOffset+p,4).getInt32(0,true);};
const u16=(a,p)=>{requireRange(a,p,2);return a[p]|a[p+1]<<8;};
function pagesCheck(n){if(n<1||n>80)throw new Error('当前手机版支持1–80页，请先拆分较长文档。');}

export function detectCaj(a){const sig=byteString(a.subarray(0,4));if(sig==='%PDF')return 'PDF';if(sig.startsWith('CAJ'))return 'CAJ';if(sig==='KDH ')return 'KDH';if(sig.startsWith('HN'))return 'HN';if(a[0]===0xc8)return 'C8';throw new Error('这个 CAJ 内部格式暂不支持。请先用 CAJViewer 导出 PDF，再选择 PDF 转 Word。');}

export function repairCajPdf(a){
  pagesCheck(i32(a,0x10));const pointer=i32(a,0x14),start=i32(a,pointer);requireRange(a,start,1);
  const raw=byteString(a.subarray(start)),headers=[...raw.matchAll(/(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b/g)];
  if(!headers.length||headers.length>30000)throw new Error('未能读取 CAJ 内嵌的 PDF 对象。');
  const objects=new Map();
  for(const h of headers){const end=raw.indexOf('endobj',h.index+h[0].length);if(end<0)continue;const id=Number(h[1]);if(id>1000000)throw new Error('CAJ 对象编号异常。');objects.set(id,{gen:Number(h[2]),body:raw.slice(h.index+h[0].length,end).trim()});}
  const leaf=[...objects].filter(([,o])=>/\/Type\s*\/Page\b/.test(o.body));if(!leaf.length)throw new Error('CAJ 中未找到 PDF 页面。');
  let max=Math.max(...objects.keys()),root=null;
  const parentRe=/\/Parent\s+(\d+)\s+\d+\s+R/;
  const missing=new Set([...objects.values()].flatMap(o=>{const p=o.body.match(parentRe);return p&&!objects.has(+p[1])?[+p[1]]:[];}));
  for(const id of missing){const children=[...objects].filter(([,o])=>Number(o.body.match(parentRe)?.[1])===id);objects.set(id,{gen:0,body:`<< /Type /Pages /Kids [${children.map(([n,o])=>`${n} ${o.gen} R`).join(' ')}] /Count ${i32(a,0x10)} >>`});max=Math.max(max,id);}
  const roots=[...objects].filter(([,o])=>/\/Type\s*\/Pages\b/.test(o.body)&&!parentRe.test(o.body));
  const catalog=[...objects].find(([,o])=>/\/Type\s*\/Catalog\b/.test(o.body));
  if(catalog){root=catalog[0];}else{
    let pageRoot;if(roots.length===1){pageRoot=roots[0][0];}else{pageRoot=++max;const children=roots.length?roots:leaf;objects.set(pageRoot,{gen:0,body:`<< /Type /Pages /Kids [${children.map(([n,o])=>`${n} ${o.gen} R`).join(' ')}] /Count ${leaf.length} >>`});}
    root=++max;objects.set(root,{gen:0,body:`<< /Type /Catalog /Pages ${pageRoot} 0 R >>`});
  }
  let out='%PDF-1.7\n%\xff\xff\xff\xff\n';const offsets=new Map();
  for(const [id,o] of objects){offsets.set(id,{offset:out.length,gen:o.gen});out+=`${id} ${o.gen} obj\n${o.body}\nendobj\n`;}
  const xref=out.length;out+='xref\n0 1\n0000000000 65535 f \n';
  for(const [id,o] of offsets)out+=`${id} 1\n${String(o.offset).padStart(10,'0')} ${String(o.gen).padStart(5,'0')} n \n`;
  out+=`trailer\n<< /Size ${max+1} /Root ${root} ${objects.get(root).gen} R >>\nstartxref\n${xref}\n%%EOF\n`;
  return ascii(out);
}

function hnText(a,old){let p=0,text='';const decode=(lo,hi)=>{const code=hi*256+lo;const special={0xa389:'\t',0xa38a:'\n',0xa38d:'\r',0xa3a0:' '};if(special[code])return special[code];if(!hi&&lo<128)return String.fromCharCode(lo);return gbk.decode(new Uint8Array([hi,lo]));};
  while(p<=a.length-2){const code=u16(a,p);p+=2;if(code===0x800a){p+=26;}else if(!old&&code===0x8001){if(p+5>=a.length)break;text+=decode(a[p+4],a[p+5]);p+=6;}else if(old&&(code===0x8001||code===0x8070)){p+=2;if(code===0x8001)text+='\n';while(p+3<a.length&&a[p+1]!==0x80){text+=decode(a[p+2],a[p+3]);p+=4;}}else p+=2;}
  return text.replace(/\u0000/g,'').replace(/\r\n?/g,'\n').trim();
}

export function readHn(a,type){
  const count=i32(a,type==='C8'?8:0x90);pagesCheck(count);let table;
  if(type==='C8')table=0x50;else if(a[4]===0xc8&&a[5]===0)table=0xd8;else{const toc=i32(a,0x158);if(toc<0||toc>5000)throw new Error('CAJ 目录结构异常。');table=0x15c+0x134*toc;}
  requireRange(a,table,count*20);const pages=[];let ignoredImages=0;
  for(let n=0;n<count;n++){const at=table+n*20,start=i32(a,at),length=i32(a,at+4),images=u16(a,at+8),next=i32(a,at+16);requireRange(a,start,length);let data=a.subarray(start,start+length);let comp=byteString(data.subarray(0,12))==='COMPRESSTEXT'?0:byteString(data.subarray(8,20))==='COMPRESSTEXT'?8:-1;
    if(comp>=0){const expected=i32(data,comp+12);if(expected<0||expected>32*1024*1024)throw new Error('CAJ 的压缩文字层过大或已损坏。');const out=new Uint8Array(expected);data=unzlibSync(data.subarray(comp+16),{out});if(data.length!==expected)throw new Error('CAJ 文字层解压失败。');}
    const text=hnText(data,next>start);ignoredImages+=images;pages.push({text,page:n+1});
  }
  if(!pages.some(p=>p.text.replace(/\s/g,'').length))throw new Error('这个 HN/C8 文件没有可读取的文字层，手机版暂不支持其专有压缩图片。请从 CAJViewer 导出 PDF 后再转换。');
  return {kind:'text',pages,warning:ignoredImages?`已读取 ${count} 页文字；${ignoredImages} 个专有图像块未还原，请核对图表。`:'HN/C8 文字版：提取文字段落，不保留原页面排版。'};
}

export function readCaj(buffer){const a=new Uint8Array(buffer);const type=detectCaj(a);if(type==='PDF')return{kind:'pdf',data:a,type};if(type==='CAJ')return{kind:'pdf',data:repairCajPdf(a),type};if(type==='KDH'){requireRange(a,254,1);const key=ascii('FZHMEI');const out=Uint8Array.from(a.subarray(254),(b,i)=>b^key[i%key.length]);const raw=byteString(out),end=raw.lastIndexOf('%%EOF');if(end<0)throw new Error('KDH 内嵌 PDF 未能读取。');return {kind:'pdf',data:out.subarray(0,end+5),type};}return{...readHn(a,type),type};}
