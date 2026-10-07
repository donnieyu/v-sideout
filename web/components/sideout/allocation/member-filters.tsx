'use client';
import {useRef,useState} from 'react';
import {Check,SlidersHorizontal,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import type {Candidate,ProfilePosition} from './position-board-model';
export type MemberFilters={clubs:string[];positions:ProfilePosition[]};
export const emptyMemberFilters:MemberFilters={clubs:[],positions:[]};
export function filterUnregisteredMembers(people:Candidate[],query:string,filters:MemberFilters){
 const search=query.trim().toLocaleLowerCase();
 return people.filter(p=>p.status==='미신청 회원'&&p.active!==false&&(!search||`${p.name} ${p.club}`.toLocaleLowerCase().includes(search))&&(!filters.clubs.length||filters.clubs.includes(p.club))&&(!filters.positions.length||filters.positions.includes(p.position)||p.secondary!=='미등록'&&filters.positions.includes(p.secondary)));
}
export function MemberFilterControls({clubs,value,onChange}:{clubs:string[];value:MemberFilters;onChange:(next:MemberFilters)=>void}){
 const [open,setOpen]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null),returnFocus=useRef(false);
 const count=value.clubs.length+value.positions.length;
 const toggle=(key:keyof MemberFilters,option:string)=>onChange({...value,[key]:value[key].includes(option as ProfilePosition)?value[key].filter(v=>v!==option):[...value[key],option]});
 return <Popover open={open} onOpenChange={next=>{if(next)returnFocus.current=false;setOpen(next)}}>
  <PopoverTrigger asChild><Button ref={trigger} variant="outline" className="ab-filter-trigger" data-filtered={count>0} title="미신청 회원 필터" aria-label={`미신청 회원 필터${count?`, ${count}개 선택`:''}`}><SlidersHorizontal aria-hidden="true"/>{count>0&&<span className="ab-filter-count" aria-hidden="true">{count}</span>}</Button></PopoverTrigger>
  <PopoverContent align="end" sideOffset={6} collisionPadding={12} className="ab-filter-popover" aria-label="미신청 회원 필터 설정" onEscapeKeyDown={()=>{returnFocus.current=true}} onCloseAutoFocus={event=>{if(returnFocus.current){event.preventDefault();trigger.current?.focus();returnFocus.current=false}}}>
   <header className="ab-filter-header"><strong>필터</strong><Button variant="ghost" className="ab-filter-reset" aria-disabled={!count} onClick={()=>{if(count)onChange(emptyMemberFilters)}}>초기화</Button><Button variant="ghost" className="ab-filter-close" aria-label="필터 닫기" onClick={()=>{returnFocus.current=true;setOpen(false)}}><X aria-hidden="true"/></Button></header>
   <div className="ab-filter-body">
    {(['clubs','positions'] as const).map(key=>{const label=key==='clubs'?'소속 모임':'포지션',options=key==='clubs'?clubs:['세터','레프트','센터','라이트','미등록'];return <section key={key} aria-label={label}>
     <div className="ab-filter-section-title"><h3>{label}</h3><span>{key==='positions'?'주·부 포지션':'복수 선택'}</span></div>
     <div className={`ab-filter-options ${key}`}>{options.map(option=>{const selected=value[key].includes(option as ProfilePosition);return <button type="button" role="checkbox" aria-checked={selected} className="ab-filter-option" key={option} onClick={()=>toggle(key,option)}><span>{option==='미등록'?'포지션 미등록':option}</span><Check aria-hidden="true"/></button>})}{!options.length&&<p className="ab-filter-empty">선택할 모임이 없습니다.</p>}</div>
    </section>})}
   </div>
  </PopoverContent>
 </Popover>;
}
