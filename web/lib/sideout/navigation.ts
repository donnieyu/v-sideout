import {parseReadSelection,validDate} from './calendar';
export function safeReturnPath(raw:string):string{
 try{
  if(!raw.startsWith('/')||raw.startsWith('//')||raw.includes('\\'))return '/home';
  const path=raw.split('?')[0];
  const match=path.match(/^\/session\/([^/]+)(?:\/(?:schedule|teams|matches)\/edit)?$/);
  if(path!=='/home'&&path!=='/account'&&!match)return '/home';
  if(match){const id=decodeURIComponent(match[1]);if(!id||id.length>128||/[\/\\?#\x00-\x1f]/.test(id)||id==='.'||id==='..')return '/home'}
  const url=new URL(raw,'http://internal');
  if(url.searchParams.has('week')&&!/^-?\d+$/.test(url.searchParams.get('week')!))return '/home';
  if(url.searchParams.has('weekStart'))parseReadSelection(url,new Date('2026-01-01T00:00:00Z'));
  const q=new URLSearchParams();for(const key of (path==='/session/new'?['weekStart','filter','clubId','date']:['weekStart','filter'])){if(url.searchParams.getAll(key).length>1)return '/home';const v=url.searchParams.get(key);if(v)q.set(key,v)}
  if(path==='/session/new'&&(!validDate(q.get('date')??'')||!q.get('clubId')||q.get('clubId')!.length>128))return '/home';
  return path+(q.size?'?'+q:'');
 }catch{return '/home'}
}
export function legacyHashToPath(hash:string,now:Date):string{
 try{const raw=hash.replace(/^#/,'');const url=new URL(raw,'http://internal');const selection=parseReadSelection(url,now);const path=url.pathname.replace(/\/(teams|schedule|matches)\/edit$/,'');const safe=safeReturnPath(path);if(safe!==path)return '/home';return safe+'?'+new URLSearchParams(selection)}catch{return '/home'}
}
