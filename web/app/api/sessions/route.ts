import {sideoutRoute} from '@/lib/server/sideout-dependencies';
export const GET=(request:Request)=>sideoutRoute(request,'sessions');
