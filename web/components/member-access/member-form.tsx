'use client';

import {useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {MemberAdminView,MemberChanges,MemberDraft} from '@/lib/auth/member-management';
import {MemberAccessError} from '@/lib/member-access-client';
import styles from './member-access.module.css';

export type ClubOption={id:string;name:string};
type Role=''|'chair'|'staff';
type Props={member?:MemberAdminView;clubs?:ClubOption[];onSave:(value:MemberDraft|MemberChanges)=>Promise<void>;onDirtyChange?:(dirty:boolean)=>void;blocked?:boolean};

export function MemberForm({member,clubs,onSave,onDirtyChange,blocked=false}:Props){
 const [loginId,setLoginId]=useState('');
 const [displayName,setDisplayName]=useState(member?.displayName??'');
 const [isMaster,setIsMaster]=useState(member?.isMaster??false);
 const [homeClubId,setHomeClubId]=useState(member?.homeClubId??'');
 const [homeRole,setHomeRole]=useState<Role>(member?.homeRole??'');
 const [grantRoles,setGrantRoles]=useState<Record<string,Role>>(Object.fromEntries(member?.grants.map(grant=>[grant.clubId,grant.role])??[]));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const locked=busy||blocked;
 const unknownClub=Boolean(member&&!isMaster&&(member.homeClubId&&!clubs?.some(club=>club.id===member.homeClubId)||member.grants.some(grant=>!clubs?.some(club=>club.id===grant.clubId))));

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(locked)return;
  if(!member&&(!loginId.trim()||/\s/u.test(loginId.trim()))){setError('아이디의 중간 공백을 없애고 다시 입력해 주세요.');return}
  if(!displayName.trim()){setError('표시 이름을 입력해 주세요.');return}
  if(unknownClub){setError('모임 목록이 연결된 뒤 이 회원을 수정할 수 있습니다.');return}
  const profile={displayName:displayName.trim(),isMaster,homeClubId:isMaster||!homeClubId?null:homeClubId,
   homeRole:isMaster||!homeClubId||!homeRole?null:homeRole,
   grants:isMaster?[]:Object.entries(grantRoles).filter(([id,role])=>role&&id!==homeClubId).map(([clubId,role])=>({clubId,role:role as 'chair'|'staff'}))};
  setBusy(true);setError('');
  try{await onSave(member?profile:{...profile,loginId:loginId.trim()});onDirtyChange?.(false)}
  catch(caught){setError(caught instanceof MemberAccessError?caught.message:'저장하지 못했습니다. 다시 시도해 주세요.')}
  finally{setBusy(false)}
 }

 return <form onSubmit={submit} className={styles.adminForm}>
  {!member?<label className={styles.field}><span>로그인 아이디</span><Input value={loginId} disabled={locked} onChange={event=>{setLoginId(event.target.value);onDirtyChange?.(true)}} autoComplete="off" spellCheck={false} maxLength={50} required className={styles.textInput} placeholder="한글 또는 영어 닉네임"/><small>한글·영어 모두 중간 공백 없이 입력하세요. 등록 후 아이디는 유지됩니다.</small></label>:<div className={styles.readOnlyField}><span>로그인 아이디</span><strong>{member.loginId}</strong><small>아이디는 이 화면에서 변경할 수 없습니다.</small></div>}
  <label className={styles.field}><span>표시 이름</span><Input value={displayName} disabled={locked} onChange={event=>{setDisplayName(event.target.value);onDirtyChange?.(true)}} maxLength={50} required className={styles.textInput}/></label>
  <label className={styles.inlineChoice}><input type="checkbox" checked={isMaster} disabled={locked} onChange={event=>{setIsMaster(event.target.checked);onDirtyChange?.(true)}}/><span>마스터 권한</span></label>
  {!isMaster&&<>
   <label className={styles.field}><span>소속 모임</span><select className={styles.selectInput} value={homeClubId} disabled={locked} onChange={event=>{setHomeClubId(event.target.value);setHomeRole('');onDirtyChange?.(true)}}><option value="">무소속</option>{clubs?.map(club=><option key={club.id} value={club.id}>{club.name}</option>)}</select></label>
   {homeClubId&&<label className={styles.field}><span>소속 모임 운영 역할</span><select className={styles.selectInput} value={homeRole} disabled={locked} onChange={event=>{setHomeRole(event.target.value as Role);onDirtyChange?.(true)}}><option value="">일반 회원</option><option value="chair">회장</option><option value="staff">운영진</option></select></label>}
   {clubs?.some(club=>club.id!==homeClubId)&&<fieldset className={styles.grantFieldset}><legend>추가 모임 운영 권한</legend>{clubs.filter(club=>club.id!==homeClubId).map(club=><label key={club.id}><span>{club.name}</span><select className={styles.selectInput} value={grantRoles[club.id]??''} disabled={locked} onChange={event=>{setGrantRoles(previous=>({...previous,[club.id]:event.target.value as Role}));onDirtyChange?.(true)}}><option value="">없음</option><option value="chair">회장</option><option value="staff">운영진</option></select></label>)}</fieldset>}
  </>}
  {!clubs&&<p className={styles.note}>운영 모임 목록이 아직 연결되지 않아 무소속 등록만 가능합니다.</p>}
  {unknownClub&&<p className={styles.note}>이 회원의 기존 모임 정보를 확인할 수 없습니다. 모임 목록 연결 뒤 수정해 주세요.</p>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  <Button type="submit" disabled={locked||unknownClub} className={styles.primaryButton}>{busy?'저장 중…':member?'변경 저장':'회원 등록'}</Button>
 </form>;
}
