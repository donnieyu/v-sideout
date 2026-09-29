export type AppRoute={view:'home'|'community'|'account'|'detail'|'schedule-edit'|'team-edit';id?:string;week:number;filter:string}
export const homeRoute=(week=0,filter='all'):AppRoute=>({view:'home',week,filter})
const validId=/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/
export function routeHash(route:AppRoute){const query=new URLSearchParams({week:String(route.week),filter:route.filter});const base=route.id?`/session/${encodeURIComponent(route.id)}${route.view==='schedule-edit'?'/edit':route.view==='team-edit'?'/teams/edit':''}`:`/${route.view}`;return `#${base}?${query}`}
export function parseRoute(hash:string):AppRoute{
 if(hash==='#account'||hash==='#community')return {view:hash.slice(1) as 'account'|'community',week:0,filter:'all'}
 const [path,raw='']=hash.replace(/^#/,'').split('?');const params=new URLSearchParams(raw);const week=Number(params.get('week')??'0'),filter=params.get('filter')??'all';const context={week:Number.isInteger(week)&&Math.abs(week)<1000?week:0,filter};
 if(path==='/account'||path==='/community'||path==='/home')return {view:path.slice(1) as 'account'|'community'|'home',...context}
 const match=path.match(/^\/session\/([^/]+)(?:\/(edit|teams\/edit))?$/);if(match){const id=decodeURIComponent(match[1]);if(validId.test(id))return {view:match[2]==='edit'?'schedule-edit':match[2]==='teams/edit'?'team-edit':'detail',id,...context}}
 return homeRoute()
}
