import type {AccountRecord,ClubGrant} from './accounts';
import {resolveSession,type AuthRepository,type ResolvedSession} from './auth-service';
import type {MemberIdentity,SessionView,VerifiedIdentity} from './contracts';

function memberIdentity(account:AccountRecord):MemberIdentity{
 return {memberId:account.id,loginId:account.loginId,displayName:account.displayName,homeClubId:account.homeClubId};
}

export function toSessionView(resolved:ResolvedSession):SessionView{
 if(resolved.state==='anonymous')return {state:'anonymous'};
 if(resolved.state==='password_change_required')return {state:'password_change_required',expiresAt:new Date(resolved.expiresAt).toISOString()};
 return {state:'active',me:memberIdentity(resolved.account),authorizationVersion:resolved.account.authVersion};
}

export function effectiveClubGrants(account:AccountRecord):ClubGrant[]{
 const roles=new Map<string,ClubGrant['role']>();
 if(!account.isMaster&&account.homeClubId&&account.homeRole)roles.set(account.homeClubId,account.homeRole);
 const explicit=new Set<string>();
 for(const grant of account.grants){
  // clubRole() uses the first explicit match; preserve that rule for duplicate source rows.
  if(explicit.has(grant.clubId))continue;
  explicit.add(grant.clubId);
  roles.set(grant.clubId,grant.role);
 }
 return [...roles].map(([clubId,role])=>({clubId,role}));
}

export async function resolveVerifiedIdentity(repo:AuthRepository,token:string|null,now=Date.now()):Promise<VerifiedIdentity>{
 const resolved=await resolveSession(repo,token,now);
 if(resolved.state==='anonymous')return {state:'anonymous'};
 if(resolved.state==='password_change_required')return {state:'password_change_required',expiresAt:new Date(resolved.expiresAt).toISOString()};
 const account=resolved.account;
 return {state:'active',principal:{
  memberId:account.id,homeClubId:account.homeClubId,isMaster:account.isMaster,
  grants:effectiveClubGrants(account),authorizationVersion:account.authVersion,
 }};
}

// Internal history lookup only. It also returns inactive members and proves no current access.
export async function getMemberIdentity(repo:AuthRepository,memberId:string):Promise<MemberIdentity|null>{
 const account=await repo.getById(memberId);
 return account?memberIdentity(account):null;
}
