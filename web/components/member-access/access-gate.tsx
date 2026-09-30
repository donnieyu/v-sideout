'use client';

import {useCallback,useEffect,useState,useRef,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {MemberAccessError,memberAccessClient,type MemberAccessClient} from '@/lib/member-access-client';
import type {SessionView} from '@/lib/auth/contracts';
import {LoginForm} from './login-form';
import {PasswordChangeForm} from './password-change-form';
import styles from './member-access.module.css';

type ActiveSession=Extract<SessionView,{state:'active'}>;
type ActiveActions={changePassword:()=>void;logout:()=>Promise<void>;refresh:()=>Promise<void>};
type Props={revalidateOnFocus?:boolean;client?:MemberAccessClient;onJoinRequest?:()=>void;onSignedOut?:()=>void;renderActive?:(session:ActiveSession,actions:ActiveActions)=>ReactNode};
const sessionKey=(s:SessionView|null)=>!s?'unknown':s.state==='active'?`${s.me.memberId}:${s.authorizationVersion}`:s.state==='password_change_required'?`restricted:${s.expiresAt}`:'anonymous';

export function MemberAccessGate({client=memberAccessClient,onJoinRequest,onSignedOut,renderActive,revalidateOnFocus=false}:Props){
 const [session,setSession]=useState<SessionView|null>(null);
 const [checking,setChecking]=useState(true);
 const [error,setError]=useState('');
 const [changing,setChanging]=useState(false);
 const generation=useRef(0);
 const logoutInFlight=useRef(false);
 const current=useRef({session,changing});current.current={session,changing};
 const refresh=useCallback(async(preserveForm=false)=>{
  if(logoutInFlight.current)return;
  const turn=++generation.current;
  const background=preserveForm&&(current.current.session?.state!=='active'||current.current.changing);
  const priorKey=sessionKey(current.current.session);
  if(!background){setChecking(true);setChanging(false)}setError('');
  try{const next=await client.session();if(turn===generation.current){if(sessionKey(next)!==priorKey)setChanging(false);setSession(next)}}
  catch(caught){if(turn===generation.current){setError(caught instanceof MemberAccessError?caught.message:'접속 상태를 확인하지 못했습니다.');if(!background)setSession(null)}}
  finally{if(turn===generation.current)setChecking(false)}
 },[client]);
 useEffect(()=>{void refresh();return()=>{generation.current++}},[refresh]);
 useEffect(()=>{
  if(!revalidateOnFocus)return;
  const check=()=>{if(document.visibilityState!=='hidden')void refresh(true)};
  const shown=(event:PageTransitionEvent)=>{if(event.persisted)check()};
  window.addEventListener('pageshow',shown);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
  return()=>{window.removeEventListener('pageshow',shown);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)};
 },[revalidateOnFocus,refresh]);
 async function logout(){
  if(logoutInFlight.current)return;
  logoutInFlight.current=true;
  const turn=++generation.current;setChecking(true);setError('');
  try{await client.logout();if(turn===generation.current){setChanging(false);setSession({state:'anonymous'});onSignedOut?.()}}
  catch(caught){if(turn===generation.current)setError(caught instanceof MemberAccessError?caught.message:'로그아웃하지 못했습니다. 다시 시도해 주세요.')}
  finally{logoutInFlight.current=false;if(turn===generation.current)setChecking(false)}
 }

 if(checking)return <main className={styles.accessStage}><div className={styles.accessPanel}><p role="status" className={styles.loading}>접속 상태를 확인하고 있습니다…</p></div></main>;
 if(error&&!session)return <main className={styles.accessStage}><div className={styles.accessPanel}><div className={styles.brandRow}><span className={styles.brandMark} aria-hidden="true"/><span>SIDEOUT</span></div><h1>접속 상태를 확인할 수 없습니다</h1><p role="alert" className={styles.error}>{error}</p><Button onClick={()=>void refresh()} className={styles.primaryButton}>다시 시도</Button></div></main>;
 if(!session||session.state==='anonymous')return <main className={styles.accessStage}><LoginForm client={client} onSession={setSession} onJoinRequest={onJoinRequest}/>{error&&<p role="alert" className={styles.floatingError}>{error}</p>}</main>;
 if(session.state==='password_change_required')return <main className={styles.accessStage}><PasswordChangeForm key={sessionKey(session)} client={client} firstLogin expiresAt={session.expiresAt} onChanged={()=>void refresh()} onLogout={()=>void logout()}/>{error&&<p role="alert" className={styles.floatingError}>{error}</p>}</main>;
 if(changing)return <main className={styles.accessStage}><PasswordChangeForm key={sessionKey(session)} client={client} firstLogin={false} onChanged={()=>{setChanging(false);void refresh()}} onCancel={()=>void refresh()}/>{error&&<p role="alert" className={styles.floatingError}>{error}</p>}</main>;
 if(renderActive)return <>{renderActive(session,{changePassword:()=>setChanging(true),logout,refresh})}{error&&<p role="alert" className={styles.floatingError}>{error}</p>}</>;
 return <main className={styles.accessStage}><div className={styles.accessPanel}>
  <div className={styles.brandRow}><span className={styles.brandMark} aria-hidden="true"/><span>SIDEOUT</span></div>
  <div className={styles.panelIntro}><h1>{session.me.displayName}님, 반갑습니다</h1><p>로그인이 완료되었습니다. 모임으로 이동할 준비가 되었습니다.</p></div>
  <div className={styles.accountSummary}><span>로그인 아이디</span><strong>{session.me.loginId}</strong><span>소속 모임</span><strong>{session.me.homeClubId??'무소속'}</strong></div>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  <div className={styles.actionRow}><Button variant="outline" onClick={()=>setChanging(true)}>비밀번호 변경</Button><Button variant="ghost" onClick={()=>void logout()}>로그아웃</Button></div>
 </div></main>;
}
