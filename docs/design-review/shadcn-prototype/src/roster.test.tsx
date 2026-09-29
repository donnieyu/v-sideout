import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {RosterDialog} from './roster-dialog'
import {fixtures} from './model'
import {memberPool,type Player} from './team-model'
import {App} from './main'
import {SessionAllocation} from './session-allocation'
import {autoFillBoard} from './allocation-ab-model'
import {createTeam,type Candidate} from './position-board-model'
beforeEach(()=>{history.replaceState(null,'','#home');vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});HTMLElement.prototype.scrollIntoView=vi.fn()})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()})
const session=fixtures.find(s=>s.id==='2026-09-27-nb')!
const own=memberPool.find(p=>p.id==='김도윤')!,guest=memberPool.find(p=>p.id==='박서준')!
it('일반 회원에게 게스트 실명과 추가 기능을 표시하지 않는다',()=>{
 render(<RosterDialog session={session} applicants={[own,guest]} waiters={[]} members={memberPool} manager={false} canAdd={false} canCancel={true} addingAsWaiting={false} onAdd={()=>{}} onClose={()=>{}}/>);
 expect(screen.getByText(own.name)).toBeTruthy();expect(screen.queryByText(guest.name)).toBeNull();expect(screen.queryByRole('button',{name:'참가자 추가'})).toBeNull();expect(screen.queryByRole('button',{name:`${own.name} 참석 신청 취소`})).toBeNull()
})
it('운영진은 게스트를 확인하고 검색 간 선택을 유지해 일괄 추가한다',()=>{
 const add=vi.fn();render(<RosterDialog session={session} applicants={[own,guest]} waiters={[]} members={memberPool} manager canAdd addingAsWaiting={false} onAdd={add} onClose={()=>{}}/>);
 expect(screen.getByText(guest.name)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'참가자 추가'}));
 expect(screen.queryByRole('checkbox',{name:own.name+' 선택'})).toBeNull();fireEvent.click(screen.getByRole('checkbox',{name:'한지우 선택'}));fireEvent.change(screen.getByLabelText('회원 검색'),{target:{value:'김나래'}});fireEvent.click(screen.getByRole('checkbox',{name:'김나래 선택'}));fireEvent.click(screen.getByRole('button',{name:'2명 추가'}));expect(add.mock.calls[0][0].map((p:Player)=>p.id).sort()).toEqual(['김나래','한지우'])
})
it('대기자도 타일의 취소 버튼에서 대상별 확인창으로 이동한다',()=>{
 render(<RosterDialog session={session} applicants={[]} waiters={[guest]} members={memberPool} manager canAdd canCancel addingAsWaiting onAdd={()=>{}} onClose={()=>{}}/>);
 expect(screen.queryByRole('button',{name:`${guest.name} 관리`})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:`${guest.name} 대기 등록 취소`}));
 expect(screen.getByRole('heading',{name:`${guest.name} 님의 대기 등록을 취소할까요?`})).toBeTruthy()
})
it('명단 일괄 추가는 해당 회차의 인원수와 팀편성 신청자에 함께 반영된다',()=>{
 render(<App/>);fireEvent.click(screen.getAllByRole('button',{name:'아스팍 상세 정보'})[0]);fireEvent.click(screen.getByRole('button',{name:'명단 확인'}));fireEvent.click(screen.getByRole('button',{name:'참가자 추가'}));fireEvent.click(screen.getByRole('checkbox',{name:'한지우 선택'}));fireEvent.click(screen.getByRole('checkbox',{name:'박서준 선택'}));fireEvent.click(screen.getByRole('button',{name:'2명 추가'}));expect(screen.getByText('2명을 참가자로 추가했어요.')).toBeTruthy();fireEvent.click(screen.getAllByRole('button',{name:'닫기'})[0]);expect(screen.getByRole('progressbar',{name:'참여 인원 17명'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'팀편성 수정'}));expect(screen.getByText('배정 0명 · 미배정 신청자 17명')).toBeTruthy();fireEvent.change(screen.getByPlaceholderText('이름 또는 소속 검색'),{target:{value:'한지우'}});expect(screen.getByText('모든 참가 상태의 검색 결과')).toBeTruthy();expect(screen.getByRole('button',{name:'한지우 배정'})).toBeTruthy()
})
it('미신청·대기자는 미배정 신청자 카운트에서 제외하며 미신청자는 자동배치하지 않는다',()=>{
 const people:Candidate[]=[{...own,secondary:'센터',status:'신청자'},{...guest,secondary:'센터',status:'미신청 회원'},{...memberPool[1],secondary:'센터',status:'대기자'}]
 const board=autoFillBoard([createTeam('A')],people);expect(board.flatMap(t=>t.slots).some(s=>s.playerId===guest.id)).toBe(false)
 render(<SessionAllocation title="테스트" baseline={{teams:[{id:'A',title:'A팀',players:[]}]}} people={people} saved={false} onSave={()=>{}} onCancel={()=>{}} onDirty={()=>{}}/>);expect(screen.getByText('배정 0명 · 미배정 신청자 1명')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:own.name+' 배정'}));expect(screen.getByText('배정 1명 · 미배정 신청자 0명')).toBeTruthy()
})
it('팀편성 저장이 거부되면 편집 화면과 배정 선택을 유지한다',()=>{
 const people:Candidate[]=[{...own,secondary:'센터',status:'신청자'}]
 const save=vi.fn(()=>({ok:false as const,code:'stale_revision' as const}))
 render(<SessionAllocation title="저장 거부 검증" baseline={{teams:[{id:'A',title:'A팀',players:[]}]}} people={people} saved={false} onSave={save} onCancel={()=>{}} onDirty={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:own.name+' 배정'}))
 expect(screen.getByText('배정 1명 · 미배정 신청자 0명')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'초안 저장'}))
 expect(save).toHaveBeenCalledTimes(1)
 expect(screen.getByRole('region',{name:'팀편성 편집'})).toBeTruthy()
 expect(screen.getByText('배정 1명 · 미배정 신청자 0명')).toBeTruthy()
 expect(screen.getByRole('alert').textContent).toContain('명단이 변경됐어요')
})
it('운영진이 신청을 취소하면 명단과 팀편성 후보 수가 함께 갱신된다',async()=>{
 render(<App/>);fireEvent.click(screen.getAllByRole('button',{name:'아스팍 상세 정보'})[0]);
 expect(screen.getByRole('progressbar',{name:'참여 인원 15명'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'명단 확인'}));
 expect(screen.queryByRole('button',{name:'김민서 관리'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'김민서 참석 신청 취소'}));
 expect(screen.getByRole('heading',{name:'김민서 님의 참석 신청을 취소할까요?'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'참석 신청 취소 확인'}))
 expect(screen.getByText('참석 신청을 취소했어요.')).toBeTruthy()
 fireEvent.click(screen.getAllByRole('button',{name:'닫기'})[0]);
 expect(screen.getByRole('progressbar',{name:'참여 인원 14명'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'명단 확인'}));expect(screen.queryByText('김민서')).toBeNull()
 fireEvent.click(screen.getAllByRole('button',{name:'닫기'})[0]);fireEvent.click(screen.getByRole('button',{name:'팀편성 수정'}));
 expect(screen.getByText('배정 0명 · 미배정 신청자 14명')).toBeTruthy()
})
