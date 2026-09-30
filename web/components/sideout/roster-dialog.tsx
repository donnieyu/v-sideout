'use client';
import {useCallback,useState} from 'react';
import {Plus,Users} from 'lucide-react';
import {Button} from '../ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogTrigger,DialogClose} from '../ui/dialog';
import type {SessionCardView,SessionDetailView,MemberLabel} from '@/lib/sideout/read-model';
import {useRead,useSideout,ReadState} from './access';
import styles from './sideout.module.css';

export function RosterButton({card,detail}:{card:SessionCardView;detail?:SessionDetailView}){
 const {client,actions,session}=useSideout(),[open,setOpen]=useState(false);
 const load=useCallback((signal:AbortSignal)=>!open?Promise.resolve(null):detail?Promise.resolve(detail):client.session(card.session.id,signal),[open,detail,client,card.session.id]);
 const recheck=useCallback(()=>void actions.refresh(),[actions.refresh]);
 const {data,error,retry}=useRead(load,recheck);
 if(card.session.phase==='draft'||(!card.canManage&&session.me.homeClubId!==card.club.id))return null;
 const group=(title:string,people:MemberLabel[],own=false)=><section className={styles.rosterGroup}><div className={styles.rosterLabel}><h3>{title}</h3><span>{people.length}명</span></div>{people.length?<div className={styles.rosterPeople}>{people.map(p=><div className={styles.rosterPerson} key={p.memberId}><div><strong>{p.displayName}{p.memberId===session.me.memberId&&<em>나</em>}</strong>{!own&&<small>{p.clubName??'소속 없음'}</small>}</div>{data?.canManage&&!data.teamPublished&&<Button variant="ghost" disabled aria-label={`${p.displayName} 참가 취소`}>취소</Button>}</div>)}</div>:<p className={styles.muted}>등록된 인원이 없습니다.</p>}</section>;
 return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="link" size="sm" className={styles.rosterTrigger}>명단 확인</Button></DialogTrigger><DialogContent className={styles.rosterDialog}><DialogHeader><DialogTitle>함께하는 회원</DialogTitle><DialogDescription>{card.club.name} · {card.session.date} 운동</DialogDescription></DialogHeader>{!data?<ReadState error={error} retry={retry}/>:<><div className={styles.rosterScroll} role="region" aria-label="참가 명단">{group('소속 회원',data.visibleApplicants.filter(m=>m.clubName===card.club.name),true)}{data.canManage&&group('게스트',data.visibleApplicants.filter(m=>m.clubName!==card.club.name))}{data.canManage&&!!data.visibleWaiters?.length&&group('대기자',data.visibleWaiters)}</div>{!data.canManage&&<div className={styles.guestSummary}><Users size={17}/><span>게스트</span><strong>{data.guestCount??0}<small>명</small></strong></div>}</>}<DialogFooter className={styles.rosterFooter}>{card.canManage&&<Button variant="outline" disabled><Plus/>참가자 추가</Button>}<DialogClose asChild><Button>확인</Button></DialogClose></DialogFooter></DialogContent></Dialog>;
}
