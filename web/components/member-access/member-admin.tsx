'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {MemberAdminView,MemberChanges,MemberDraft} from '@/lib/auth/member-management';
import {MemberAccessError,memberAccessClient,type MemberAccessClient,type IssuedMemberResult} from '@/lib/member-access-client';
import {MemberForm,type ClubOption} from './member-form';
import {TemporaryCredential} from './temporary-credential';
import styles from './member-access.module.css';

type Props={client?:MemberAccessClient;clubs?:ClubOption[];onDirtyChange?:(dirty:boolean)=>void};
type StatusFilter='all'|'active'|'pending'|'inactive';
type MemberAction='reissue'|'deactivate'|'reactivate';
const roleName=(member:MemberAdminView)=>member.isMaster?'마스터':member.homeRole==='chair'?'소속 모임 회장':member.homeRole==='staff'?'소속 모임 운영진':member.grants.length?'추가 모임 운영 권한':'일반 회원';
const memberStatus=(member:MemberAdminView)=>!member.active?'비활성':member.mustChangePassword?'첫 변경 대기':'활성';
const dateTime=(value:string)=>new Date(value).toLocaleString('ko-KR',{dateStyle:'medium',timeStyle:'short'});

export function MemberAdmin({client=memberAccessClient,clubs,onDirtyChange}:Props){
 const [members,setMembers]=useState<MemberAdminView[]>([]);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [creating,setCreating]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [accessDenied,setAccessDenied]=useState(false);
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState<StatusFilter>('all');
 const [issued,setIssued]=useState<IssuedMemberResult|null>(null);
 const [confirmAction,setConfirmAction]=useState<MemberAction|null>(null);
 const [busyAction,setBusyAction]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [formGeneration,setFormGeneration]=useState(0);
 const [pendingSelection,setPendingSelection]=useState<string|null>(null);
 const mutationInFlight=useRef(false);
 const reloadInFlight=useRef(false);
 const continueButton=useRef<HTMLButtonElement>(null);
 const interactionLocked=busyAction||loading;
 const selected=members.find(member=>member.memberId===selectedId);
 const visible=useMemo(()=>members.filter(member=>{
  const query=search.trim().toLocaleLowerCase();
  const matching=!query||`${member.loginId} ${member.displayName}`.toLocaleLowerCase().includes(query);
  const matchingStatus=filter==='all'||filter==='inactive'&&!member.active||filter==='pending'&&member.active&&member.mustChangePassword||filter==='active'&&member.active&&!member.mustChangePassword;
  return matching&&matchingStatus;
 }),[members,search,filter]);

 const reload=useCallback(async()=>{
  if(mutationInFlight.current||reloadInFlight.current)return;
  reloadInFlight.current=true;
  setLoading(true);setError('');setConfirmAction(null);
  try{setMembers(await client.listMembers());setAccessDenied(false)}
  catch(caught){setError(caught instanceof MemberAccessError?caught.message:'회원 목록을 불러오지 못했습니다.');setAccessDenied(caught instanceof MemberAccessError&&(caught.code==='FORBIDDEN'||caught.code==='UNAUTHENTICATED'));setMembers([])}
  finally{reloadInFlight.current=false;setLoading(false)}
 },[client]);
 useEffect(()=>{
  let current=true;
  void client.listMembers().then(value=>{if(current)setMembers(value)})
   .catch(caught=>{if(current){setError(caught instanceof MemberAccessError?caught.message:'회원 목록을 불러오지 못했습니다.');setAccessDenied(caught instanceof MemberAccessError&&(caught.code==='FORBIDDEN'||caught.code==='UNAUTHENTICATED'))}})
   .finally(()=>{if(current)setLoading(false)});
  return()=>{current=false};
 },[client]);
 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 useEffect(()=>{onDirtyChange?.(dirty)},[dirty,onDirtyChange]);
 useEffect(()=>{if(pendingSelection)continueButton.current?.focus()},[pendingSelection]);

 function select(target:string){
  if(mutationInFlight.current||reloadInFlight.current||issued)return;
  if(target===selectedId&&!creating||target==='new'&&creating)return;
  if(dirty){setPendingSelection(target);return}
  setCreating(target==='new');setSelectedId(target==='new'?null:target);setConfirmAction(null);
 }
 function discardAndSelect(){
  if(!pendingSelection||mutationInFlight.current||reloadInFlight.current)return;
  if(pendingSelection==='__reload__'){
   setDirty(false);setPendingSelection(null);setFormGeneration(value=>value+1);void reload();return;
  }
  setDirty(false);setCreating(pendingSelection==='new');setSelectedId(pendingSelection==='new'?null:pendingSelection);
  setConfirmAction(null);setPendingSelection(null);
 }
 function handleDirtyChange(value:boolean){
  setDirty(value);
  if(!value)setPendingSelection(null);
 }

 function upsertMember(member:MemberAdminView){
  setMembers(previous=>previous.some(row=>row.memberId===member.memberId)?previous.map(row=>row.memberId===member.memberId?member:row):[member,...previous]);
 }
 function replaceMember(member:MemberAdminView){
  upsertMember(member);
  setSelectedId(member.memberId);setCreating(false);
 }
 async function save(value:MemberDraft|MemberChanges){
  if(mutationInFlight.current||reloadInFlight.current)throw new Error('Member request already in progress');
  mutationInFlight.current=true;setBusyAction(true);
  try{
   if(creating){
    const result=await client.createMember(value as MemberDraft);
    replaceMember(result.member);setIssued(result);
   }else if(selected){
    const result=await client.updateMember(selected.memberId,value as MemberChanges);
    replaceMember(result.member);
   }
  }finally{mutationInFlight.current=false;setBusyAction(false)}
 }
 async function perform(action:MemberAction){
  if(!selected||mutationInFlight.current||reloadInFlight.current)return;
  mutationInFlight.current=true;
  setBusyAction(true);setError('');
  try{
   const result=action==='reissue'?await client.reissue(selected.memberId):action==='reactivate'?await client.reactivate(selected.memberId):await client.deactivate(selected.memberId);
   upsertMember(result.member);
   if('temporaryPassword' in result)setIssued(result as IssuedMemberResult);
   setDirty(false);
   setConfirmAction(null);
  }catch(caught){setError(caught instanceof MemberAccessError?caught.message:'요청을 완료하지 못했습니다. 다시 시도해 주세요.');setConfirmAction(null)}
  finally{mutationInFlight.current=false;setBusyAction(false)}
 }
 const clubName=(id:string|null)=>id===null?'무소속':clubs?.find(club=>club.id===id)?.name??id;
 const grantSummary=(member:MemberAdminView)=>member.grants.map(grant=>`${clubName(grant.clubId)} ${grant.role==='chair'?'회장':'운영진'}`).join(' · ');

 if(accessDenied)return <main className={styles.accessStage}><div className={styles.accessPanel}><div className={styles.brandRow}><span className={styles.brandMark} aria-hidden="true"/><span>SIDEOUT</span></div><div className={styles.panelIntro}><h1>회원 관리에 접근할 수 없습니다</h1><p>마스터 계정으로 로그인한 뒤 다시 시도해 주세요.</p></div><p role="alert" className={styles.error}>{error}</p><Button variant="outline" disabled={interactionLocked} onClick={()=>void reload()} className={styles.retryButton}>다시 확인</Button></div></main>;

 return <div className={styles.adminStage}>
  <header className={styles.adminHeader}><div className={styles.brandRow}><span className={styles.brandMark} aria-hidden="true"/><span>SIDEOUT</span></div><div><h1>회원 관리</h1><p>회원 계정과 임시 비밀번호를 개별적으로 관리합니다.</p></div></header>
  {error&&<div className={styles.adminError}><p role="alert" className={styles.error}>{error}</p><Button variant="outline" type="button" disabled={interactionLocked} onClick={()=>dirty?setPendingSelection('__reload__'):void reload()}>목록 다시 불러오기</Button></div>}
  {pendingSelection&&<div className={styles.leaveGuard} role="region" aria-live="assertive" aria-labelledby="leave-guard-title" aria-describedby="leave-guard-description"><div><strong id="leave-guard-title">저장하지 않은 변경 사항이 있습니다</strong><p id="leave-guard-description">{pendingSelection==='__reload__'?'목록을 다시 불러오면 현재 입력이 사라집니다.':'다른 회원으로 이동하면 현재 입력이 사라집니다.'}</p></div><div className={styles.actionRow}><Button ref={continueButton} type="button" variant="outline" disabled={interactionLocked} onClick={()=>setPendingSelection(null)}>계속 수정</Button><Button type="button" disabled={interactionLocked} onClick={discardAndSelect}>변경 사항 버리고 {pendingSelection==='__reload__'?'새로 고침':'이동'}</Button></div></div>}
  <div className={styles.adminLayout}>
   <section className={styles.memberListPanel} aria-labelledby="member-list-title">
    <div className={styles.listHeading}><div><h2 id="member-list-title">회원 목록</h2><span>{members.length}명</span></div><Button type="button" disabled={Boolean(issued)||interactionLocked} onClick={()=>select('new')}>회원 등록</Button></div>
    <label className={styles.searchField}><span className={styles.srOnly}>회원 검색</span><Input className={styles.searchInput} value={search} onChange={event=>setSearch(event.target.value)} placeholder="아이디 또는 이름 검색" type="search"/></label>
    <div className={styles.filterRow} aria-label="계정 상태 필터">{([['all','전체'],['active','활성'],['pending','첫 변경 대기'],['inactive','비활성']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
    {loading?<p role="status" className={styles.listMessage}>회원 목록을 불러오는 중…</p>:visible.length===0?<p className={styles.listMessage}>{members.length===0?'등록된 회원이 없습니다.':'검색 조건에 맞는 회원이 없습니다.'}</p>:<div className={styles.memberRows}>{visible.map(member=><button type="button" disabled={Boolean(issued)||interactionLocked} key={member.memberId} className={styles.memberRow} data-selected={selectedId===member.memberId} onClick={()=>select(member.memberId)}><span className={styles.memberInitial} aria-hidden="true">{member.displayName.slice(0,1)}</span><span className={styles.memberRowText}><strong>{member.displayName}</strong><small>{member.loginId} · {clubName(member.homeClubId)}</small><small>{roleName(member)}</small></span><span className={styles.memberState} data-active={member.active}>{memberStatus(member)}</span></button>)}</div>}
   </section>
   <section className={styles.memberDetailPanel} aria-labelledby="member-detail-title">
    {issued?<TemporaryCredential loginId={issued.member.loginId} temporaryPassword={issued.temporaryPassword} expiresAt={issued.member.temporaryExpiresAt} onClose={()=>setIssued(null)}/>:creating?<><div className={styles.detailHeading}><h2 id="member-detail-title">회원 등록</h2><p>등록 후 나타나는 임시 비밀번호를 해당 회원에게 개별 전달하세요.</p></div><MemberForm key={`new-${formGeneration}`} clubs={clubs} onSave={save} onDirtyChange={handleDirtyChange} blocked={interactionLocked}/></>:selected?<>
     <div className={styles.detailHeading}><div><h2 id="member-detail-title">{selected.displayName}</h2><p>{roleName(selected)} · {memberStatus(selected)} · {clubName(selected.homeClubId)}</p>{grantSummary(selected)&&<p>추가 권한: {grantSummary(selected)}</p>}{selected.active&&selected.mustChangePassword&&selected.temporaryExpiresAt&&<p>임시 비밀번호 만료: {dateTime(selected.temporaryExpiresAt)}</p>}</div><span className={styles.statePill} data-active={selected.active}>{memberStatus(selected)}</span></div>
     <MemberForm key={`${selected.memberId}-${selected.authorizationVersion}-${formGeneration}`} member={selected} clubs={clubs} onSave={save} onDirtyChange={handleDirtyChange} blocked={interactionLocked}/>
     <div className={styles.dangerZone}><h3>계정 관리</h3><p>자격을 재발급하거나 계정 상태를 바꾸면 기존 로그인은 종료됩니다.</p><div className={styles.actionRow}>{selected.active?<><Button variant="outline" type="button" disabled={interactionLocked} onClick={()=>setConfirmAction('reissue')}>임시 비밀번호 재발급</Button><Button variant="outline" type="button" disabled={interactionLocked} onClick={()=>setConfirmAction('deactivate')}>비활성화</Button></>:<Button variant="outline" type="button" disabled={interactionLocked} onClick={()=>setConfirmAction('reactivate')}>재활성화</Button>}</div>
      {confirmAction&&<div className={styles.confirmBox}><strong>{confirmAction==='reissue'?'새 임시 비밀번호를 발급할까요?':confirmAction==='deactivate'?'이 계정을 비활성화할까요?':'이 계정을 다시 활성화할까요?'}</strong><p>확정하면 이전 세션을 사용할 수 없습니다.{confirmAction!=='deactivate'?' 새 비밀번호는 한 번만 표시됩니다.':''}{dirty?' 저장하지 않은 입력도 사라집니다.':''}</p><div className={styles.actionRow}><Button type="button" variant="outline" onClick={()=>setConfirmAction(null)} disabled={interactionLocked}>취소</Button><Button type="button" onClick={()=>void perform(confirmAction)} disabled={interactionLocked}>{busyAction?'처리 중…':'확인'}</Button></div></div>}
     </div>
    </>:<div className={styles.detailEmpty}><h2 id="member-detail-title">회원을 선택하세요</h2><p>목록에서 회원을 선택하면 계정 정보와 관리 동작이 표시됩니다.</p></div>}
   </section>
  </div>
 </div>;
}
