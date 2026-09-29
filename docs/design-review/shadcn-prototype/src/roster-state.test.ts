import {describe,expect,it} from 'vitest'
import {clubs,fixtures} from './model'
import {accessForAccount} from './registration-model'
import {emptyLineup,memberPool,type Lineup} from './team-model'
import {createEmptyRoster,executeRosterCommand,selectRosterView,type RosterCommandContext} from './roster-state'

const session=fixtures.find(value=>value.id==='2026-09-27-nb')!
const self=memberPool.find(player=>player.id==='김나래')!
const other=memberPool.find(player=>player.id==='김도윤')!
const guest=memberPool.find(player=>player.id==='박서준')!
const now='2026-09-23T12:00'
const master=accessForAccount('master',null)
const member=accessForAccount('member','nb')
const context=(actorId='김나래',access=master,when=now):RosterCommandContext=>({session,actorId,access,now:when,members:memberPool})
const teams=(...players:typeof self[]):Lineup=>({teams:[{id:'A',title:'A팀',players}]})

describe('회차 참가 원본',()=>{
 it('신청자가 한 명이라도 미배정이면 초안은 저장하지만 첫 공개와 재공개는 거부한다',()=>{
  const initial=createEmptyRoster(session.id)
  const added=executeRosterCommand(initial,{type:'ADD_MEMBERS',sessionId:session.id,expectedRevision:0,playerIds:[self.id,other.id]},context())
  expect(added.ok).toBe(true)
  if(!added.ok)return
  const draft=executeRosterCommand(added.next,{type:'SAVE_DRAFT',sessionId:session.id,expectedRevision:1,lineup:teams(self),confirmUnregisteredIds:[]},context())
  expect(draft.ok).toBe(true)
  if(!draft.ok)return
  expect(executeRosterCommand(draft.next,{type:'PUBLISH_TEAMS',sessionId:session.id,expectedRevision:2,lineup:teams(self),confirmUnregisteredIds:[]},context())).toEqual({ok:false,code:'unassigned_applicants'})
  const first=executeRosterCommand(draft.next,{type:'PUBLISH_TEAMS',sessionId:session.id,expectedRevision:2,lineup:teams(self,other),confirmUnregisteredIds:[]},context())
  expect(first.ok).toBe(true)
  if(!first.ok)return
  expect(executeRosterCommand(first.next,{type:'PUBLISH_TEAMS',sessionId:session.id,expectedRevision:3,lineup:teams(self),confirmUnregisteredIds:[]},context())).toEqual({ok:false,code:'unassigned_applicants'})
 })
 it('공개 전 취소는 참가 상태와 초안 배정을 함께 바꾸고 공개 잠금은 모든 역할에 적용한다',()=>{
  const initial=createEmptyRoster(session.id)
  const registered=executeRosterCommand(initial,{type:'REGISTER_SELF',sessionId:session.id,expectedRevision:0},context('김나래',member))
  expect(registered.ok).toBe(true)
  if(!registered.ok)return
  const saved=executeRosterCommand(registered.next,{type:'SAVE_DRAFT',sessionId:session.id,expectedRevision:1,lineup:teams(self),confirmUnregisteredIds:[]},context())
  expect(saved.ok).toBe(true)
  if(!saved.ok)return
  const cancelled=executeRosterCommand(saved.next,{type:'CANCEL_PARTICIPATION',sessionId:session.id,expectedRevision:2,playerId:self.id},context('김나래',member))
  expect(cancelled.ok).toBe(true)
  if(!cancelled.ok)return
  expect(cancelled.next.participants[self.id].status).toBe('cancelled')
  expect(cancelled.next.teams.draft.teams[0].players).toEqual([])
  const rejoined=executeRosterCommand(cancelled.next,{type:'REGISTER_SELF',sessionId:session.id,expectedRevision:3},context('김나래',member))
  expect(rejoined.ok).toBe(true)
  if(!rejoined.ok)return
  const published=executeRosterCommand(rejoined.next,{type:'PUBLISH_TEAMS',sessionId:session.id,expectedRevision:4,lineup:teams(self),confirmUnregisteredIds:[]},context())
  expect(published.ok).toBe(true)
  if(!published.ok)return
  expect(published.next.firstPublishedAt).toBe(now)
  for(const [actorId,access] of [[self.id,member],[self.id,master]] as const){
   const rejected=executeRosterCommand(published.next,{type:'CANCEL_PARTICIPATION',sessionId:session.id,expectedRevision:5,playerId:self.id},context(actorId,access))
   expect(rejected).toEqual({ok:false,code:'published_locked'})
   expect(published.next.participants[self.id].status).toBe('applied')
  }
 })

 it('취소→첫 공개→대기 등록→재공개 시 팀·명단·인원이 함께 승격한다',()=>{
  let state=createEmptyRoster(session.id)
  const run=(command:Parameters<typeof executeRosterCommand>[1],ctx=context())=>{const result=executeRosterCommand(state,command,ctx);expect(result.ok).toBe(true);if(result.ok)state=result.next}
  run({type:'ADD_MEMBERS',sessionId:session.id,expectedRevision:0,playerIds:[self.id,other.id]},context())
  run({type:'CANCEL_PARTICIPATION',sessionId:session.id,expectedRevision:1,playerId:self.id},context())
  run({type:'PUBLISH_TEAMS',sessionId:session.id,expectedRevision:2,lineup:teams(other),confirmUnregisteredIds:[]},context())
  run({type:'REGISTER_SELF',sessionId:session.id,expectedRevision:3},context('김나래',member))
  expect(state.participants[self.id].status).toBe('waiting')
  expect(selectRosterView(state,{playerId:self.id,homeClubId:'nb',manager:false},memberPool,session,now).counts).toMatchObject({applicants:1,waiting:1})
  run({type:'SAVE_DRAFT',sessionId:session.id,expectedRevision:4,lineup:teams(other,self),confirmUnregisteredIds:[]})
  expect(state.participants[self.id].status).toBe('waiting')
  run({type:'PUBLISH_TEAMS',sessionId:session.id,expectedRevision:5,lineup:teams(other,self),confirmUnregisteredIds:[]})
  const view=selectRosterView(state,{playerId:self.id,homeClubId:'nb',manager:false},memberPool,session,now)
  expect(view.selfStatus).toBe('applied')
  expect(view.counts).toMatchObject({applicants:2,waiting:0,unassignedApplicants:0})
  expect(view.canViewPublishedTeams).toBe(true)
  expect(state.teams.shared?.teams[0].players.map(player=>player.id)).toEqual([other.id,self.id])
 })

 it('복수 추가의 잘못된 회원과 오래된 버전은 부분 반영 없이 거부한다',()=>{
  const initial=createEmptyRoster(session.id)
  expect(executeRosterCommand(initial,{type:'ADD_MEMBERS',sessionId:session.id,expectedRevision:0,playerIds:[other.id,'존재하지 않음']},context())).toEqual({ok:false,code:'unknown_member'})
  expect(initial.participants).toEqual({})
  expect(executeRosterCommand(initial,{type:'REGISTER_SELF',sessionId:session.id,expectedRevision:9},context('김나래',member))).toEqual({ok:false,code:'stale_revision'})
  expect(initial.revision).toBe(0)
 })

 it('미신청 선수의 초안 배정은 명시적 확인을 요구하고 공개 전 대기자는 대기 상태로 남는다',()=>{
  const initial=createEmptyRoster(session.id)
  const lineup=teams(guest)
  const bare={type:'SAVE_DRAFT' as const,sessionId:session.id,expectedRevision:0,lineup,confirmUnregisteredIds:[]}
  expect(executeRosterCommand(initial,bare,context())).toEqual({ok:false,code:'unregistered_confirmation_required'})
  const result=executeRosterCommand(initial,{...bare,confirmUnregisteredIds:[guest.id]},context())
  expect(result.ok).toBe(true)
  if(!result.ok)return
  expect(result.next.participants[guest.id].status).toBe('applied')
  expect(result.next.teams.shared).toBeUndefined()
  expect(executeRosterCommand(initial,{...bare,confirmUnregisteredIds:[guest.id]},context('김나래',member))).toEqual({ok:false,code:'forbidden'})
 })

 it('마감 후 본인 취소만 막고 관리자의 첫 공개 전 취소는 기존 동작을 보존한다',()=>{
  const initial=createEmptyRoster(session.id)
  const added=executeRosterCommand(initial,{type:'ADD_MEMBERS',sessionId:session.id,expectedRevision:0,playerIds:[other.id]},context())
  expect(added.ok).toBe(true)
  if(!added.ok)return
  const later='2026-09-26T15:00'
  expect(executeRosterCommand(added.next,{type:'CANCEL_PARTICIPATION',sessionId:session.id,expectedRevision:1,playerId:other.id},context(other.id,member,later))).toEqual({ok:false,code:'deadline_locked'})
  const managerCancel=executeRosterCommand(added.next,{type:'CANCEL_PARTICIPATION',sessionId:session.id,expectedRevision:1,playerId:other.id},context('김나래',master,later))
  expect(managerCancel.ok).toBe(true)
 })

 it('일반 회원은 타 모임 신청자 실명을 보지 못하고 미배정 수는 신청자만 센다',()=>{
  let state=createEmptyRoster(session.id)
  const added=executeRosterCommand(state,{type:'ADD_MEMBERS',sessionId:session.id,expectedRevision:0,playerIds:[other.id,guest.id]},context())
  expect(added.ok).toBe(true);if(!added.ok)return;state=added.next
  const ownView=selectRosterView(state,{playerId:self.id,homeClubId:clubs[3].id,manager:false},memberPool,session,now)
  expect(ownView.visibleRoster.applicants.map(p=>p.id)).toEqual([other.id])
  expect(ownView.visibleRoster.guestCount).toBe(1)
  expect(ownView.counts.unassignedApplicants).toBe(2)
  const outsider=selectRosterView(state,{playerId:self.id,homeClubId:'heroes',manager:false},memberPool,session,now)
  expect(outsider.visibleRoster.applicants).toEqual([])
 })
})
