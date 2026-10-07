import {expect,it} from 'vitest';
import {allocationCandidateGroups,createTeam,type Candidate} from '../components/sideout/allocation/position-board-model';
const person=(id:string,position:Candidate['position'],secondary:Candidate['secondary'],status:Candidate['status']='신청자'):Candidate=>({id,name:id,club:'같은모임',position,secondary,status});
const pool=[person('main1','센터','라이트'),person('main2','센터','레프트'),person('secondary1','레프트','센터'),person('setter','세터','센터'),person('other','라이트','레프트'),person('missing','미등록','미등록')];
it('groups every unassigned active applicant exactly once without a setter exception',()=>{
 const groups=allocationCandidateGroups([...pool,{...pool[0],id:'inactive',active:false}], [createTeam('A')],'센터','신청자','');
 expect(groups.map(g=>g.people.map(p=>p.id))).toEqual([['main1','main2'],['secondary1','setter'],['other','missing']]);
 expect(groups.map(g=>g.label)).toEqual(['주 포지션 · 신청자','부 포지션 · 신청자','다른 포지션 · 신청자']);
});
it('keeps nonmatching candidates, statuses in cross-status search, and excludes assigned players',()=>{
 const board=[createTeam('A')];board[0].slots[0].playerId='main1';
 const people=[...pool,person('wait','센터','라이트','대기자'),person('guest','센터','라이트','미신청 회원')];
 expect(allocationCandidateGroups(people,board,'센터','신청자','같은모임').map(g=>g.people.map(p=>p.id))).toEqual([['main2'],['secondary1','setter'],['other','missing'],['wait'],['guest']]);
 expect(allocationCandidateGroups([pool[3],pool[5]],board,'레프트','신청자','').flatMap(g=>g.people.map(p=>p.id))).toEqual(['setter','missing']);
 expect(allocationCandidateGroups(pool,board,'교대','신청자','').map(g=>g.people.length)).toEqual([5]);
});
