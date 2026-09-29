import {expect,it} from 'vitest'
import {parseRoute,routeHash,type AppRoute} from './navigation'
it('홈의 주·필터와 일정 상세·편집 주소를 복원한다',()=>{
 const routes:AppRoute[]=[
  {view:'home',week:2,filter:'favorites'},
  {view:'detail',id:'2026-10-11-nb',week:2,filter:'nb'},
  {view:'schedule-edit',id:'2026-10-11-nb',week:2,filter:'nb'},
  {view:'team-edit',id:'2026-10-11-nb',week:2,filter:'nb'},
  {view:'account',week:2,filter:'nb'},
 ]
 for(const route of routes)expect(parseRoute(routeHash(route))).toEqual(route)
 expect(parseRoute('#/session/not-valid/teams')).toEqual({view:'home',week:0,filter:'all'})
})
