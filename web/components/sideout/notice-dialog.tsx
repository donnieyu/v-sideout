'use client';
import {useId,useLayoutEffect,useRef,useState,type MouseEventHandler} from 'react';
import {FileText,Pencil,Plus,ChevronDown,ChevronUp} from 'lucide-react';
import {Button} from '../ui/button';
import {Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription,DialogHeader,DialogFooter,DialogClose} from '../ui/dialog';
import {SideoutLink as Link} from './link';
import type {SessionRecord} from '@/lib/sideout/read-model';
import styles from './sideout.module.css';
import noticeStyles from './notice.module.css';

export function noticeEditHref(id:string,suffix=''){
 const query=new URLSearchParams(suffix.replace(/^\?/,''));query.set('section','notice');
 return '/session/'+encodeURIComponent(id)+'/schedule/edit?'+query;
}
export function NoticeButton({session,clubName,editHref,onEdit}:{session:SessionRecord;clubName:string;editHref?:string;onEdit?:MouseEventHandler<HTMLAnchorElement>}){
 const date=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(new Date(session.date+'T00:00:00+09:00'));
 if(!session.notice.trim())return editHref?<Button asChild variant="ghost" className={styles.noticeTrigger}><Link href={editHref} onClick={onEdit}><Plus aria-hidden="true"/>공지 추가</Link></Button>:null;
 return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm" className={styles.noticeTrigger}><FileText aria-hidden="true"/>운동 공지</Button></DialogTrigger><DialogContent className={`${styles.rosterDialog} ${styles.noticeDialog}`}><DialogHeader><DialogTitle>운동 공지</DialogTitle><DialogDescription>{clubName} · {date}</DialogDescription></DialogHeader><div className={styles.rosterScroll} role="region" aria-label="운동 공지 내용" tabIndex={0}><p className={noticeStyles.text}>{session.notice}</p></div><DialogFooter className={styles.rosterFooter}>{editHref&&<DialogClose asChild><Button asChild variant="outline"><Link href={editHref} onClick={onEdit}><Pencil aria-hidden="true"/>공지 수정</Link></Button></DialogClose>}<DialogClose asChild><Button>닫기</Button></DialogClose></DialogFooter></DialogContent></Dialog>;
}
export function NoticeSection({notice,editHref,embedded=false}:{notice:string;editHref?:string;embedded?:boolean}){
 const text=useRef<HTMLParagraphElement>(null),id=useId();
 const [expanded,setExpanded]=useState(false),[overflows,setOverflows]=useState(false);
 useLayoutEffect(()=>{
  const element=text.current;if(!element)return;
  const measure=()=>setOverflows(element.scrollHeight>(parseFloat(getComputedStyle(element).lineHeight)||22)*3+1);
  measure();const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(measure);observer?.observe(element);
  window.addEventListener('resize',measure);return()=>{observer?.disconnect();window.removeEventListener('resize',measure)};
 },[notice]);
 if(!notice.trim())return editHref?<div className={noticeStyles.empty}><Button asChild variant="ghost"><Link href={editHref}><Plus aria-hidden="true"/>공지 추가</Link></Button></div>:null;
 return <section data-embedded-notice={embedded||undefined} className={noticeStyles.section} aria-labelledby={id+'-title'}><div className={noticeStyles.heading}><h2 id={id+'-title'}>운동 공지</h2>{editHref&&<Button asChild variant="outline" className={noticeStyles.edit}><Link href={editHref} aria-label="운동 공지 수정"><Pencil aria-hidden="true"/>수정</Link></Button>}</div><p id={id} ref={text} className={`${noticeStyles.text} ${expanded?'':noticeStyles.collapsed}`}>{notice}</p>{overflows&&<Button variant="ghost" className={noticeStyles.expand} aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(!expanded)}>{expanded?'접기':'펼치기'}{expanded?<ChevronUp aria-hidden="true"/>:<ChevronDown aria-hidden="true"/>}</Button>}</section>;
}
