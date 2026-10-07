import {it,expect} from 'vitest';
import {publishTeams,teamPublishInput} from '../lib/sideout/team-publish';
import {unpublishTeams} from '../lib/sideout/team-unpublish';
import {saveTeamDraft} from '../lib/sideout/team-draft';
import {session,roster,ids} from './fixtures/sideout';
import type {LineupRecord} from '../lib/sideout/read-model';
const now=new Date('2026-10-01T00:00:00Z');
const members=Object.values(ids).map(memberId=>({memberId,homeClubId:session.clubId,active:true,version:1}));
const base=()=>({...structuredClone(roster),published:null,firstPublishedAt:null,publishedMatches:null});
const board=():LineupRecord=>({teams:[ids.applicant,ids.guest,ids.waiter].map((memberId,i)=>({id:['A','C','D'][i],title:['A','C','D'][i]+'팀',players:[{memberId,slotId:'s',assignedPosition:'S'}]}))});
it('retires an unplaced inactive applicant before first publication without blocking active applicants',()=>{
 const r=base(),directory=structuredClone(members);
 r.participants[ids.operator]={status:'applied',source:'self'};
 directory.find(m=>m.memberId===ids.operator)!.active=false;
 const next=publishTeams(session,r,board(),[],directory,now);
 expect(next.publicationState).toBe('published');
 expect(next.participants[ids.operator].status).toBe('cancelled');
 expect(next.published).toEqual(board());
 expect(r.participants[ids.operator].status).toBe('applied');
});
it('publishes teams and matches, promotes only placed waiters, leaves source unchanged',()=>{
 const r=base();r.participants[ids.operator]={status:'waiting',source:'self',waitReason:'closed'};const before=structuredClone(r);
 const next=publishTeams(session,r,board(),[],members,now);
 expect(next.published).toEqual(board());expect(next.draft).toEqual(board());expect(next.firstPublishedAt).toBe(now.toISOString());
 expect(next.participants[ids.waiter].status).toBe('applied');expect(next.participants[ids.operator].status).toBe('waiting');
 expect(next.publishedMatches).toEqual(next.draftMatches);expect(next.publishedMatches!.matches).toHaveLength(11);expect(r).toEqual(before);
});
it('allows four nonempty teams and keeps first publication time on republish',()=>{
 const r=base();r.participants[ids.operator]={status:'waiting',source:'self',waitReason:'closed'};
 const lineup=board();lineup.teams.push({id:'E',title:'E팀',players:[{memberId:ids.operator,slotId:'s',assignedPosition:'S'}]});
 const first=publishTeams(session,r,lineup,[],members,now);const second=publishTeams(session,unpublishTeams(session,first,'saved',now),lineup,[],members,new Date(now.getTime()+1000));
 expect(second.firstPublishedAt).toBe(first.firstPublishedAt);expect(second.publishedMatches!.matches).toHaveLength(8);expect(second.participants[ids.operator].waitReason).toBeUndefined();
});
it.each([1,2])('allows %i teams as draft but refuses publication',n=>{
 const r=base(),lineup=board();lineup.teams=lineup.teams.slice(0,n);
 expect(saveTeamDraft(session,r,lineup,[],members,now).draft).toEqual(lineup);expect(()=>publishTeams(session,r,lineup,[],members,now)).toThrow('3~4팀');
});
it.each(['empty-team','missing-applicant','duplicate','inactive','cancelled','wrong-slot','started'] as const)('rejects %s without modifying source',kind=>{
 const r=base(),before=structuredClone(r),lineup=board(),directory=structuredClone(members);
 if(kind==='empty-team')lineup.teams[2].players=[];
 if(kind==='missing-applicant')lineup.teams[1].players[0].memberId=ids.operator;
 if(kind==='duplicate')lineup.teams[2].players[0].memberId=ids.applicant;
 if(kind==='inactive')directory.find(m=>m.memberId===ids.applicant)!.active=false;
 if(kind==='cancelled')lineup.teams[2].players[0].memberId=ids.cancelled;
 if(kind==='wrong-slot')lineup.teams[2].players[0].assignedPosition='OH';
 expect(()=>publishTeams(session,r,lineup,kind==='missing-applicant'?[ids.operator]:[],directory,kind==='started'?new Date(session.date+'T'+session.start+':00+09:00'):now)).toThrow();expect(r).toEqual(before);
});
it('requires already published applicants again and draft save preserves public snapshots',()=>{
 const first=publishTeams(session,base(),board(),[],members,now),changed=board();changed.teams[2].players=[];
 const draft=saveTeamDraft(session,unpublishTeams(session,first,'saved',now),changed,[],members,now);expect(draft.published).toEqual(first.published);expect(draft.publishedMatches).toEqual(first.publishedMatches);
 first.participants[ids.operator]={status:'waiting',source:'self'};changed.teams[2].players=[{memberId:ids.operator,slotId:'s',assignedPosition:'S'}];
 expect(()=>publishTeams(session,unpublishTeams(session,first,'saved',now),changed,[],members,now)).toThrow('신청자');
});
it('requires confirmation, registers pre-publication members and preserves match edits',()=>{
 const r=base(),lineup=board();lineup.teams[0].players.push({memberId:ids.outsider,slotId:'oh1',assignedPosition:'OH'});
 expect(()=>publishTeams(session,r,lineup,[],members,now)).toThrow('확인');
 const saved=saveTeamDraft(session,r,lineup,[ids.outsider],members,now);saved.draftMatches!.matches.reverse();
 const next=publishTeams(session,saved,lineup,[],members,now);expect(next.publishedMatches).toEqual(saved.draftMatches);
 expect(teamPublishInput.safeParse({action:'publish',sessionRevision:1,lineup,confirmedMemberIds:[]}).success).toBe(false);
 expect(teamPublishInput.safeParse({action:'publish',confirmed:true,sessionRevision:1,lineup,confirmedMemberIds:[]}).success).toBe(true);
});
