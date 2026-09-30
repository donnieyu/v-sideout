'use client';
import {createContext,useContext,useEffect,useRef,useState,useCallback,type ReactNode} from 'react';
import {MemberAccessGate} from '../member-access/access-gate';
import type {MemberAccessClient} from '@/lib/member-access-client';
import type {SessionView} from '@/lib/auth/contracts';
import {sideoutClient,SideoutClientError,type SideoutClient} from '@/lib/sideout-client';
import type {ClubsView} from '@/lib/sideout/read-model';
import {Button} from '../ui/button';
import styles from './sideout.module.css';
type Active=Extract<SessionView,{state:'active'}>;
type Actions={changePassword:()=>void;logout:()=>Promise<void>;refresh:()=>Promise<void>};
type Context={session:Active;actions:Actions;client:SideoutClient;directory:ClubsView;scroll:Map<string,number>};
const AccessContext=createContext<Context|null>(null);
export function useSideout(){const value=useContext(AccessContext);if(!value)throw Error('SideoutAccess required');return value}
export function useRead<T>(load:(signal:AbortSignal)=>Promise<T>,onAuthError?:()=>void){
 const [state,setState]=useState<{data?:T;error?:Error}>({}),[retry,setRetry]=useState(0);
 const generation=useRef(0);
 useEffect(()=>{
  const controller=new AbortController(),turn=++generation.current;setState({});
  void load(controller.signal).then(data=>{if(turn===generation.current&&!controller.signal.aborted)setState({data})}).catch(error=>{
   if(turn!==generation.current||controller.signal.aborted)return;
   setState({error});if(error instanceof SideoutClientError&&(error.status===401||error.code==='PASSWORD_CHANGE_REQUIRED'))onAuthError?.();
  });
  return()=>{controller.abort();generation.current++};
 },[load,retry,onAuthError]);
 return {...state,retry:()=>setRetry(n=>n+1)};
}
export function ReadState({error,retry}:{error?:Error;retry:()=>void}){return <section className={styles.empty} aria-live="polite">{error?<><h2>정보를 불러오지 못했어요</h2><p role="alert">{error.message}</p><Button variant="outline" onClick={retry}>다시 시도</Button></>:<p role="status">정보를 불러오고 있습니다…</p>}</section>}
function ActiveAccess({session,actions,client,children}:{session:Active;actions:Actions;client:SideoutClient;children:ReactNode}){
 const load=useCallback((signal:AbortSignal)=>client.clubs(signal),[client]);
 const onAuthError=useCallback(()=>void actions.refresh(),[actions.refresh]);
 const {data,error,retry}=useRead(load,onAuthError);const scroll=useRef(new Map<string,number>());
 return <div className={styles.app}>{data?<AccessContext.Provider value={{session,actions,client,directory:data,scroll:scroll.current}}>{children}</AccessContext.Provider>:<ReadState error={error} retry={retry}/>}</div>;
}
export function SideoutAccess({children,authClient,client=sideoutClient}:{children:ReactNode;authClient?:MemberAccessClient;client?:SideoutClient}){
 return <MemberAccessGate client={authClient} revalidateOnFocus renderActive={(session,actions)=><ActiveAccess key={`${session.me.memberId}:${session.authorizationVersion}`} session={session} actions={actions} client={client}>{children}</ActiveAccess>}/>;
}
