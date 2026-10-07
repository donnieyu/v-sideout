'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';

export function TeamNameDialog({title,onApply,onClose}:{title:string;onApply:(title:string)=>void;onClose:()=>void}){
 const [name,setName]=useState(title),trimmed=name.trim();
 const valid=trimmed.length>0&&trimmed.length<=40;
 return <Dialog open onOpenChange={open=>!open&&onClose()}><DialogContent>
  <DialogHeader><DialogTitle>팀 이름 수정</DialogTitle><DialogDescription>변경한 이름은 상단 저장 버튼을 눌러 저장하세요.</DialogDescription></DialogHeader>
  <form className="allocation-team-name-form" onSubmit={event=>{event.preventDefault();if(valid)onApply(trimmed)}}>
   <label htmlFor="allocation-team-name">팀 이름</label>
   <Input id="allocation-team-name" value={name} maxLength={40} aria-describedby="allocation-team-name-help" onChange={event=>setName(event.target.value)} onFocus={event=>event.currentTarget.select()}/>
   <p id="allocation-team-name-help">1~40자</p>
   <div className="ab-confirm-actions"><Button type="button" variant="outline" aria-label="이름 수정 취소" onClick={onClose}>취소</Button><Button type="submit" disabled={!valid}>적용</Button></div>
  </form>
 </DialogContent></Dialog>;
}
