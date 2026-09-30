import {prepareAccount,type AccountRecord,type AuthPolicy,type ClubGrant} from './accounts';
import {hashPassword,normalizeLoginId,validatePassword} from './credentials';
import {AuthError} from './errors';

export type ClubDirectory={exists(clubId:string):Promise<boolean>};
export type MemberDraft={
 loginId:string;displayName:string;homeClubId:string|null;homeRole:'chair'|'staff'|null;
 grants:ClubGrant[];isMaster:boolean;
};
export type MemberChanges=Partial<Omit<MemberDraft,'loginId'>>;
export type MemberAdminView={
 memberId:string;loginId:string;displayName:string;homeClubId:string|null;kind:AccountRecord['kind'];
 isMaster:boolean;homeRole:AccountRecord['homeRole'];grants:ClubGrant[];active:boolean;
 mustChangePassword:boolean;temporaryExpiresAt:string|null;authorizationVersion:number;
};

function invalid():never{throw new AuthError('INVALID_INPUT','회원 정보를 확인해 주세요.')}
const isRecord=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const validName=(value:unknown)=>typeof value==='string'&&value.trim().length>0&&[...value.trim()].length<=50&&!/\p{C}/u.test(value);
const validClubId=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=100&&!/\s|\p{C}/u.test(value);

async function validateProfile(input:unknown,directory:ClubDirectory){
 if(!isRecord(input)||!validName(input.displayName)||typeof input.isMaster!=='boolean')invalid();
 if(input.homeClubId!==null&&!validClubId(input.homeClubId))invalid();
 if(input.homeRole!==null&&input.homeRole!=='chair'&&input.homeRole!=='staff')invalid();
 if(!Array.isArray(input.grants)||input.grants.length>20)invalid();
 const grants:ClubGrant[]=[];
 const seen=new Set<string>();
 for(const value of input.grants){
  if(!isRecord(value)||!validClubId(value.clubId)||(value.role!=='chair'&&value.role!=='staff')||seen.has(value.clubId as string))invalid();
  const clubId=value.clubId as string;
  seen.add(clubId);
  grants.push({clubId,role:value.role as ClubGrant['role']});
 }
 if(input.isMaster){
  if(input.homeClubId!==null||input.homeRole!==null||grants.length!==0)invalid();
 }else if(input.homeRole!==null&&input.homeClubId===null)invalid();
 const clubs=new Set<string>(grants.map(grant=>grant.clubId));
 if(input.homeClubId!==null)clubs.add(input.homeClubId as string);
 for(const clubId of clubs)if(!await directory.exists(clubId))invalid();
 return {displayName:(input.displayName as string).trim(),homeClubId:input.homeClubId as string|null,
  homeRole:input.homeRole as AccountRecord['homeRole'],grants,isMaster:input.isMaster as boolean};
}

export async function validateManagedAffiliations(account:AccountRecord,directory:ClubDirectory):Promise<void>{
 await validateProfile(account,directory);
}

function randomCharacter(alphabet:string){
 const boundary=Math.floor(256/alphabet.length)*alphabet.length;
 let value:number;
 do{value=crypto.getRandomValues(new Uint8Array(1))[0]}while(value>=boundary);
 return alphabet[value%alphabet.length];
}

export function makeTemporaryPassword(length=20):string{
 if(!Number.isSafeInteger(length)||length<8||length>128)throw new Error('Invalid temporary password length');
 const letters='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 const digits='23456789';
 const alphabet=letters+digits;
 const parts=[randomCharacter(letters),randomCharacter(digits)];
 while(parts.length<length)parts.push(randomCharacter(alphabet));
 for(let i=parts.length-1;i>0;i--){
  const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);
  [parts[i],parts[j]]=[parts[j],parts[i]];
 }
 return parts.join('');
}

export async function prepareManagedMember(input:unknown,policy:AuthPolicy,directory:ClubDirectory,now=Date.now()){
 if(!isRecord(input)||typeof input.loginId!=='string'||input.loginId.trim().length>50||/\p{C}/u.test(input.loginId))invalid();
 let loginId:string;
 try{normalizeLoginId(input.loginId);loginId=input.loginId.trim().normalize('NFC')}catch{invalid()}
 const profile=await validateProfile(input,directory);
 const temporaryPassword=makeTemporaryPassword(Math.max(20,policy.minPasswordLength));
 const account=await prepareAccount({id:crypto.randomUUID(),loginId,...profile,kind:'regular'},temporaryPassword,policy,now);
 return {account,temporaryPassword};
}

export async function prepareManagedUpdate(account:AccountRecord,patch:unknown,directory:ClubDirectory):Promise<AccountRecord>{
 if(!isRecord(patch)||Object.keys(patch).length===0||Object.keys(patch).some(key=>!['displayName','homeClubId','homeRole','grants','isMaster'].includes(key)))invalid();
 const profile=await validateProfile({
  displayName:Object.hasOwn(patch,'displayName')?patch.displayName:account.displayName,
  homeClubId:patch.homeClubId===undefined?account.homeClubId:patch.homeClubId,
  homeRole:patch.homeRole===undefined?account.homeRole:patch.homeRole,
  grants:Object.hasOwn(patch,'grants')?patch.grants:account.grants,
  isMaster:Object.hasOwn(patch,'isMaster')?patch.isMaster:account.isMaster,
 },directory);
 return {...account,...profile,authVersion:account.authVersion+1};
}

export async function prepareReissue(account:AccountRecord,policy:AuthPolicy,now=Date.now(),reactivate=false){
 if(reactivate?account.active:!account.active)invalid();
 const temporaryPassword=makeTemporaryPassword(Math.max(20,policy.minPasswordLength));
 if(!validatePassword(temporaryPassword,policy.minPasswordLength))throw new Error('Generated credential invalid');
 const next={...account,active:true,passwordHash:await hashPassword(temporaryPassword),mustChangePassword:true,
  temporaryExpiresAt:new Date(now+policy.temporaryCredentialDays*86400000).toISOString(),authVersion:account.authVersion+1};
 return {account:next,temporaryPassword};
}

export function memberAdminView(account:AccountRecord):MemberAdminView{
 return {memberId:account.id,loginId:account.loginId,displayName:account.displayName,homeClubId:account.homeClubId,
  kind:account.kind,isMaster:account.isMaster,homeRole:account.homeRole,grants:account.grants.map(grant=>({...grant})),
  active:account.active,mustChangePassword:account.mustChangePassword,temporaryExpiresAt:account.temporaryExpiresAt,
  authorizationVersion:account.authVersion};
}
