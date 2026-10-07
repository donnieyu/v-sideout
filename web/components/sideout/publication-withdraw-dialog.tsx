'use client';
import {useState} from 'react';
import {Button} from '../ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '../ui/dialog';
export function PublicationWithdrawDialog({open,onClose,onConfirm,hasSavedChanges}:{open:boolean;onClose:()=>void;onConfirm:(source:'saved'|'published')=>Promise<void>;hasSavedChanges:boolean}){
 const [source,setSource]=useState<'saved'|'published'>('saved'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function confirm(){if(busy)return;setBusy(true);setError('');try{await onConfirm(hasSavedChanges?source:'published');onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <Dialog open={open} onOpenChange={value=>!value&&!busy&&onClose()}><DialogContent onEscapeKeyDown={e=>{if(busy)e.preventDefault()}} onPointerDownOutside={e=>{if(busy)e.preventDefault()}}><DialogHeader><DialogTitle>팀편성 공개를 취소할까요?</DialogTitle><DialogDescription>참석 회원에게 팀편성과 경기 순서가 더 이상 표시되지 않습니다. 기존 배정과 경기 순서는 유지되며, 수정 후 다시 공개할 수 있습니다. 운영진은 명단에서 회원을 추가하거나 참가를 취소할 수 있습니다.</DialogDescription></DialogHeader>
 {hasSavedChanges&&<fieldset disabled={busy} className="publication-draft-source"><legend>공개본과 다른 저장본이 있습니다. 어떤 편성부터 수정할까요?</legend><label><input type="radio" name="draft-source" checked={source==='saved'} onChange={()=>setSource('saved')}/>기존 저장본 이어서 수정</label><label><input type="radio" name="draft-source" checked={source==='published'} onChange={()=>setSource('published')}/>공개된 편성부터 수정</label><small>선택하지 않은 편성도 보존합니다.</small></fieldset>}
 {error&&<p role="alert">{error}</p>}<DialogFooter className="flex-row justify-end [&>button]:min-h-11"><Button variant="outline" disabled={busy} onClick={onClose}>공개 유지</Button><Button variant="destructive" disabled={busy} onClick={()=>void confirm()}>{busy?'처리 중…':'공개 취소'}</Button></DialogFooter></DialogContent></Dialog>;
}
