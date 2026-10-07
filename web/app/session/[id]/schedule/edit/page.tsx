import {ScheduleEditorScreen} from '@/components/sideout/schedule-editor';
export default async function Page({params}:{params:Promise<{id:string}>}){return <ScheduleEditorScreen id={(await params).id}/>}
