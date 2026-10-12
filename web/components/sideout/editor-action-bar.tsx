'use client';
import {createContext,useContext,useEffect,useState,type ReactNode,type CSSProperties} from 'react';
import {ChevronLeft,Keyboard} from 'lucide-react';
import {Button} from '../ui/button';
import {SideoutLink} from './link';
import styles from './editor-action-bar.module.css';
export const EditorNavigation=createContext<{href:string;label:string;suppressed?:boolean}|null>(null);
export function EditorActionBar({children,busy=false,hidden=false}:{children:ReactNode;busy?:boolean;hidden?:boolean}){
 const navigation=useContext(EditorNavigation);
 const [keyboard,setKeyboard]=useState({open:false,offset:0});
 useEffect(()=>{
  const viewport=window.visualViewport;if(!viewport)return;
  let baseline=Math.max(window.innerHeight,viewport.height);
  const update=()=>{
   const active=document.activeElement;
   const textInput=active instanceof HTMLTextAreaElement||(active instanceof HTMLInputElement&&!['checkbox','radio','button','submit','range','color','file'].includes(active.type));
   if(!textInput)baseline=Math.max(window.innerHeight,viewport.height);
   const open=window.innerWidth<=760&&viewport.scale===1&&textInput&&baseline-viewport.height>120;
   setKeyboard({open,offset:open?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0});
   if(open)document.documentElement.style.setProperty('--editor-visible-height',`${viewport.height}px`);else document.documentElement.style.removeProperty('--editor-visible-height');
  };
  viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);document.addEventListener('focusin',update);document.addEventListener('focusout',update);
  return()=>{viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update);document.removeEventListener('focusin',update);document.removeEventListener('focusout',update);document.documentElement.style.removeProperty('--editor-visible-height')};
 },[]);
 if(navigation?.suppressed)return null;
 // Keep the focused input and keyboard stable until the action click is delivered.
 return <div className={styles.bar} data-editor-actions data-floating-editor-actions data-keyboard={keyboard.open||undefined} hidden={hidden} onPointerDown={event=>{if(keyboard.open)event.preventDefault()}} style={{'--keyboard-offset':`${keyboard.offset}px`} as CSSProperties}>
  {keyboard.open?<Button variant="outline" className={styles.returnButton} aria-label="키보드 닫기" onClick={()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();setKeyboard({open:false,offset:0})}}><Keyboard aria-hidden="true"/><span>키보드 닫기</span></Button>:navigation&&(busy?<Button variant="outline" className={styles.returnButton} disabled><ChevronLeft aria-hidden="true"/>돌아가기</Button>:<Button variant="outline" className={styles.returnButton} asChild><SideoutLink href={navigation.href} aria-label={navigation.label}><ChevronLeft aria-hidden="true"/>돌아가기</SideoutLink></Button>)}
  {children}
 </div>;
}
