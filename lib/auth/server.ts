import {env} from 'cloudflare:workers';
import {makeAuthRepository} from './d1-repository';

export function authRepository(){
 if(!env.DB)throw new Error('D1 binding is required for authentication');
 return makeAuthRepository(env.DB);
}
