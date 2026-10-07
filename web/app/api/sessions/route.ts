import {sideoutRoute,sideoutWriteRoute} from '@/lib/server/sideout-dependencies';
export const GET=(request:Request)=>sideoutRoute(request,'sessions');

export const POST=(request:Request)=>sideoutWriteRoute(request,'create');
