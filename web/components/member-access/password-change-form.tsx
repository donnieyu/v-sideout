'use client';

import {useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {MemberAccessError,type MemberAccessClient} from '@/lib/member-access-client';
import styles from './member-access.module.css';

type Props={client:MemberAccessClient;firstLogin:boolean;expiresAt?:string;onChanged:()=>void;onLogout?:()=>void;onCancel?:()=>void};
const passwordValid=(value:string)=>value.length>=8&&/[A-Za-z]/.test(value)&&/[0-9]/.test(value);

export function PasswordChangeForm({client,firstLogin,expiresAt,onChanged,onLogout,onCancel}:Props){
 const [current,setCurrent]=useState('');
 const [next,setNext]=useState('');
 const [confirm,setConfirm]=useState('');
 const [visible,setVisible]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  if(!passwordValid(next)){setError('새 비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.');return}
  if(next===current){setError('기존 임시 비밀번호와 다른 값을 입력해 주세요.');return}
  if(next!==confirm){setError('새 비밀번호와 확인 입력이 다릅니다.');return}
  setBusy(true);setError('');
  try{
   await client.changePassword(current,next);
   setCurrent('');setNext('');setConfirm('');
   onChanged();
  }catch(caught){setError(caught instanceof MemberAccessError?caught.message:'변경하지 못했습니다. 다시 시도해 주세요.')}
  finally{setBusy(false)}
 }

 return <div className={styles.accessPanel}>
  <div className={styles.brandRow}><span className={styles.brandMark} aria-hidden="true"/><span>SIDEOUT</span></div>
  <div className={styles.panelIntro}>
   <h1>{firstLogin?'첫 비밀번호 변경':'비밀번호 변경'}</h1>
   <p>{firstLogin?'전달받은 임시 비밀번호를 새 비밀번호로 바꾸면 모임을 이용할 수 있습니다.':'현재 비밀번호를 확인하고 새 비밀번호를 설정하세요.'}</p>
  </div>
  {firstLogin&&expiresAt&&<p className={styles.expiry}>현재 로그인 유지 기한: {new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(expiresAt))}<br/>기한이 지나면 임시 비밀번호로 다시 로그인해 주세요.</p>}
  <form onSubmit={submit} className={styles.formStack}>
   <label className={styles.field}><span>현재 {firstLogin?'임시 ':''}비밀번호</span><Input type={visible?'text':'password'} value={current} onChange={event=>setCurrent(event.target.value)} autoComplete="current-password" required className={styles.textInput}/></label>
   <label className={styles.field}><span>새 비밀번호</span><Input type={visible?'text':'password'} value={next} onChange={event=>setNext(event.target.value)} autoComplete="new-password" required minLength={8} className={styles.textInput}/><small>8자 이상, 영문과 숫자 포함</small></label>
   <label className={styles.field}><span>새 비밀번호 확인</span><Input type={visible?'text':'password'} value={confirm} onChange={event=>setConfirm(event.target.value)} autoComplete="new-password" required className={styles.textInput}/></label>
   <label className={styles.inlineChoice}><input type="checkbox" checked={visible} onChange={event=>setVisible(event.target.checked)}/><span>비밀번호 표시</span></label>
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   <Button type="submit" disabled={busy} className={styles.primaryButton}>{busy?'변경 중…':'비밀번호 변경'}</Button>
  </form>
  <div className={styles.formFooter}>
   {firstLogin?<button type="button" className={styles.textLink} onClick={onLogout}>다른 계정으로 로그인</button>:<button type="button" className={styles.textLink} onClick={onCancel}>돌아가기</button>}
  </div>
 </div>;
}
