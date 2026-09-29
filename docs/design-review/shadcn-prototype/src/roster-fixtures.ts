import type {Session} from './model'
import {applicantPool,copyLineup,fixtureLineup,removePlayer} from './team-model'
import {createEmptyRoster,type Participation,type SessionRoster} from './roster-state'

export type PreviewState='before'|'applied'|'published'|'published-unapplied'|string

// Fixture values enter the roster once; later selectors never recreate them.
export function createRosterSeed(sessions:Session[],scenario:PreviewState,now:string):Record<string,SessionRoster>{
 const result:Record<string,SessionRoster>={}
 for(const session of sessions){
  const seed=createEmptyRoster(session.id)
  const isCurrentNewBaedong=session.id==='2026-09-27-nb'
  const joined=session.attended||isCurrentNewBaedong&&['applied','published'].includes(scenario)
  const published=session.published||isCurrentNewBaedong&&['published','published-unapplied'].includes(scenario)
  const applicants=applicantPool(session,true,joined)
  const participants:Record<string,Participation>={}
  for(const player of applicants)participants[player.id]={player,status:'applied',source:'fixture',registeredAt:now,updatedAt:now}
  const shared=published?(joined?fixtureLineup():removePlayer(fixtureLineup(),'김나래')):undefined
  result[session.id]={...seed,participants,teams:{draft:shared?copyLineup(shared):seed.teams.draft,shared},firstPublishedAt:published?session.date+'T00:00':null}
 }
 return result
}

export function createRosterForNewSession(sessionId:string){return createEmptyRoster(sessionId)}
