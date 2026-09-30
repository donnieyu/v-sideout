import {writeSync} from 'node:fs';

export async function finishBootstrap(result,dispose,{write=value=>writeSync(1,value),warn=value=>process.stderr.write(value)}={}){
 const output=`로그인 아이디: ${result.member.loginId}\n임시 비밀번호: ${result.temporaryPassword}\n만료: ${result.member.temporaryExpiresAt}\n`;
 let delivered=false;
 try{delivered=write(output)===Buffer.byteLength(output)}catch{/* A committed credential cannot be recovered from a failed output. */}
 if(!delivered)warn('계정 생성은 완료됐지만 임시 비밀번호 출력에 실패했습니다. 새 빈 합성 로컬 DB에 다시 설정하세요.\n');
 try{await dispose()}catch{warn('계정 생성은 완료됐지만 로컬 D1 연결을 정상 종료하지 못했습니다.\n')}
 return delivered;
}
