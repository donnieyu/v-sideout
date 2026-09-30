import {memberDependencies} from '@/lib/auth/server';
import {handleMemberRequest} from '@/lib/auth/member-http';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,context:Context){return handleMemberRequest(memberDependencies,'deactivate',request,(await context.params).id)}
