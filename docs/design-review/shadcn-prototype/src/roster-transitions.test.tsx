import React from 'react'
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'

afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()})

async function openNewBaedong(state:'published-unapplied'|'applied'|'published'){
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

function openRoster(){fireEvent.click(screen.getByRole('button',{name:'명단 확인'}))}
function closeRoster(){fireEvent.click(screen.getAllByRole('button',{name:'닫기'})[0])}
function cancelApplication(name:string){
 fireEvent.click(screen.getByRole('button',{name:`${name} 참석 신청 취소`}))
 fireEvent.click(screen.getByRole('button',{name:'참석 신청 취소 확인'}))
}

it('미신청 공개본에서 운영진에게도 취소가 없고 본인은 공개 팀을 볼 수 없다',async()=>{
 await openNewBaedong('published-unapplied')
 expect(screen.getByRole('progressbar',{name:'참여 인원 20명'})).toBeTruthy()
 openRoster()
 expect(screen.queryByRole('button',{name:'김나래 참석 신청 취소'})).toBeNull()
 expect(screen.queryByRole('button',{name:'김도윤 참석 신청 취소'})).toBeNull()
 expect(screen.queryByRole('button',{name:'김나래 참석 신청 취소'})).toBeNull()
 closeRoster()
 expect(screen.getByRole('progressbar',{name:'참여 인원 20명'})).toBeTruthy()
 expect(document.querySelector('.team-member.is-me')).toBeNull()
 expect(screen.queryByRole('button',{name:'취소 불가'})).toBeNull()
 fireEvent.pointerDown(screen.getByRole('combobox',{name:'권한 미리보기'}),{button:0,ctrlKey:false,pointerType:'mouse'})
 fireEvent.click(screen.getByRole('option',{name:'회원'}))
 fireEvent.click(screen.getAllByRole('button',{name:'뉴배동 상세 정보'})[0])
 expect(screen.getByText('참석자만 팀편성을 확인할 수 있어요.')).toBeTruthy()
})

it('운영진 취소 후 본인 재신청은 명단·인원수를 한 번만 복구한다',async()=>{
 await openNewBaedong('applied')
 openRoster()
 cancelApplication('김나래')
 closeRoster()
 expect(screen.getByRole('progressbar',{name:'참여 인원 20명'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'참석 신청'}))
 expect(screen.getByRole('button',{name:'참석 취소'})).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'참여 인원 21명'})).toBeTruthy()
 openRoster()
 expect(screen.getByRole('button',{name:'김나래 참석 신청 취소'})).toBeTruthy()
 closeRoster()
 fireEvent.click(screen.getByRole('button',{name:'참석 취소'}))
 expect(screen.getByRole('progressbar',{name:'참여 인원 20명'})).toBeTruthy()
})

it('공개 후 신청한 본인은 취소할 수 없고 기존 공개 팀에 남는다',async()=>{
 await openNewBaedong('published')
 openRoster()
 expect(screen.queryByRole('button',{name:'김나래 참석 신청 취소'})).toBeNull()
 closeRoster()
 expect(screen.getByRole('progressbar',{name:'참여 인원 21명'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'취소 불가'})).toBeTruthy()
 expect(document.querySelector('.team-member.is-me')).not.toBeNull()
 openRoster()
 expect(screen.queryByRole('heading',{name:'대기자'})).toBeNull()
 expect(screen.queryByRole('button',{name:'김나래 대기 등록 취소'})).toBeNull()
})
