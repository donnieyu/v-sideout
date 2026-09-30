import {memberDependencies} from '@/lib/auth/server';
import {handleMemberRequest} from '@/lib/auth/member-http';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleMemberRequest(memberDependencies,'list',request)}
export async function POST(request:Request){return handleMemberRequest(memberDependencies,'create',request)}
