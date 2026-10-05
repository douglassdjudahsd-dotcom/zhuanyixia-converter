import {spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const env=process.env;
for(const key of ['ANDROID_HOME','ZHUANYIXIA_KEYSTORE','ZHUANYIXIA_KEY_ALIAS','ZHUANYIXIA_STORE_PASSWORD','ZHUANYIXIA_KEY_PASSWORD'])if(!env[key])throw new Error('Missing environment variable: '+key);
const version=JSON.parse(readFileSync('package.json')).version;
const tools=path.join(env.ANDROID_HOME,'build-tools',env.ANDROID_BUILD_TOOLS||'34.0.0');
mkdirSync('release',{recursive:true});
const aligned=path.resolve('release/zhuanyixia-aligned.apk'),output=path.resolve('release/zhuanyixia-v'+version+'-android.apk');
const win=process.platform==='win32';
function run(exe,args){const result=spawnSync(exe,args,{stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw new Error('APK tool failed');}
run(path.join(tools,win?'zipalign.exe':'zipalign'),['-f','4','android/app/build/outputs/apk/release/app-release-unsigned.apk',aligned]);
const java=env.JAVA_HOME?path.join(env.JAVA_HOME,'bin',win?'java.exe':'java'):'java';
const signer=path.join(tools,'lib','apksigner.jar');
run(java,['-jar',signer,'sign','--ks',env.ZHUANYIXIA_KEYSTORE,'--ks-key-alias',env.ZHUANYIXIA_KEY_ALIAS,'--ks-pass','env:ZHUANYIXIA_STORE_PASSWORD','--key-pass','env:ZHUANYIXIA_KEY_PASSWORD','--out',output,aligned]);
run(java,['-jar',signer,'verify','--verbose','--print-certs',output]);
console.log('Signed APK: '+output);
