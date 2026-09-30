'use client';
import {useState,type ReactNode} from 'react';
import {SideoutLink as Link} from './link';
import {usePathname,useSearchParams} from 'next/navigation';
import {Volleyball,House,Settings,Menu,X,ChevronLeft} from 'lucide-react';
import {Button} from '../ui/button';
import {Sheet,SheetContent,SheetTitle,SheetDescription,SheetTrigger} from '../ui/sheet';
import {useSideout} from './access';
import styles from './sideout.module.css';
export function SideoutShell({children,title='SIDEOUT',subtitle}:{children:ReactNode;title?:string;subtitle?:string}){
 const {session,directory}=useSideout(),path=usePathname(),params=useSearchParams(),[open,setOpen]=useState(false);
 const query=new URLSearchParams();for(const key of ['weekStart','filter']){const v=params.get(key);if(v)query.set(key,v)}
 const suffix=query.size?'?'+query:'',home='/home'+suffix;
 const affiliation=directory.clubs.find(c=>c.id===session.me.homeClubId)?.name??'소속 없음';
 const navigation=<><Link className={styles.brand} href={home} onClick={()=>setOpen(false)}><Volleyball/><span>SIDEOUT<small>사이드아웃</small></span></Link><nav aria-label="주 메뉴"><Link className={styles.navLink} href={home} onClick={()=>setOpen(false)}><House size={18}/>모임 홈</Link></nav><Link className={styles.profile} href={'/account'+suffix} onClick={()=>setOpen(false)} aria-label={`${session.me.displayName}, 계정 정보`}><span className={styles.avatar}>{session.me.displayName.slice(-2)}</span><span><strong>{session.me.displayName}</strong><small>{affiliation}</small></span><Settings size={18}/></Link></>;
 return <><aside className={styles.sidebar}>{navigation}</aside><header className={styles.mobileHeader}>{path==='/home'?<span/>:<Button variant="ghost" size="icon" asChild><Link href={home} aria-label="모임 홈으로 돌아가기"><ChevronLeft/></Link></Button>}<div><strong>{title}</strong>{subtitle&&<small>{subtitle}</small>}</div><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="메뉴 열기"><Menu/></Button></SheetTrigger><SheetContent side="left" showCloseButton={false} className={styles.drawer}><SheetTitle className={styles.srOnly}>SIDEOUT 메뉴</SheetTitle><SheetDescription className={styles.srOnly}>모임 홈과 계정 정보</SheetDescription><Button variant="ghost" size="icon" className={styles.drawerClose} aria-label="메뉴 닫기" onClick={()=>setOpen(false)}><X/></Button>{navigation}</SheetContent></Sheet></header><main className={styles.main}><p className={styles.trial}>실제 계정 연결 시험 · 조회만 제공</p>{children}</main></>;
}
