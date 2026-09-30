import {env} from 'cloudflare:workers';
import {makeAuthRepository} from '../auth/d1-repository';
import {makeSideoutStore} from './sideout-store';
import {errorResponse,handleSideoutRead,type ReadResource} from './sideout-http';
import {unavailable} from '../sideout/errors';
export async function sideoutRoute(request:Request,resource:ReadResource,id?:string):Promise<Response>{
 try{if(!env.DB)throw unavailable();return await handleSideoutRead(request,resource,{authRepo:makeAuthRepository(env.DB),store:makeSideoutStore(env.DB),now:()=>new Date()},id)}catch(e){return errorResponse(e)}
}
