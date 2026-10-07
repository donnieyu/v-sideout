import {sideoutRoute,sideoutWriteRoute} from '@/lib/server/sideout-dependencies';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return sideoutRoute(request,'session',(await params).id)}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return sideoutWriteRoute(request,'update',(await params).id)}
