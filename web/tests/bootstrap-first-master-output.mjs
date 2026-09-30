import assert from 'node:assert/strict';
import {finishBootstrap} from '../scripts/bootstrap-first-master-output.mjs';

const result={member:{loginId:'테스트마스터',temporaryExpiresAt:'2026-10-07T00:00:00.000Z'},temporaryPassword:'Synthetic1234567890'};
let output='',warning='';
let delivered=await finishBootstrap(result,async()=>{throw new Error('dispose failed')},{
 write(value){output=value;return Buffer.byteLength(value)},warn(value){warning+=value},
});
assert.equal(delivered,true,'binding cleanup failure must not classify a committed account as failed');
assert.match(output,/임시 비밀번호: Synthetic1234567890/);
assert.match(warning,/계정 생성은 완료/);
output='';warning='';
delivered=await finishBootstrap(result,async()=>{},{
 write(){throw new Error('broken pipe')},warn(value){warning+=value},
});
assert.equal(delivered,false);
assert.equal(output,'');
assert.match(warning,/계정 생성은 완료/);
assert.doesNotMatch(warning,/Synthetic1234567890/);
console.log('bootstrap-first-master-output: pass');
