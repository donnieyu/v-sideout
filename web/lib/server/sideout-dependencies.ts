import {env} from 'cloudflare:workers';
import {makeAuthRepository} from '../auth/d1-repository';
import {makeSideoutStore} from './sideout-store';
import {errorResponse,handleSideoutRead,type ReadResource} from './sideout-http';
import {unavailable} from '../sideout/errors';
export async function sideoutRoute(request:Request,resource:ReadResource,id?:string):Promise<Response>{
 try{if(!env.DB)throw unavailable();return await handleSideoutRead(request,resource,{authRepo:makeAuthRepository(env.DB),store:makeSideoutStore(env.DB),now:()=>new Date()},id)}catch(e){return errorResponse(e)}
}

import {handleSideoutWrite,type WriteResource} from './sideout-write';
import {makeSideoutWriteStore} from './sideout-write-store';
export async function sideoutWriteRoute(request:Request,resource:WriteResource,id?:string):Promise<Response>{
 try{if(!env.DB)throw unavailable();return await handleSideoutWrite(request,resource,{authRepo:makeAuthRepository(env.DB),store:makeSideoutStore(env.DB),writeStore:makeSideoutWriteStore(env.DB),now:()=>new Date()},id)}catch(e){return errorResponse(e)}
}

import {handleParticipantWrite} from './sideout-participation';
export async function sideoutParticipantRoute(request:Request,id:string){try{if(!env.DB)throw unavailable();return await handleParticipantWrite(request,id,{authRepo:makeAuthRepository(env.DB),store:makeSideoutStore(env.DB),writeStore:makeSideoutWriteStore(env.DB),now:()=>new Date()})}catch(e){return errorResponse(e)}}

import {handleTeamDraft} from './sideout-teams';
export async function sideoutTeamDraftRoute(request:Request,id:string){try{if(!env.DB)throw unavailable();return await handleTeamDraft(request,id,{authRepo:makeAuthRepository(env.DB),store:makeSideoutStore(env.DB),writeStore:makeSideoutWriteStore(env.DB),now:()=>new Date()})}catch(e){return errorResponse(e)}}

import {handleMatchOrder} from './sideout-matches';
export async function sideoutMatchRoute(request:Request,id:string){try{if(!env.DB)throw unavailable();return await handleMatchOrder(request,id,{authRepo:makeAuthRepository(env.DB),store:makeSideoutStore(env.DB),writeStore:makeSideoutWriteStore(env.DB),now:()=>new Date()})}catch(e){return errorResponse(e)}}
