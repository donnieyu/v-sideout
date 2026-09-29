const encoder=new TextEncoder();
const ITERATIONS=600_000;
const SALT_BYTES=16;

const toHex=(bytes:Uint8Array)=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
const fromHex=(value:string)=>Uint8Array.from(value.match(/../g)??[],pair=>Number.parseInt(pair,16));

export function normalizeLoginId(input:string):string{
 if(typeof input!=='string')throw new Error('로그인 아이디를 확인해 주세요.');
 const value=input.trim().normalize('NFC').toLowerCase();
 if(!value||/\s/u.test(value))throw new Error('로그인 아이디에는 공백을 넣을 수 없어요.');
 return value;
}

export function validatePassword(input:string,minLength:number):boolean{
 return Number.isSafeInteger(minLength)&&minLength>0&&typeof input==='string'&&input.length>=minLength&&/[A-Za-z]/.test(input)&&/[0-9]/.test(input);
}

async function derive(password:string,salt:Uint8Array,iterations:number):Promise<Uint8Array>{
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(salt),iterations,hash:'SHA-256'},key,256);
 return new Uint8Array(bits);
}

export async function hashPassword(password:string):Promise<string>{
 if(typeof password!=='string'||!password)throw new Error('비밀번호를 확인해 주세요.');
 const salt=crypto.getRandomValues(new Uint8Array(SALT_BYTES));
 return `pbkdf2-sha256$${ITERATIONS}$${toHex(salt)}$${toHex(await derive(password,salt,ITERATIONS))}`;
}

export async function verifyPassword(password:string,encoded:string):Promise<boolean>{
 if(typeof password!=='string'||typeof encoded!=='string')return false;
 const parts=encoded.split('$');
 if(parts.length!==4||parts[0]!=='pbkdf2-sha256'||!/^\d+$/.test(parts[1])||!/^([0-9a-f]{2}){16}$/.test(parts[2])||!/^([0-9a-f]{2}){32}$/.test(parts[3]))return false;
 const iterations=Number(parts[1]);
 if(!Number.isSafeInteger(iterations)||iterations<100_000||iterations>2_000_000)return false;
 const expected=fromHex(parts[3]),actual=await derive(password,fromHex(parts[2]),iterations);
 let mismatch=0;for(let i=0;i<expected.length;i++)mismatch|=expected[i]^actual[i];
 return mismatch===0;
}
