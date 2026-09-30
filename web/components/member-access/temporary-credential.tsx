'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import styles from './member-access.module.css';

type Props={loginId:string;temporaryPassword:string;expiresAt:string|null;onClose:()=>void};

export function TemporaryCredential({loginId,temporaryPassword,expiresAt,onClose}:Props){
 const [copyStatus,setCopyStatus]=useState('');
 async function copy(){
  try{await navigator.clipboard.writeText(`아이디: ${loginId}\n임시 비밀번호: ${temporaryPassword}`);setCopyStatus('클립보드에 복사했습니다. 전달 후 클립보드도 지워 주세요.')}
  catch{setCopyStatus('복사하지 못했습니다. 값을 직접 확인해 주세요.')}
 }
 return <section className={styles.credential} aria-labelledby="issued-credential-title">
  <div className={styles.credentialHeading}><h3 id="issued-credential-title">새 임시 비밀번호가 발급되었습니다</h3><button type="button" onClick={onClose} aria-label="임시 비밀번호 닫기">닫기</button></div>
  <p>이 화면을 닫으면 다시 볼 수 없습니다. 회원 본인에게 기존 연락 경로로 개별 전달하세요.</p>
  <dl><dt>로그인 아이디</dt><dd>{loginId}</dd><dt>임시 비밀번호</dt><dd className={styles.secret}>{temporaryPassword}</dd>{expiresAt&&<><dt>만료</dt><dd>{new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(expiresAt))}</dd></>}</dl>
  <div className={styles.actionRow}><Button type="button" variant="outline" onClick={()=>void copy()}>아이디·비밀번호 복사</Button><Button type="button" onClick={onClose}>확인하고 닫기</Button></div>
  {copyStatus&&<p role="status" className={styles.copyStatus}>{copyStatus}</p>}
 </section>;
}
