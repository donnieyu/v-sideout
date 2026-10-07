import {MatchEditorScreen} from '@/components/sideout/match-editor';
export default async function Page({params}:{params:Promise<{id:string}>}){return <MatchEditorScreen id={(await params).id}/>}
