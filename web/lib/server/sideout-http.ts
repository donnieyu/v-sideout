import {SideoutError,unavailable,invalid} from '../sideout/errors';
import {parseReadSelection} from '../sideout/calendar';
import {requireBusinessPrincipal} from './business-principal';
import {getClubsView,getHomeView,getSessionView,type SideoutDependencies} from './sideout-query';
export type ReadResource='clubs'|'preferences'|'sessions'|'session';
export function errorResponse(error:unknown):Response {
 const e=error instanceof SideoutError?error:unavailable();
 return Response.json({ok:false,error:{code:e.code,message:e.message}},{status:e.status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
}
export async function handleSideoutRead(request:Request,resource:ReadResource,deps:SideoutDependencies,id?:string):Promise<Response>{
 try{
  const p=await requireBusinessPrincipal(request,deps.authRepo,deps.now());
  if(resource==='session'&&(!id||id.length>128))throw invalid();
  const data=resource==='clubs'?await getClubsView(p,deps.store,deps.now()):resource==='preferences'?await deps.store.getPreferences(p.memberId):resource==='sessions'?await getHomeView(p,parseReadSelection(new URL(request.url),deps.now()),deps):await getSessionView(p,id!,deps);
  const current=await requireBusinessPrincipal(request,deps.authRepo,deps.now());
  if(current.memberId!==p.memberId||current.authorizationVersion!==p.authorizationVersion)throw new SideoutError('UNAUTHENTICATED',401,'접속 권한이 변경되었습니다. 다시 로그인해 주세요.');
  return Response.json({ok:true,data},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
 }catch(e){return errorResponse(e)}
}
