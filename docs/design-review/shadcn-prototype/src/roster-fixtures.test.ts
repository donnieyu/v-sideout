import {expect,it} from 'vitest'
import {fixtures} from './model'
import {memberPool} from './team-model'
import {createEmptyRoster,selectRosterView} from './roster-state'
import {createRosterSeed} from './roster-fixtures'

const now='2026-09-23T12:00'
const nb=fixtures.find(session=>session.id==='2026-09-27-nb')!

it('대표 공개 상태는 자기 신청 여부에 따라 팀·명단·인원 원본을 일치시킨다',()=>{
 for(const [scenario,expected,selfAssigned] of [['published',21,true],['published-unapplied',20,false]] as const){
  const state=createRosterSeed(fixtures,scenario,now)[nb.id]
  const view=selectRosterView(state,{playerId:'김나래',homeClubId:'nb',manager:false},memberPool,nb,now)
  expect(view.counts.applicants).toBe(expected)
  expect(state.firstPublishedAt).toBeTruthy()
  expect(!!state.teams.shared?.teams.some(team=>team.players.some(player=>player.id==='김나래'))).toBe(selfAssigned)
  expect(view.selfStatus==='applied').toBe(selfAssigned)
  expect(new Set(view.applicants.map(player=>player.id)).size).toBe(expected)
  expect(state.teams.shared?.teams.flatMap(team=>team.players).every(player=>view.applicants.some(person=>person.id===player.id))).toBe(true)
 }
})

it('신청 전 샘플과 새 회차를 비운 채 초기화하고 과거 참석 기록은 보존한다',()=>{
 const seeded=createRosterSeed(fixtures,'before',now)
 expect(seeded[nb.id].participants['김나래']).toBeUndefined()
 expect(seeded[nb.id].teams.shared).toBeUndefined()
 const history=fixtures.find(session=>session.attended)!
 expect(seeded[history.id].participants['김나래'].status).toBe('applied')
 expect(seeded[history.id].firstPublishedAt).toBeTruthy()
 expect(createEmptyRoster('new-2026-10-04-nb').participants).toEqual({})
})
