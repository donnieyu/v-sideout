import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {App} from './main'
beforeEach(()=>history.replaceState(null,'','#home'))
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()})
it('우선 기간을 반복 변경해도 편집기와 상단 작업 버튼은 한 묶음만 유지한다',async()=>{
 vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}})
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
 render(<App/>);
 fireEvent.click(screen.getAllByRole('button',{name:'아스팍 상세 정보'})[0])
 fireEvent.click(screen.getByRole('button',{name:'일정 수정'}))
 expect(screen.queryByRole('heading',{name:'팀편성'})).toBeNull()
 for(let i=0;i<4;i++){
  fireEvent.click(screen.getByRole('checkbox',{name:'소속 회원 우선 기간'}))
  expect(screen.getAllByRole('button',{name:'저장'})).toHaveLength(1)
  expect(screen.getAllByRole('button',{name:'취소'})).toHaveLength(1)
  expect(screen.getAllByRole('checkbox',{name:'소속 회원 우선 기간'})).toHaveLength(1)
 }
 fireEvent.change(screen.getByLabelText('장소'),{target:{value:'변경된 체육관'}})
 fireEvent.click(screen.getByRole('button',{name:'취소'}))
 expect(await screen.findByRole('dialog',{name:'변경사항을 저장하지 않고 이동할까요?'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'저장하지 않고 이동'}))
 await waitFor(()=>expect(screen.queryByRole('button',{name:'저장'})).toBeNull())
 expect(screen.queryByRole('checkbox',{name:'소속 회원 우선 기간'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'일정 수정'}))
 expect(screen.queryByRole('heading',{name:'팀편성'})).toBeNull()
 expect((screen.getByLabelText('장소') as HTMLInputElement).value).toBe('궁산다목적체육관')
})
it('일정 편집 저장 후 조회와 팀편성 수정 진입을 분리한다',async()=>{
 vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}})
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
 HTMLElement.prototype.scrollIntoView=vi.fn()
 render(<App/>);
 fireEvent.click(screen.getAllByRole('button',{name:'아스팍 상세 정보'})[0])
 fireEvent.click(screen.getByRole('button',{name:'일정 수정'}))
 fireEvent.change(screen.getByLabelText('장소'),{target:{value:'새 체육관'}})
 fireEvent.click(screen.getByRole('button',{name:'저장'}))
 await waitFor(()=>expect(screen.getByText('새 체육관')).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'팀편성 수정'}))
 expect(screen.getByRole('region',{name:'팀편성 편집'})).toBeTruthy()
 expect(screen.queryByRole('dialog')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'취소'}))
 await waitFor(()=>expect(screen.queryByRole('region',{name:'팀편성 편집'})).toBeNull())
 expect(screen.getByText('새 체육관')).toBeTruthy()
})
it('변경 전에도 일정 수정 취소로 상세에 돌아간다',async()=>{
 vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}})
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
 render(<App/>);
 fireEvent.click(screen.getAllByRole('button',{name:'뉴배동 상세 정보'})[0])
 fireEvent.click(screen.getByRole('button',{name:'일정 수정'}))
 expect((screen.getByRole('button',{name:'취소'}) as HTMLButtonElement).disabled).toBe(false)
 fireEvent.click(screen.getByRole('button',{name:'취소'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'일정 수정'})).toBeTruthy())
 expect(screen.getByRole('button',{name:'팀편성 수정'})).toBeTruthy()
})
it('팀편성 편집은 상세 문맥 안에서 정보 편집과 분리된다',()=>{
 vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}})
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
 HTMLElement.prototype.scrollIntoView=vi.fn()
 render(<App/>);
 fireEvent.click(screen.getAllByRole('button',{name:'뉴배동 상세 정보'})[0])
 fireEvent.click(screen.getByRole('button',{name:'팀편성 수정'}))
 expect(screen.getAllByRole('heading',{name:'뉴배동'}).length).toBeGreaterThan(0)
 expect(screen.getByRole('heading',{name:'팀편성 수정'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'일정 수정'})).toBeNull()
 expect(screen.queryByRole('heading',{name:'운동 일정'})).toBeNull()
 expect(screen.getByRole('link',{name:'일정 상세'})).toBeTruthy()
})
