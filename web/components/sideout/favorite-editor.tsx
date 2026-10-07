'use client';
import {createCommandId} from '@/lib/sideout/command-id';
import {useState} from 'react';
import {SlidersHorizontal} from 'lucide-react';
import {Button} from '../ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '../ui/dialog';
import {useSideout} from './access';
import {useEditGuard} from './use-edit-guard';
import {SideoutClientError} from '@/lib/sideout-client';
type Draft={selected:string[];baseline:string[];revision:number;command?:{signature:string;id:string}};
export function FavoriteEditor({onSaved}:{onSaved:()=>void}){
 const {directory,client,actions,drafts}=useSideout();
 const [draft,setDraft]=useState<Draft|null>(()=>drafts.get('favorites') as Draft??null);
 const [open,setOpen]=useState(!!draft),[busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false);
 const dirty=!!draft&&JSON.stringify(draft.selected)!==JSON.stringify(draft.baseline);
 useEditGuard(open&&dirty);
 const update=(next:Draft|null)=>{if(next)drafts.set('favorites',next);else drafts.delete('favorites');setDraft(next)};
 const authError=(e:unknown)=>{if(e instanceof SideoutClientError&&(e.status===401||e.code==='PASSWORD_CHANGE_REQUIRED'))void actions.refresh()};
 function close(){if(busy||dirty&&!window.confirm('변경한 즐겨찾기를 저장하지 않고 닫을까요?'))return;update(null);setOpen(false)}
 async function begin(){setOpen(true);setError('');setConflict(false);setBusy(true);try{const pref=await client.preferences();update({selected:pref.value.favoriteClubIds,baseline:pref.value.favoriteClubIds,revision:pref.revision})}catch(e){setError((e as Error).message);authError(e)}finally{setBusy(false)}}
 async function save(){
  if(!draft||busy)return;
  setBusy(true);setError('');setConflict(false);
  try{const payload={favoriteClubIds:draft.selected},signature=JSON.stringify({revision:draft.revision,payload}),commandId=draft.command?.signature===signature?draft.command.id:createCommandId();
  update({...draft,command:{signature,id:commandId}});
  await client.savePreferences({commandId,expectedRevision:draft.revision,payload});update(null);setOpen(false);onSaved()}
  catch(e){setError((e as Error).message);setConflict(e instanceof SideoutClientError&&e.status===409);authError(e)}finally{setBusy(false)}
 }
 return <><Button variant="outline" size="icon" aria-label="즐겨찾기 관리" onClick={()=>void begin()}><SlidersHorizontal/></Button><Dialog open={open} onOpenChange={value=>{if(!value)close()}}><DialogContent><DialogHeader><DialogTitle>즐겨찾는 모임</DialogTitle><DialogDescription>자주 가는 모임을 선택하세요.</DialogDescription></DialogHeader>{error&&<p role="alert">{error}</p>}{conflict&&<Button variant="outline" onClick={()=>{if(!dirty||window.confirm('작성 중인 내용을 버리고 최신 정보를 불러올까요?'))void begin()}}>최신 정보 다시 불러오기</Button>}{draft?<fieldset disabled={busy} className="grid gap-3">{directory.clubs.map(c=><label className="flex min-h-11 items-center gap-3" key={c.id}><input type="checkbox" checked={draft.selected.includes(c.id)} onChange={e=>update({...draft,selected:e.target.checked?[...draft.selected,c.id]:draft.selected.filter(id=>id!==c.id)})}/>{c.name}</label>)}</fieldset>:<Button disabled={busy} variant="outline" onClick={()=>void begin()}>{busy?'불러오는 중…':'다시 불러오기'}</Button>}<DialogFooter><Button variant="outline" disabled={busy} onClick={close}>취소</Button><Button disabled={busy||!draft} onClick={()=>void save()}>{busy?'저장 중…':'저장'}</Button></DialogFooter></DialogContent></Dialog></>;
}
