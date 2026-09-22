import { env } from 'cloudflare:workers';
import { seedWorkspace, projection, type Workspace, type Role, DEMO_MEMBER } from '@/lib/model';
import { operate, AppError } from '@/lib/operations';
export const dynamic='force-dynamic';
const id='seoul-demo-v1';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
// Private sample workspace only. Role switching is a review tool, not account authentication.
// Production member accounts and server-authenticated role assignments belong to phase two.
function roleOf(request:Request):Role {const role=new URL(request.url).searchParams.get('role')??'member';if(!['master','chair','staff','member'].includes(role))throw new AppError('역할을 확인해 주세요.');return role as Role}
async function read(){
 if(!env.DB)throw new Error('D1 is not bound');
 await env.DB.prepare('INSERT OR IGNORE INTO workspaces (id,payload,revision) VALUES (?,?,0)').bind(id,JSON.stringify(seedWorkspace())).run();
 const row=await env.DB.prepare('SELECT payload, revision FROM workspaces WHERE id=?').bind(id).first<{payload:string;revision:number}>();
 if(!row)throw new Error('Workspace unavailable');return {workspace:JSON.parse(row.payload) as Workspace,revision:row.revision};
}
function fail(error:unknown){if(error instanceof AppError)return json({error:error.message},error.status);console.error('workspace request failed',error);return json({error:'저장소에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},503)}
export async function GET(request:Request){try{const role=roleOf(request),row=await read();return json(projection(row.workspace,role,DEMO_MEMBER,row.revision));}catch(e){return fail(e)}}
export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'요청 출처를 확인해 주세요.'},403);
 const role=roleOf(request);const bodyText=await request.text();if(bodyText.length>20000)throw new AppError('입력 내용이 너무 길어요.');
 let body;try{body=JSON.parse(bodyText)}catch{throw new AppError('요청 내용을 확인해 주세요.')}
 if(!body||typeof body!=='object'||!body.action||typeof body.action.type!=='string')throw new AppError('요청 내용을 확인해 주세요.');
 const row=await read();if(body.revision!==row.revision)throw new AppError('다른 변경이 먼저 저장되었어요. 새로고침 후 다시 시도해 주세요.',409);
 const updated=operate(row.workspace,body.action,role);
 const result=await env.DB!.prepare('UPDATE workspaces SET payload=?, revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(updated),id,row.revision).run();
 if(result.meta.changes!==1)throw new AppError('다른 변경이 먼저 저장되었어요. 새로고침 후 다시 시도해 주세요.',409);
 return json(projection(updated,role,DEMO_MEMBER,row.revision+1));
 }catch(e){return fail(e)}}
