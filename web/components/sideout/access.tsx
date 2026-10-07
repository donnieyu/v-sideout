'use client';
import {createContext,useContext,useEffect,useRef,useState,useCallback,useMemo,type ReactNode} from 'react';
import {MemberAccessGate} from '../member-access/access-gate';
import {memberAccessClient,type MemberAccessClient} from '@/lib/member-access-client';
import type {SessionView} from '@/lib/auth/contracts';
import {sideoutClient,SideoutClientError,type SideoutClient} from '@/lib/sideout-client';
import type {ClubsView} from '@/lib/sideout/read-model';
import {Button} from '../ui/button';
import styles from './sideout.module.css';
type Active=Extract<SessionView,{state:'active'}>;
type Actions={changePassword:()=>void;logout:()=>Promise<void>;refresh:()=>Promise<void>};
type Context={session:Active;actions:Actions;client:SideoutClient;directory:ClubsView;scroll:Map<string,number>;drafts:Map<string,unknown>};
const AccessContext=createContext<Context|null>(null);
export function useSideout(){const value=useContext(AccessContext);if(!value)throw Error('SideoutAccess required');return value}
export function useRead<T>(load:(signal:AbortSignal)=>Promise<T>,onAuthError?:()=>void,pollMs=0){
 const [state,setState]=useState<{data?:T;error?:Error}>({}),[retry,setRetry]=useState(0);
 const generation=useRef(0);
 useEffect(()=>{
  const controller=new AbortController();
  const run=(background=false)=>{const turn=++generation.current;if(!background)setState({});
   void load(controller.signal).then(data=>{if(turn===generation.current&&!controller.signal.aborted)setState({data})}).catch(error=>{
    if(turn!==generation.current||controller.signal.aborted)return;
    setState(old=>background?{...old,error}:{error});if(error instanceof SideoutClientError&&(error.status===401||error.code==='PASSWORD_CHANGE_REQUIRED'))onAuthError?.();
   });
  };
  run();const refresh=()=>{if(document.visibilityState!=='hidden')run(true)};
  const timer=pollMs?setInterval(refresh,pollMs):undefined;
  if(pollMs)window.addEventListener('sideout:roster',refresh);
  return()=>{controller.abort();generation.current++;clearInterval(timer);if(pollMs)window.removeEventListener('sideout:roster',refresh)};
 },[load,retry,onAuthError,pollMs]);
 return {...state,retry:()=>setRetry(n=>n+1)};
}
export function ReadWarning({retry}:{retry:()=>void}){return <div role="alert"><p>최신 정보를 확인하지 못했습니다. 연결을 확인하고 다시 불러와 주세요.</p><Button variant="outline" onClick={retry}>다시 불러오기</Button></div>}
export function ReadState({error,retry}:{error?:Error;retry:()=>void}){return <section className={styles.empty} aria-live="polite">{error?<><h2>정보를 불러오지 못했어요</h2><p role="alert">{error.message}</p><Button variant="outline" onClick={retry}>다시 시도</Button></>:<p role="status">정보를 불러오고 있습니다…</p>}</section>}
function ActiveAccess({session,actions,client,children,drafts}:{session:Active;actions:Actions;client:SideoutClient;children:ReactNode;drafts:Map<string,unknown>}){
 const load=useCallback((signal:AbortSignal)=>client.clubs(signal),[client]);
 const onAuthError=useCallback(()=>void actions.refresh(),[actions.refresh]);
 const {data,error,retry}=useRead(load,onAuthError);const scroll=useRef(new Map<string,number>());
 return <div className={styles.app}>{data?<AccessContext.Provider value={{session,actions,client,directory:data,scroll:scroll.current,drafts}}>{children}</AccessContext.Provider>:<ReadState error={error} retry={retry}/>}</div>;
}
export function SideoutAccess({children,authClient,client=sideoutClient}:{children:ReactNode;authClient?:MemberAccessClient;client?:SideoutClient}){
 const owner=useRef({key:'',drafts:new Map<string,unknown>()});
 const base=authClient??memberAccessClient;
 const requestGeneration=useRef(0);
 const guarded=useMemo(()=>({...base,session:async()=>{
  const turn=++requestGeneration.current;
  try{const result=await base.session();if(turn===requestGeneration.current&&result.state!=='active')owner.current={key:'',drafts:new Map()};return result}
  catch(error){throw error}
 },login:async(...args:Parameters<MemberAccessClient['login']>)=>{requestGeneration.current++;owner.current={key:'',drafts:new Map()};return base.login(...args)},logout:async()=>{requestGeneration.current++;return base.logout()}}),[base]);
 return <MemberAccessGate client={guarded} revalidateOnFocus onSignedOut={()=>{owner.current={key:'',drafts:new Map()};window.location.replace('/home')}} renderActive={(session,actions)=>{
  const key=`${session.me.memberId}:${session.authorizationVersion}`;
  if(owner.current.key!==key)owner.current={key,drafts:new Map()};
  return <ActiveAccess drafts={owner.current.drafts} key={key} session={session} actions={actions} client={client}>{children}</ActiveAccess>;
 }}/>;
}
