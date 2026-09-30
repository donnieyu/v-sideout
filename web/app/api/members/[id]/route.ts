import {memberDependencies} from '@/lib/auth/server';
import {handleMemberRequest} from '@/lib/auth/member-http';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){return handleMemberRequest(memberDependencies,'detail',request,(await context.params).id)}
export async function PATCH(request:Request,context:Context){return handleMemberRequest(memberDependencies,'update',request,(await context.params).id)}
