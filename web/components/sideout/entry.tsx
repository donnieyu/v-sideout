'use client';
import {useEffect} from 'react';
import {useSideout} from './access';
import {legacyHashToPath} from '@/lib/sideout/navigation';
export function SideoutEntry(){const {directory}=useSideout();useEffect(()=>{window.location.replace(window.location.hash?legacyHashToPath(window.location.hash,new Date(directory.serverNow)):'/home')},[directory.serverNow]);return <p role="status">모임 홈으로 이동하고 있습니다…</p>}
