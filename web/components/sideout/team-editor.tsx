'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {ReadState,useRead,useSideout} from './access';
import {SideoutShell} from './shell';
import {SessionAllocation,type EditorSnapshot} from './allocation/session-allocation';
import {useEditGuard} from './use-edit-guard';
import {Button} from '../ui/button';
import {editorCandidates} from '@/lib/sideout/allocation-adapter';
import {createCommandId} from '@/lib/sideout/command-id';
import type {TeamEditorView} from '@/lib/sideout/team-editor';
import type {LineupRecord,SessionDetailView} from '@/lib/sideout/read-model';
import {SideoutClientError} from '@/lib/sideout-client';
type Cached={data:TeamEditorView;snapshot?:EditorSnapshot;command?:{signature:string;id:string};needsRefresh?:boolean};
function Editor({data,detail,suffix}:{data:TeamEditorView;detail:SessionDetailView;suffix:string}){
 const {client,drafts,actions}=useSideout(),key='teams:'+data.sessionId;
 const [cached,setCached]=useState<Cached>(()=>{const old=drafts.get(key) as Cached|undefined;return old&&old.data.rosterRevision===data.rosterRevision&&old.data.sessionRevision===data.sessionRevision&&old.data.teamPublished===data.teamPublished?old:{data}}),ref=useRef(cached);
 const operation=useRef(false),[working,setWorking]=useState<'save'|'refresh'|null>(null);
 const begin=(kind:'save'|'refresh')=>{if(operation.current)return false;operation.current=true;setWorking(kind);return true};
 const finish=()=>{operation.current=false;setWorking(null)};
 const [dirty,setDirty]=useState(false),[refreshError,setRefreshError]=useState(''),[reloadKey,setReloadKey]=useState(0);
 const guard=useEditGuard(dirty,{onLeave:()=>drafts.delete(key)}),back='/session/'+encodeURIComponent(data.sessionId)+suffix;
 const update=useCallback((next:Cached)=>{ref.current=next;drafts.set(key,next);setCached(next)},[drafts,key]);
 const received=useRef(data);
 useEffect(()=>{if(received.current===data||operation.current)return;received.current=data;if(data.rosterRevision<ref.current.data.rosterRevision||data.sessionRevision<ref.current.data.sessionRevision)return;if(data.rosterRevision===ref.current.data.rosterRevision&&data.sessionRevision===ref.current.data.sessionRevision)return;if(data.teamPublished!==ref.current.data.teamPublished||!dirty){update({data});guard.saved();setDirty(false);setReloadKey(k=>k+1);setRefreshError('')}else{update({...ref.current,needsRefresh:true});setRefreshError('다른 곳에서 변경되었습니다. 최신 정보를 다시 불러와 주세요.')}},[data,dirty,update,guard]);
 const snapshot=useCallback((value:EditorSnapshot)=>{const next={...ref.current,snapshot:value};ref.current=next;drafts.set(key,next)},[drafts,key]);
 const reload=async()=>{if(operation.current)return;if(dirty&&!window.confirm('작성 중인 내용을 버리고 최신 정보를 불러올까요?'))return;if(!begin('refresh'))return;try{const fresh=await client.teamEditor(data.sessionId);update({data:fresh});setReloadKey(k=>k+1);setDirty(false);guard.saved();setRefreshError('')}catch(e){setRefreshError((e as Error).message)}finally{finish()}};
 async function save(lineup:LineupRecord,publish:boolean){
  const current=ref.current;if(current.data.teamPublished)throw Error('공개를 취소한 뒤 수정해 주세요.');if(current.needsRefresh)throw Error('최신 명단을 먼저 불러와 주세요.');
  const placed=new Set(lineup.teams.flatMap(t=>t.players.map(p=>p.memberId)));
  const payload={action:publish?'publish' as const:'save' as const,...(publish?{confirmed:true as const}:{}),sessionRevision:current.data.sessionRevision,lineup,confirmedMemberIds:current.data.people.filter(p=>p.status==='미신청 회원'&&placed.has(p.id)).map(p=>p.id)};
  const signature=JSON.stringify({revision:current.data.rosterRevision,payload}),commandId=current.command?.signature===signature?current.command.id:createCommandId();
  if(!begin('save'))throw Error('이전 작업이 끝난 뒤 다시 시도해 주세요.');
  update({...current,command:{signature,id:commandId}});
  try{
   const result=await client.saveTeams(data.sessionId,{commandId,expectedRevision:current.data.rosterRevision,payload:payload as Parameters<typeof client.saveTeams>[1]['payload']});
   update({...ref.current,data:{...current.data,draft:lineup,hasSavedDraft:true,publishedLineup:publish?lineup:current.data.publishedLineup,rosterRevision:result.revision,teamPublished:publish||current.data.teamPublished},command:undefined,needsRefresh:true});guard.saved();
   try{const fresh=await client.teamEditor(data.sessionId);update({...ref.current,data:fresh,needsRefresh:false})}catch{setRefreshError('저장은 완료됐지만 최신 명단을 확인하지 못했습니다. 다시 불러와 주세요.')}
  }catch(e){if(e instanceof SideoutClientError){if(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED')void actions.refresh();if(e.status===409){update({...ref.current,needsRefresh:true});setRefreshError('다른 곳에서 변경되었습니다. 최신 정보를 다시 불러와 주세요.')}}throw e}finally{finish()}
 }
 async function unpublish(draftSource:'saved'|'published'){
  const current=ref.current;if(current.needsRefresh)throw Error('최신 정보를 먼저 불러와 주세요.');
  const payload={action:'unpublish' as const,confirmed:true as const,sessionRevision:current.data.sessionRevision,draftSource};
  const signature=JSON.stringify({revision:current.data.rosterRevision,payload}),commandId=current.command?.signature===signature?current.command.id:createCommandId();
  if(!begin('save'))throw Error('이전 작업이 끝난 뒤 다시 시도해 주세요.');update({...current,command:{signature,id:commandId}});
  try{
   const result=await client.saveTeams(data.sessionId,{commandId,expectedRevision:current.data.rosterRevision,payload});
   update({data:{...current.data,teamPublished:false,draft:draftSource==='published'?current.data.publishedLineup!:current.data.draft,rosterRevision:result.revision},needsRefresh:true});guard.saved();setDirty(false);setReloadKey(k=>k+1);
   try{const fresh=await client.teamEditor(data.sessionId);update({data:fresh});setRefreshError('')}catch{setRefreshError('공개는 취소됐지만 최신 정보를 확인하지 못했습니다. 다시 불러와 주세요.')}
  }catch(e){if(e instanceof SideoutClientError&&e.status===409){update({...ref.current,needsRefresh:true});setRefreshError('공개 상태가 변경되었습니다. 최신 정보를 다시 불러와 주세요.')}throw e}finally{finish()}
 }
 return <SideoutShell editor title={detail.club.name} subtitle="팀편성 수정" backHref={back} backLabel="일정 상세로 돌아가기">
  {refreshError&&<p role="alert">{refreshError}</p>}
  {cached.needsRefresh?<div><Button disabled={!!working} onClick={()=>void reload()}>최신 명단 불러오기</Button></div>:null}
  <div className="allocation-editor-frame" inert={cached.needsRefresh||working==='refresh'||undefined}>
   <SessionAllocation key={`${reloadKey}:${cached.data.teamPublished?'public':'draft'}`} entryMode={cached.data.teamPublished?'legacy':'board'} readOnly={cached.data.teamPublished} wasPublished={!!cached.data.publishedLineup} hasSavedChanges={JSON.stringify(cached.data.draft)!==JSON.stringify(cached.data.publishedLineup)||JSON.stringify(cached.data.draftMatches)!==JSON.stringify(cached.data.publishedMatches)} onUnpublish={unpublish} title={detail.club.name} baseline={cached.data.teamPublished?cached.data.publishedLineup!:cached.data.draft} initial={cached.data.teamPublished?undefined:cached.snapshot} onSnapshot={snapshot} people={editorCandidates(cached.data.people)} saved={cached.data.hasSavedDraft} publishedLineup={cached.data.publishedLineup} onSave={save} onCancel={()=>{if(!dirty||window.confirm('저장하지 않은 변경사항을 버리고 돌아갈까요?')){drafts.delete(key);guard.saved();window.location.assign(back)}}} onDirty={setDirty}/>
  </div>
 </SideoutShell>;
}
export function TeamEditorScreen({id}:{id:string}){
 const {client,actions}=useSideout(),params=useSearchParams(),load=useCallback(async(signal:AbortSignal)=>{const [data,detail]=await Promise.all([client.teamEditor(id,signal),client.session(id,signal)]);return {data,detail}},[client,id]),auth=useCallback(()=>void actions.refresh(),[actions.refresh]);
 const {data,error,retry}=useRead(load,auth,15000),q=new URLSearchParams();for(const key of ['weekStart','filter']){const v=params.get(key);if(v)q.set(key,v)}
 if(!data)return <SideoutShell title="팀편성 수정"><ReadState error={error} retry={retry}/></SideoutShell>;
 return <Editor key={id} data={data.data} detail={data.detail} suffix={q.size?'?'+q:''}/>;
}
