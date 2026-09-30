import {env} from 'cloudflare:workers';
import {makeAuthRepository} from './d1-repository';
import {makeMemberRepository} from './member-repository';
import type {ClubDirectory} from './member-management';
import {AuthError} from './errors';

export function authRepository(){
 if(!env.DB)throw new Error('D1 binding is required for authentication');
 return makeAuthRepository(env.DB);
}

// I supplies the operational club directory when its server-side source is ready.
// Until then, any non-null club reference fails closed through this provider.
const unavailableClubDirectory:ClubDirectory={
 async exists(){throw new AuthError('STORAGE_UNAVAILABLE','모임 정보를 확인할 수 없습니다.')},
};

export function memberDependencies(){
 if(!env.DB)throw new Error('D1 binding is required for member management');
 return {authRepo:makeAuthRepository(env.DB),memberRepo:makeMemberRepository(env.DB),directory:unavailableClubDirectory};
}
