import './style.css';
import './mobile.css';
import { convertFile } from './convert.js';
import { android, incomingTool, readIncoming, saveAndroid } from './android.js';

const tools = [
  {id:'word-pdf',name:'Word 转 PDF',from:'DOCX',to:'PDF',group:'文档',accept:'.docx',targets:['pdf'],note:'保留基本段落、表格和图片',color:'purple'},
  {id:'pdf-word',name:'PDF 转 Word',from:'PDF',to:'DOCX',group:'文档',accept:'.pdf',targets:['docx'],note:'文字版可编辑，扫描件可识别文字',color:'red'},
  {id:'caj-word',name:'CAJ 转 Word',from:'CAJ',to:'DOCX',group:'文档',accept:'.caj,.kdh,.nh,.hn',targets:['docx','pdf','txt'],note:'支持 CAJ、HN/C8 文字与 KDH 变体',color:'orange'},
  {id:'pdf-export',name:'PDF 转图片 / 文字',from:'PDF',to:'PNG',group:'文档',accept:'.pdf',targets:['png','jpg','txt'],note:'逐页导出图片，或提取全部文字',color:'red'},
  {id:'image-pdf',name:'图片转 PDF',from:'图片',to:'PDF',group:'图片',accept:'image/jpeg,image/png,image/webp',targets:['pdf'],note:'多张图片合成一份 PDF',color:'blue'},
  {id:'image-format',name:'图片格式转换',from:'图片',to:'JPG',group:'图片',accept:'image/jpeg,image/png,image/webp',targets:['jpg','png','webp'],note:'JPG、PNG、WebP 互转',color:'blue'},
  {id:'image-word',name:'图片文字识别',from:'图片',to:'DOCX',group:'图片',accept:'image/jpeg,image/png,image/webp',targets:['docx','txt'],note:'识别中英文，导出可编辑文档',color:'blue'},
  {id:'word-export',name:'Word 转文字 / 网页',from:'DOCX',to:'TXT',group:'文档',accept:'.docx',targets:['txt','html'],note:'提取 Word 的文字或转为 HTML',color:'purple'},
  {id:'text-word',name:'文字转 Word / PDF',from:'TXT',to:'DOCX',group:'文档',accept:'.txt,.md',targets:['docx','pdf'],note:'保留段落，生成文档或 PDF',color:'purple'},
  {id:'sheet-format',name:'表格格式转换',from:'表格',to:'XLSX',group:'表格',accept:'.xlsx,.xls,.csv,.json',targets:['xlsx','csv','json'],note:'Excel、CSV、JSON 互转',color:'green'},
];
const app=document.querySelector('#app');
app.innerHTML=`<header class="top"><div class="brand"><span class="brand-mark">转</span><div><strong>转一下</strong><span>手机文件转换</span></div></div><button id="install-help" class="plain">添加到桌面</button></header>
<main><div class="intro"><div><p class="eyebrow">文件，换个格式</p><h1>选文件，轻松转换。</h1></div><span class="local-label">手机本地处理</span></div>
<div class="workspace"><section class="tool-pane"><div class="section-title"><h2>转换工具</h2><span>10 个常用工具</span></div><div class="tabs" role="tablist" aria-label="工具类型">${['全部','文档','图片','表格'].map((x,i)=>`<button role="tab" aria-selected="${!i}" data-group="${x}">${x}</button>`).join('')}</div><div class="tool-grid" id="tool-grid"></div><p class="privacy">你的文件只在当前设备处理，不上传到转换服务器。</p></section>
<section class="convert-pane"><div class="section-title"><h2 id="active-title">PDF 转 Word</h2><span class="step-label">01 / 选择文件</span></div><label class="drop-zone" id="drop-zone"><input id="file-input" type="file" multiple accept=".pdf"><span class="upload-symbol" aria-hidden="true">+</span><strong>点这里选择文件</strong><span id="accept-note">PDF · 每个文件最多 30 MB</span><small>也可以将文件拖到这里</small></label><div id="queue" class="queue"></div>
<div class="options"><label>转换为<select id="target"><option value="docx">Word 文档（.docx）</option></select></label><label id="layout-wrap">Word 内容<select id="layout"><option value="editable">可编辑文字</option><option value="visual">保留页面外观（图片）</option></select></label><label class="checkbox" id="ocr-wrap"><input id="ocr" type="checkbox" checked><span>扫描件自动识别中英文</span></label></div><p class="tool-note" id="tool-note"></p><div class="job-status" id="job-status" aria-live="polite"></div><progress id="progress" max="100" value="0" hidden></progress><button id="convert" class="primary" disabled>选择文件后开始转换</button><div class="results" id="results"></div></section></div>
<details class="guide"><summary>支持范围与手机使用说明</summary><div><p><b>PDF / CAJ 转 Word：</b>可编辑模式提取文字，不保留原图表，复杂表格、公式、分栏需要调整。页面外观模式将原页作为图片放入 Word，文字不可直接编辑。</p><p><b>CAJ：</b>支持嵌入 PDF 的 CAJ、KDH，以及 HN/C8 文字层。部分专有压缩图片、加密或损坏变体暂不支持；遇到这些文件会明确提示。可先从 CAJViewer 导出 PDF 再转换。</p><p><b>手机：</b>推荐单次处理 1–5 个文件。PDF 最多80页；扫描识别会较慢。${android?'安卓安装包内已包含识别模型。':'首次使用识别功能需要联网下载识别模型。'}</p><p><b>图片与表格：</b>支持 JPG、PNG、WebP；Excel/CSV/JSON，CSV/JSON 导出使用第一张工作表。Word 输入支持 .docx。</p></div></details><footer>转换完成后请保存文件，关闭页面会清除本次结果。${!android?'<p><a href="https://github.com/douglassdjudahsd-dotcom/zhuanyixia-converter/releases/latest">下载安卓 APK</a></p>':''}</footer></main>
<dialog id="help-dialog"><h2>把“转一下”放到桌面</h2><p><b>iPhone：</b>用 Safari 打开，在“分享”菜单选择“添加到主屏幕”。</p><p><b>安卓：</b>用 Chrome 打开，在菜单选择“添加到主屏幕”或“安装应用”。</p><p>首次打开需要网络。文件在手机本地转换；文字识别模型首次使用时下载。</p><button id="close-help" class="primary">知道了</button></dialog>`;

let active=tools.find(t=>t.id==='pdf-word'),filter='全部',files=[],busy=false,results=[];
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={docx:'Word 文档（.docx）',pdf:'PDF 文档（.pdf）',txt:'纯文字（.txt）',html:'网页（.html）',png:'PNG 图片（.png）',jpg:'JPG 图片（.jpg）',webp:'WebP 图片（.webp）',xlsx:'Excel 表格（.xlsx）',csv:'CSV 表格（.csv）',json:'JSON 数据（.json）'};
function renderTools(){ $('tool-grid').innerHTML=tools.filter(t=>filter==='全部'||t.group===filter).map(t=>`<button class="tool-card ${active.id===t.id?'selected':''}" data-tool="${t.id}" aria-pressed="${active.id===t.id}" ${busy?'disabled':''}><span class="format-pair"><span class="badge ${t.color}">${t.from}</span><span class="divider">/</span><span class="format-to">${t.to}</span></span><strong>${t.name}</strong><small>${t.note}</small>${active.id===t.id?'<span class="selected-dot" aria-hidden="true"></span>':''}</button>`).join(''); }
function selectTool(id){if(busy||id===active.id)return;active=tools.find(t=>t.id===id)||active;files=[];clearResults();$('mobile-tool').value=active.id;$('file-input').value='';$('file-input').accept=active.accept;$('active-title').textContent=active.name;$('accept-note').textContent=active.from+' · 每个文件最多 30 MB';$('target').innerHTML=active.targets.map(t=>`<option value="${t}">${names[t]}</option>`).join('');updateOptions();renderTools();renderQueue();}
function updateOptions(){let word=['pdf-word','caj-word'].includes(active.id)&&$('target').value==='docx';$('layout-wrap').hidden=!word;$('ocr-wrap').hidden=!['pdf-word','pdf-export'].includes(active.id);$('tool-note').textContent=active.id==='word-pdf'?'支持 .docx；保留基本段落、表格和图片，按 A4 重排。复杂页眉页脚、分栏和公式可能改变，PDF 页面为图片。':active.id==='caj-word'?'CAJ 按内部结构识别。HN/C8 转 Word 和文字以文字层为主，专有压缩图片可能无法还原。':active.id==='image-pdf'?'所选图片会按选择顺序合成一份 PDF。':active.id==='sheet-format'?'CSV / JSON 只导出第一张工作表；JSON 输入请使用对象数组。':'每个文件生成独立结果。可编辑模式尽量保留文字段落，复杂排版需要调整。';}
function renderQueue(){ $('queue').innerHTML=files.map((f,i)=>`<div class="file-row"><span class="file-type">${escape(f.name.split('.').pop().toUpperCase())}</span><div><strong>${escape(f.name)}</strong><small>${(f.size/1024/1024).toFixed(2)} MB</small></div><button data-remove="${i}" aria-label="移除 ${escape(f.name)}" ${busy?'disabled':''}>×</button></div>`).join('');$('convert').disabled=busy||!files.length;$('convert').textContent=busy?'正在转换，请保持页面打开':files.length?`开始转换${files.length>1?' · '+files.length+' 个文件':''}`:'选择文件后开始转换'; }
function addFiles(list){if(busy)return;const allowed=active.accept.split(',');for(const f of list){if(f.size>30*1024*1024){status(f.name+' 超过30 MB，请使用较小文件。',true);continue;}if(!allowed.some(a=>a.startsWith('.')?f.name.toLowerCase().endsWith(a):f.type===a)){status('请选择 '+active.from+' 格式的文件。',true);continue;}if(files.length>=5){status('一次最多选择5个文件。',true);break;}files.push(f);}renderQueue();}
function status(text,error=false){$('job-status').textContent=text;$('job-status').classList.toggle('error',error);}
function clearResults(){for(const r of results)URL.revokeObjectURL(r.url);results=[];$('results').replaceChildren();status('');$('progress').hidden=true;}
function renderResults(){ $('results').innerHTML=results.map((r,i)=>r.failed?`<article class="result failed"><div><strong>${escape(r.name)}</strong><small>${escape(r.warning)}</small></div></article>`:`<article class="result"><span class="done-icon" aria-hidden="true">✓</span><div><strong>${escape(r.name)}</strong><small>${r.warning?escape(r.warning):'转换完成 · '+(r.blob.size/1024).toFixed(0)+' KB'}</small></div>${android?`<button class="plain" data-native-save="${i}">保存文件</button>`:`<a href="${r.url}" download="${escape(r.name)}">下载</a>`}${!android&&navigator.share?`<button class="plain save-share" data-share="${i}">保存</button>`:''}</article>`).join(''); }
async function start(){if(busy||!files.length)return;clearResults();busy=true;renderQueue();renderTools();$('file-input').disabled=true;$('target').disabled=true;$('layout').disabled=true;$('ocr').disabled=true;$('progress').hidden=false;let succeeded=0;try{const tasks=active.id==='image-pdf'?[files]:files.map(f=>[f]);for(let i=0;i<tasks.length;i++){try{const converted=await convertFile(tasks[i],{tool:active.id,target:$('target').value,layout:$('layout').value,ocr:$('ocr').checked},(p,m)=>{$('progress').value=(i+p/100)/tasks.length*100;status(m);});for(const r of converted){results.push({...r,url:URL.createObjectURL(r.blob)});}succeeded++;renderResults();}catch(e){const label=tasks[i][0].name;results.push({name:label,blob:new Blob(),url:'',warning:e.message||'文件无法转换',failed:true});$('results').insertAdjacentHTML('beforeend',`<article class="result failed"><div><strong>${escape(label)}</strong><small>${escape(e.message||'文件无法转换')}</small></div></article>`);}}$('progress').value=100;status(succeeded?`已完成 ${succeeded} / ${tasks.length} 项，请下载或保存结果。`:'转换未完成，请查看文件提示。',!succeeded);}finally{busy=false;$('file-input').disabled=false;$('target').disabled=false;$('layout').disabled=false;$('ocr').disabled=false;renderQueue();renderTools();receiveAndroid();}}
document.addEventListener('click',e=>{const tool=e.target.closest('[data-tool]');if(tool)selectTool(tool.dataset.tool);const remove=e.target.closest('[data-remove]');if(remove&&!busy){files.splice(+remove.dataset.remove,1);renderQueue();}const group=e.target.closest('[data-group]');if(group){filter=group.dataset.group;document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-selected',b===group));renderTools();}});
$('file-input').addEventListener('change',e=>{addFiles(e.target.files);e.target.value='';});$('target').addEventListener('change',updateOptions);$('convert').addEventListener('click',start);$('drop-zone').addEventListener('dragover',e=>{e.preventDefault();$('drop-zone').classList.add('dragging');});$('drop-zone').addEventListener('dragleave',()=>{$('drop-zone').classList.remove('dragging');});$('drop-zone').addEventListener('drop',e=>{e.preventDefault();$('drop-zone').classList.remove('dragging');addFiles(e.dataTransfer.files);});$('install-help').onclick=()=> $('help-dialog').showModal();$('close-help').onclick=()=> $('help-dialog').close();
document.addEventListener('click',async e=>{const b=e.target.closest('[data-share]');if(!b)return;const r=results[+b.dataset.share];try{const file=new File([r.blob],r.name,{type:r.blob.type});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file]});else status('这个浏览器不支持文件分享，请点击“下载”。');}catch(err){if(err.name!=='AbortError')status('保存未完成，请改用下载。',true);}});
const mobileTool=document.createElement('label');mobileTool.className='mobile-tool';mobileTool.innerHTML=`转换工具<select id="mobile-tool" aria-label="转换工具">${tools.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select>`;$('active-title').closest('.section-title').after(mobileTool);$('mobile-tool').onchange=e=>selectTool(e.target.value);
renderTools();updateOptions();renderQueue();

if(document.modelContext?.registerTool){const lifecycle=new AbortController();for(const tool of [
  {name:'list_conversion_tools',title:'查看转换工具',description:'列出本工具实际支持的输入和输出格式。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>({tools:tools.map(t=>({id:t.id,name:t.name,accept:t.accept,targets:t.targets})),selected:active.id})},
  {name:'select_conversion_tool',title:'选择转换工具',description:'在页面上选择转换方式，清空当前文件选择与本次结果。文件转换需要用户选择文件后开始。',inputSchema:{type:'object',properties:{tool_id:{type:'string',enum:tools.map(t=>t.id)}},required:['tool_id'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(!input||!tools.some(t=>t.id===input.tool_id)||Object.keys(input).length!==1)throw new Error('Unknown conversion tool');if(busy)throw new Error('Conversion in progress');selectTool(input.tool_id);return {selected:active.id,name:active.name,accept:active.accept};}}
]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
if(!android&&'serviceWorker' in navigator&&import.meta.env.PROD)navigator.serviceWorker.register(new URL('../sw.js',import.meta.url)).catch(()=>{});

function receiveAndroid(){
  if(busy)return;
  readIncoming(file=>{
    const tool=incomingTool(file);
    if(!tool){status('不支持 '+file.name+' 的格式。旧版 .doc 请先另存为 .docx。',true);return;}
    if(files.length&&!active.accept.split(',').some(a=>a.startsWith('.')?file.name.toLowerCase().endsWith(a):file.type===a)){status('收到 '+file.name+'，格式与当前队列不同，请先处理当前文件，再从微信发送此文件。',true);return;}
    if(!files.length)selectTool(tool);const before=files.length;addFiles([file]);if(files.length===before)return;
    status('已接收 '+file.name+'。请选择输出格式并开始转换。');
  },message=>status(message,true));
}
if(android){
  $('install-help').textContent='微信文件';
  $('help-dialog').innerHTML='<h2>转换微信聊天里的文件</h2><p>在微信聊天中打开文件，点右上角菜单，选择“用其他应用打开”或“分享”，再选择“转一下”。不同微信版本的菜单名称可能不同。</p><p>也可以先把文件保存到手机，然后在这里点“选择文件”。支持 PDF、CAJ/KDH/NH/HN、DOCX、图片、文字和表格。</p><p>文件在手机内处理，识别模型已包含在安装包内。转换完成后点“保存文件”，选择手机文件夹。</p><button id="close-native-help" class="primary">知道了</button>';
  $('close-native-help').onclick=()=> $('help-dialog').close();
  window.addEventListener('android-files',receiveAndroid);
  window.addEventListener('android-error',e=>status(e.detail.message,true));
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-native-save]');if(!button)return;
    const result=results[+button.dataset.nativeSave];if(!result)return;
    button.disabled=true;
    try {const saved=await saveAndroid(result);status(saved.ok?'文件已保存到你选择的位置。':saved.error,!saved.ok);}catch(error){status(error.message,true);}finally{button.disabled=false;}
  });
  const guide=document.querySelector('.guide');
  guide.insertAdjacentHTML('beforeend','<p>安卓安装包已包含识别模型，可离线转换。微信文件请通过“用其他应用打开 / 分享”导入，不会扫描聊天记录。</p>');
  receiveAndroid();
}
