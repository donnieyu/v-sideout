'use client';
import type {ReactNode} from 'react';
import {Pencil,Save} from 'lucide-react';
import {Button} from '../ui/button';
import {SideoutLink as Link} from './link';
import styles from './editor-controls.module.css';

export function EditButton({href,label}:{href?:string;label:string}){
 return <Button className={styles.edit} variant="outline" aria-label={label} disabled={!href} asChild={!!href} data-sideout-edit>{href?<Link href={href}><Pencil aria-hidden="true"/>수정</Link>:<span><Pencil aria-hidden="true"/>수정</span>}</Button>;
}
export function EditorActions({onCancel,onSave,cancelDisabled=false,saveDisabled=false,busy=false,saveLabel='저장',cancelLabel='취소',children}:{onCancel:()=>void;onSave:()=>void;cancelDisabled?:boolean;saveDisabled?:boolean;busy?:boolean;saveLabel?:string;cancelLabel?:string;children?:ReactNode}){
 return <div className={styles.actions} data-editor-actions><Button variant="outline" disabled={busy||cancelDisabled} onClick={onCancel}>{cancelLabel}</Button>{children}<Button disabled={busy||saveDisabled} onClick={onSave}><Save aria-hidden="true"/>{busy?'저장 중…':saveLabel}</Button></div>;
}
