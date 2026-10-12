// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {NoticeButton,NoticeSection,noticeEditHref} from '../components/sideout/notice-dialog';
import {session} from './fixtures/sideout';
afterEach(()=>{cleanup();vi.restoreAllMocks()});
it('links an operator to the existing notice editor preserving schedule context and closes the dialog',()=>{
 const href=noticeEditHref(session.id,'?weekStart=2026-10-12&filter=favorites');
 const edit=vi.fn();
 render(<NoticeButton session={session} clubName="뉴배동" editHref={href} onEdit={edit}/>);
 fireEvent.click(screen.getByRole('button',{name:'운동 공지'}));
 const link=within(screen.getByRole('dialog')).getByRole('link',{name:'공지 수정'});
 expect(link.getAttribute('href')).toBe('/session/'+session.id+'/schedule/edit?weekStart=2026-10-12&filter=favorites&section=notice');
 document.addEventListener('click',e=>e.preventDefault(),{once:true});fireEvent.click(link);expect(edit).toHaveBeenCalledTimes(1);expect(screen.queryByRole('dialog')).toBeNull();
});
it('shows no empty notice for members and a direct add action for an allowed operator',()=>{
 const {rerender}=render(<NoticeSection notice=" "/>);expect(screen.queryByRole('heading')).toBeNull();
 rerender(<NoticeSection notice="" editHref="/edit?section=notice"/>);expect(screen.getByRole('link',{name:'공지 추가'})).toBeTruthy();expect(screen.queryByText('등록된 공지가 없습니다.')).toBeNull();
});
it('expands overflowing notice in place and exposes no edit action to members',()=>{
 vi.spyOn(HTMLElement.prototype,'scrollHeight','get').mockReturnValue(240);
 render(<NoticeSection notice={'긴 공지입니다.\n'.repeat(20)}/>);
 const expand=screen.getByRole('button',{name:'펼치기'});expect(expand.getAttribute('aria-expanded')).toBe('false');fireEvent.click(expand);
 expect(screen.getByRole('button',{name:'접기'}).getAttribute('aria-expanded')).toBe('true');expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByRole('link')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'접기'}));expect(screen.getByRole('button',{name:'펼치기'})).toBeTruthy();
});
it('does not add an expand control to short notice',()=>{
 render(<NoticeSection notice="실내화를 준비해 주세요."/>);expect(screen.getByText('실내화를 준비해 주세요.')).toBeTruthy();expect(screen.queryByRole('button',{name:'펼치기'})).toBeNull();
});
