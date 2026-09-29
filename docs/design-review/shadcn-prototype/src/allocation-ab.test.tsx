import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {App} from './allocation-ab'
import {SessionAllocation} from './session-allocation'
import {sessionCandidates,lineupToBoard,boardToLineup} from './session-allocation-model'
import {allocationCandidateGroups,createTeam,type Candidate} from './position-board-model'
import {allocationReducer,autoFillBoard,nextVacant,reviewCandidates,type ReviewState} from './allocation-ab-model'

beforeEach(()=>history.replaceState(null,'','/'))
afterEach(cleanup)

describe('B 포지션별 연속 배정',()=>{
 it('라이트 2를 팀마다 기본 빈자리로 두고 18명 자동 배치에서는 여섯 코트 자리부터 채운다',()=>{
  const board=['A','B','C'].map(id=>createTeam(id))
  expect(board.map(team=>team.slots.filter(slot=>slot.position==='라이트').map(slot=>slot.id))).toEqual([['5','6'],['5','6'],['5','6']])
  expect(nextVacant(board,'라이트')).toEqual({teamId:'A',slotId:'5'})
  expect(nextVacant(board,'라이트',{teamId:'A',slotId:'5'})).toEqual({teamId:'B',slotId:'5'})
  const placed=autoFillBoard(board,reviewCandidates)
  expect(placed.map(team=>team.slots.slice(0,6).filter(slot=>slot.playerId).length)).toEqual([6,6,6])
  expect(placed.every(team=>team.slots.find(slot=>slot.id==='6')?.playerId===null)).toBe(true)
 })
 it('주 포지션이 라이트에 몰려도 코트 18자리를 추가 자리보다 먼저 채운다',()=>{
  const people:Candidate[]=[
   ...Array.from({length:3},(_,i)=>({id:`s${i}`,name:`세터${i}`,club:'뉴배동',position:'세터' as const,secondary:'라이트' as const,status:'신청자' as const})),
   ...Array.from({length:6},(_,i)=>({id:`l${i}`,name:`레프트${i}`,club:'뉴배동',position:'레프트' as const,secondary:'센터' as const,status:'신청자' as const})),
   ...Array.from({length:3},(_,i)=>({id:`m${i}`,name:`센터${i}`,club:'뉴배동',position:'센터' as const,secondary:'라이트' as const,status:'신청자' as const})),
   ...Array.from({length:6},(_,i)=>({id:`r${i}`,name:`라이트${i}`,club:'뉴배동',position:'라이트' as const,secondary:'센터' as const,status:'신청자' as const})),
  ]
  const placed=autoFillBoard(['A','B','C'].map(id=>createTeam(id)),people)
  expect(placed.every(team=>team.slots.slice(0,6).every(slot=>slot.playerId))).toBe(true)
  expect(placed.every(team=>team.slots[6].playerId===null)).toBe(true)
 })
 it('미배정 신청자를 주·부 포지션 순서로 제시하고 검색에서만 다른 상태를 섞어 찾는다',()=>{
  const people:Candidate[]=[
   {id:'wait',name:'대기',club:'히어로즈',position:'센터',secondary:'레프트',status:'대기자'},
   {id:'sub',name:'부',club:'뉴배동',position:'센터',secondary:'레프트',status:'신청자'},
   {id:'unrelated',name:'다른포지션',club:'아스팍',position:'라이트',secondary:'센터',status:'신청자'},
   {id:'other',name:'미신청',club:'런업',position:'레프트',secondary:'센터',status:'미신청 회원'},
   {id:'main',name:'주',club:'뉴배동',position:'레프트',secondary:'센터',status:'신청자'},
  ]
  const board=[createTeam('A')]
  expect(allocationCandidateGroups(people,board,'레프트','신청자','').map(group=>[group.label,group.people.map(p=>p.id)])).toEqual([
   ['주 포지션 · 신청자',['main']],['부 포지션 · 신청자',['sub']],['다른 포지션 · 신청자',['unrelated']],
  ])
  expect(allocationCandidateGroups(people,board,'레프트','미신청 회원','').flatMap(group=>group.people.map(p=>p.id))).toEqual(['other'])
  expect(allocationCandidateGroups(people,board,'레프트','신청자','대').flatMap(group=>group.people.map(p=>p.id))).toEqual(['wait'])
 })

 it('차 있는 자리를 미배정 신청자로 원자적으로 교체하고 그 자리에 머무른다',()=>{
  const board=[createTeam('A')]
  board[0].slots.find(s=>s.position==='세터')!.playerId='old'
  const state:ReviewState={board,target:{teamId:'A',slotId:'2'},pendingId:'old',reviewed:false}
  const people:Candidate[]=[
   {id:'old',name:'기존',club:'뉴배동',position:'세터',secondary:'라이트',status:'신청자'},
   {id:'new',name:'신규',club:'뉴배동',position:'세터',secondary:'라이트',status:'신청자'},
  ]
  const next=allocationReducer(state,{type:'continuous-assign',playerId:'new',flow:'position'},people)
  expect(next.board[0].slots.find(s=>s.id==='2')?.playerId).toBe('new')
  expect(next.target).toEqual(state.target)
  expect(next.board.flatMap(t=>t.slots).filter(s=>s.playerId==='old')).toHaveLength(0)
  expect(allocationReducer(next,{type:'continuous-assign',playerId:'old',flow:'position'},people).board[0].slots.find(s=>s.id==='2')?.playerId).toBe('old')
 })
 it('한 가지 배정 흐름에서 세터를 배정하고 레프트에서도 팀별 세터를 비교한다',()=>{
  render(<App/>)
  expect(screen.queryByRole('group',{name:'배정 방식'})).toBeNull()
  expect(screen.getByRole('group',{name:'배정 포지션'})).toBeTruthy()
  const setterBoard=screen.getByRole('group',{name:'현재 포지션 팀별 배치'})
  expect(Array.from(setterBoard.querySelectorAll('.ab-matrix-head strong')).map(cell=>cell.textContent)).toEqual(['A팀','B팀','C팀'])
  expect(setterBoard.querySelectorAll('.ab-matrix-row')).toHaveLength(1)
  expect(Array.from(setterBoard.querySelectorAll('.ab-matrix-row button[aria-label$="선택"]')).map(button=>button.getAttribute('aria-label'))).toEqual(['A팀 세터 선택','B팀 세터 선택','C팀 세터 선택'])
  fireEvent.click(screen.getByRole('button',{name:'김도윤 배정'}))
  fireEvent.click(screen.getByRole('button',{name:'서유진 배정'}))
  fireEvent.click(screen.getByRole('button',{name:'이도현 배정'}))
  fireEvent.click(screen.getByRole('button',{name:'다음: 레프트'}))
  const board=screen.getByRole('group',{name:'현재 포지션 팀별 배치'})
  expect(board.querySelectorAll('.ab-matrix-row')).toHaveLength(2)
  expect(Array.from(board.querySelectorAll('.ab-matrix-row')[0].querySelectorAll('button[aria-label$="선택"]')).map(button=>button.getAttribute('aria-label'))).toEqual(['A팀 레프트 1 선택','B팀 레프트 1 선택','C팀 레프트 1 선택'])
  expect(within(board).getByText('세터 김도윤')).toBeTruthy()
  expect(within(board).getByText('세터 서유진')).toBeTruthy()
  expect(within(board).getByText('세터 이도현')).toBeTruthy()
  expect(screen.getByRole('button',{name:'A팀 레프트 1 선택'}).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button',{name:'강현우 배정'}))
  expect(screen.getByRole('button',{name:'A팀 레프트 2 선택'}).getAttribute('aria-pressed')).toBe('true')
 })

 it('채워진 선수의 이름으로 교체 자리를 선택하고 X로 즉시 해제한다',()=>{
  render(<App/>)
  const pool=screen.getByRole('region',{name:'선수 풀'})
  fireEvent.change(within(pool).getByRole('textbox',{name:'선수 검색'}),{target:{value:'김도윤'}})
  fireEvent.click(within(pool).getByRole('button',{name:'김도윤 배정'}))
  const name=screen.getByRole('button',{name:'A팀 세터 김도윤 선택'})
  const remove=screen.getByRole('button',{name:'A팀 세터 김도윤 배정 해제'})
  expect(name.closest('.ab-cont-slot')?.querySelectorAll('button')).toHaveLength(2)
  fireEvent.click(name)
  expect(name.getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button',{name:'A팀 세터 김도윤 배정 해제'})).toBeTruthy()
  expect(within(pool).getByRole('button',{name:'서유진 교체'})).toBeTruthy()
  fireEvent.click(remove)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('button',{name:'A팀 세터 김도윤 배정 해제'})).toBeNull()
  expect(screen.getByRole('button',{name:'A팀 세터 선택'}).getAttribute('aria-pressed')).toBe('true')
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'A팀 세터 선택'}))
  expect(within(pool).getByRole('button',{name:'김도윤 배정'})).toBeTruthy()
  fireEvent.click(within(pool).getByRole('button',{name:'김도윤 배정'}))
  expect(screen.getByRole('button',{name:'A팀 세터 김도윤 배정 해제'})).toBeTruthy()
 })

 it('전체 팀을 확인하고 돌아와도 포지션과 선수 검색을 유지한다',()=>{
  render(<App/>)
  fireEvent.click(screen.getByRole('button',{name:'다음: 레프트'}))
  fireEvent.change(screen.getByRole('textbox',{name:'선수 검색'}),{target:{value:'강현우'}})
  fireEvent.click(screen.getByRole('button',{name:'전체 팀'}))
  fireEvent.click(screen.getByRole('button',{name:'배정으로'}))
  expect(screen.getByRole('button',{name:'레프트'}).getAttribute('aria-pressed')).toBe('true')
  expect((screen.getByRole('textbox',{name:'선수 검색'}) as HTMLInputElement).value).toBe('강현우')
  expect(screen.getByRole('button',{name:'A팀 레프트 1 선택'}).getAttribute('aria-pressed')).toBe('true')
 })

 it('전체 팀에서 처음부터 다시 시작하면 검색과 지난 배정 알림을 지운다',()=>{
  render(<App/>)
  fireEvent.click(screen.getByRole('button',{name:'김도윤 배정'}))
  fireEvent.change(screen.getByRole('textbox',{name:'선수 검색'}),{target:{value:'없는선수'}})
  fireEvent.click(screen.getByRole('button',{name:'전체 팀'}))
  fireEvent.click(screen.getByRole('button',{name:'현재 안 처음부터'}))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'처음부터'}))
  expect((screen.getByRole('textbox',{name:'선수 검색'}) as HTMLInputElement).value).toBe('')
  expect(screen.getByRole('button',{name:'김도윤 배정'})).toBeTruthy()
  expect(screen.queryByText('김도윤 님을 A팀 세터에 배정했어요.')).toBeNull()
  expect(screen.getByRole('button',{name:'A팀 세터 선택'}).getAttribute('aria-pressed')).toBe('true')
 })

 it('선택한 자리를 배치판에서만 강조하고 이전 배정은 전체 팀에서 확인한다',()=>{
  render(<App/>)
  fireEvent.click(screen.getByRole('button',{name:'김도윤 배정'}))
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'B팀 세터 선택'}))
  fireEvent.click(screen.getByRole('button',{name:'서유진 배정'}))
  fireEvent.click(screen.getByRole('button',{name:'이도현 배정'}))
  fireEvent.click(screen.getByRole('button',{name:'다음: 레프트'}))
  expect(screen.queryByText('앞선 배정 보기')).toBeNull()
  expect(screen.queryByRole('table',{name:'앞선 포지션 팀별 명단'})).toBeNull()
  expect(screen.queryByText(/선수 교체|에 배정|자리를 선택하세요/)).toBeNull()
  expect(screen.getByRole('button',{name:'A팀 레프트 1 선택'}).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button',{name:'전체 팀'}))
  expect(within(screen.getByRole('region',{name:'A팀 편성'})).getByText('김도윤')).toBeTruthy()
 })
})

describe('일정 상세의 배정 작업 연결',()=>{
 it('이름 선택으로 기존 선수를 교체하고 별도 해제 버튼은 신청자를 다시 미배정으로 돌린다',()=>{
  const save=vi.fn()
  const people=sessionCandidates([
   {id:'old',name:'기존세터',club:'뉴배동',position:'세터'},
   {id:'new',name:'새세터',club:'뉴배동',position:'세터'},
  ],[],[])
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[{id:'old',name:'기존세터',club:'뉴배동',position:'세터',slotId:'2'}]}]}} people={people} saved={false} onSave={save} onCancel={()=>{}} onDirty={()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'A팀 세터 기존세터 선택'}))
  expect(screen.getByRole('button',{name:'A팀 세터 기존세터 선택'}).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button',{name:'새세터 교체'}))
  expect(screen.getByRole('button',{name:'A팀 세터 새세터 배정 해제'})).toBeTruthy()
  expect(screen.getByText('배정 1명 · 미배정 신청자 1명')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'A팀 세터 새세터 배정 해제'}))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText('배정 0명 · 미배정 신청자 2명')).toBeTruthy()
  expect(screen.getByRole('button',{name:'A팀 세터 선택'}).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button',{name:'새세터 배정'})).toBeTruthy()
 })

 it('저장은 누를 수 있는 보조 색이고 공개는 조건을 충족했을 때만 주요 색으로 활성화한다',()=>{
  const people=sessionCandidates([{id:'setter',name:'세터회원',club:'뉴배동',position:'세터'}],[],[])
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[]}]}} people={people} saved={false} onSave={()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>)
  const save=screen.getByRole('button',{name:'초안 저장'}),publish=screen.getByRole('button',{name:'공개'})
  expect(save.getAttribute('data-variant')).toBe('secondary')
  expect(save.hasAttribute('disabled')).toBe(false)
  expect(publish.getAttribute('data-variant')).toBe('default')
  expect(publish.hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'세터회원 배정'}))
  expect(publish.hasAttribute('disabled')).toBe(false)
 })

 it('이전과 다음은 같은 스타일로 세터와 라이트 끝에서 순환한다',()=>{
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[]}]}} people={[]} saved={false} onSave={()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>)
  const nav=screen.getByRole('navigation',{name:'팀 배정 내비게이션'})
  const previous=within(nav).getByRole('button',{name:'이전: 라이트'}),next=within(nav).getByRole('button',{name:'다음: 레프트'})
  expect(previous.getAttribute('data-variant')).toBe('outline')
  expect(next.getAttribute('data-variant')).toBe('outline')
  fireEvent.click(previous)
  expect(screen.getByRole('button',{name:'라이트'}).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(within(nav).getByRole('button',{name:'다음: 세터'}))
  expect(screen.getByRole('button',{name:'세터'}).getAttribute('aria-pressed')).toBe('true')
 })

 it('배정 단계의 팀 구성 진입점에서 팀과 추가 자리를 관리하고 배정으로 돌아온다',()=>{
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[]}]}} people={[]} saved={false} onSave={()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'팀 구성'}))
  fireEvent.click(screen.getByRole('button',{name:'팀 추가'}))
  expect(screen.getByRole('heading',{name:'B팀 0명'})).toBeTruthy()
  fireEvent.click(screen.getAllByRole('button',{name:'추가 선수 자리'})[0])
  expect(within(screen.getByRole('group',{name:'A팀 추가 선수'})).getAllByRole('button')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button',{name:'배정으로'}))
  expect(within(screen.getByRole('group',{name:'현재 포지션 팀별 배치'})).getByText('B팀')).toBeTruthy()
  expect(screen.getByRole('button',{name:'팀 구성'})).toBeTruthy()
 })

 it('팀 구성에서 한 팀에만 추가한 자리도 열어 선수를 배정할 수 있다',()=>{
  const people=sessionCandidates([{id:'reserve',name:'추가선수',club:'뉴배동',position:'센터'}],[],[])
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[]},{id:'B',title:'B팀',players:[]}]}} people={people} saved={false} onSave={()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'팀 구성'}))
  fireEvent.click(screen.getAllByRole('button',{name:'추가 선수 자리'})[0])
  fireEvent.click(screen.getByRole('button',{name:'A팀 추가 선수 추가 자리 배정'}))
  expect(screen.getByRole('region',{name:'선수 풀'})).toBeTruthy()
  expect(screen.getByRole('heading',{name:'추가 자리 후보 · 신청자'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'추가선수 배정'}))
  fireEvent.click(screen.getByRole('button',{name:'팀 구성'}))
  expect(within(screen.getByRole('group',{name:'A팀 추가 선수'})).getByRole('button',{name:/센터 추가선수/})).toBeTruthy()
 })

 it('미배정 신청자가 있으면 공개를 막고 초안 저장은 허용한다',()=>{
  const people=sessionCandidates([
   {id:'a',name:'첫신청자',club:'뉴배동',position:'세터'},
   {id:'b',name:'둘째신청자',club:'뉴배동',position:'레프트'},
  ],[],[])
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[]}]}} people={people} saved={false} onSave={()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>)
  expect(screen.getByRole('button',{name:'공개'}).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('button',{name:'초안 저장'}).hasAttribute('disabled')).toBe(false)
  fireEvent.click(screen.getByRole('button',{name:'첫신청자 배정'}))
  expect(screen.getByRole('button',{name:'공개'}).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'레프트'}))
  fireEvent.click(screen.getByRole('button',{name:'둘째신청자 배정'}))
  expect(screen.getByRole('button',{name:'공개'}).hasAttribute('disabled')).toBe(false)
 })

 it('전체 팀 코트에는 여섯 자리만 놓고 추가 선수 영역에 라이트 2와 실제 포지션을 표시한다',()=>{
  const players=Array.from({length:8},(_,i)=>({id:`p${i}`,name:`선수${i}`,club:'뉴배동',position:(i===7?'센터':i>=5?'라이트':'레프트') as Candidate['position'],slotId:i<7?String(i):'bench-1'}))
  const people=sessionCandidates(players,[],[])
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players}]}} people={people} saved onSave={()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'팀 구성'}))
  expect(within(screen.getByRole('group',{name:'A팀 코트'})).getAllByRole('button')).toHaveLength(6)
  const extra=screen.getByRole('group',{name:'A팀 추가 선수'})
  expect(within(extra).getByRole('button',{name:/라이트 2 선수6/})).toBeTruthy()
  expect(within(extra).getByRole('button',{name:/센터 선수7/})).toBeTruthy()
  expect(within(extra).queryByText('교대')).toBeNull()
 })
 it('기본 후보는 미배정 신청자이고 상태 선택과 검색에서만 대기자·미신청 회원을 보여준다',()=>{
  const people:Candidate[]=[
   {id:'primary',name:'주선수',club:'뉴배동',position:'세터',secondary:'라이트',status:'신청자'},
   {id:'secondary',name:'부선수',club:'히어로즈',position:'센터',secondary:'세터',status:'신청자'},
   {id:'unrelated',name:'다른선수',club:'아스팍',position:'레프트',secondary:'센터',status:'신청자'},
   {id:'waiting',name:'대기선수',club:'더브이',position:'세터',secondary:'라이트',status:'대기자'},
   {id:'unregistered',name:'미신청선수',club:'런업',position:'세터',secondary:'라이트',status:'미신청 회원'},
  ]
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[]}]}} people={people} saved={false} onSave={()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>)
  const pool=screen.getByRole('region',{name:'선수 풀'})
  expect(within(pool).getByRole('heading',{name:'주 포지션 · 신청자'})).toBeTruthy()
  expect(within(pool).getByRole('heading',{name:'부 포지션 · 신청자'})).toBeTruthy()
  expect(within(pool).getByRole('heading',{name:'다른 포지션 · 신청자'})).toBeTruthy()
  expect(within(pool).getByText('다른선수')).toBeTruthy()
  expect(within(pool).queryByText('대기선수')).toBeNull()
  expect(within(pool).queryByText('미신청선수')).toBeNull()
  fireEvent.click(within(pool).getByRole('button',{name:/^대기자/}))
  expect(within(pool).getByText('대기선수')).toBeTruthy()
  expect(within(pool).queryByText('주선수')).toBeNull()
  fireEvent.click(within(pool).getByRole('button',{name:/^미신청 회원/}))
  expect(within(pool).getByText('미신청선수')).toBeTruthy()
  expect(within(pool).queryByText('대기선수')).toBeNull()
  fireEvent.change(within(pool).getByRole('textbox',{name:'선수 검색'}),{target:{value:'더브이'}})
  expect(within(pool).getByRole('heading',{name:'주 포지션 · 대기자'})).toBeTruthy()
  expect(within(pool).getByText('대기선수')).toBeTruthy()
  expect(within(pool).queryByText('미신청선수')).toBeNull()
 })
 it('전체 팀은 코트 보기를 기본으로 하고 행 보기로 전환한다',()=>{
  const people=sessionCandidates([{id:'c1',name:'오수빈',club:'뉴배동',position:'센터'}],[],[])
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[{id:'c1',name:'오수빈',club:'뉴배동',position:'센터'}]}]}} people={people} saved onSave={()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>)
  expect(screen.queryByText('선수를 배정하면 다음 빈자리로 이동합니다.')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'팀 구성'}))
  const switcher=screen.getByRole('group',{name:'팀 보기 방식'})
  expect(within(switcher).getByRole('button',{name:'코트'}).getAttribute('aria-pressed')).toBe('true')
  expect(document.querySelector('.allocation-team-columns.court')).not.toBeNull()
  const assigned=screen.getByRole('button',{name:/센터 오수빈/})
  expect(within(assigned).getByText('뉴배동')).toBeTruthy()
  fireEvent.click(within(switcher).getByRole('button',{name:'행'}))
  expect(within(switcher).getByRole('button',{name:'행'}).getAttribute('aria-pressed')).toBe('true')
  expect(document.querySelector('.allocation-team-columns.rows')).not.toBeNull()
 })
 it('해당 일정의 후보를 배정하고 초안으로 반환하며 대기자를 구분한다',()=>{
  const save=vi.fn(),cancel=vi.fn()
  const people=sessionCandidates([{id:'session-only',name:'일정회원',club:'뉴배동',position:'세터'}],[{id:'waiting-only',name:'대기회원',club:'히어로즈',position:'세터'}],[])
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[]}]}} people={people} saved={false} onSave={save} onCancel={cancel} onDirty={()=>{}}/>)
  expect(screen.queryByRole('button',{name:'김도윤 배정'})).toBeNull()
  expect(screen.getByRole('heading',{name:'주 포지션 · 신청자'})).toBeTruthy()
  expect(screen.queryByRole('heading',{name:'주 포지션 · 대기자'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:/^대기자/}))
  expect(screen.getByRole('heading',{name:'주 포지션 · 대기자'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:/^신청자/}))
  fireEvent.click(screen.getByRole('button',{name:'일정회원 배정'}))
  fireEvent.click(screen.getByRole('button',{name:'초안 저장'}))
  expect(save.mock.calls[0][0].teams[0].players[0].id).toBe('session-only')
  expect(save.mock.calls[0][1]).toBe(false)
  fireEvent.click(screen.getByRole('button',{name:'취소'}))
  expect(cancel).toHaveBeenCalledOnce()
 })
 it('전체 팀에서 채워진 자리를 열어 후보로 바로 교체하고 초안을 저장한다',()=>{
  const save=vi.fn()
  const people=sessionCandidates([
   {id:'old',name:'기존세터',club:'뉴배동',position:'세터'},
   {id:'new',name:'새세터',club:'뉴배동',position:'세터'},
  ],[],[])
  render(<SessionAllocation title="뉴배동 일정" baseline={{teams:[{id:'A',title:'A팀',players:[{id:'old',name:'기존세터',club:'뉴배동',position:'세터',slotId:'2'}]}]}} people={people} saved={false} onSave={save} onCancel={()=>{}} onDirty={()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'팀 구성'}))
  fireEvent.click(screen.getByRole('button',{name:'A팀 세터 기존세터 뉴배동'}))
  const selected=screen.getByRole('button',{name:'A팀 세터 기존세터 선택'})
  expect(selected.getAttribute('aria-pressed')).toBe('true')
  expect(selected.closest('.ab-cont-slot')?.classList.contains('active')).toBe(true)
  expect(screen.getByRole('button',{name:'새세터 교체'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'새세터 교체'}))
  expect(screen.getByRole('button',{name:'A팀 세터 새세터 배정 해제'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'기존세터 교체'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'초안 저장'}))
  expect(save.mock.calls[0][0].teams[0].players.map((player:{id:string})=>player.id)).toEqual(['new'])
 })
 it('저장된 일곱 번째 선수와 다른 포지션 배정을 왕복 보존한다',()=>{
  const people=sessionCandidates([],[],Array.from({length:7},(_,i)=>({id:`p${i}`,name:`선수${i}`,club:'뉴배동',position:'센터' as const})))
  const lineup={teams:[{id:'A',title:'A팀',players:people.map(({id,name,club,position})=>({id,name,club,position}))}]}
  const saved=boardToLineup(lineupToBoard(lineup),people)
  expect(saved.teams[0].players.map(p=>p.id)).toEqual(lineup.teams[0].players.map(p=>p.id))
  expect(boardToLineup(lineupToBoard(saved),people)).toEqual(saved)
 })
})
