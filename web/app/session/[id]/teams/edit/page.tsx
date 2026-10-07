import {TeamEditorScreen} from '@/components/sideout/team-editor';
export default async function Page({params}:{params:Promise<{id:string}>}){return <TeamEditorScreen id={(await params).id}/>}
