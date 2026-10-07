import {it,expect} from 'vitest';
import {generateTeamMatches,toggleRookieMatches,setRookieTeamCount,addRookieMatch,setRookieMatchPair,moveMatchTo,removeRookieMatch,matchTimes,validateMatchPlan} from '../lib/sideout/match-plan';
it('keeps every regular game when toggling rookies and places defaults between rounds or around four teams',()=>{
 const three=generateTeamMatches(['x','y','z'])!,four=generateTeamMatches(['x','y','z','q'])!;
 expect(three.matches.map(m=>m.kind)).toEqual(['regular','regular','regular','rookie','regular','regular','regular','rookie','regular','regular','regular']);
 expect(four.matches.map(m=>m.kind)).toEqual(['rookie','regular','regular','regular','regular','regular','regular','rookie']);
 const moved=moveMatchTo(three,'regular-1',10),off=toggleRookieMatches(moved,false);
 expect(off.matches.map(m=>m.id)).toEqual(['regular-2','regular-3','regular-4','regular-5','regular-6','regular-7','regular-8','regular-9','regular-1']);
 expect(toggleRookieMatches(off,true).matches.filter(m=>m.kind==='regular')).toEqual(off.matches);
 expect(validateMatchPlan(off,['x','y','z'])).toBe('');
});
it('cycles rookie opponents for 2–4 teams without changing regular opponents; add/delete and explicit pair work',()=>{
 let p=setRookieTeamCount(generateTeamMatches(['x','y','z'])!,4);p=addRookieMatch(p);
 expect(p.matches.filter(m=>m.kind==='rookie').map(m=>[m.home,m.away])).toEqual([['R1','R2'],['R3','R4'],['R1','R3']]);
 p=setRookieMatchPair(p,'rookie-3','R2','R4');expect(p.matches.at(-1)).toMatchObject({home:'R2',away:'R4'});
 expect(removeRookieMatch(p,'regular-1').matches).toHaveLength(12);
 expect(removeRookieMatch(p,'rookie-3').matches).toHaveLength(11);
 expect(setRookieTeamCount(p,2).matches.filter(m=>m.kind==='rookie').every(m=>m.home==='R1'&&m.away==='R2')).toBe(true);
});
it('rejects malformed schedules, missing regular games, duplicates and wrong teams; accepts reordered complete plan',()=>{
 const p=generateTeamMatches(['x','y','z'])!;
 expect(validateMatchPlan(moveMatchTo(p,'regular-1',5),['z','x','y'])).toBe('');
 for(const bad of [{...p,matches:p.matches.slice(1)},{...p,matches:[...p.matches,p.matches[0]]},{...p,teamCount:4},{...p,rookieTeamCount:5},{...p,matches:p.matches.map((m,i)=>i?m:{...m,home:'alien'})},{...p,matches:p.matches.map((m,i)=>i?m:{...m,away:m.home})}])expect(validateMatchPlan(bad,['x','y','z'])).not.toBe('');
 expect(validateMatchPlan(p,['x','y'])).not.toBe('');
});
it('recomputes twenty minute times after moving games and reports next day explicitly',()=>{
 expect(matchTimes(generateTeamMatches(['x','y','z'])!,'08:30')[1]).toEqual({start:'08:50',end:'09:10'});
 expect(matchTimes(generateTeamMatches(['x','y','z'])!,'23:50')[0]).toEqual({start:'23:50',end:'다음날 00:10'});
});
it.each([3,4])('restores sequential rookie opponents for %i rookie teams around the four-team round',count=>{
 const configured=setRookieTeamCount(generateTeamMatches(['a','b','c','d'])!,count),on=toggleRookieMatches(toggleRookieMatches(configured,false),true);
 expect(on.matches.filter(m=>m.kind==='rookie').map(m=>[m.home,m.away])).toEqual(count===3?[['R1','R2'],['R2','R3']]:[['R1','R2'],['R3','R4']]);
});
