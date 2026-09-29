import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(join(tmpdir(),'sideout-auth-'));
try{
 const source=await readFile(new URL('../lib/auth/credentials.ts',import.meta.url),'utf8').catch(()=> 'export {}');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 await writeFile(join(dir,'credentials.mjs'),code);
 const credentials=await import(pathToFileURL(join(dir,'credentials.mjs')));
 const {normalizeLoginId,validatePassword,hashPassword,verifyPassword}=credentials;
 let passed=0;
 function check(name,run){run();passed++;console.log(`PASS ${name}`)}

 check('Korean login ID has one stable NFC key while display spelling remains separate',()=>{
  assert.equal(normalizeLoginId(' 가나 '),'가나');
  assert.equal(normalizeLoginId('PlayerA'),'playera');
  assert.throws(()=>normalizeLoginId('김 나래'));
  assert.throws(()=>normalizeLoginId('a\tb'));
 });
 check('password rule uses the supplied length and requires letters and digits only',()=>{
  assert.equal(validatePassword('abc123456789',12),true);
  assert.equal(validatePassword('abcdef12345',12),false);
  assert.equal(validatePassword('abcdefghijkl',12),false);
  assert.equal(validatePassword('123456789012',12),false);
  assert.equal(validatePassword('ABCdef123!@#',12),true);
 });
 const first=await hashPassword('abc123456789');
 const second=await hashPassword('abc123456789');
 assert.notEqual(first,second);
 assert.equal(first.includes('abc123456789'),false);
 assert.equal(await verifyPassword('abc123456789',first),true);
 assert.equal(await verifyPassword('abc123456788',first),false);
 assert.equal(await verifyPassword('abc123456789','invalid-hash'),false);
 console.log(`PASS salted password hashing and verification`);
 console.log(`${passed+1} credential checks passed`);
}finally{await rm(dir,{recursive:true,force:true})}
