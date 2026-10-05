import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const folder=mkdtempSync(path.join(tmpdir(),'zhuanyixia-file-rules-'));
const code=`import io.github.douglassdjudahsd.zhuanyixia.FileRules;
import java.io.*;
public class FileRulesCheck {
 public static void main(String[] args) throws Exception {
  if (!FileRules.safeName("../微信\\\\样例.docx").equals(".._微信_样例.docx")) throw new AssertionError("Filename sanitizing");
  if (!FileRules.mime("微信.DOCX","application/octet-stream").contains("wordprocessingml")) throw new AssertionError("Wechat generic MIME");
  if (!FileRules.mime("图片.JPEG",null).equals("image/jpeg")) throw new AssertionError("Image MIME");
  ByteArrayOutputStream out=new ByteArrayOutputStream();
  if (FileRules.copyBounded(new ByteArrayInputStream(new byte[100]),out,100)!=100) throw new AssertionError("Exact limit");
  boolean blocked=false;try {FileRules.copyBounded(new ByteArrayInputStream(new byte[101]),new ByteArrayOutputStream(),100);} catch(IOException e){blocked=true;}
  if (!blocked) throw new AssertionError("Oversized stream must be blocked regardless of metadata");
  String name=FileRules.safeName("a".repeat(300)+".docx");if(name.length()>200||!name.endsWith(".docx")) throw new AssertionError("Long extension preserved");
  System.out.println("Android file names, MIME and bounded stream checks passed.");
 }
}`;
try {
 const file=path.join(folder,'FileRulesCheck.java');writeFileSync(file,code);
 for(const [exe,args] of [['javac',['-encoding','UTF-8','-d',folder,'android/app/src/main/java/io/github/douglassdjudahsd/zhuanyixia/FileRules.java',file]],['java',['-cp',folder,'FileRulesCheck']]]) {
  const run=spawnSync(exe,args,{stdio:'inherit'});if(run.error)throw run.error;if(run.status!==0)process.exitCode=run.status;
 }
} finally {rmSync(folder,{recursive:true,force:true});}
