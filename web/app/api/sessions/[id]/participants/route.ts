import {sideoutRoute,sideoutParticipantRoute} from '@/lib/server/sideout-dependencies';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return sideoutRoute(request,'candidates',(await params).id)}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return sideoutParticipantRoute(request,(await params).id)}
