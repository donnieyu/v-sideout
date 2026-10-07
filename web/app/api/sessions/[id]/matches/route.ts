import {sideoutMatchRoute} from '@/lib/server/sideout-dependencies';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return sideoutMatchRoute(request,(await params).id)}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return sideoutMatchRoute(request,(await params).id)}
