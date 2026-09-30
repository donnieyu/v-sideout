import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function testDatabase(){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of ['0000_windy_omega_red','0001_glamorous_iron_lad','0002_modern_triathlon'])sqlite.exec(readFileSync(new URL(`../../drizzle/${name}.sql`,import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
 const statements:string[]=[];
 const prepare=(sql:string,args:unknown[]=[]):unknown=>({
  bind:(...values:unknown[])=>prepare(sql,values),
  first:async()=>{statements.push(sql);return sqlite.prepare(sql).get(...args as [])??null},
  all:async()=>{statements.push(sql);return {results:sqlite.prepare(sql).all(...args as []),success:true}},
  run:async()=>{statements.push(sql);const r=sqlite.prepare(sql).run(...args as []);return {success:true,meta:{changes:Number(r.changes)}}},
 });
 const db={prepare,batch:async(stmts:{run:()=>Promise<unknown>}[])=>{sqlite.exec('BEGIN');try{const results=[];for(const s of stmts)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}} as unknown as D1Database;
 const put=(kind:string,id:string,data:unknown,revision=1)=>sqlite.prepare('INSERT OR REPLACE INTO workspaces(id,payload,revision) VALUES(?,?,?)').run(`sideout:${kind}:${id}`,JSON.stringify({schemaVersion:1,data}),revision);
 return {db,sqlite,put,statements,close:()=>sqlite.close()};
}
