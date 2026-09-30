import type {AuthRepository} from '../auth/auth-service';
import type {VerifiedPrincipal} from '../auth/contracts';
import {resolveVerifiedIdentity} from '../auth/identity';
import {parseSessionCookie} from '../auth/session-token';
import {SideoutError} from '../sideout/errors';
export async function requireBusinessPrincipal(request:Request,authRepo:AuthRepository,now:Date):Promise<VerifiedPrincipal>{
 const identity=await resolveVerifiedIdentity(authRepo,parseSessionCookie(request.headers.get('cookie')),now.getTime());
 if(identity.state==='anonymous')throw new SideoutError('UNAUTHENTICATED',401,'다시 로그인해 주세요.');
 if(identity.state==='password_change_required')throw new SideoutError('PASSWORD_CHANGE_REQUIRED',403,'먼저 비밀번호를 변경해 주세요.');
 return identity.principal;
}
