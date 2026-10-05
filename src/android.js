export const android = typeof window !== 'undefined' && !!window.AndroidConverter;
const bridge = () => window.AndroidConverter;
let importing=false, readAgain=false, saving=false;
const waiters=new Map();
if(android) window.addEventListener('android-save',e=>{
  const waiter=waiters.get(e.detail?.id);if(!waiter)return;
  waiters.delete(e.detail.id);waiter(e.detail);
});
export function incomingTool(file) {
  const ext=file.name.toLowerCase().split('.').pop();
  if(['caj','kdh','nh','hn'].includes(ext))return 'caj-word';
  if(ext==='pdf'||file.type==='application/pdf')return 'pdf-word';
  if(ext==='docx')return 'word-pdf';
  if(['txt','md'].includes(ext))return 'text-word';
  if(['xlsx','xls','csv','json'].includes(ext))return 'sheet-format';
  if(['jpg','jpeg','png','webp'].includes(ext))return 'image-pdf';
  return null;
}
export async function readIncoming(onFile,onError) {
  if(!android)return;
  if(importing){readAgain=true;return;}
  importing=true;
  try {
    for(const item of JSON.parse(bridge().takeIncomingFiles())) {
      try {
        const url=new URL(item.url);
        if(url.origin!==location.origin||!url.pathname.startsWith('/imports/'))throw new Error('文件接收地址无效。');
        const response=await fetch(url);if(!response.ok)throw new Error('无法读取收到的文件，请从微信重新发送。');
        const blob=await response.blob();
        if(blob.size>30*1024*1024)throw new Error('收到的文件超过30 MB。');
        await onFile(new File([blob],item.name,{type:item.mime}));
      } catch(error){onError(error.message);}
      finally {bridge().releaseImport(item.id);}
    }
    if(bridge().takeIncomingErrors)for(const message of JSON.parse(bridge().takeIncomingErrors()))onError(message);
  } catch(error){onError(error.message||'接收文件失败。');}
  finally {importing=false;if(readAgain){readAgain=false;readIncoming(onFile,onError);}}
}
const dataUrl=blob=>new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('读取转换结果失败。'));reader.readAsDataURL(blob);
});
export async function saveAndroid(result) {
  if(saving)throw new Error('请先完成当前文件的保存。');
  saving=true;let id;
  try {
    id=bridge().beginExport(result.name,result.blob.type,result.blob.size);
    if(!id)throw new Error('无法保存文件，请先完成当前保存，或减少结果大小。');
    let index=0;
    for(let offset=0;offset<result.blob.size;offset+=48*1024) {
      const chunk=await dataUrl(result.blob.slice(offset,offset+48*1024));
      if(!bridge().appendExport(id,index++,chunk))throw new Error('保存文件中断，请重试。');
    }
    const saved=new Promise(resolve=>waiters.set(id,resolve));
    if(!bridge().finishExport(id))throw new Error('保存文件准备失败，请重试。');
    return await saved;
  } finally {if(id){waiters.delete(id);bridge().cancelExport(id);}saving=false;}
}
