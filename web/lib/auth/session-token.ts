const NAME='sideout_session';
const hex=(bytes:Uint8Array)=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');

export function createSessionToken():string{
 return hex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashSessionToken(token:string):Promise<string>{
 if(!/^[0-9a-f]{64}$/.test(token))throw new Error('Invalid session token');
 return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))));
}

export function parseSessionCookie(header:string|null):string|null{
 const value=header?.split(';').map(part=>part.trim()).find(part=>part.startsWith(`${NAME}=`))?.slice(NAME.length+1);
 return value&&/^[0-9a-f]{64}$/.test(value)?value:null;
}

export function sessionCookie(token:string,maxAgeSeconds:number,secure:boolean):string{
 if(!/^[0-9a-f]{64}$/.test(token)||!Number.isSafeInteger(maxAgeSeconds)||maxAgeSeconds<1)throw new Error('Invalid session cookie');
 return `${NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure?'; Secure':''}`;
}

export function clearSessionCookie(secure:boolean):string{
 return `${NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`;
}
