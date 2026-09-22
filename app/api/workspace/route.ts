import { env } from 'cloudflare:workers';
import { seedWorkspace, projection, upgradeWorkspace, EXAMPLE_CLUBS, type Workspace, type Role, type Account, DEMO_MEMBER } from '@/lib/model';
import { operate, AppError } from '@/lib/operations';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
// Owner-private review workspace. Demo role switching is not production authentication.
function scope(request:Request){const q=new URL(request.url).searchParams,role=q.get('role')??'member',club=q.get('club')??'seoul-demo';if(!['master','chair','staff','member'].includes(role)||!EXAMPLE_CLUBS.some(c=>c.id===club))throw new AppError('모임과 역할을 확인해 주세요.');return {role:role as Role,club,id:`${club}-v1`}}
async function readRow<T>(id:string,seed:T){
 if(!env.DB)throw new Error('D1 is not bound');
 await env.DB.prepare('INSERT OR IGNORE INTO workspaces (id,payload,revision) VALUES (?,?,0)').bind(id,JSON.stringify(seed)).run();
 const row=await env.DB.prepare('SELECT payload, revision FROM workspaces WHERE id=?').bind(id).first<{payload:string;revision:number}>();
 if(!row)throw new Error('Workspace unavailable');return {data:JSON.parse(row.payload) as T,revision:row.revision};
}
async function read(club:string){
 const row=await readRow<Workspace>(`${club}-v1`,seedWorkspace(new Date(),club));
 const account=await readRow<Account>('sideout-demo-account-v1',{name:'김나래',bio:''});
 const workspace=upgradeWorkspace(row.data,club);const me=workspace.members.find(m=>m.id===DEMO_MEMBER);if(me)me.name=account.data.name;
 return {workspace,revision:row.revision,account};
}
function view(row:Awaited<ReturnType<typeof read>>,role:Role){return {...projection(row.workspace,role,DEMO_MEMBER,row.revision),account:row.account.data,accountRevision:row.account.revision}}
function fail(error:unknown){if(error instanceof AppError)return json({error:error.message},error.status);console.error('workspace request failed',error);return json({error:'저장소에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},503)}
export async function GET(request:Request){try{const {role,club}=scope(request);return json(view(await read(club),role))}catch(e){return fail(e)}}
export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'요청 출처를 확인해 주세요.'},403);
 const {role,club,id}=scope(request),text=await request.text();if(text.length>20000)throw new AppError('입력 내용이 너무 길어요.');
 let body;try{body=JSON.parse(text)}catch{throw new AppError('요청 내용을 확인해 주세요.')}
 if(!body||typeof body!=='object'||!body.action||typeof body.action.type!=='string')throw new AppError('요청 내용을 확인해 주세요.');
 const row=await read(club);
 if(body.action.type==='account'){
  const {name,bio}=body.action;if(typeof name!=='string'||!name.trim()||name.length>30||typeof bio!=='string'||bio.length>300)throw new AppError('이름과 소개를 확인해 주세요.');
  if(body.accountRevision!==row.account.revision)throw new AppError('계정 정보가 먼저 변경되었어요. 새로고침 후 다시 시도해 주세요.',409);
  const result=await env.DB!.prepare('UPDATE workspaces SET payload=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify({name:name.trim(),bio:bio.trim()}),'sideout-demo-account-v1',row.account.revision).run();
  if(result.meta.changes!==1)throw new AppError('다른 변경이 먼저 저장되었어요.',409);return json(view(await read(club),role));
 }
 if(body.revision!==row.revision)throw new AppError('다른 변경이 먼저 저장되었어요. 새로고침 후 다시 시도해 주세요.',409);
 const updated=operate(row.workspace,body.action,role);
 const result=await env.DB!.prepare('UPDATE workspaces SET payload=?, revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(updated),id,row.revision).run();
 if(result.meta.changes!==1)throw new AppError('다른 변경이 먼저 저장되었어요. 새로고침 후 다시 시도해 주세요.',409);
 return json(view({...row,workspace:updated,revision:row.revision+1},role));
 }catch(e){return fail(e)}}
