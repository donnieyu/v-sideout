'use client';
import {Button} from '../ui/button';
import {useSideout} from './access';
import {SideoutShell} from './shell';
import styles from './sideout.module.css';
export function AccountScreen(){const {session,directory,actions}=useSideout();const club=directory.clubs.find(c=>c.id===session.me.homeClubId);return <SideoutShell title="계정 정보"><header className={styles.pageHeading}><h1>계정 정보</h1><p>내 프로필과 소속 모임을 확인하세요.</p></header><article className={styles.accountCard}><div className={styles.accountIdentity}><span className={styles.avatar}>{session.me.displayName.slice(-2)}</span><h2>{session.me.displayName}</h2></div><dl><div><dt>로그인 아이디</dt><dd>{session.me.loginId}</dd></div><div><dt>소속 모임</dt><dd>{club?.name??'소속 없음'}</dd></div></dl><p className={styles.muted}>소속 모임은 운영자가 등록하며 직접 변경할 수 없어요.</p><div className={styles.actions}><Button variant="outline" onClick={actions.changePassword}>비밀번호 변경</Button><Button variant="ghost" onClick={()=>void actions.logout()}>로그아웃</Button></div></article></SideoutShell>}
