// @vitest-environment jsdom
import React from 'react';
import {it,expect,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {PublishedTeams} from '../components/sideout/published-teams';
import type {PublishedTeam} from '../lib/sideout/read-model';
afterEach(cleanup);
const team:PublishedTeam={id:'a',title:'A팀',players:[{memberId:'op2',slotId:'op2',assignedPosition:'OP',displayName:'추가라이트',homeClubId:'club',clubName:'모임'},{memberId:'mb1',slotId:'mb1',assignedPosition:'MB',displayName:'센터1',homeClubId:'other',clubName:'긴모임이름'},{memberId:'oh2',slotId:'oh2',assignedPosition:'OH',displayName:'레프트2',homeClubId:null,clubName:null},{memberId:'s',slotId:'s',assignedPosition:'S',displayName:'세터',homeClubId:'club',clubName:'모임'},{memberId:'oh1',slotId:'oh1',assignedPosition:'OH',displayName:'레프트1',homeClubId:'club',clubName:'모임'},{memberId:'mb2',slotId:'mb2',assignedPosition:'MB',displayName:'센터2',homeClubId:'club',clubName:'모임'},{memberId:'op1',slotId:'op1',assignedPosition:'OP',displayName:'라이트1',homeClubId:'club',clubName:'모임'}]};
it('toggles only presentation, keeps semantic court slots and separates extra players',()=>{
 const original=structuredClone(team);render(<PublishedTeams teams={[team]} memberId="s"/>);
 expect([...screen.getByRole('table').querySelectorAll('tbody tr')].map(row=>row.querySelector('strong')!.textContent)).toEqual(['세터','레프트1','레프트2','센터1','센터2','라이트1','추가라이트']);
 fireEvent.click(screen.getByRole('button',{name:/^코트$/}));const court=screen.getByRole('group',{name:'A팀 코트'});
 expect([...court.querySelectorAll('[data-slot-id]')].map(slot=>slot.getAttribute('data-slot-id'))).toEqual(['oh1','mb1','s','oh2','mb2','op1']);
 expect(within(court).getByText('긴모임이름')).toBeTruthy();expect(within(court).getByText('나')).toBeTruthy();expect(within(court).queryByText('추가라이트')).toBeNull();expect(within(screen.getByRole('group',{name:'A팀 추가 선수'})).getByText('추가라이트')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/^행$/}));expect(screen.getByRole('table')).toBeTruthy();expect(team).toEqual(original);
});
it('hides empty published court slots while preserving the occupied court position in historical views',()=>{
 render(<PublishedTeams teams={[{...team,players:[team.players[3]]}]} memberId="nobody" past/>);fireEvent.click(screen.getByRole('button',{name:/^코트$/}));expect(screen.queryByText('미배정')).toBeNull();expect(screen.getByRole('group',{name:'A팀 코트'}).querySelector('[data-slot-id="s"]')?.getAttribute('style')).toContain('grid-column: 3');expect(screen.getByText('당시 공개된 팀편성')).toBeTruthy();expect(screen.queryByRole('group',{name:'A팀 추가 선수'})).toBeNull();expect(screen.queryByRole('button',{name:'팀편성 수정'})).toBeNull();
});

it('keeps empty court slots in an unpublished draft',()=>{
 render(<PublishedTeams teams={[{...team,players:[team.players[3]]}]} memberId="nobody" manager savedState="changed"/>);fireEvent.click(screen.getByRole('button',{name:/^코트$/}));expect(screen.getAllByText('미배정')).toHaveLength(5);
});
