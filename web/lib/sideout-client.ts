import type {TeamUnpublishInput} from './sideout/team-unpublish';
import type {MatchEditorView,MatchSaveInput} from './sideout/match-editor';
import type {TeamEditorView} from './sideout/team-editor';
import type {TeamDraftInput} from './sideout/team-draft';
import type {ParticipantCommand} from './server/sideout-participation';
import type {MemberLabel} from './sideout/read-model';
import type {ClubsView,Preferences,HomeView,SessionDetailView,ReadSelection,Versioned} from './sideout/read-model';
export class SideoutClientError extends Error{constructor(readonly code:string,readonly status:number,message:string){super(message)}}
import type {ScheduleInput,WriteEnvelope,WriteResult} from './sideout/write-model';
export function createSideoutClient(fetcher:typeof fetch=fetch){
 async function get<T>(path:string,signal?:AbortSignal,input?:unknown):Promise<T>{
  let r:Response;
  try{r=await fetcher(path,{credentials:'same-origin',cache:'no-store',signal,...(input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{})})}catch(e){if(signal?.aborted)throw e;throw new SideoutClientError('NETWORK_ERROR',0,'연결을 확인하고 다시 시도해 주세요.')}
  let body:{ok?:boolean;data?:T;error?:{code:string;message:string}};
  try{body=await r.json() as typeof body}catch{throw new SideoutClientError('STORAGE_UNAVAILABLE',r.ok?503:r.status,'정보를 불러오지 못했습니다.')}
  if(!r.ok)throw new SideoutClientError(body.error?.code??'STORAGE_UNAVAILABLE',r.status,body.error?.message??'정보를 불러오지 못했습니다.');
  if(body.ok!==true||!body.data||typeof body.data!=='object')throw new SideoutClientError('STORAGE_UNAVAILABLE',503,'서비스 응답을 확인할 수 없습니다.');
  return body.data;
 }
 return {matchEditor:(id:string,signal?:AbortSignal)=>get<MatchEditorView>('/api/sessions/'+encodeURIComponent(id)+'/matches',signal),saveMatches:(id:string,body:WriteEnvelope<MatchSaveInput>)=>get<WriteResult>('/api/sessions/'+encodeURIComponent(id)+'/matches',undefined,body),teamEditor:(id:string,signal?:AbortSignal)=>get<TeamEditorView>('/api/sessions/'+encodeURIComponent(id)+'/teams',signal),saveTeams:(id:string,body:WriteEnvelope<(Omit<TeamDraftInput,'action'>&({action:'save'}|{action:'publish';confirmed:true}))|TeamUnpublishInput>)=>get<WriteResult>('/api/sessions/'+encodeURIComponent(id)+'/teams',undefined,body),candidates:(id:string,signal?:AbortSignal)=>get<{members:MemberLabel[];sessionRevision:number;rosterRevision:number}>('/api/sessions/'+encodeURIComponent(id)+'/participants',signal),participate:(id:string,body:WriteEnvelope<ParticipantCommand>)=>get<WriteResult>('/api/sessions/'+encodeURIComponent(id)+'/participants',undefined,body),saveSchedule:(body:WriteEnvelope<ScheduleInput>,id?:string)=>get<WriteResult>('/api/sessions'+(id?'/'+encodeURIComponent(id):''),undefined,body),savePreferences:(body:WriteEnvelope<Preferences>)=>get<WriteResult>('/api/me/preferences',undefined,body),clubs:(signal?:AbortSignal)=>get<ClubsView>('/api/clubs',signal),preferences:(signal?:AbortSignal)=>get<Versioned<Preferences>>('/api/me/preferences',signal),home:(selection:ReadSelection,signal?:AbortSignal)=>get<HomeView>('/api/sessions?'+new URLSearchParams(selection),signal),session:(id:string,signal?:AbortSignal)=>get<SessionDetailView>('/api/sessions/'+encodeURIComponent(id),signal)};
}
export type SideoutClient=ReturnType<typeof createSideoutClient>;
export const sideoutClient=createSideoutClient();
