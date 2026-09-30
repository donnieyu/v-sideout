import {build} from 'esbuild';
import {getPlatformProxy} from 'wrangler';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {finishBootstrap} from './bootstrap-first-master-output.mjs';

function options(args){
 const values={};
 for(let i=0;i<args.length;i+=2){
  const key=args[i];
  if(!['--login-id','--display-name','--state-path'].includes(key)||!args[i+1]||values[key]){
   throw new Error('사용법: node scripts/bootstrap-first-master-local.mjs --login-id <아이디> --display-name <이름> --state-path <로컬 D1 경로>');
  }
  values[key]=args[i+1];
 }
 if(!values['--login-id']||!values['--display-name']||!values['--state-path']){
  throw new Error('아이디, 표시 이름, 로컬 D1 경로가 모두 필요합니다.');
 }
 return values;
}

async function main(){
 const input=options(process.argv.slice(2));
 const bundled=await build({stdin:{
  contents:"export {bootstrapFirstMaster} from './lib/auth/member-http.ts'; export {makeMemberRepository} from './lib/auth/member-repository.ts';",
  resolveDir:fileURLToPath(new URL('../',import.meta.url)),sourcefile:'bootstrap-entry.ts',loader:'ts',
 },bundle:true,platform:'node',format:'esm',write:false});
 const {bootstrapFirstMaster,makeMemberRepository}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
 const proxy=await getPlatformProxy({configPath:resolve('dist/server/wrangler.json'),persist:{path:join(resolve(input['--state-path']),'v3')},remoteBindings:false,envFiles:[]});
 let result;
 try{
  if(!proxy.env.DB)throw new Error('로컬 D1 바인딩 DB를 찾을 수 없습니다.');
  result=await bootstrapFirstMaster(makeMemberRepository(proxy.env.DB),{exists:async()=>{throw new Error('첫 마스터는 모임에 속하지 않습니다.')}},
   {loginId:input['--login-id'],displayName:input['--display-name']});
 }catch(error){await proxy.dispose().catch(()=>{});throw error}
 if(!await finishBootstrap(result,()=>proxy.dispose()))process.exitCode=2;
}

try{await main()}catch(error){
 const message=error instanceof Error?error.message:'알 수 없는 오류';
 process.stderr.write(`최초 마스터 설정 실패: ${message}\n`);
 process.exitCode=1;
}
