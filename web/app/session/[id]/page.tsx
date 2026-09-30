import {SessionDetailScreen} from '@/components/sideout/session-detail';
export default async function Page({params}:{params:Promise<{id:string}>}){return <SessionDetailScreen id={(await params).id}/>}
