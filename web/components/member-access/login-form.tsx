'use client';

import {useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {MemberAccessError,type MemberAccessClient} from '@/lib/member-access-client';
import type {SessionView} from '@/lib/auth/contracts';
import styles from './member-access.module.css';

type Props={client:MemberAccessClient;onSession:(session:SessionView)=>void;onJoinRequest?:()=>void};

export function LoginForm({client,onSession,onJoinRequest}:Props){
 const [loginId,setLoginId]=useState('');
 const [password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  if(!loginId.trim()||/\s/u.test(loginId.trim())){setError('아이디의 중간 공백을 없애고 다시 입력해 주세요.');return}
  if(!password){setError('비밀번호를 입력해 주세요.');return}
  setBusy(true);setError('');
  try{
   await client.login(loginId.trim(),password);
   setPassword('');
   onSession(await client.session());
  }catch(caught){setError(caught instanceof MemberAccessError?caught.message:'로그인을 완료하지 못했습니다. 다시 시도해 주세요.')}
  finally{setBusy(false)}
 }

 return <div className={styles.accessPanel}>
  <div className={styles.brandRow}><span className={styles.brandMark} aria-hidden="true"/><span>SIDEOUT</span></div>
  <div className={styles.panelIntro}><h1>모임으로 돌아오세요</h1><p>마스터에게 전달받은 아이디와 비밀번호로 로그인하세요.</p></div>
  <form onSubmit={submit} className={styles.formStack}>
   <label className={styles.field}><span>로그인 아이디</span><Input value={loginId} onChange={event=>setLoginId(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="모임에서 사용하는 닉네임" required maxLength={50} className={styles.textInput}/></label>
   <label className={styles.field}><span>비밀번호</span><span className={styles.passwordRow}><Input value={password} onChange={event=>setPassword(event.target.value)} type={showPassword?'text':'password'} autoComplete="current-password" required className={styles.textInput}/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'비밀번호 숨기기':'비밀번호 표시'}>{showPassword?'숨기기':'보기'}</button></span></label>
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   <Button type="submit" disabled={busy} className={styles.primaryButton}>{busy?'로그인 중…':'로그인'}</Button>
  </form>
  <div className={styles.formFooter}>
   <p>비밀번호를 잊으셨나요? 기존 모임 연락 경로로 마스터에게 재발급을 요청해 주세요.</p>
   {onJoinRequest&&<button type="button" onClick={onJoinRequest} className={styles.textLink}>처음 오셨나요? 가입 신청</button>}
  </div>
 </div>;
}
