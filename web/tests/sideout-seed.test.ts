import {it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
it('refuses an external DB path without creating files',()=>{const path=mkdtempSync(join(tmpdir(),'sideout-seed-refusal-'));try{const r=spawnSync(process.execPath,['scripts/seed-sideout-p1-local.mjs','--state-path',path],{encoding:'utf8'});expect(r.status).toBe(1);expect(r.stderr).toContain('허용된 로컬 시험 경로')}finally{rmSync(path,{recursive:true,force:true})}});
