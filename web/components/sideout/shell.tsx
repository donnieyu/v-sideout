'use client';
import {useState,type ReactNode} from 'react';
import {SideoutLink as Link} from './link';
import {usePathname,useSearchParams} from 'next/navigation';
import {House,Menu,X,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button} from '../ui/button';
import {Sheet,SheetContent,SheetTitle,SheetDescription,SheetTrigger} from '../ui/sheet';
import {useSideout} from './access';
import styles from './sideout.module.css';
import {EditorNavigation} from './editor-action-bar';
export function SideoutShell({children,title='운동 일정',subtitle,backHref,backLabel,editor=false,schedule=false,contentHeading=false,floatingReturn=false,returnHidden=false,formEditor=false,actionBar=false}:{children:ReactNode;title?:string;subtitle?:string;backHref?:string;backLabel?:string;editor?:boolean;schedule?:boolean;contentHeading?:boolean;floatingReturn?:boolean;returnHidden?:boolean;formEditor?:boolean;actionBar?:boolean}){
 const {session,directory}=useSideout(),path=usePathname(),params=useSearchParams(),[open,setOpen]=useState(false);
 const query=new URLSearchParams();for(const key of ['weekStart','filter']){const v=params.get(key);if(v)query.set(key,v)}
 const suffix=query.size?'?'+query:'',home='/home'+suffix;
 const affiliation=directory.clubs.find(c=>c.id===session.me.homeClubId)?.name??'소속 없음';
 const inSchedule=path==='/home'||path.startsWith('/session/'),inAccount=path==='/account';
 const navigation=<><nav aria-label="주 메뉴"><Link className={styles.navLink} data-active={inSchedule} aria-current={path==='/home'?'page':undefined} href={home} onClick={()=>setOpen(false)}><House size={17} aria-hidden="true"/>운동 일정<ChevronRight size={15} aria-hidden="true"/></Link></nav><Link className={styles.profile} data-active={inAccount} aria-current={inAccount?'page':undefined} href={'/account'+suffix} onClick={()=>setOpen(false)} aria-label={`${session.me.displayName}, 계정 정보`}><span className={styles.avatar}>{session.me.displayName.slice(-2)}</span><span><strong>{session.me.displayName}</strong><small>{affiliation}</small></span><span className={styles.accountLink}>계정 보기</span></Link></>;
 return <>
  <a className={styles.skipLink} href="#sideout-main">본문으로 이동</a>
  <aside className={styles.sidebar}><Link className={styles.brand} href={home}>SIDEOUT</Link>{navigation}</aside>
  <header className={styles.mobileHeader}>
   <div className={styles.headerBrand}><Link href={home}>SIDEOUT</Link></div>
   <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><Button variant="ghost" className={styles.headerMenu} aria-label="메뉴 열기"><Menu aria-hidden="true"/><span>메뉴</span></Button></SheetTrigger>
    <SheetContent side="bottom" showCloseButton={false} className={`${styles.drawer} ${styles.menuSheet}`}>
     <SheetTitle>메뉴</SheetTitle><SheetDescription className={styles.srOnly}>운동 일정과 계정 정보</SheetDescription>
     <Button variant="ghost" size="icon" className={styles.drawerClose} aria-label="메뉴 닫기" onClick={()=>setOpen(false)}><X aria-hidden="true"/></Button>{navigation}
    </SheetContent>
   </Sheet>
  </header>
  <main id="sideout-main" tabIndex={-1} className={`${styles.main} ${editor?styles.editorMain+' team-editor-page':''} ${formEditor?styles.formEditorMain:''} ${schedule?styles.scheduleMain:''} ${floatingReturn?styles.floatingReturnMain:''} ${actionBar?styles.actionBarMain:''}`}>
   {(path!=='/home'||!contentHeading)&&<div className={`${styles.pageIntro} ${floatingReturn?styles.floatingReturnIntro:''}`}>
    {path!=='/home'&&!returnHidden&&!actionBar&&<Link className={`${styles.parentLink} ${floatingReturn?styles.floatingReturn:''}`} data-return-placement={floatingReturn?'floating':'inline'} href={backHref??home}><ChevronLeft size={16} aria-hidden="true"/>{backLabel??'운동 일정으로'}</Link>}
    {!contentHeading&&<><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</>}
   </div>}
   <EditorNavigation.Provider value={actionBar?{href:backHref??home,label:backLabel??'운동 일정으로'}:{href:backHref??home,label:backLabel??'운동 일정으로',suppressed:true}}>{children}</EditorNavigation.Provider>
  </main>
 </>;
}
