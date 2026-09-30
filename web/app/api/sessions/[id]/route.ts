import {sideoutRoute} from '@/lib/server/sideout-dependencies';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return sideoutRoute(request,'session',(await params).id)}
