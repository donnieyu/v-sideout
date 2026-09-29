export type AuthErrorCode=
 | 'INVALID_INPUT'
 | 'INVALID_CREDENTIALS'
 | 'UNAUTHENTICATED'
 | 'FORBIDDEN'
 | 'CONFLICT'
 | 'STORAGE_UNAVAILABLE';

export class AuthError extends Error{
 readonly code:AuthErrorCode;

 constructor(code:AuthErrorCode,message:string){
  super(message);
  this.name='AuthError';
  this.code=code;
 }
}
