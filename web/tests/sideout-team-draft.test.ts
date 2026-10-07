import {it,expect} from 'vitest';
import {unpublishTeams} from '../lib/sideout/team-unpublish';
import {saveTeamDraft,teamDraftInput} from '../lib/sideout/team-draft';
import {generateTeamMatches} from '../lib/sideout/match-plan';
import {session,roster,ids} from './fixtures/sideout';
import type {LineupRecord} from '../lib/sideout/read-model';
const now=new Date('2026-10-01T00:00:00Z');
const member=(memberId:string)=>({memberId,homeClubId:session.clubId,active:true,version:1});
const members=[ids.applicant,ids.guest,ids.waiter,ids.outsider,ids.cancelled].map(member);
const board=(...memberIds:string[]):LineupRecord=>({teams:[{id:'A',title:'A팀',players:memberIds.map((memberId,i)=>({memberId,slotId:i?'mb1':'s',assignedPosition:i?'MB':'S'}))}]});
const base=()=>({...structuredClone(roster),published:null,firstPublishedAt:null,publishedMatches:null});
it('saves a partial draft, including empty teams, promoting placed waiters without changing published teams',()=>{
 const original=unpublishTeams(session,roster,'saved',now);const lineup=board(ids.applicant,ids.waiter);lineup.teams.push({id:'C',title:'C팀',players:[]});
 const next=saveTeamDraft(session,original,lineup,[],members,now);
 expect(next.draft).toEqual(lineup);expect(next.published).toEqual(original.published);expect(next.publishedMatches).toEqual(original.publishedMatches);expect(next.firstPublishedAt).toBe(original.firstPublishedAt);expect(next.participants[ids.waiter].status).toBe('applied');expect(original.published).toEqual(roster.published);
});
it('requires exact explicit confirmation and confirms newly assigned members as attending',()=>{
 const r=base(),lineup=board(ids.applicant,ids.outsider);expect(()=>saveTeamDraft(session,r,lineup,[],members,now)).toThrow();expect(()=>saveTeamDraft(session,r,lineup,[ids.outsider,ids.guest],members,now)).toThrow();
 const next=saveTeamDraft({...session,cap:2},r,lineup,[ids.outsider],members,now);expect(next.participants[ids.outsider].status).toBe('applied');expect(next.participants[ids.outsider].waitReason).toBeUndefined();expect(r.participants[ids.outsider]).toBeUndefined();
});
it('cannot bypass published registration closure or re-add cancelled members',()=>{
 expect(()=>saveTeamDraft(session,roster,board(ids.outsider),[ids.outsider],members,now)).toThrow('공개 중');
 expect(()=>saveTeamDraft(session,base(),board(ids.cancelled),[],members,now)).toThrow('참석 의사');
});
it.each(['duplicate-player','duplicate-slot','wrong-position','unknown-slot','duplicate-team','inactive-member'] as const)('rejects invalid draft %s',kind=>{
 const lineup=board(ids.applicant,ids.guest),directory=structuredClone(members);
 if(kind==='duplicate-player')lineup.teams[0].players[1].memberId=ids.applicant;
 if(kind==='duplicate-slot')lineup.teams[0].players[1].slotId='s';
 if(kind==='wrong-position')lineup.teams[0].players[0].assignedPosition='OH';
 if(kind==='unknown-slot')lineup.teams[0].players[0].slotId='unknown';
 if(kind==='duplicate-team')lineup.teams.push({...lineup.teams[0],players:[]});
 if(kind==='inactive-member')directory[0].active=false;
 expect(()=>saveTeamDraft(session,base(),lineup,[],directory,now)).toThrow();
});
it('validates bounds and extra slot positions without storing client identity fields',()=>{
 expect(teamDraftInput.safeParse({action:'save',sessionRevision:1,lineup:{teams:[]},confirmedMemberIds:[]}).success).toBe(false);
 const lineup=board(ids.applicant,ids.guest);lineup.teams[0].players[1].slotId='op2';expect(()=>saveTeamDraft(session,base(),lineup,[],members,now)).toThrow();lineup.teams[0].players[1].assignedPosition='OP';expect(saveTeamDraft(session,base(),lineup,[],members,now).draft).toEqual(lineup);
 lineup.teams[0].players[1].slotId='bench-extra';expect(saveTeamDraft(session,base(),lineup,[],members,now).draft).toEqual(lineup);
 expect(teamDraftInput.safeParse({action:'save',sessionRevision:1,lineup,confirmedMemberIds:[],isMaster:true}).success).toBe(false);
});
it('generates actual-ID match rounds and keeps them stable until the team identities change',()=>{
 const plan=generateTeamMatches(['A','C','D'])!;expect(plan.matches.filter(m=>m.kind==='regular')).toHaveLength(9);expect(plan.matches.filter(m=>m.kind==='rookie')).toHaveLength(2);expect(plan.matches.filter(m=>m.kind==='regular').some(m=>m.home==='B'||m.away==='B')).toBe(false);
 const four=generateTeamMatches(['w','x','y','z'])!;expect(four.matches.filter(m=>m.kind==='regular')).toHaveLength(6);expect(four.matches[0].kind).toBe('rookie');expect(four.matches.at(-1)?.kind).toBe('rookie');expect(generateTeamMatches(['A'])).toBeNull();
 const lineup={teams:['A','C','D'].map(id=>({id,title:id,players:[]}))},r=base();r.draft=lineup;r.draftMatches={...plan,matches:plan.matches.filter(m=>m.kind==='regular').reverse()};
 expect(saveTeamDraft(session,r,lineup,[],members,now).draftMatches).toEqual(r.draftMatches);
 const changed={teams:lineup.teams.map(t=>t.id==='C'?{...t,id:'B'}:t)};expect(saveTeamDraft(session,r,changed,[],members,now).draftMatches?.matches.filter(m=>m.kind==='regular').some(m=>m.home==='C'||m.away==='C')).toBe(false);
});
it('saves renamed teams without changing player assignments or a customized match order',()=>{
 const r=base();r.draft={teams:['A','B','C'].map(id=>({id,title:id+'팀',players:[]}))};r.draftMatches=generateTeamMatches(['A','B','C'])!;r.draftMatches.matches.reverse();
 const lineup=structuredClone(r.draft);lineup.teams[0].title='  블루 팀  ';
 const next=saveTeamDraft(session,r,lineup,[],members,now);expect(next.draft.teams[0]).toEqual({...r.draft.teams[0],title:'블루 팀'});expect(next.draftMatches).toEqual(r.draftMatches);expect(r.draft.teams[0].title).toBe('A팀');
});
it('allows confirmed cancelled and unregistered members in an explicitly withdrawn draft without changing the public snapshot',()=>{
 const r=unpublishTeams(session,roster,'saved',now),lineup=board(ids.cancelled,ids.outsider);
 expect(()=>saveTeamDraft(session,r,lineup,[],members,now)).toThrow('참석 의사');
 const next=saveTeamDraft(session,r,lineup,[ids.cancelled,ids.outsider],members,now);expect(next.draft).toEqual(lineup);expect(next.participants[ids.cancelled].status).not.toBe('cancelled');expect(next.participants[ids.outsider]).toBeTruthy();expect(next.published).toEqual(r.published);expect(next.firstPublishedAt).toBe(r.firstPublishedAt);
 expect(()=>saveTeamDraft(session,roster,lineup,[ids.cancelled,ids.outsider],members,now)).toThrow('공개 중');
});

it.each(['closed','capacity','priority'] as const)('confirms a placed %s waiter at draft save and keeps unplaced waiters and participation after release',reason=>{
 const r=base();r.participants[ids.waiter]={status:'waiting',source:'self',waitReason:reason,order:7};r.participants[ids.operator]={status:'waiting',source:'self',waitReason:reason,order:8};const before=structuredClone(r);
 const next=saveTeamDraft(session,r,board(ids.applicant,ids.waiter),[],members,now);expect(next.participants[ids.waiter]).toEqual({status:'applied',source:'self',order:7});expect(next.participants[ids.operator]).toEqual(r.participants[ids.operator]);expect(r).toEqual(before);
 const released=saveTeamDraft(session,next,board(ids.applicant),[],members,now);expect(released.participants[ids.waiter].status).toBe('applied');
});
it('confirms a newly allocated member even after the registration deadline but before exercise starts',()=>{
 const next=saveTeamDraft({...session,deadline:'2026-09-01T00:00:00Z'},base(),board(ids.applicant,ids.outsider),[ids.outsider],members,now);expect(next.participants[ids.outsider].status).toBe('applied');expect(next.participants[ids.outsider].waitReason).toBeUndefined();
});
