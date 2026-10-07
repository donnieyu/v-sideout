import {sideoutRoute,sideoutWriteRoute} from '@/lib/server/sideout-dependencies';
export const GET=(request:Request)=>sideoutRoute(request,'preferences');

export const POST=(request:Request)=>sideoutWriteRoute(request,'preferences');
