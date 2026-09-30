import type {ClubsView,Preferences,HomeView,SessionDetailView,ReadSelection} from './sideout/read-model';
export class SideoutClientError extends Error{constructor(readonly code:string,readonly status:number,message:string){super(message)}}
export function createSideoutClient(fetcher:typeof fetch=fetch){
 async function get<T>(path:string,signal?:AbortSignal):Promise<T>{
  let r:Response;
  try{r=await fetcher(path,{credentials:'same-origin',cache:'no-store',signal})}catch(e){if(signal?.aborted)throw e;throw new SideoutClientError('NETWORK_ERROR',0,'연결을 확인하고 다시 시도해 주세요.')}
  let body:{ok?:boolean;data?:T;error?:{code:string;message:string}};
  try{body=await r.json() as typeof body}catch{throw new SideoutClientError('STORAGE_UNAVAILABLE',r.ok?503:r.status,'정보를 불러오지 못했습니다.')}
  if(!r.ok)throw new SideoutClientError(body.error?.code??'STORAGE_UNAVAILABLE',r.status,body.error?.message??'정보를 불러오지 못했습니다.');
  if(body.ok!==true||!body.data||typeof body.data!=='object')throw new SideoutClientError('STORAGE_UNAVAILABLE',503,'서비스 응답을 확인할 수 없습니다.');
  return body.data;
 }
 return {clubs:(signal?:AbortSignal)=>get<ClubsView>('/api/clubs',signal),preferences:(signal?:AbortSignal)=>get<Preferences>('/api/me/preferences',signal),home:(selection:ReadSelection,signal?:AbortSignal)=>get<HomeView>('/api/sessions?'+new URLSearchParams(selection),signal),session:(id:string,signal?:AbortSignal)=>get<SessionDetailView>('/api/sessions/'+encodeURIComponent(id),signal)};
}
export type SideoutClient=ReturnType<typeof createSideoutClient>;
export const sideoutClient=createSideoutClient();
