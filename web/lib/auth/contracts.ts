import type {ClubGrant} from './accounts';

export type MemberIdentity={memberId:string;loginId:string;displayName:string;homeClubId:string|null};
export type SessionView=
 | {state:'anonymous'}
 | {state:'password_change_required';expiresAt:string}
 | {state:'active';me:MemberIdentity;authorizationVersion:number};
export type VerifiedPrincipal={
 memberId:string;homeClubId:string|null;isMaster:boolean;
 // Final effective grants; consumers must not merge homeRole again.
 grants:ClubGrant[];authorizationVersion:number;
};
export type VerifiedIdentity=
 | {state:'anonymous'}
 | {state:'password_change_required';expiresAt:string}
 | {state:'active';principal:VerifiedPrincipal};
