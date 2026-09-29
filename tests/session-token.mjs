import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-session-'));
try{
 const source=await readFile(new URL('../lib/auth/session-token.ts',import.meta.url),'utf8').catch(()=> 'export {}');
 await writeFile(join(dir,'session-token.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 const {createSessionToken,hashSessionToken,sessionCookie,parseSessionCookie,clearSessionCookie}=await import(pathToFileURL(join(dir,'session-token.mjs')));
 const token=createSessionToken();
 assert.match(token,/^[0-9a-f]{64}$/);
 assert.notEqual(token,createSessionToken());
 const hash=await hashSessionToken(token);
 assert.match(hash,/^[0-9a-f]{64}$/);
 assert.notEqual(hash,token);
 const cookie=sessionCookie(token,3600,true);
 assert.match(cookie,/HttpOnly/);
 assert.match(cookie,/SameSite=Lax/);
 assert.match(cookie,/Secure/);
 assert.equal(parseSessionCookie(`a=1; sideout_session=${token}; b=2`),token);
 assert.equal(parseSessionCookie('a=1'),null);
 assert.equal(sessionCookie(token,3600,false).includes('Secure'),false);
 assert.match(clearSessionCookie(true),/Max-Age=0/);
 console.log('PASS opaque session token, hashing and scoped cookie');
}finally{await rm(dir,{recursive:true,force:true})}
