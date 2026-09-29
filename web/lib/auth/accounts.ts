import {hashPassword,normalizeLoginId,validatePassword,verifyPassword} from './credentials';

export type ClubGrant={clubId:string;role:'chair'|'staff'};
export type AuthPolicy={minPasswordLength:number;temporaryCredentialDays:number};
export type AccountRecord={
 id:string;loginId:string;loginIdKey:string;displayName:string;homeClubId:string|null;
 kind:'regular'|'new';isMaster:boolean;homeRole:'chair'|'staff'|null;grants:ClubGrant[];
 active:boolean;passwordHash:string;mustChangePassword:boolean;temporaryExpiresAt:string|null;authVersion:number;
};
type AccountInput=Pick<AccountRecord,'id'|'loginId'|'displayName'|'homeClubId'|'kind'|'isMaster'|'grants'> & {homeRole?:AccountRecord['homeRole']};

export async function prepareAccount(input:AccountInput,temporaryPassword:string,policy:AuthPolicy,now=Date.now()):Promise<AccountRecord>{
 if(!validatePassword(temporaryPassword,policy.minPasswordLength))throw new Error('임시 비밀번호 규칙을 확인해 주세요.');
 if(!Number.isSafeInteger(policy.temporaryCredentialDays)||policy.temporaryCredentialDays<1)throw new Error('임시 자격 유효기간을 확인해 주세요.');
 const loginId=input.loginId.trim().normalize('NFC');
 return {
  id:input.id,loginId,loginIdKey:normalizeLoginId(loginId),displayName:input.displayName.trim(),homeClubId:input.isMaster?null:input.homeClubId,
  kind:input.kind,isMaster:input.isMaster,homeRole:input.isMaster?null:input.homeRole??null,grants:input.grants,
  active:true,passwordHash:await hashPassword(temporaryPassword),mustChangePassword:true,
  temporaryExpiresAt:new Date(now+policy.temporaryCredentialDays*86400000).toISOString(),authVersion:1
 };
}

export async function authenticateAccount(account:AccountRecord,password:string,now=Date.now()):Promise<'active'|'change_required'|'expired'|'inactive'|'invalid'>{
 if(!account.active)return 'inactive';
 if(!await verifyPassword(password,account.passwordHash))return 'invalid';
 if(account.mustChangePassword&&account.temporaryExpiresAt&&Date.parse(account.temporaryExpiresAt)<=now)return 'expired';
 return account.mustChangePassword?'change_required':'active';
}

export async function changePassword(account:AccountRecord,currentPassword:string,newPassword:string,policy:AuthPolicy,now=Date.now()):Promise<AccountRecord>{
 if(!account.active||account.mustChangePassword&&account.temporaryExpiresAt&&Date.parse(account.temporaryExpiresAt)<=now)throw new Error('계정 또는 임시 비밀번호를 확인해 주세요.');
 if(!await verifyPassword(currentPassword,account.passwordHash))throw new Error('현재 비밀번호를 확인해 주세요.');
 if(!validatePassword(newPassword,policy.minPasswordLength)||newPassword===currentPassword)throw new Error('새 비밀번호 규칙을 확인해 주세요.');
 return {...account,passwordHash:await hashPassword(newPassword),mustChangePassword:false,temporaryExpiresAt:null,authVersion:account.authVersion+1};
}

export function deactivateAccount(account:AccountRecord):AccountRecord{
 return {...account,active:false,authVersion:account.authVersion+1};
}

export function clubRole(account:AccountRecord,clubId:string):'master'|'chair'|'staff'|'member'{
 if(account.isMaster)return 'master';
 return account.grants.find(grant=>grant.clubId===clubId)?.role??(account.homeClubId===clubId?account.homeRole:null)??'member';
}
