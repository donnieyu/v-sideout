import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const transpile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const uri=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64')
const modelURL=uri(transpile(fs.readFileSync('src/model.ts','utf8')))
const {clubs,fixtures}=await import(modelURL)
const registrationSource=transpile(fs.readFileSync('src/registration-model.ts','utf8')).replace("'./model'",JSON.stringify(modelURL))
const {defaults,validateRegistration,calendarSessions,recordSession,formForSession,isFixtureSession,accessForAccount,formChanged}=await import(uri(registrationSource))
const base=defaults(clubs.find(c=>c.id==='nb'))
const check=(form,role='master',records=[],id=null)=>validateRegistration(form,role,records,id)
assert.equal(base.date,'2026-10-04')
assert.deepEqual(check(base),[])
assert.ok(check({...base,date:'2026-09-27'}).some(e=>e.includes('이미 등록')))
assert.ok(check({...base,entry:'14:00'}).some(e=>e.includes('시간')))
assert.ok(check({...base,deadline:'2026-10-04T13:00'}).some(e=>e.includes('신청 마감')))
assert.ok(check({...base,priorityUntil:'2026-10-04T12:00'}).some(e=>e.includes('우선 신청')))
assert.ok(check({...base,capped:true,cap:'0'}).some(e=>e.includes('상한')))
assert.deepEqual(check({...base,priority:false,priorityUntil:'',capped:true,cap:'24'}),[])
assert.ok(check(defaults(clubs.find(c=>c.id==='heroes')),'staff').some(e=>e.includes('담당 모임')))
const draft={id:'test-draft',form:base,status:'draft'}
assert.ok(check(base,'master',[draft]).some(e=>e.includes('이미 등록')))
assert.deepEqual(check(base,'master',[draft],draft.id),[])
assert.equal(defaults(clubs.find(c=>c.id==='nb'),[draft]).date,'2026-10-11')
console.log('Registration checks: 12 passed (dates, permissions, duplicate prevention, time order, limits, draft continuation).')

const master={master:true,managedClubIds:[]},member={master:false,managedClubIds:[]},multi={master:false,managedClubIds:['nb','heroes']};
const all=new Set();
assert.equal(calendarSessions(1,'all',all,master,[]).length,5)
assert.equal(calendarSessions(1,'all',all,member,[]).length,0)
assert.deepEqual(calendarSessions(1,'all',all,multi,[]).map(s=>s.club.id),['heroes','nb'])
assert.equal(calendarSessions(1,'nb',all,member,[draft]).length,0)
assert.equal(calendarSessions(1,'nb',all,multi,[draft])[0].phase,'draft')
assert.equal(calendarSessions(1,'nb',all,multi,[draft]).length,1)
const opened={...draft,status:'open'}
assert.equal(calendarSessions(1,'all',all,member,[opened]).length,1)
assert.equal(calendarSessions(1,'all',all,member,[opened])[0].phase,'open')
assert.equal(calendarSessions(20,'all',all,member,[]).length,0)
assert.equal(calendarSessions(-20,'all',all,master,[]).length,0)
assert.deepEqual(validateRegistration(defaults(clubs.find(c=>c.id==='heroes')),'staff',[],null,['nb','heroes']),[])
assert.ok(validateRegistration(defaults(clubs.find(c=>c.id==='asp')),'staff',[],null,['nb','heroes']).some(e=>e.includes('담당 모임')))
assert.equal(recordSession({...opened,form:{...base,place:'이번 회차 장소',notice:'회차 공지'}}).club.place,'이번 회차 장소')
assert.equal(clubs.find(c=>c.id==='nb').place,'양강초등학교 체육관')
console.log('Calendar access checks: 14 passed (master, multiple clubs, private drafts, publication, unchanged club defaults).')

const current=fixtures.find(s=>s.id==='2026-09-27-nb');
const currentForm=formForSession(current);
assert.deepEqual(check(currentForm,'master',[],current.id),[]);
assert.deepEqual(check(currentForm,'staff',[],current.id),[]);
assert.ok(validateRegistration(currentForm,'staff',[],current.id,['heroes']).some(e=>e.includes('담당')));
const edited={id:current.id,form:{...currentForm,place:'양강초등학교 체육관 2층',notice:'수정된 공지'},status:'open'};
const updated=recordSession(edited);
assert.equal(updated.count,current.count);
assert.equal(updated.id,current.id);
assert.equal(updated.phase,'open');
assert.equal(updated.club.place,'양강초등학교 체육관 2층');
assert.equal(isFixtureSession(updated.id),true);
assert.equal(calendarSessions(0,'nb',all,member,[edited]).length,1);
assert.equal(calendarSessions(0,'nb',all,member,[edited])[0].club.place,edited.form.place);
const past=fixtures.find(s=>s.attended&&s.published);
const pastRecord={id:past.id,form:formForSession(past),status:'open'};
assert.equal(recordSession(pastRecord).attended,true);
assert.equal(recordSession(pastRecord).published,true);
assert.equal(recordSession(opened).count,0);
assert.equal(formForSession(current).deadline,'2026-09-26T14:00');
assert.ok(formForSession(current).notice.includes('실내 운동화'));
const elapsed={...currentForm,priorityUntil:'2026-09-22T18:00'};
assert.deepEqual(validateRegistration(elapsed,'master',[],current.id,[],elapsed),[]);
assert.ok(validateRegistration({...currentForm,priorityUntil:'2026-09-22T18:00'},'master',[],current.id,[],currentForm).length>0);
console.log('Existing exercise edit checks: 17 passed (same ID, counts, publication/history, no duplicate cards, scope, notice/deadline defaults, elapsed unchanged settings).');

assert.deepEqual(accessForAccount('master',null),{master:true,managedClubIds:[]});
assert.deepEqual(accessForAccount('operator','nb').managedClubIds,['nb']);
assert.deepEqual(accessForAccount('operator','nb',['heroes','nb']).managedClubIds,['nb','heroes']);
assert.deepEqual(accessForAccount('member','nb',['heroes']).managedClubIds,[]);
assert.equal(calendarSessions(1,'all',all,accessForAccount('operator','nb'),[]).length,1);
assert.equal(calendarSessions(1,'all',all,accessForAccount('operator','nb',['heroes']),[]).length,2);
assert.equal(formChanged(currentForm,{...currentForm}),false);
assert.equal(formChanged({...currentForm,place:'변경'},currentForm),true);
console.log('Editor and affiliation checks: 8 passed (own club implicit access, extras, member restrictions, exact dirty state).');
