import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
import {Checkbox} from '@/components/ui/checkbox'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {Check,Save} from 'lucide-react'
import {formForSession,formChanged,validateRegistration,type RegistrationForm,type RegistrationRecord,type Access} from './registration-model'
import {formatDate,type Session} from './model'
export function SessionEditor({session,access,records,onSave,onDirty,editing=false,onCancel,actionHost}:{actionHost:HTMLElement|null;editing?:boolean;onCancel?:()=>void;session:Session;access:Access;records:RegistrationRecord[];onSave:(r:RegistrationRecord)=>void;onDirty:(dirty:boolean)=>void}){
 const [form,setForm]=useState(()=>formForSession(session)),[tab,setTab]=useState('info'),[errors,setErrors]=useState<string[]>([]),[saved,setSaved]=useState(false)
 const original=formForSession(session),dirty=formChanged(form,original)
 useEffect(()=>onDirty(dirty),[dirty,onDirty])
 const errorRef=useRef<HTMLDivElement>(null),entryRef=useRef<HTMLInputElement>(null)
 useEffect(()=>{if(errors.length)errorRef.current?.focus()},[errors])
 function change<K extends keyof RegistrationForm>(key:K,value:RegistrationForm[K]){setForm(f=>({...f,[key]:value}));setSaved(false);setErrors([])}
 function save(status:'draft'|'open'){const issues=validateRegistration(form,access.master?'master':'staff',records,session.recordId??(editing?session.id:null),access.managedClubIds,editing?formForSession(session):undefined);if(issues.length){setErrors(issues);return}const normalized={...form,place:form.place.trim(),notice:form.notice.trim()};setForm(normalized);onSave({id:session.recordId??session.id,form:normalized,status});onDirty(false);setSaved(true)}
 function cancel(){onCancel?.()}
 const actions=<><Button type="button" variant="outline" size="sm" onClick={cancel}>취소</Button>{editing?<Button type="button" size="sm" onClick={()=>save('open')}><Save/>저장</Button>:<><Button type="button" variant="outline" size="sm" onClick={()=>save('draft')}>준비로 저장</Button><Button type="button" size="sm" onClick={()=>save('open')}>모집 시작</Button></>}</>
 return <form className="detail-editor" onSubmit={e=>{e.preventDefault();save('open')}} noValidate>
 {errors.length>0&&<div className="registration-errors" role="alert" ref={errorRef} tabIndex={-1}><strong>입력 내용을 확인해 주세요.</strong><ul>{errors.map(e=><li key={e}>{e}</li>)}</ul></div>}
 <div className="detail-layout"><Card className="information-card"><Tabs value={tab} onValueChange={setTab}><TabsList variant="line"><TabsTrigger value="info">정보</TabsTrigger><TabsTrigger value="notice">공지</TabsTrigger></TabsList><TabsContent value="info" className="info-content editor-info"><h2>운동 일정</h2><div className="editor-timeline">{([['entry','입장 · 몸풀기'],['start','운동 시작'],['end','종료']] as const).map(([key,label])=><div className="registration-field" key={key}><label htmlFor={`edit-${key}`}>{label}</label><Input ref={key==='entry'?entryRef:undefined} id={`edit-${key}`} type="time" value={form[key]} onChange={e=>change(key,e.target.value)}/></div>)}</div><div className="registration-field"><label htmlFor="edit-place">장소</label><Input id="edit-place" value={form.place} maxLength={100} onChange={e=>change('place',e.target.value)}/></div><dl><div><dt>운동 날짜</dt><dd>{formatDate(form.date)} {'일월화수목금토'[new Date(form.date+'T00:00:00Z').getUTCDay()]}요일</dd></div></dl><p className="editor-hint">변경한 장소·시간은 이번 운동에만 적용됩니다.</p></TabsContent><TabsContent value="notice" className="info-content editor-info"><h2>이번 운동 안내</h2><label htmlFor="edit-notice" className="sr-only">이번 운동 공지</label><Textarea id="edit-notice" value={form.notice} onChange={e=>change('notice',e.target.value)} maxLength={2000} rows={7} placeholder="이번 운동에서 전달할 내용을 적어 주세요."/></TabsContent></Tabs></Card>
 <Card className="join-card editor-settings"><h2>신청 설정</h2><label className="registration-check"><Checkbox checked={form.priority} onCheckedChange={v=>change('priority',v===true)}/>소속 회원 우선 기간</label>{form.priority&&<div className="registration-field"><label htmlFor="edit-priority">우선 신청 종료</label><Input id="edit-priority" type="datetime-local" value={form.priorityUntil} onChange={e=>change('priorityUntil',e.target.value)}/></div>}<div className="registration-field"><label htmlFor="edit-deadline">일반 신청 마감</label><Input id="edit-deadline" type="datetime-local" value={form.deadline} onChange={e=>change('deadline',e.target.value)}/></div><label className="registration-check"><Checkbox checked={form.capped} onCheckedChange={v=>change('capped',v===true)}/>일반 신청 상한</label>{form.capped?<div className="registration-field"><label htmlFor="edit-cap">일반 신청 상한 (명)</label><Input id="edit-cap" type="number" inputMode="numeric" value={form.cap} min={1} max={200} onChange={e=>change('cap',e.target.value)}/></div>:<p className="muted">인원 제한 없음</p>}<p className="editor-hint">후보 접수는 운동 시작 시각인 {form.start}까지 받습니다.</p></Card></div>
 {actionHost&&createPortal(actions,actionHost)}
 {saved&&<p className="update-feedback" role="status"><Check/>준비로 저장했어요.</p>}
 </form>
}
