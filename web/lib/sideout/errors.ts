export type SideoutErrorCode='INVALID_INPUT'|'UNAUTHENTICATED'|'PASSWORD_CHANGE_REQUIRED'|'FORBIDDEN'|'NOT_FOUND'|'STORAGE_UNAVAILABLE'|'LEGACY_API_DISABLED';
export class SideoutError extends Error {
 constructor(readonly code:SideoutErrorCode,readonly status:number,message:string){super(message);this.name='SideoutError'}
}
export const invalid=()=>new SideoutError('INVALID_INPUT',400,'날짜와 모임 선택을 확인해 주세요.');
export const unavailable=()=>new SideoutError('STORAGE_UNAVAILABLE',503,'정보를 불러오지 못했습니다. 다시 시도해 주세요.');
