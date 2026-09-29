import React from 'react'
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'

afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()})

async function renderScenario(state:'applied'|'published'|'published-unapplied'){
 history.replaceState(null,'',`/?state=${state}#/home?week=0&filter=all`)
 vi.resetModules()
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
 HTMLElement.prototype.scrollIntoView=vi.fn()
 HTMLElement.prototype.hasPointerCapture=vi.fn(()=>false)
 HTMLElement.prototype.setPointerCapture=vi.fn()
 HTMLElement.prototype.releasePointerCapture=vi.fn()
 const {App}=await import('./main')
 render(<App/>)
 fireEvent.click(screen.getAllByRole('button',{name:'뉴배동 상세 정보'})[0])
}

it('공개된 편성은 본인과 운영진의 명단 취소 동작을 모두 닫는다',async()=>{
 await renderScenario('published')
 expect(screen.getByRole('button',{name:'취소 불가'})).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'참여 인원 21명'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'명단 확인'}))
 expect(screen.queryByRole('button',{name:/참석 신청 취소$/})).toBeNull()
 expect(screen.queryByRole('button',{name:/대기 등록 취소$/})).toBeNull()
})

it('공개 후 미신청 회원은 대기 등록만 하고 인원수와 공개 편성은 유지한다',async()=>{
 await renderScenario('published-unapplied')
 expect(screen.getByRole('progressbar',{name:'참여 인원 20명'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'대기자 등록'}))
 expect(screen.getByRole('button',{name:'대기 등록 완료'})).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'참여 인원 20명'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'명단 확인'}))
 expect(screen.getByRole('heading',{name:'대기자'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'김나래 대기 등록 취소'})).toBeNull()
})

it('공개 후 대기자를 빈 팀 자리에 배정하고 재공개하면 신청자와 인원으로 승격한다',async()=>{
 await renderScenario('published-unapplied')
 fireEvent.click(screen.getByRole('button',{name:'대기자 등록'}))
 fireEvent.click(screen.getByRole('button',{name:'팀편성 수정'}))
 fireEvent.click(await screen.findByRole('button',{name:'라이트'}))
 fireEvent.click(screen.getByRole('button',{name:/^대기자/}))
 expect(screen.getByRole('heading',{name:'주 포지션 · 대기자'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'김나래 배정'}))
 fireEvent.click(screen.getByRole('button',{name:'공개'}))
 fireEvent.click(within(screen.getByRole('dialog',{name:'팀편성을 공개할까요?'})).getByRole('button',{name:'공개'}))
 expect(await screen.findByRole('progressbar',{name:'참여 인원 21명'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'취소 불가'})).toBeTruthy()
 expect(document.querySelector('.team-member.is-me')).not.toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'명단 확인'}))
 expect(screen.queryByRole('heading',{name:'대기자'})).toBeNull()
})

it('운영진 권한 미리보기를 바꿔도 이미 추가한 신청자는 보존된다',async()=>{
 await renderScenario('applied')
 fireEvent.click(screen.getAllByRole('link',{name:'모임 홈'})[0])
 fireEvent.click(screen.getAllByRole('button',{name:'아스팍 상세 정보'})[0])
 fireEvent.click(screen.getByRole('button',{name:'명단 확인'}))
 fireEvent.click(screen.getByRole('button',{name:'참가자 추가'}))
 fireEvent.click(screen.getByRole('checkbox',{name:'박서준 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'1명 추가'}))
 fireEvent.click(screen.getAllByRole('button',{name:'닫기'})[0])
 expect(screen.getByRole('progressbar',{name:'참여 인원 16명'})).toBeTruthy()
 fireEvent.pointerDown(screen.getByRole('combobox',{name:'권한 미리보기'}),{button:0,ctrlKey:false,pointerType:'mouse'})
 fireEvent.click(screen.getByRole('option',{name:'운영자 · 뉴배동'}))
 fireEvent.click(screen.getAllByRole('button',{name:'아스팍 상세 정보'})[0])
 expect(screen.getByRole('progressbar',{name:'참여 인원 16명'})).toBeTruthy()
})

it('일반 회원은 자기 모임 신청자만 보고 게스트는 인원수만 확인한다',async()=>{
 await renderScenario('applied')
 fireEvent.pointerDown(screen.getByRole('combobox',{name:'권한 미리보기'}),{button:0,ctrlKey:false,pointerType:'mouse'})
 fireEvent.click(screen.getByRole('option',{name:'회원'}))
 fireEvent.click(screen.getAllByRole('button',{name:'뉴배동 상세 정보'})[0])
 fireEvent.click(screen.getByRole('button',{name:'명단 확인'}))
 expect(screen.getByText('김도윤')).toBeTruthy()
 expect(screen.queryByText('김민서')).toBeNull()
 expect(screen.getByText('게스트')).toBeTruthy()
 expect(screen.getByText('6')).toBeTruthy()
})

it.each([
 ['team-edit','teams/edit'],
 ['schedule-edit','edit'],
])('회원의 %s 편집 주소는 상세로 돌려 운영용 정보를 숨긴다',async(_view,path)=>{
 await renderScenario('applied')
 fireEvent.pointerDown(screen.getByRole('combobox',{name:'권한 미리보기'}),{button:0,ctrlKey:false,pointerType:'mouse'})
 fireEvent.click(screen.getByRole('option',{name:'회원'}))
 const editRoute={view:_view,id:'2026-09-27-nb',week:0,filter:'all'}
 history.pushState({sideoutRoute:editRoute,sideoutIndex:1},'',`#/session/2026-09-27-nb/${path}?week=0&filter=all`)
 fireEvent(window,new PopStateEvent('popstate',{state:history.state}))
 await waitFor(()=>expect(location.hash).toBe('#/session/2026-09-27-nb?week=0&filter=all'))
 expect(screen.queryByRole('region',{name:'팀편성 편집'})).toBeNull()
 expect(screen.queryByText('주 세터 · 부 라이트')).toBeNull()
 expect(screen.queryByRole('button',{name:'저장'})).toBeNull()
})
