import {env} from 'cloudflare:workers';
import {makeAuthRepository} from './d1-repository';
import {makeMemberRepository} from './member-repository';
import {makeClubDirectory,makeSideoutStore} from '../server/sideout-store';

export function authRepository(){
 if(!env.DB)throw new Error('D1 binding is required for authentication');
 return makeAuthRepository(env.DB);
}

export function memberDependencies(){
 if(!env.DB)throw new Error('D1 binding is required for member management');
 return {authRepo:makeAuthRepository(env.DB),memberRepo:makeMemberRepository(env.DB),directory:makeClubDirectory(makeSideoutStore(env.DB))};
}
